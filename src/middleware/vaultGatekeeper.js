import { vaultKeymaster } from "../services/vaultKeymaster.js";
import { vaultSessionStore } from "../services/vaultSessionStore.js";
import { config } from "../config.js";
import { honeyMazeService } from "../services/honeyMazeService.js";
import { jailService } from "../services/jailService.js";
import { getClientIp } from "../utils/clientIp.js";

/**
 * Credential brute-force lockout.
 * Client keys carry 160 bits of entropy, but the master pass is human-chosen, so repeated
 * failures from one IP are jailed. Only requests that PRESENT a credential are counted, so
 * anonymous browsers hitting the lock screen are never penalized.
 */
const AUTH_FAIL_LIMIT = 10;
const AUTH_FAIL_WINDOW_MS = 10 * 60 * 1000;
const AUTH_FAIL_BAN_MS = 60 * 60 * 1000;
const AUTH_FAIL_MAX_TRACKED = 50_000;
const authFailures = new Map(); // ip -> { count, firstAt }

const recordAuthFailure = (ip, path) => {
  const now = Date.now();
  let entry = authFailures.get(ip);
  if (!entry || now - entry.firstAt > AUTH_FAIL_WINDOW_MS) {
    if (!entry && authFailures.size >= AUTH_FAIL_MAX_TRACKED) {
      // Evict the oldest tracked IP (Map preserves insertion order)
      authFailures.delete(authFailures.keys().next().value);
    }
    entry = { count: 0, firstAt: now };
  }
  entry.count += 1;
  authFailures.set(ip, entry);

  if (entry.count >= AUTH_FAIL_LIMIT) {
    authFailures.delete(ip);
    const reason = `Vault credential brute-force: ${entry.count} invalid credentials within ${AUTH_FAIL_WINDOW_MS / 60000} minutes.`;
    jailService.banIp(ip, reason, "LAYER 3: Vault Brute-Force", AUTH_FAIL_BAN_MS);
    jailService.recordEvent({
      ip,
      wall: "LAYER 3: Vault Brute-Force",
      threat_level: "HIGH",
      reason,
      action: "BAN_IP_24H",
      path,
    });
  }
};

const authFailureSweeper = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authFailures) {
    if (now - entry.firstAt > AUTH_FAIL_WINDOW_MS) authFailures.delete(ip);
  }
}, 60 * 1000);
authFailureSweeper.unref?.();

/**
 * FORTRESS VAULT GATEKEEPER
 * Complete boundary protection: Locks down the API and Dashboard.
 * Nobody can use the API without an approved Vault Key or Master Pass.
 */
export const vaultGatekeeper = async (req, res, next) => {
  // If vault protection is explicitly turned off for testing
  if (config.vaultEnforce === false || process.env.VAULT_ENFORCE === "false") {
    return next();
  }

  const path = req.path || req.originalUrl.split("?")[0];

  // 1. PUBLIC EXEMPTIONS (Uptime monitoring, public docs & Honey-Maze Deception Labyrinth)
  if (
    path === "/health" ||
    path === "/fortress-sdk.js" ||
    path === "/favicon.ico" ||
    path === "/openapi.json" ||
    path.startsWith("/docs") ||
    path.startsWith("/api-docs") ||
    path.startsWith("/api/docs") ||
    // NOTE: /api/maze (telemetry + simulate) is intentionally NOT exempt; real maze bait paths are
    // matched by honeyMazeService.isMazePath() below.
    path.startsWith("/api/canary/beacon") ||
    path === "/api/canary/tripwire" ||
    path === "/api/vault/login" ||
    path === "/api/vault/logout" ||
    path === "/api/vault/verify" ||
    path.startsWith("/internal/ai") ||
    honeyMazeService.isMazePath(path)
  ) {
    return next();
  }

  // Disallow passing credentials in URL query parameters (CWE-598: Credential Exposure)
  if (req.query?.vault_pass || req.query?.vault_key) {
    return res.status(400).json({
      fortress_status: "REJECTED",
      threat_level: "MEDIUM",
      cwe: "CWE-598",
      reason: "Passing credentials in URL query strings is prohibited to prevent exposure in logs, proxies, and Referer headers. Transmit via 'Authorization: Bearer <key>' or 'X-Vault-Key' headers.",
    });
  }

  // 2. CHECK HTTPONLY SESSION COOKIE (Dashboard Web Sessions)
  let sessionToken = null;
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)vault_session=([^;]+)/);
    if (match) {
      sessionToken = decodeURIComponent(match[1]);
    }
  }

  if (sessionToken) {
    try {
      const session = await vaultSessionStore.getSession(sessionToken);
      if (session) {
        authFailures.delete(getClientIp(req));
        req.vaultUser = {
          valid: true,
          name: session.name,
          role: session.role,
          keyId: session.keyId,
          quota: Infinity,
          usageCount: 0,
          remaining: Infinity,
        };
        return next();
      }
    } catch (_) {}
  }

  // 3. EXTRACT CREDENTIAL FROM SECURE HEADERS (AND LEGACY COOKIE FALLBACK)
  let credential =
    req.headers["x-vault-pass"] ||
    req.headers["x-vault-key"] ||
    req.headers["x-fortress-key"];

  // Extract from Authorization: Bearer <key>
  if (!credential && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      credential = parts[1];
    }
  }

  // Legacy fallback: Extract from Browser Cookie
  if (!credential && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)vault_token=([^;]+)/);
    if (match) {
      credential = decodeURIComponent(match[1]);
    }
  }

  // 4. VERIFY CREDENTIAL (only bill actual API invocations, not dashboard browsing or verification checks)
  const isBillableApi = path.startsWith("/api") && path !== "/api/vault/verify";
  const check = credential
    ? await vaultKeymaster.verifyAsync(credential, { recordUsage: isBillableApi })
    : { valid: false, reason: "No Vault Key provided." };

  if (check.valid) {
    authFailures.delete(getClientIp(req));
    req.vaultUser = check;
    // Identity is intentionally NOT echoed in response headers (info disclosure + header-injection risk)
    return next();
  }

  // Count only failures where a credential was actually presented
  if (credential) {
    recordAuthFailure(getClientIp(req), `${req.method} ${path}`);
  }

  // 4. BROWSER DASHBOARD UNLOCK SCREEN
  if (path.startsWith("/dashboard")) {
    return res.status(401).send(renderVaultLockScreen(check.reason));
  }

  // 5. PUBLIC WELCOME ROUTE GET / (Provide helpful status)
  if (path === "/" && req.method === "GET") {
    return res.status(200).json({
      name: "FORTRESS CLOUD DEFENDER v3.5 (Enterprise)",
      tagline: "Always-Active Heavy Military-Grade API Security Wall & Scanner",
      vault_security: {
        status: "LOCKED_BEHIND_VAULT",
        protection: "ACTIVE",
        message: "This API requires an authorized Vault Key or Master Pass. Contact the administrator to request access.",
        unlock_header: "x-vault-key: <your_key> or Authorization: Bearer <your_key>",
      },
      dashboard: "/dashboard",
      health: "/health",
    });
  }

  // 6. API REQUEST REJECTION (HTTP 401)
  return res.status(401).json({
    fortress_status: "VAULT_LOCKED",
    threat_level: "HIGH",
    action: "ACCESS_DENIED",
    reason: check.reason || "This API is locked. An authorized Vault Key or Master Pass is required.",
    instructions: "To use this API, request a personal Vault Key from the administrator.",
    authentication_methods: [
      "Header: x-vault-key: <your_key>",
      "Header: x-vault-pass: <master_pass>",
      "Header: Authorization: Bearer <your_key>",
    ],
    locked_endpoint: `${req.method} ${path}`,
  });
};

/**
 * Cyberpunk Dark-Mode Lock Screen for Web SOC Dashboard
 */
function renderVaultLockScreen(errorMsg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FORTRESS VAULT | Authentication Required</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Orbitron:wght@700;900&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #06080d;
      color: #e2e8f0;
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-image: 
        radial-gradient(circle at 50% 30%, rgba(0, 240, 255, 0.08) 0%, transparent 60%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 30px 30px, 30px 30px;
      padding: 20px;
    }
    .vault-card {
      background: rgba(13, 17, 27, 0.95);
      border: 1px solid rgba(0, 240, 255, 0.25);
      box-shadow: 0 0 50px rgba(0, 240, 255, 0.12), inset 0 0 20px rgba(0, 240, 255, 0.04);
      border-radius: 18px;
      width: 100%;
      max-width: 460px;
      padding: 38px;
      text-align: center;
      backdrop-filter: blur(12px);
    }
    .vault-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(255, 0, 85, 0.2));
      border: 1px solid rgba(0, 240, 255, 0.4);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.2);
    }
    h1 {
      font-family: 'Orbitron', monospace;
      font-size: 20px;
      letter-spacing: 2px;
      color: #00f0ff;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    p.sub {
      color: #94a3b8;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 26px;
    }
    .input-group {
      position: relative;
      margin-bottom: 20px;
      text-align: left;
    }
    label {
      display: block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 14px 16px;
      background: #090d16;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
    }
    input:focus {
      border-color: #00f0ff;
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.3);
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #00f0ff, #0088ff);
      color: #06080d;
      font-family: 'Orbitron', monospace;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 1.5px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.35);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 35px rgba(0, 240, 255, 0.55);
    }
    .badge {
      display: inline-block;
      margin-top: 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #64748b;
      letter-spacing: 1px;
    }
    .error-msg {
      background: rgba(255, 0, 85, 0.1);
      border: 1px solid rgba(255, 0, 85, 0.3);
      color: #ff3377;
      font-size: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 18px;
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>
  <div class="vault-card">
    <div class="vault-icon">🔐</div>
    <h1>Vault Gatekeeper</h1>
    <p class="sub">This FORTRESS node is private. Enter your <strong>Master Pass</strong> or authorized <strong>Client Key</strong> to access the SOC Dashboard.</p>

    <div id="clientErrBox" class="error-msg" style="display: ${errorMsg && errorMsg !== "No Vault Key provided." ? "block" : "none"};">
      ⚠️ ${errorMsg || ""}
    </div>

    <form id="vaultForm" onsubmit="handleUnlock(event)">
      <div class="input-group">
        <label for="vaultKey">Passphrase or Client Key</label>
        <input type="password" id="vaultKey" placeholder="Enter Vault Key or Master Pass..." required autofocus autocomplete="current-password" />
      </div>
      <button id="unlockBtn" type="submit">Unlock Security Vault</button>
    </form>

    <div class="badge">PROTECTED BY MILITARY-GRADE CRYPTOGRAPHY</div>
  </div>

  <script>
    async function handleUnlock(e) {
      e.preventDefault();
      const val = document.getElementById('vaultKey').value.trim();
      const btn = document.getElementById('unlockBtn');
      const errBox = document.getElementById('clientErrBox');
      if (!val) return;

      btn.disabled = true;
      btn.textContent = "VERIFYING CREDENTIAL...";
      if (errBox) errBox.style.display = "none";

      try {
        const res = await fetch("/api/vault/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: val })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          try {
            document.cookie = "vault_token=; path=/; max-age=0;";
            localStorage.removeItem("fortress_vault_token");
          } catch (_) {}
          window.location.reload();
        } else {
          if (errBox) {
            errBox.textContent = "⚠️ " + (data.reason || data.error || "Authentication failed.");
            errBox.style.display = "block";
          }
          btn.disabled = false;
          btn.textContent = "Unlock Security Vault";
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = "⚠️ Network error: " + err.message;
          errBox.style.display = "block";
        }
        btn.disabled = false;
        btn.textContent = "Unlock Security Vault";
      }
    }
  </script>
</body>
</html>`;
}

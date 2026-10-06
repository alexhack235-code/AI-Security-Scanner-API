import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.resolve(__dirname, "../../openapi.json");

const router = express.Router();

let cachedOpenApi = null;
function getOpenApiSpec() {
  if (!cachedOpenApi && fs.existsSync(openApiPath)) {
    try {
      cachedOpenApi = JSON.parse(fs.readFileSync(openApiPath, "utf-8"));
    } catch {
      cachedOpenApi = { error: "Failed to read openapi.json" };
    }
  }
  return cachedOpenApi || { openapi: "3.0.3", info: { title: "FORTRESS API" } };
}

// 1. JSON endpoint for OpenAPI 3.0 specification (Postman / SwaggerHub import)
router.get("/openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json(getOpenApiSpec());
});

// 2. Interactive Interactive Developer Documentation Portal
router.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(renderInteractiveDocs());
});

function renderInteractiveDocs() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FORTRESS API Documentation | Enterprise Cloud Defender</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Orbitron:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07090e;
      --bg-panel: #0d111b;
      --bg-card: #121826;
      --bg-code: #090c14;
      --cyan: #00f0ff;
      --cyan-glow: rgba(0, 240, 255, 0.25);
      --green: #10b981;
      --red: #f43f5e;
      --blue: #3b82f6;
      --purple: #a855f7;
      --amber: #f59e0b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.08);
      --border-cyan: rgba(0, 240, 255, 0.25);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      line-height: 1.5;
      display: flex;
      min-height: 100vh;
      overflow-x: hidden;
    }
    /* SIDEBAR */
    #sidebar {
      width: 290px;
      min-width: 290px;
      background: var(--bg-panel);
      border-right: 1px solid var(--border);
      height: 100vh;
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      z-index: 100;
    }
    .brand-box {
      padding: 24px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-badge {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, rgba(0,240,255,0.2), rgba(59,130,246,0.2));
      border: 1px solid var(--cyan);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 15px var(--cyan-glow);
    }
    .brand-title {
      font-family: 'Orbitron', monospace;
      font-size: 15px;
      font-weight: 800;
      color: var(--cyan);
      letter-spacing: 1.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }
    .nav-search {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
    }
    .search-input {
      width: 100%;
      background: var(--bg-code);
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: var(--cyan);
    }
    .nav-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;
      list-style: none;
    }
    .nav-cat {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 18px 8px 8px 8px;
      font-family: 'JetBrains Mono', monospace;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .nav-item:hover, .nav-item.active {
      background: rgba(0, 240, 255, 0.08);
      color: #fff;
    }
    .badge-method {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 5px;
      min-width: 44px;
      text-align: center;
    }
    .badge-post { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-get { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
    .badge-del { background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.4); }

    /* MAIN CONTENT */
    #content {
      flex: 1;
      padding: 36px 48px;
      max-width: 1300px;
      overflow-y: auto;
    }
    .hero-header {
      margin-bottom: 36px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 28px;
    }
    .hero-title {
      font-family: 'Orbitron', monospace;
      font-size: 28px;
      color: #fff;
      margin-bottom: 8px;
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .version-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: rgba(0, 240, 255, 0.15);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      padding: 3px 8px;
      border-radius: 6px;
    }
    .hero-desc {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 850px;
      line-height: 1.6;
    }
    .action-bar {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--cyan), #0099ff);
      color: #07090e;
      font-weight: 700;
      box-shadow: 0 0 20px var(--cyan-glow);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 25px rgba(0,240,255,0.45); }
    .btn-secondary {
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: #e2e8f0;
    }
    .btn-secondary:hover { border-color: var(--cyan); color: #fff; }

    /* AUTH CONTROLLER */
    .auth-banner {
      background: rgba(13, 17, 27, 0.9);
      border: 1px solid var(--border-cyan);
      border-radius: 12px;
      padding: 16px 22px;
      margin-bottom: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .auth-left h4 {
      font-size: 14px;
      color: var(--cyan);
      margin-bottom: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .auth-left p {
      font-size: 13px;
      color: var(--text-muted);
    }
    .auth-input-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .auth-input-group input {
      background: var(--bg-code);
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 14px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      width: 260px;
      outline: none;
    }
    .auth-input-group input:focus { border-color: var(--cyan); }

    /* ENDPOINT CARDS */
    .endpoint-card {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      margin-bottom: 30px;
      overflow: hidden;
      scroll-margin-top: 30px;
      transition: border-color 0.2s;
    }
    .endpoint-card:hover { border-color: rgba(255, 255, 255, 0.16); }
    .ep-header {
      padding: 18px 24px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .ep-route {
      display: flex;
      align-items: center;
      gap: 14px;
      font-family: 'JetBrains Mono', monospace;
    }
    .ep-path {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }
    .ep-title {
      font-size: 13px;
      color: var(--text-muted);
    }
    .ep-lock {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      font-family: 'JetBrains Mono', monospace;
    }
    .ep-public {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      font-family: 'JetBrains Mono', monospace;
    }

    .ep-body {
      padding: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .ep-body { grid-template-columns: 1fr; }
    }
    .ep-desc {
      font-size: 14px;
      color: #cbd5e1;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .section-title {
      font-size: 12px;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
      letter-spacing: 1px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .code-box {
      background: var(--bg-code);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .code-tabs {
      background: rgba(255, 255, 255, 0.03);
      padding: 6px 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .tab-btn-group {
      display: flex;
      gap: 6px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 5px;
      cursor: pointer;
    }
    .tab-btn.active {
      background: rgba(0, 240, 255, 0.15);
      color: var(--cyan);
    }
    .copy-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
      padding: 3px 6px;
      border-radius: 4px;
    }
    .copy-btn:hover { color: #fff; }
    pre {
      padding: 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #e2e8f0;
      overflow-x: auto;
      max-height: 280px;
    }
    textarea.payload-editor {
      width: 100%;
      height: 140px;
      background: var(--bg-code);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: #a7f3d0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      padding: 12px;
      outline: none;
      resize: vertical;
    }
    textarea.payload-editor:focus { border-color: var(--cyan); }
    .test-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
    }
    .btn-run {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-run:hover { opacity: 0.9; }
    .resp-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      display: none;
    }
    .status-200 { background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); display: inline-block; }
    .status-403 { background: rgba(244,63,94,0.2); color: #fb7185; border: 1px solid rgba(244,63,94,0.4); display: inline-block; }
    .status-401 { background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); display: inline-block; }
  </style>
</head>
<body>

  <!-- SIDEBAR -->
  <aside id="sidebar">
    <div class="brand-box">
      <div class="brand-badge">🛡️</div>
      <div>
        <div class="brand-title">FORTRESS</div>
        <div class="brand-sub">API REFERENCE & DOCS</div>
      </div>
    </div>
    <div class="nav-search">
      <input type="text" class="search-input" id="searchFilter" placeholder="Filter endpoints..." onkeyup="filterNav()">
    </div>
    <ul class="nav-list" id="navList">
      <li class="nav-cat">Core Firewall & WAF</li>
      <li><a href="#ep-defend" class="nav-item"><span class="badge-method badge-post">POST</span> /api/defend</a></li>
      <li><a href="#ep-unified" class="nav-item"><span class="badge-method badge-post">POST</span> /api</a></li>

      <li class="nav-cat">Payment Fortress</li>
      <li><a href="#ep-payment-webhook" class="nav-item"><span class="badge-method badge-post">POST</span> /api/payment/verify-webhook</a></li>
      <li><a href="#ep-payment-tokenize" class="nav-item"><span class="badge-method badge-post">POST</span> /api/payment/tokenize-card</a></li>

      <li class="nav-cat">Vulnerability Scanners</li>
      <li><a href="#ep-inspect-zero" class="nav-item"><span class="badge-method badge-post">POST</span> /api/inspect-url/zero-vuln</a></li>
      <li><a href="#ep-scan" class="nav-item"><span class="badge-method badge-post">POST</span> /api/scan</a></li>

      <li class="nav-cat">Threat Intelligence</li>
      <li><a href="#ep-reports-latest" class="nav-item"><span class="badge-method badge-get">GET</span> /api/reports/latest</a></li>
      <li><a href="#ep-reports-gen" class="nav-item"><span class="badge-method badge-post">POST</span> /api/reports/generate-now</a></li>

      <li class="nav-cat">Virtual Hotpatching</li>
      <li><a href="#ep-patch-list" class="nav-item"><span class="badge-method badge-get">GET</span> /api/patch/list</a></li>
      <li><a href="#ep-patch-apply" class="nav-item"><span class="badge-method badge-post">POST</span> /api/patch/apply</a></li>

      <li class="nav-cat">Access & Vault</li>
      <li><a href="#ep-vault-verify" class="nav-item"><span class="badge-method badge-post">POST</span> /api/vault/verify</a></li>
      <li><a href="#ep-vault-keys" class="nav-item"><span class="badge-method badge-get">GET</span> /api/vault/keys</a></li>
      <li><a href="#ep-jail" class="nav-item"><span class="badge-method badge-get">GET</span> /api/jail</a></li>
      <li><a href="#ep-health" class="nav-item"><span class="badge-method badge-get">GET</span> /health</a></li>
    </ul>
  </aside>

  <!-- MAIN VIEW -->
  <main id="content">
    <div class="hero-header">
      <div class="hero-title">
        FORTRESS API Documentation
        <span class="version-tag">v3.5.0 Enterprise</span>
      </div>
      <p class="hero-desc">
        Welcome to the official developer reference for FORTRESS Cloud Defender & AI Security Scanner.
        Use this interactive portal to explore schemas, test real endpoints, generate code in cURL/Node/Python, and integrate turnkey zero-vulnerability defenses into your web infrastructure.
      </p>
      <div class="action-bar">
        <a href="/openapi.json" download="openapi.json" class="btn btn-primary">
          📥 Download OpenAPI 3.0 (Postman Spec)
        </a>
        <a href="/dashboard" class="btn btn-secondary">
          🖥️ Open SOC Dashboard
        </a>
        <button onclick="showPostmanGuide()" class="btn btn-secondary">
          🚀 Postman Import Guide
        </button>
      </div>
    </div>

    <!-- AUTH BAR -->
    <div class="auth-banner">
      <div class="auth-left">
        <h4>🔐 Authentication Header</h4>
        <p>Set your Vault Key or Master Pass below to enable live interactive testing on all protected routes.</p>
      </div>
      <div class="auth-input-group">
        <input type="password" id="userVaultKey" placeholder="Enter x-vault-key or Master Pass..." onchange="saveVaultKey()">
        <button class="btn btn-secondary" onclick="saveVaultKey()">Save Key</button>
      </div>
    </div>

    <!-- ENDPOINT: POST /api/defend -->
    <div class="endpoint-card" id="ep-defend">
      <div class="ep-header">
        <div class="ep-route">
          <span class="badge-method badge-post">POST</span>
          <span class="ep-path">/api/defend</span>
          <span class="ep-title">Autonomous Cloud Defender & AI Cognitive Sanitizer</span>
        </div>
        <span class="ep-lock">🔒 VAULT KEY</span>
      </div>
      <div class="ep-body">
        <div>
          <p class="ep-desc">
            Primary WAF and self-healing defense endpoint. Inspects incoming request headers, query params, and body through 12 Fast-Kill rules, applies active virtual hotpatches, calculates anomaly scores, and executes cognitive AI neutralization.
          </p>
          <div class="section-title">Request Payload (JSON)</div>
          <textarea class="payload-editor" id="defend-payload">{
  "method": "POST",
  "path": "/api/users/update",
  "headers": { "content-type": "application/json" },
  "body": { "username": "admin' OR '1'='1", "bio": "Security Audit" },
  "ip": "198.51.100.42"
}</textarea>
          <div class="test-actions">
            <button class="btn-run" onclick="executeTest('/api/defend', 'POST', 'defend-payload', 'defend-resp', 'defend-status')">
              ⚡ Execute Test
            </button>
            <span class="resp-badge" id="defend-status"></span>
          </div>
        </div>
        <div>
          <div class="code-box">
            <div class="code-tabs">
              <div class="tab-btn-group">
                <button class="tab-btn active">cURL</button>
              </div>
              <button class="copy-btn" onclick="copySnippet('curl-defend')">📋 Copy</button>
            </div>
            <pre id="curl-defend">curl -X POST "http://localhost:3000/api/defend" \\
  -H "Content-Type: application/json" \\
  -H "x-vault-key: YOUR_KEY" \\
  -d '{"method":"POST","path":"/api/users","body":{"bio":"test"}}'</pre>
          </div>
          <div class="section-title">Live Response Output</div>
          <div class="code-box">
            <pre id="defend-resp">// Response will appear here after clicking 'Execute Test'...</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- ENDPOINT: POST /api/payment/verify-webhook -->
    <div class="endpoint-card" id="ep-payment-webhook">
      <div class="ep-header">
        <div class="ep-route">
          <span class="badge-method badge-post">POST</span>
          <span class="ep-path">/api/payment/verify-webhook</span>
          <span class="ep-title">Multi-Gateway Webhook HMAC & Replay Shield</span>
        </div>
        <span class="ep-lock">🔒 VAULT KEY</span>
      </div>
      <div class="ep-body">
        <div>
          <p class="ep-desc">
            Authenticates webhooks from Stripe, Paystack, Flutterwave, Square, and PayPal. Enforces cryptographic HMAC signature verification and rejects expired replay-attack timestamps.
          </p>
          <div class="section-title">Request Payload (JSON)</div>
          <textarea class="payload-editor" id="webhook-payload">{
  "gateway": "stripe",
  "signature": "t=1700000000,v1=test_sig",
  "payload": {
    "id": "evt_1001",
    "type": "payment_intent.succeeded"
  }
}</textarea>
          <div class="test-actions">
            <button class="btn-run" onclick="executeTest('/api/payment/verify-webhook', 'POST', 'webhook-payload', 'webhook-resp', 'webhook-status')">
              ⚡ Execute Test
            </button>
            <span class="resp-badge" id="webhook-status"></span>
          </div>
        </div>
        <div>
          <div class="code-box">
            <div class="code-tabs">
              <div class="tab-btn-group">
                <button class="tab-btn active">Node.js</button>
              </div>
              <button class="copy-btn" onclick="copySnippet('node-webhook')">📋 Copy</button>
            </div>
            <pre id="node-webhook">const res = await fetch("http://localhost:3000/api/payment/verify-webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-vault-key": "YOUR_KEY" },
  body: JSON.stringify({ gateway: "stripe", signature: sig, payload })
});
const data = await res.json();</pre>
          </div>
          <div class="section-title">Live Response Output</div>
          <div class="code-box">
            <pre id="webhook-resp">// Response will appear here...</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- ENDPOINT: POST /api/payment/tokenize-card -->
    <div class="endpoint-card" id="ep-payment-tokenize">
      <div class="ep-header">
        <div class="ep-route">
          <span class="badge-method badge-post">POST</span>
          <span class="ep-path">/api/payment/tokenize-card</span>
          <span class="ep-title">Carding Velocity & PCI Tokenization Shield</span>
        </div>
        <span class="ep-lock">🔒 VAULT KEY</span>
      </div>
      <div class="ep-body">
        <div>
          <p class="ep-desc">
            Validates cards with the Luhn algorithm, limits rapid automated carding tests, blocks fractional-cent salami slicing, scans for Magecart scripts, and auto-masks PAN.
          </p>
          <div class="section-title">Request Payload (JSON)</div>
          <textarea class="payload-editor" id="card-payload">{
  "pan": "4532000000000000",
  "amount": 49.99,
  "currency": "USD",
  "ip": "203.0.113.19"
}</textarea>
          <div class="test-actions">
            <button class="btn-run" onclick="executeTest('/api/payment/tokenize-card', 'POST', 'card-payload', 'card-resp', 'card-status')">
              ⚡ Execute Test
            </button>
            <span class="resp-badge" id="card-status"></span>
          </div>
        </div>
        <div>
          <div class="section-title">Live Response Output</div>
          <div class="code-box">
            <pre id="card-resp">// Response will appear here...</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- ENDPOINT: POST /api/inspect-url/zero-vuln -->
    <div class="endpoint-card" id="ep-inspect-zero">
      <div class="ep-header">
        <div class="ep-route">
          <span class="badge-method badge-post">POST</span>
          <span class="ep-path">/api/inspect-url/zero-vuln</span>
          <span class="ep-title">360-Degree Zero-Vulnerability Security Audit</span>
        </div>
        <span class="ep-lock">🔒 VAULT KEY</span>
      </div>
      <div class="ep-body">
        <div>
          <p class="ep-desc">
            Performs an end-to-end security posture evaluation of any public domain or endpoint. Inspects HSTS, Content-Security-Policy, anti-clickjacking headers, TLS encryption, and cookie security flags.
          </p>
          <div class="section-title">Request Payload (JSON)</div>
          <textarea class="payload-editor" id="url-payload">{
  "url": "https://example.com"
}</textarea>
          <div class="test-actions">
            <button class="btn-run" onclick="executeTest('/api/inspect-url/zero-vuln', 'POST', 'url-payload', 'url-resp', 'url-status')">
              ⚡ Execute Test
            </button>
            <span class="resp-badge" id="url-status"></span>
          </div>
        </div>
        <div>
          <div class="section-title">Live Response Output</div>
          <div class="code-box">
            <pre id="url-resp">// Response will appear here...</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- ENDPOINT: GET /api/reports/latest -->
    <div class="endpoint-card" id="ep-reports-latest">
      <div class="ep-header">
        <div class="ep-route">
          <span class="badge-method badge-get">GET</span>
          <span class="ep-path">/api/reports/latest</span>
          <span class="ep-title">Latest Automated AI Security Intelligence Report</span>
        </div>
        <span class="ep-lock">🔒 VAULT KEY</span>
      </div>
      <div class="ep-body">
        <div>
          <p class="ep-desc">
            Returns the latest automated 1-hour or 24-hour executive AI threat intelligence report detailing attack metrics, high-threat incident logs, and CVE mitigations.
          </p>
          <div class="test-actions">
            <button class="btn-run" onclick="executeTest('/api/reports/latest', 'GET', null, 'rep-resp', 'rep-status')">
              ⚡ Fetch Latest Report
            </button>
            <span class="resp-badge" id="rep-status"></span>
          </div>
        </div>
        <div>
          <div class="section-title">Live Response Output</div>
          <div class="code-box">
            <pre id="rep-resp">// Response will appear here...</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- ENDPOINT: GET /health -->
    <div class="endpoint-card" id="ep-health">
      <div class="ep-header">
        <div class="ep-route">
          <span class="badge-method badge-get">GET</span>
          <span class="ep-path">/health</span>
          <span class="ep-title">Public Health & Uptime Ping</span>
        </div>
        <span class="ep-public">🌐 PUBLIC</span>
      </div>
      <div class="ep-body">
        <div>
          <p class="ep-desc">
            Returns current node health, process uptime, memory consumption, and active firewall operational status. No authentication required.
          </p>
          <div class="test-actions">
            <button class="btn-run" onclick="executeTest('/health', 'GET', null, 'health-resp', 'health-status')">
              ⚡ Ping Health
            </button>
            <span class="resp-badge" id="health-status"></span>
          </div>
        </div>
        <div>
          <div class="section-title">Live Response Output</div>
          <div class="code-box">
            <pre id="health-resp">// Response will appear here...</pre>
          </div>
        </div>
      </div>
    </div>

  </main>

  <script>
    // Load stored key
    document.addEventListener("DOMContentLoaded", () => {
      const stored = localStorage.getItem("fortress_vault_token");
      if (stored) {
        document.getElementById("userVaultKey").value = stored;
      }
    });

    function saveVaultKey() {
      const key = document.getElementById("userVaultKey").value.trim();
      localStorage.setItem("fortress_vault_token", key);
      alert("Vault Key saved for interactive API testing!");
    }

    function getKey() {
      return document.getElementById("userVaultKey").value.trim() || localStorage.getItem("fortress_vault_token") || "";
    }

    async function executeTest(url, method, payloadId, respId, statusId) {
      const respEl = document.getElementById(respId);
      const statusEl = document.getElementById(statusId);
      respEl.textContent = "Connecting to " + url + "...";
      statusEl.style.display = "none";

      const headers = { "Content-Type": "application/json" };
      const key = getKey();
      if (key) {
        headers["x-vault-key"] = key;
      }

      const opts = { method, headers };
      if (payloadId) {
        try {
          const val = document.getElementById(payloadId).value;
          JSON.parse(val); // validate json
          opts.body = val;
        } catch (e) {
          respEl.textContent = "Error: Invalid JSON payload in editor: " + e.message;
          return;
        }
      }

      const startTime = performance.now();
      try {
        const res = await fetch(url, opts);
        const elapsed = Math.round(performance.now() - startTime);
        const data = await res.json();
        
        statusEl.textContent = res.status + " " + res.statusText + " (" + elapsed + "ms)";
        statusEl.className = "resp-badge " + (res.status === 200 || res.status === 201 ? "status-200" : res.status === 401 ? "status-401" : "status-403");
        statusEl.style.display = "inline-block";

        respEl.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        respEl.textContent = "Request failed: " + err.message;
      }
    }

    function filterNav() {
      const q = document.getElementById("searchFilter").value.toLowerCase();
      const items = document.querySelectorAll("#navList li");
      items.forEach(li => {
        if (li.classList.contains("nav-cat")) return;
        const txt = li.textContent.toLowerCase();
        li.style.display = txt.includes(q) ? "" : "none";
      });
    }

    function copySnippet(id) {
      const txt = document.getElementById(id).textContent;
      navigator.clipboard.writeText(txt);
      alert("Code snippet copied to clipboard!");
    }

    function showPostmanGuide() {
      alert("To import into Postman:\n\n1. Download openapi.json using the button on this page.\n2. Open Postman -> Click 'Import' in the top left.\n3. Drag and drop the downloaded openapi.json file.\n4. All endpoints and schemas will be imported with automated test headers!");
    }
  </script>
</body>
</html>`;
}

export default router;

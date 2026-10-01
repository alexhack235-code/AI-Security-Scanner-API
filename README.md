# 🛡️ FORTRESS CLOUD DEFENDER v3.5 (Enterprise Edition)

An always-active, military-grade **API Defense Firewall (WAF)** and **Deep AI Vulnerability Scanner** powered by **Google Gemini 3.8 Flash** and a sub-2ms in-memory pattern shield.

---

## ⚡ Multi-Tier Defense Architecture

```
Incoming Request
      │
      ▼
[ LAYER 0: IP Auto-Jail (Fail2Ban) ] ────(If Jailed)───▶ 403 FORBIDDEN (<0.1ms)
      │ (Clean IP)
      ▼
[ LAYER 1: In-Memory Fast Kill Shield ] ──(If Attack)──▶ 403 BLOCKED (<2ms)
      │  • XSS, SQLi, NoSQLi, Traversal, Proto Pollution, Command Injection
      │ (Clean Syntax)
      ▼
[ LAYER 2: Business Logic & Financial ] ──(If Bypass)──▶ 403 BLOCKED (<5ms)
      │  • Price/Total manipulation on /pay & /checkout routes
      │  • Negative/Float item quantities & cart bypasses
      │  • Webhook missing cryptographic signatures
      │ (Clean Logic)
      ▼
[ LAYER 3: Gemini 3.8 Flash Deep AI ] ───(If Breach)──▶ 403 BLOCKED (Neural SAST)
      │  • Race conditions, authorization bypasses, multi-step flaws
      ▼
✅ ALLOW (Request Forwarded to Destination Backend)
```

---

## 🚀 Key Upgrades in v3.5

1. **Sub-2ms In-Memory Shield (Layer 1 & 2)**:
   - Instant kill on malicious payloads (XSS, SQLi, path traversal, prototype pollution) in under 2ms.
   - Zero LLM tokens consumed for obvious attacks.
2. **E-Commerce & Financial Integrity Engine**:
   - Detects client-side price/total tampering on payment endpoints (`/pay`, `/checkout`, `/order`).
   - Blocks negative/invalid quantities and unsigned payment webhooks.
3. **Automated IP Auto-Jail (Fail2Ban)**:
   - Critical attacks instantly ban the offending IP for 24 hours.
   - Jailed IPs are dropped at the first TCP/Express middleware in 0.05ms.
4. **Web Weakness & Bug Detector (`POST /api/inspect-url`)**:
   - Audits external URLs and websites for missing security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options), permissive CORS, and server information leaks.
5. **Real-Time SOC Web Dashboard (`GET /dashboard`)**:
   - Cyberpunk dark-mode web console.
   - Real-time threat feed, live blocked attack telemetry, and interactive attack testing simulator.
6. **Gemini 3.8 Flash Deep Neural Engine**:
   - Powered by Gemini 3.8 Flash with automatic multi-model zero-downtime failover to `gemini-3.7-flash` and `gemini-3.6-flash`.

---

## 📦 Getting Started

### 1. Setup Environment
```bash
# Add your Gemini API key to .env
GEMINI_API_KEY=your_key_here
PORT=4000
GEMINI_MODEL=gemini-3.8-flash
```

### 2. Start Server
- **Development (with hot reload)**:
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```
- **Run Cloud Defender Test Suite**:
  ```bash
  npm test
  ```

---

## 📡 API Reference & Endpoints

| Endpoint | Method | Speed | Description |
|---|---|---|---|
| `/dashboard` | `GET` | Instant | Interactive Web SOC Dashboard & Attack Simulator |
| `/health` | `GET` | <1ms | Operational status & shield diagnostics |
| `/api/defend` | `POST` | <2ms | Cloud Defender: 3-tier real-time request inspection |
| `/api/scan` | `POST` | ~1.5s | Deep Code SAST: Gemini AI vulnerability scanner |
| `/api/inspect-url` | `POST` | ~500ms | Web Weakness Bug Detector: Security headers audit |
| `/api/jail` | `GET` | <1ms | Live Fail2Ban banned IP list & threat metrics |
| `/api/jail/unban` | `POST` | <1ms | Release an IP from the auto-jail |

---

## 🧪 Quick Test Examples

### 1. Test Price Manipulation Block (<2ms)
```bash
curl -X POST http://localhost:4000/api/defend \
  -H "Content-Type: application/json" \
  -d '{"path": "/api/checkout", "body": {"item": "shoes", "total": 0.99}}'
```

### 2. Test XSS Instant Kill (<2ms)
```bash
curl -X POST http://localhost:4000/api/defend \
  -H "Content-Type: application/json" \
  -d '{"path": "/api/comment", "body": {"text": "<script>alert(1)</script>"}}'
```

### 3. Audit a Website's Security Weaknesses
```bash
curl -X POST http://localhost:4000/api/inspect-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'
```

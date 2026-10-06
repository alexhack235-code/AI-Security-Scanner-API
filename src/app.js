import express from "express";
import helmet from "helmet";
import { ipJailMiddleware } from "./middleware/ipJail.js";
import { corsMiddleware } from "./middleware/cors.js";
import { rateLimiterMiddleware } from "./middleware/rateLimiter.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

import healthRouter from "./routes/health.js";
import scanRouter from "./routes/scan.js";
import defendRouter from "./routes/defend.js";
import jailRouter from "./routes/jail.js";
import inspectUrlRouter from "./routes/inspectUrl.js";
import dashboardRouter from "./routes/dashboard.js";
import paymentRouter from "./routes/payment.js";
import bountyRouter from "./routes/bounty.js";
import adminRouter from "./routes/admin.js";
import canaryRouter from "./routes/canary.js";
import powRouter from "./routes/pow.js";
import patchRouter from "./routes/patch.js";
import profilerRouter from "./routes/profiler.js";
import signerRouter from "./routes/signer.js";
import unifiedRouter from "./routes/unified.js";
import vaultRouter from "./routes/vault.js";
import reportsRouter from "./routes/reports.js";
import { vaultGatekeeper } from "./middleware/vaultGatekeeper.js";
import { ReconTrapService } from "./services/reconTrapService.js";
import { aiReportService } from "./services/aiReportService.js";

const app = express();

// Initialize AI Security Intelligence Scheduled Reporting Engine
aiReportService.init();

// Trust first proxy if behind Reverse Proxy (Nginx, Cloudflare, Vercel)
app.set("trust proxy", 1);
app.disable("x-powered-by"); // Stealth: do not disclose Express

// LAYER 0: IP Auto-Jail (Fail2Ban - Drops bad actors in 0.05ms)
app.use(ipJailMiddleware);

// LAYER 0B: Autonomous Bot & Reconnaissance Honey-Trap (Catches probes for .env, .git, admin)
app.use((req, res, next) => {
  if (ReconTrapService.isReconBait(req.path)) {
    return ReconTrapService.triggerTrap({
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "",
      method: req.method,
      res,
    });
  }
  next();
});

// ANTI-PROBING & STEALTH SHIELD: Block aggressive scanning tools & reconnaissance bots
app.use((req, res, next) => {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  const hostileScanners = ["sqlmap", "nikto", "masscan", "zgrab", "gobuster", "dirbuster", "wpscan"];
  if (hostileScanners.some((bot) => ua.includes(bot))) {
    return res.status(403).json({
      fortress_status: "BLOCKED",
      threat_level: "CRITICAL",
      reason: `Automated reconnaissance scanner detected: '${ua.slice(0, 40)}'`,
      action: "DROP_CONNECTION",
    });
  }
  next();
});

// WALL 1: Security Headers & CORS
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);
app.use(corsMiddleware);

// JSON body parser with strict size ceiling
app.use(express.json({ limit: "512kb" }));

// WALL 2: Rate Limiting Shield
app.use(rateLimiterMiddleware);

// Public Health Check (Must stay open for monitoring pings)
app.use("/health", healthRouter);

// Serve Client-Side SDK
app.use(express.static("public"));

// WALL 3: GLOBAL VAULT GATEKEEPER (Requires Master Pass or Client Key for all endpoints below)
app.use(vaultGatekeeper);

// VAULT KEYMASTER API (Issue, revoke, and verify keys)
app.use("/api/vault", vaultRouter);

// Web SOC Dashboard (Protected by Vault Gatekeeper)
app.use("/dashboard", dashboardRouter);

// Root Welcome Endpoint
app.get("/", (req, res) => {
  res.json({
    name: "FORTRESS CLOUD DEFENDER v3.5 (Enterprise)",
    tagline: "Always-Active Heavy Military-Grade API Security Wall & Scanner",
    vault_status: "AUTHENTICATED",
    authenticated_user: req.vaultUser ? req.vaultUser.name : "ANONYMOUS",
    authenticated_role: req.vaultUser ? req.vaultUser.role : "NONE",
    dashboard: "/dashboard",
    endpoints: {
      health: "GET /health",
      dashboard: "GET /dashboard",
      ai_reports: "GET /api/reports/latest & POST /api/reports/generate-now",
      vault_management: "GET & POST /api/vault/keys",
      defend_request: "POST /api/defend (Autonomous E-Commerce & Fast Shield)",
      admin_handshake_issue: "POST /api/admin/handshake/issue (Time-Bombed One-Way Ticket)",
      admin_handshake_claim: "POST /api/admin/handshake/claim (Single-Use Admin Status)",
      payment_security: "POST /api/payment/verify-webhook (Stripe/Paystack/Flutterwave)",
      bounty_leaks: "POST /api/bounty/scan-leaks (Data Exposure & HackerOne Reports)",
      canary_traps: "POST /api/canary/generate & /tripwire (Honeytoken Credential Traps)",
      pow_bot_shield: "GET /api/pow/challenge & /verify (Zero-Friction Anti-DDoS)",
      virtual_patching: "GET /api/patch/list & POST /apply (Self-Healing Runtime Shield)",
      threat_profiler: "GET /api/threat-profile/:ip (MITRE ATT&CK Dossier)",
      request_signer: "POST /api/signer/session & /verify (Client Anti-Tamper SDK)",
      scan_code: "POST /api/scan (SAST Vulnerability Scanner)",
      inspect_url: "POST /api/inspect-url (Web Weakness & Header Auditor)",
      jail_telemetry: "GET /api/jail (Fail2Ban & Threat Intelligence)",
    },
    status: "ARMED_AND_ACTIVE",
  });
});

// CLOUD DEFENDER: Always-Active Fast In-Memory + AI Request Wall (<50ms)
app.use("/api/defend", defendRouter);

// ADMIN TELEMETRY & EPHEMERAL HANDSHAKE PORTAL (One-Way 20s/60s Auto-Expiring)
app.use("/api/admin", adminRouter);

// PAYMENT GATEWAY FORTRESS: Stripe, Paystack, Flutterwave HMAC & Idempotency
app.use("/api/payment", paymentRouter);

// CANARY HONEYTOKENS: Active Stolen Credential Traps
app.use("/api/canary", canaryRouter);

// CRYPTOGRAPHIC PROOF-OF-WORK: Anti-DDoS & Bot Shield
app.use("/api/pow", powRouter);

// AUTONOMOUS VIRTUAL PATCHING: Self-Healing In-Memory WAF Rules
app.use("/api/patch", patchRouter);

// THREAT ACTOR PROFILER: Behavioral DNA & MITRE ATT&CK Matrix
app.use("/api/threat-profile", profilerRouter);

// CLIENT REQUEST SIGNER: Anti-Tamper & Burp Suite Shield
app.use("/api/signer", signerRouter);

// SENSITIVE DATA EXPOSURE & BUG BOUNTY GENERATOR
app.use("/api/bounty", bountyRouter);

// AI THREAT INTELLIGENCE & SCHEDULED REPORTS
app.use("/api/reports", reportsRouter);

// WEB WEAKNESS BUG DETECTOR: Security Header & Vulnerability Auditor
app.use("/api/inspect-url", inspectUrlRouter);

// JAIL & THREAT INTELLIGENCE
app.use("/api/jail", jailRouter);

// CODE SAST SCANNER: Gemini Deep Neural Code Auditor
app.use("/api/scan", authMiddleware, scanRouter);

// ALL-IN-ONE UNIFIED MASTER ENDPOINT (Auto-detects payload)
app.use("/api", unifiedRouter);

// 404 Route Catch-All
app.use((req, res) => {
  res.status(404).json({
    fortress_status: "REJECTED",
    verdict: `Endpoint ${req.method} ${req.originalUrl} not recognized.`,
  });
});

// Centralized Error Handling
app.use(errorHandler);

export default app;

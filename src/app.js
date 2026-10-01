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

const app = express();

// Trust first proxy if behind Reverse Proxy (Nginx, Cloudflare, Vercel)
app.set("trust proxy", 1);

// LAYER 0: IP Auto-Jail (Fail2Ban - Drops bad actors in 0.05ms)
app.use(ipJailMiddleware);

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

// Web SOC Dashboard
app.use("/dashboard", dashboardRouter);

// Health Check (Publicly accessible)
app.use("/health", healthRouter);

// Root Welcome Endpoint
app.get("/", (req, res) => {
  res.json({
    name: "FORTRESS CLOUD DEFENDER v3.5 (Enterprise)",
    tagline: "Always-Active Heavy Military-Grade API Security Wall & Scanner",
    dashboard: "/dashboard",
    endpoints: {
      health: "GET /health",
      dashboard: "GET /dashboard",
      defend_request: "POST /api/defend (Autonomous E-Commerce & Fast Shield)",
      payment_security: "POST /api/payment/verify-webhook (Stripe/Paystack/Flutterwave)",
      bounty_leaks: "POST /api/bounty/scan-leaks (Data Exposure & HackerOne Reports)",
      scan_code: "POST /api/scan (SAST Vulnerability Scanner)",
      inspect_url: "POST /api/inspect-url (Web Weakness & Header Auditor)",
      jail_telemetry: "GET /api/jail (Fail2Ban & Threat Intelligence)",
    },
    status: "ARMED_AND_ACTIVE",
  });
});

// CLOUD DEFENDER: Always-Active Fast In-Memory + AI Request Wall (<50ms)
app.use("/api/defend", defendRouter);

// PAYMENT GATEWAY FORTRESS: Stripe, Paystack, Flutterwave HMAC & Idempotency
app.use("/api/payment", paymentRouter);

// SENSITIVE DATA EXPOSURE & BUG BOUNTY GENERATOR
app.use("/api/bounty", bountyRouter);

// WEB WEAKNESS BUG DETECTOR: Security Header & Vulnerability Auditor
app.use("/api/inspect-url", inspectUrlRouter);

// JAIL & THREAT INTELLIGENCE
app.use("/api/jail", jailRouter);

// CODE SAST SCANNER: Gemini Deep Neural Code Auditor
app.use("/api/scan", authMiddleware, scanRouter);

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

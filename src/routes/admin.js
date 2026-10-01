import express from "express";
import { ephemeralAuth } from "../services/ephemeralAuth.js";
import { jailService } from "../services/jailService.js";
import { SecretRedactor } from "../services/secretRedactor.js";

const router = express.Router();

// Issue a time-bombed one-way handshake ticket (default 60s, or specify ttl_seconds: 20)
router.post("/handshake/issue", (req, res) => {
  const { ttl_seconds = 60, scope = "ADMIN_TELEMETRY" } = req.body || {};
  const ticket = ephemeralAuth.issueToken({ ttlSeconds: Number(ttl_seconds), scope });
  return res.status(200).json(ticket);
});

// Claim the handshake ticket to view live admin status (One-way single use)
router.post("/handshake/claim", (req, res) => {
  const { token } = req.body || {};

  const verification = ephemeralAuth.claimToken(token, "ADMIN_TELEMETRY");
  if (!verification.valid) {
    return res.status(403).json({
      fortress_status: "REJECTED",
      threat_level: "HIGH",
      reason: verification.reason,
      action: "LOCKDOWN_API_ACCESS",
      verdict: "One-way handshake failed or timed out. Connection closed.",
    });
  }

  // Sanitize and redact all data before sending to admin dashboard
  const metrics = jailService.getMetrics();
  const sanitizedReport = SecretRedactor.sanitize({
    status: "AUTHORIZED",
    service: "FORTRESS Enterprise Admin Monitor",
    timestamp: new Date().toISOString(),
    metrics: metrics.stats,
    banned_ips: jailService.getBannedList(),
    recent_events: metrics.recentThreats,
    stealth_mode: "ENABLED",
    message: "Handshake verified. Access granted for this one-time transmission.",
  });

  return res.status(200).json(sanitizedReport);
});

export default router;

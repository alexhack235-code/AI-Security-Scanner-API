import express from "express";
import { canaryEngine } from "../services/canaryEngine.js";

const router = express.Router();

// Generate an active Canary Honeytoken
router.post("/generate", (req, res) => {
  const { type = "aws", context = {} } = req.body || {};
  const tokenRecord = canaryEngine.generateHoneytoken(type, context);
  return res.status(201).json({
    success: true,
    message: `Active Canary Honeytoken created for type '${type}'.`,
    honeytoken: tokenRecord,
  });
});

// Canary Tripwire Endpoint (Attacker attempts to query or test stolen bait)
router.post("/tripwire", (req, res) => {
  const { token } = req.body || {};
  const clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  const clientPort = req.headers["x-forwarded-port"] || req.socket?.remotePort || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const result = canaryEngine.tripwire({
    token: token || JSON.stringify(req.body || {}),
    clientIp,
    clientPort,
    userAgent,
    path: req.originalUrl,
    method: req.method,
    headers: req.headers,
  });

  if (result.matched) {
    return res.status(403).json({
      fortress_status: "TRIPPED",
      threat_level: "CRITICAL",
      alarm: "EMERGENCY_BREACH_DETECTED",
      details: result,
    });
  }

  return res.status(200).json({
    status: "OK",
    message: "No canary honeytoken matched.",
  });
});

// Out-of-Band Canary Beacon Callback Endpoint (DNS/HTTP resolution)
router.all("/beacon/:id", (req, res) => {
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  const result = canaryEngine.triggerBeacon({
    beaconId: req.params.id,
    clientIp,
    userAgent,
    headers: req.headers,
  });

  // Return realistic mock telemetry tracking ping or 1x1 pixel
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Beacon-Status", "RECORDED");
  return res.status(200).json({
    telemetry: "ACKNOWLEDGED",
    epoch_timestamp: Date.now(),
    node: "corp-telemetry-collector-01",
  });
});

// Telemetry of active canary traps
router.get("/status", (req, res) => {
  return res.status(200).json({
    service: "FORTRESS Canary Honeytoken & Credential Trap Engine",
    telemetry: canaryEngine.getTelemetry(),
  });
});

export default router;

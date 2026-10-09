import express from "express";
import { jailService } from "../services/jailService.js";
import { requireMasterAdmin } from "../middleware/requireRole.js";
import net from "net";

const router = express.Router();

// Jail telemetry exposes every tenant's IPs/evidence and unban can release attackers: MASTER_ADMIN only
router.use(requireMasterAdmin);

// List currently jailed IPs and global attack telemetry
router.get("/", (req, res) => {
  const metrics = jailService.getMetrics();
  return res.status(200).json({
    status: "ACTIVE",
    service: "FORTRESS Fail2Ban & Threat Intelligence",
    banned_ips: jailService.getBannedList(),
    metrics: metrics.stats,
    recent_events: metrics.recentThreats,
  });
});

// Unban an IP address
router.post("/unban", (req, res) => {
  const { ip } = req.body || {};
  if (!ip || typeof ip !== "string" || !net.isIP(ip.trim())) {
    return res.status(400).json({ error: "Missing or invalid 'ip' in request body." });
  }

  const removed = jailService.unbanIp(ip);
  return res.status(200).json({
    success: true,
    ip,
    message: removed ? `IP ${ip} has been released from FORTRESS Jail.` : `IP ${ip} was not currently jailed.`,
  });
});

export default router;

import { jailService } from "../services/jailService.js";

export const ipJailMiddleware = (req, res, next) => {
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (jailService.isBanned(clientIp)) {
    const banInfo = jailService.getBanInfo(clientIp);
    jailService.recordEvent({
      ip: clientIp,
      wall: "LAYER 0: IP Jail",
      threat_level: "CRITICAL",
      reason: `Blocked by active IP ban: ${banInfo?.reason || "Hostile traffic"}`,
      action: "BLOCK",
      path: req.originalUrl,
    });

    return res.status(403).json({
      fortress_status: "BREACHED",
      threat_level: "CRITICAL",
      action: "BLOCK",
      wall_failed: "LAYER 0: IP Auto-Jail",
      reason: `Your IP address has been jailed due to malicious activity: ${banInfo?.reason || "Attack detected"}`,
      banned_until: banInfo ? new Date(banInfo.expiresAt).toISOString() : "24h",
      verdict: "Connection dropped by FORTRESS Auto-Jail.",
    });
  }

  req.clientIp = clientIp;
  next();
};

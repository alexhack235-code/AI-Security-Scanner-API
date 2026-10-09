import { jailService } from "../services/jailService.js";
import { honeyMazeService } from "../services/honeyMazeService.js";
import { getClientIp } from "../utils/clientIp.js";

export const ipJailMiddleware = async (req, res, next) => {
  const clientIp = getClientIp(req);

  // Uptime monitoring ping exemption
  if (req.path === "/health" || req.originalUrl === "/health") {
    return next();
  }

  // Deception Shadow-Pass: Trapped attackers browsing the Honey-Maze or OOB beacons receive 200 OK deception
  const targetPath = req.path || req.originalUrl || "";
  if (
    honeyMazeService.isMazePath(targetPath) ||
    targetPath.startsWith("/api/canary/beacon") ||
    targetPath === "/api/canary/tripwire"
  ) {
    req.clientIp = clientIp;
    return next();
  }

  const banned = await jailService.isBannedAsync(clientIp);
  if (banned) {
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

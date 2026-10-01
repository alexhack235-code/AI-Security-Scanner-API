// In-memory IP Auto-Jail (Fail2Ban) & Threat Metrics Engine

class JailService {
  constructor() {
    this.bannedIps = new Map(); // ip -> { ip, port, reason, bannedAt, expiresAt, strikes, wall }
    this.threatLog = []; // list of recent events { ip, port, wall, threat_level, reason, action, timestamp, user_agent, evidence }
    this.maxLogSize = 200;
    this.stats = {
      totalRequests: 0,
      totalBlocked: 0,
      totalBanned: 0,
      attacksByWall: {
        "LAYER 0: IP Jail": 0,
        "LAYER 1: Instant Kill": 0,
        "LAYER 1: SSRF_CLOUD_METADATA": 0,
        "LAYER 2: Business Logic": 0,
        "LAYER 3: Deep AI": 0,
        "WALL 4: Input Validation": 0,
      },
    };
  }

  isBanned(ip) {
    if (!ip) return false;
    const record = this.bannedIps.get(ip);
    if (!record) return false;

    // Check expiration
    if (Date.now() > record.expiresAt) {
      this.bannedIps.delete(ip);
      return false;
    }
    return true;
  }

  getBanInfo(ip) {
    return this.bannedIps.get(ip) || null;
  }

  banIp(ip, reason, wall = "LAYER 1: Instant Kill", durationMs = 24 * 60 * 60 * 1000, port = "unknown") {
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
      // Don't ban loopback in dev
      return;
    }

    const now = Date.now();
    const existing = this.bannedIps.get(ip);
    const strikes = (existing ? existing.strikes : 0) + 1;

    this.bannedIps.set(ip, {
      ip,
      port,
      reason,
      wall,
      strikes,
      bannedAt: new Date(now).toISOString(),
      expiresAt: now + durationMs,
      durationHours: durationMs / (60 * 60 * 1000),
    });

    this.stats.totalBanned += 1;
    console.warn(`🚫 [IP AUTO-JAILED] ${ip}:${port} banned for ${durationMs / 3600000}h | Reason: ${reason} | Wall: ${wall}`);
  }

  unbanIp(ip) {
    return this.bannedIps.delete(ip);
  }

  recordEvent({ ip, port = "unknown", wall, threat_level, reason, action, path = "", user_agent = "unknown", evidence = "" }) {
    this.stats.totalRequests += 1;
    if (action === "BLOCK" || action === "BAN_IP_24H") {
      this.stats.totalBlocked += 1;
      if (this.stats.attacksByWall[wall] !== undefined) {
        this.stats.attacksByWall[wall] += 1;
      } else {
        this.stats.attacksByWall[wall] = 1;
      }
    }

    this.threatLog.unshift({
      id: "ev_" + Math.random().toString(36).substring(2, 9),
      ip: ip || "unknown",
      port: port || "unknown",
      wall: wall || "NONE",
      threat_level: threat_level || "NONE",
      reason: reason || "",
      action: action || "ALLOW",
      path: path || "",
      user_agent: user_agent || "unknown",
      evidence: evidence || "",
      timestamp: new Date().toISOString(),
    });

    if (this.threatLog.length > this.maxLogSize) {
      this.threatLog.pop();
    }
  }

  getBannedList() {
    const now = Date.now();
    const list = [];
    for (const [ip, rec] of this.bannedIps.entries()) {
      if (now <= rec.expiresAt) {
        list.push(rec);
      } else {
        this.bannedIps.delete(ip);
      }
    }
    return list;
  }

  getMetrics() {
    return {
      stats: this.stats,
      bannedCount: this.bannedIps.size,
      recentThreats: this.threatLog.slice(0, 50),
    };
  }
}

export const jailService = new JailService();

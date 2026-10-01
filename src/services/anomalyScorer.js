import { jailService } from "./jailService.js";

/**
 * Advanced Anomaly Threat Scoring, Honeypot Traps & JSON Depth Guard
 */
export class AnomalyScorer {
  constructor() {
    this.threatScores = new Map(); // ip -> { score, firstSeen, lastSeen }
    this.decayWindowMs = 10 * 60 * 1000; // 10 minute rolling score
    this.banThreshold = 100; // 100 points = instant jail
  }

  /**
   * Honeypot / Canary parameter detection
   * Parameters only scanned for by malicious fuzzers and bots
   */
  static checkHoneypots(body) {
    if (!body || typeof body !== "object") return null;

    const honeypotFields = [
      "__admin",
      "is_admin",
      "is_superuser",
      "role_override",
      "debug_mode",
      "dump_memory",
      "exec_command",
      "system_eval",
      "internal_token",
      "bypass_auth",
    ];

    const bodyKeys = Object.keys(body).map((k) => k.toLowerCase());
    const triggered = honeypotFields.find((h) => bodyKeys.includes(h));

    if (triggered) {
      return {
        triggered: true,
        field: triggered,
        threat: "CRITICAL",
        reason: `Honeypot Canary Trap Triggered: forbidden reconnaissance field '${triggered}' submitted.`,
        fix: "Never accept administrative privilege flags directly from client-controlled payloads.",
      };
    }

    return null;
  }

  /**
   * JSON Nesting Depth Guard (Billion Laughs / Memory Exhaustion Protection)
   */
  static calculateObjectDepth(obj, currentDepth = 1) {
    if (currentDepth > 10) return currentDepth; // Fast exit if too deep
    if (typeof obj !== "object" || obj === null) return currentDepth;

    let maxChildDepth = currentDepth;
    for (const val of Object.values(obj)) {
      if (typeof val === "object" && val !== null) {
        const d = this.calculateObjectDepth(val, currentDepth + 1);
        if (d > maxChildDepth) maxChildDepth = d;
      }
    }
    return maxChildDepth;
  }

  /**
   * Accumulates threat points for an IP. Returns whether threshold reached.
   */
  addThreatPoints(ip, points, reason) {
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return { jailed: false, currentScore: 0 };

    const now = Date.now();
    let record = this.threatScores.get(ip);

    if (!record || now - record.lastSeen > this.decayWindowMs) {
      record = { score: 0, firstSeen: now, lastSeen: now };
    }

    record.score += points;
    record.lastSeen = now;
    this.threatScores.set(ip, record);

    if (record.score >= this.banThreshold) {
      jailService.banIp(ip, `Cumulative Threat Score Exceeded (${record.score} pts): ${reason}`, "ANOMALY_ENGINE");
      this.threatScores.delete(ip);
      return { jailed: true, currentScore: record.score };
    }

    return { jailed: false, currentScore: record.score };
  }
}

export const anomalyScorer = new AnomalyScorer();

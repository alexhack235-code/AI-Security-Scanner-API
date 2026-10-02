import crypto from "crypto";
import { jailService } from "./jailService.js";

/**
 * Canary Honeytoken & Credential Trap Engine
 * Generates tracked bait credentials (AWS, Stripe, JWT, Database URIs)
 * When an attacker attempts to use or query a honeytoken, the tripwire triggers,
 * captures attacker forensics, and permanently auto-jails their IP.
 */
class CanaryEngine {
  constructor() {
    this.honeytokens = new Map(); // tokenString -> { id, type, secret, context, issuedAt, expiresAt, tripped: false, trippedEvents: [] }
    this.maxActiveTokens = 500;
  }

  /**
   * Generate an active honeytoken
   * @param {string} type - 'aws' | 'stripe' | 'jwt' | 'database' | 'generic'
   * @param {object} context - extra info (e.g. decoy_order_id, target_path)
   */
  generateHoneytoken(type = "aws", context = {}) {
    const id = "canary_" + crypto.randomBytes(8).toString("hex");
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days lifespan

    let tokenValue = "";
    let metadata = {};

    switch (type.toLowerCase()) {
      case "aws": {
        // Looks like real AWS access key & secret
        const keyId = "AKIA" + crypto.randomBytes(8).toString("hex").toUpperCase();
        const secret = crypto.randomBytes(20).toString("base64");
        tokenValue = keyId;
        metadata = { keyId, secret, arn: `arn:aws:iam::123456789012:user/prod-deployer-${id}` };
        break;
      }

      case "stripe": {
        // Looks like live Stripe restricted secret key
        tokenValue = "sk_live_" + crypto.randomBytes(24).toString("hex");
        metadata = { key: tokenValue, publishable: "pk_live_" + crypto.randomBytes(20).toString("hex") };
        break;
      }

      case "jwt": {
        // Looks like high-privilege administrative JWT
        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(
          JSON.stringify({
            sub: "admin-root",
            role: "SUPER_ADMIN",
            canary_id: id,
            iat: Math.floor(now / 1000),
            exp: Math.floor(expiresAt / 1000),
          })
        ).toString("base64url");
        const sig = crypto.createHmac("sha256", "fortress-canary-key").update(`${header}.${payload}`).digest("base64url");
        tokenValue = `${header}.${payload}.${sig}`;
        metadata = { role: "SUPER_ADMIN", sub: "admin-root" };
        break;
      }

      case "database": {
        // Looks like high-privilege PostgreSQL connection URI
        const dbPass = "FortressPass_" + crypto.randomBytes(6).toString("hex");
        tokenValue = `postgres://app_prod_master:${dbPass}@db-primary-internal.corp:5432/finance_production`;
        metadata = { uri: tokenValue, db: "finance_production" };
        break;
      }

      default: {
        tokenValue = "CANARY_TOKEN_" + crypto.randomBytes(16).toString("hex");
        metadata = { token: tokenValue };
      }
    }

    const record = {
      id,
      type,
      token: tokenValue,
      metadata,
      context,
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      tripped: false,
      trippedEvents: [],
    };

    this.honeytokens.set(tokenValue, record);

    // Evict oldest if limit reached
    if (this.honeytokens.size > this.maxActiveTokens) {
      const oldestKey = this.honeytokens.keys().next().value;
      this.honeytokens.delete(oldestKey);
    }

    return record;
  }

  /**
   * Check if a text or payload contains any known honeytokens
   */
  detectHoneytokens(text) {
    if (!text || typeof text !== "string") return null;
    for (const [token, rec] of this.honeytokens.entries()) {
      if (text.includes(token)) {
        return rec;
      }
    }
    return null;
  }

  /**
   * Trigger the Canary Tripwire alarm
   * @param {object} param0 - { token, clientIp, clientPort, userAgent, path, method, headers }
   */
  tripwire({ token, clientIp = "unknown", clientPort = "unknown", userAgent = "unknown", path = "", method = "POST", headers = {} }) {
    const rec = this.honeytokens.get(token) || this.detectHoneytokens(token);
    if (!rec) {
      return {
        matched: false,
        message: "Token is not a recognized Canary Honeytoken.",
      };
    }

    rec.tripped = true;
    const incidentId = "TRIP_" + crypto.randomBytes(6).toString("hex").toUpperCase();
    const event = {
      incidentId,
      canaryId: rec.id,
      type: rec.type,
      attackerIp: clientIp,
      attackerPort: clientPort,
      userAgent,
      path,
      method,
      trippedAt: new Date().toISOString(),
      lureContext: rec.context,
    };

    rec.trippedEvents.push(event);

    // Auto-jail the attacker IP for 24 hours immediately
    jailService.banIp(clientIp, `Canary Honeytoken Tripped: ${rec.type.toUpperCase()} [${rec.id}]`, "LAYER 1: CANARY_TRIPWIRE", 24 * 3600 * 1000, clientPort);
    jailService.recordEvent({
      ip: clientIp,
      port: clientPort,
      wall: "LAYER 1: CANARY_TRIPWIRE",
      threat_level: "CRITICAL",
      reason: `Attacker attempted to utilize stolen Canary Honeytoken (${rec.type})`,
      action: "BAN_IP_24H",
      path,
      user_agent: userAgent,
      evidence: `Honeytoken ID: ${rec.id} (${rec.type})`,
    });

    return {
      matched: true,
      alarm: "EMERGENCY_BREACH_DETECTED",
      incidentId,
      canary_id: rec.id,
      type: rec.type,
      attacker_ip: clientIp,
      attacker_port: clientPort,
      action: "BAN_IP_24H",
      recommendation: "Attacker has exfiltrated bait credential and attempted usage. Real production assets remain uncompromised.",
    };
  }

  /**
   * Get telemetry of active traps
   */
  getTelemetry() {
    const list = [];
    let trippedCount = 0;
    for (const rec of this.honeytokens.values()) {
      if (rec.tripped) trippedCount++;
      list.push({
        id: rec.id,
        type: rec.type,
        token_sample: rec.token.slice(0, 10) + "..." + rec.token.slice(-6),
        issuedAt: rec.issuedAt,
        tripped: rec.tripped,
        trippedCount: rec.trippedEvents.length,
        context: rec.context,
      });
    }
    return {
      activeTokens: this.honeytokens.size,
      trippedTokens: trippedCount,
      traps: list.slice(-50).reverse(),
    };
  }
}

export const canaryEngine = new CanaryEngine();

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

      case "github": {
        // Looks like active GitHub personal access token (classic or fine-grained)
        tokenValue = "ghp_" + crypto.randomBytes(18).toString("hex");
        metadata = { token: tokenValue, scopes: ["repo", "admin:org", "workflow"] };
        break;
      }

      case "openai":
      case "ai": {
        // Looks like active OpenAI / Anthropic Enterprise API Key
        tokenValue = "sk-proj-" + crypto.randomBytes(32).toString("base64url");
        metadata = { token: tokenValue, org: "org-enterprise-corp-ai" };
        break;
      }

      case "dns":
      case "beacon": {
        // Out-of-band DNS & HTTP Canary Beacon
        const beaconId = id.replace("canary_", "");
        const beaconHost = `beacon-${beaconId}.corp-telemetry.internal`;
        tokenValue = beaconHost;
        metadata = {
          hostname: beaconHost,
          beaconUrl: `/api/canary/beacon/${id}`,
          type: "DNS_OOB_BEACON",
        };
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
   * Alias for generateHoneytoken supporting both (type, context) and ({ type, context })
   */
  generateCanary(typeOrOptions = "aws", maybeContext = {}) {
    if (typeof typeOrOptions === "object" && typeOrOptions !== null) {
      return this.generateHoneytoken(typeOrOptions.type || "aws", typeOrOptions.context || typeOrOptions);
    }
    return this.generateHoneytoken(typeOrOptions, maybeContext);
  }

  detectHoneytokens(text) {
    if (!text || typeof text !== "string" || this.honeytokens.size === 0) return null;

    // Instant prefix / token filter: Bypass full Map traversal for 99.99% of normal traffic
    if (
      !text.includes("AKIA") &&
      !text.includes("sk_live_") &&
      !text.includes("eyJ") &&
      !text.includes("postgres://") &&
      !text.includes("ghp_") &&
      !text.includes("sk-proj-") &&
      !text.includes("beacon-") &&
      !text.includes("corp-telemetry") &&
      !text.includes("CANARY_TOKEN_") &&
      !text.includes("canary_")
    ) {
      return null;
    }

    // Direct token match fast lookup
    const direct = this.honeytokens.get(text);
    if (direct) return direct;

    // Scan Map entries when a token signature substring is detected
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
   * Trigger Out-of-Band Beacon (Attacker machine resolved or pinged beacon)
   */
  triggerBeacon({ beaconId, clientIp = "unknown", userAgent = "unknown", headers = {} }) {
    let rec = null;
    for (const item of this.honeytokens.values()) {
      if (item.id === beaconId || item.id === `canary_${beaconId}` || item.token.includes(beaconId)) {
        rec = item;
        break;
      }
    }

    if (!rec) {
      rec = { id: `beacon_${beaconId}`, type: "dns", context: { note: "Untracked OOB Beacon Ping" } };
    }

    rec.tripped = true;
    const incidentId = "OOB_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    jailService.banIp(clientIp, `Canary OOB Beacon Tripped: [${rec.id}]`, "LAYER 1: CANARY_BEACON", 48 * 3600 * 1000);
    jailService.recordEvent({
      ip: clientIp,
      wall: "LAYER 1: CANARY_BEACON",
      threat_level: "CRITICAL",
      reason: `Attacker machine resolved or pinged Out-of-Band Canary Beacon [${rec.id}]`,
      action: "BAN_IP_48H",
      path: `/api/canary/beacon/${beaconId}`,
      user_agent: userAgent,
      evidence: `Beacon ID: ${beaconId} | ISP/Origin captured!`,
    });

    return {
      matched: true,
      alarm: "EMERGENCY_OOB_BEACON_PINGED",
      incidentId,
      canary_id: rec.id,
      attacker_ip: clientIp,
      action: "BAN_IP_48H",
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

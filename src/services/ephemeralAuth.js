import crypto from "crypto";

/**
 * Ephemeral One-Way Time-Bombed Handshake Engine
 * Generates single-use tokens valid for 20 to 60 seconds.
 * If not claimed within the window, access locks down automatically.
 */
export class EphemeralAuth {
  constructor() {
    this.tokens = new Map(); // token -> { createdAt, expiresAt, scope, claimed }
    this.defaultTtlMs = 60 * 1000; // 60 seconds default (configurable to 20s)
  }

  /**
   * Issue a new one-way ephemeral admission ticket
   * @param {Object} options - { ttlSeconds, scope }
   */
  issueToken({ ttlSeconds = 60, scope = "ADMIN_TELEMETRY" } = {}) {
    const token = "ft_eph_" + crypto.randomBytes(24).toString("hex");
    const now = Date.now();
    const durationMs = Math.max(10, Math.min(300, ttlSeconds)) * 1000; // between 10s and 300s
    const expiresAt = now + durationMs;

    this.tokens.set(token, {
      createdAt: now,
      expiresAt,
      ttlSeconds: durationMs / 1000,
      scope,
      claimed: false,
    });

    return {
      token,
      ttl_seconds: durationMs / 1000,
      expires_at: new Date(expiresAt).toISOString(),
      scope,
      directive: `This handshake token is single-use and will self-destruct in ${durationMs / 1000} seconds. Must be claimed before expiry.`,
    };
  }

  /**
   * Validate and burn the token immediately (One-way single use)
   */
  claimToken(token, requiredScope = null) {
    if (!token) {
      return { valid: false, reason: "Missing ephemeral admission token." };
    }

    const record = this.tokens.get(token);
    if (!record) {
      return { valid: false, reason: "Token not found or already consumed / purged." };
    }

    const now = Date.now();

    // Check expiration
    if (now > record.expiresAt) {
      this.tokens.delete(token);
      return {
        valid: false,
        reason: "Ephemeral token expired. Time window closed to prevent unauthorized reconnaissance.",
      };
    }

    // Check single-use
    if (record.claimed) {
      this.tokens.delete(token);
      return {
        valid: false,
        reason: "One-way token has already been claimed. Replay rejected.",
      };
    }

    // Check scope if required
    if (requiredScope && record.scope !== requiredScope) {
      return { valid: false, reason: "Token scope mismatch." };
    }

    // Burn token immediately
    this.tokens.delete(token);

    return {
      valid: true,
      scope: record.scope,
      message: "Handshake verified and burned successfully.",
    };
  }

  /**
   * Background cleanup of expired tokens
   */
  prune() {
    const now = Date.now();
    for (const [token, rec] of this.tokens.entries()) {
      if (now > rec.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }
}

export const ephemeralAuth = new EphemeralAuth();

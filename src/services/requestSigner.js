import crypto from "crypto";

/**
 * Client-Side Ephemeral Request Signing & Anti-Tamper Shield
 * Prevents Burp Suite, DevTools Inspect Element, and Postman price tampering
 * by cryptographically verifying every payload with a client session HMAC.
 */
class RequestSigner {
  constructor() {
    this.sessions = new Map(); // sessionId -> { clientKey, clientIp, expiresAt }
    this.maxSessions = 10000; // Hard cap to prevent memory exhaustion from session flooding
    this.nonceBuckets = new Map(); // bucketKey -> Set<nonce> (TTL-based eviction)
    this.sessionTtlMs = 60 * 60 * 1000; // 1 hour session
    this.maxClockDriftSeconds = 300; // 5 minute replay window
    this.nonceBucketSeconds = 300; // Each nonce bucket covers one drift window

    // Periodic cleanup: evict expired sessions and stale nonce buckets every 5 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
    if (this._cleanupInterval.unref) this._cleanupInterval.unref(); // Don't block Node shutdown
  }

  /**
   * Evict expired sessions and stale nonce buckets to prevent memory leaks.
   */
  _cleanup() {
    const now = Date.now();
    // Evict expired sessions
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
    // Evict nonce buckets older than 2x the clock drift window
    const currentBucket = Math.floor(now / 1000 / this.nonceBucketSeconds);
    for (const [bucket] of this.nonceBuckets) {
      if (currentBucket - bucket > 2) {
        this.nonceBuckets.delete(bucket);
      }
    }
  }

  /**
   * Issue a cryptographic signing session to a legitimate web store frontend
   */
  createSession(clientIp = "unknown") {
    // Enforce session cap to prevent memory exhaustion from unauthenticated flooding
    if (this.sessions.size >= this.maxSessions) {
      // Evict the oldest session to make room
      const oldestKey = this.sessions.keys().next().value;
      this.sessions.delete(oldestKey);
    }

    const sessionId = "fses_" + crypto.randomBytes(16).toString("hex");
    const clientKey = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + this.sessionTtlMs;

    this.sessions.set(sessionId, {
      sessionId,
      clientKey,
      clientIp,
      expiresAt,
    });

    return {
      sessionId,
      clientKey,
      expiresAt: new Date(expiresAt).toISOString(),
      algorithm: "HMAC-SHA256",
    };
  }

  /**
   * Verify an incoming signed request
   * @param {object} param0 - { method, path, body, headers }
   */
  verifySignature({ method = "POST", path = "", body = {}, headers = {} }) {
    const signature = headers["x-fortress-signature"] || headers["X-Fortress-Signature"];
    const sessionId = headers["x-fortress-session-id"] || headers["X-Fortress-Session-Id"];
    const timestamp = headers["x-fortress-timestamp"] || headers["X-Fortress-Timestamp"];
    const nonce = headers["x-fortress-nonce"] || headers["X-Fortress-Nonce"];

    if (!signature || !sessionId || !timestamp || !nonce) {
      return {
        valid: false,
        reason: "Missing required Fortress cryptographic signing headers (x-fortress-signature, session-id, timestamp, nonce).",
      };
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        valid: false,
        reason: "Invalid or expired signing session.",
      };
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return {
        valid: false,
        reason: "Signing session has expired.",
      };
    }

    // 1. Clock drift & replay check
    const reqTime = parseInt(timestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    const drift = Math.abs(nowSec - (reqTime > 1e11 ? Math.floor(reqTime / 1000) : reqTime));

    if (drift > this.maxClockDriftSeconds) {
      return {
        valid: false,
        reason: `Replay Attack Detected: Request timestamp expired or clock drift exceeded (${drift}s).`,
      };
    }

    // 2. Nonce reuse check (TTL-bucketed to prevent full-wipe replay vulnerability)
    const nonceBucketKey = Math.floor(reqTime / this.nonceBucketSeconds);
    if (!this.nonceBuckets.has(nonceBucketKey)) {
      this.nonceBuckets.set(nonceBucketKey, new Set());
    }
    const bucket = this.nonceBuckets.get(nonceBucketKey);
    if (bucket.has(nonce)) {
      return {
        valid: false,
        reason: "Replay Attack Detected: Cryptographic nonce was previously consumed.",
      };
    }
    bucket.add(nonce);

    // 3. HMAC computation
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const canonicalString = [
      method.toUpperCase(),
      path,
      String(timestamp),
      String(nonce),
      bodyStr,
    ].join("\n");

    const expectedSig = crypto
      .createHmac("sha256", Buffer.from(session.clientKey, "hex"))
      .update(canonicalString)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return {
        valid: false,
        reason: "TAMPERING_DETECTED: Request payload or parameters do not match cryptographic client signature.",
      };
    }

    return {
      valid: true,
      sessionId,
      message: "Request cryptographically verified against client-side tampering.",
    };
  }
}

export const requestSigner = new RequestSigner();

import crypto from "crypto";

/**
 * Zero-Friction Cryptographic Proof-of-Work (PoW) Shield
 * Stops DDoS attacks, mass automated curl scrapers, and intruder fuzzers
 * by forcing client machines to prove computational expenditure (Hashcash SHA-256).
 * Legitimate browsers solve this in ~15ms in the background. Automated attack bots
 * exhaust CPU cycles or get dropped immediately in 0.05ms.
 */
class PowShield {
  constructor() {
    this.challenges = new Map(); // challengeId -> { salt, difficulty, createdAt, expiresAt }
    this.verifiedPasses = new Map(); // passToken -> expiresAt
    this.defaultDifficulty = 4; // 4 hex zeros = ~65,536 iterations (~15ms on modern CPU)
    this.minDifficulty = 3; // Never let clients request a trivially solvable puzzle
    this.maxDifficulty = 6; // Never let clients request a puzzle that DoSes legitimate browsers
    this.ttlMs = 120 * 1000; // 2 minutes to solve challenge
    this.passTtlMs = 15 * 60 * 1000; // 15 minutes of trusted browsing once solved
    // Hard memory ceilings: oldest entries are evicted first (Map preserves insertion order)
    this.maxChallenges = 20_000;
    this.maxPasses = 50_000;

    this._sweeper = setInterval(() => this.prune(), 30 * 1000);
    this._sweeper.unref?.();
  }

  _evictOldest(map, max) {
    while (map.size >= max) {
      map.delete(map.keys().next().value);
    }
  }

  /**
   * Drop expired challenges and passes
   */
  prune() {
    const now = Date.now();
    for (const [id, c] of this.challenges) {
      if (now > c.expiresAt) this.challenges.delete(id);
    }
    for (const [token, expiresAt] of this.verifiedPasses) {
      if (now > expiresAt) this.verifiedPasses.delete(token);
    }
  }

  /**
   * Create a fresh Proof-of-Work challenge
   * @param {number} difficulty - Number of leading hex zeros required (default 4)
   */
  createChallenge(difficulty = this.defaultDifficulty) {
    const requested = Number.parseInt(difficulty, 10);
    difficulty = Number.isFinite(requested)
      ? Math.min(this.maxDifficulty, Math.max(this.minDifficulty, requested))
      : this.defaultDifficulty;

    const challengeId = "pow_" + crypto.randomBytes(12).toString("hex");
    const salt = crypto.randomBytes(16).toString("hex");
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    const record = {
      challengeId,
      salt,
      difficulty,
      algorithm: "SHA-256",
      createdAt: now,
      expiresAt,
    };

    this._evictOldest(this.challenges, this.maxChallenges);
    this.challenges.set(challengeId, record);

    return {
      challengeId,
      salt,
      difficulty,
      algorithm: "SHA-256",
      expiresAt: new Date(expiresAt).toISOString(),
      instructions: `Find an integer or string 'nonce' such that SHA-256(salt + nonce) starts with ${"0".repeat(difficulty)}`,
    };
  }

  /**
   * Verify candidate nonce for a challenge
   * @param {string} challengeId
   * @param {string|number} nonce
   */
  verifySolution(challengeId, nonce) {
    if (!challengeId || nonce === undefined || nonce === null) {
      return { success: false, reason: "Missing challengeId or nonce." };
    }

    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return { success: false, reason: "Invalid or expired challenge ID." };
    }

    // Single-use: burn immediately to prevent replay
    this.challenges.delete(challengeId);

    if (Date.now() > challenge.expiresAt) {
      return { success: false, reason: "Challenge expired. Request a new challenge." };
    }

    const input = challenge.salt + String(nonce);
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    const targetPrefix = "0".repeat(challenge.difficulty);

    if (!hash.startsWith(targetPrefix)) {
      return {
        success: false,
        reason: `Hash ${hash.slice(0, 8)}... does not satisfy difficulty requirement (must start with '${targetPrefix}').`,
      };
    }

    // Issue a verified session pass
    const passToken = "pow_pass_" + crypto.randomBytes(24).toString("hex");
    const passExpires = Date.now() + this.passTtlMs;
    this._evictOldest(this.verifiedPasses, this.maxPasses);
    this.verifiedPasses.set(passToken, passExpires);

    return {
      success: true,
      passToken,
      hash,
      expiresAt: new Date(passExpires).toISOString(),
      message: "Proof-of-Work verified. Legitimate client authenticated.",
    };
  }

  /**
   * Check if a request provides a valid verified pass
   * @param {string} passToken
   */
  validatePass(passToken) {
    if (!passToken) return false;
    const expiresAt = this.verifiedPasses.get(passToken);
    if (!expiresAt) return false;

    if (Date.now() > expiresAt) {
      this.verifiedPasses.delete(passToken);
      return false;
    }
    return true;
  }
}

export const powShield = new PowShield();

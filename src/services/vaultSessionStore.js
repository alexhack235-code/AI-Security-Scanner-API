import crypto from "crypto";
import { distributedState } from "./distributedState.js";

/**
 * FORTRESS VAULT SESSION STORE
 * Manages opaque, high-entropy session tokens for the SOC Dashboard.
 * Replaces insecure client-side raw secret storage (document.cookie/localStorage)
 * with server-managed sessions stored in-memory and synchronized via Redis/distributed state.
 */
class VaultSessionStore {
  constructor() {
    this.sessions = new Map(); // token -> { sessionToken, keyId, name, role, createdAt, expiresAt }
    this.ttlMs = 8 * 60 * 60 * 1000; // 8 hours
    this.maxSessions = 10_000;

    // Background sweep every 60s
    this._sweeper = setInterval(() => this.prune(), 60 * 1000);
    if (this._sweeper.unref) this._sweeper.unref();
  }

  prune() {
    const now = Date.now();
    for (const [token, s] of this.sessions.entries()) {
      if (now > s.expiresAt) {
        this.sessions.delete(token);
        distributedState.del("vault:session:" + token).catch(() => {});
      }
    }
  }

  async createSession({ keyId = "root", name = "Authenticated User", role = "CLIENT" }) {
    const rawToken = "vses_" + crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    const session = {
      sessionToken: rawToken,
      keyId,
      name,
      role,
      createdAt: new Date(now).toISOString(),
      expiresAt,
    };

    while (this.sessions.size >= this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) {
        this.sessions.delete(oldestKey);
        distributedState.del("vault:session:" + oldestKey).catch(() => {});
      }
    }

    this.sessions.set(rawToken, session);
    await distributedState.set("vault:session:" + rawToken, session, Math.ceil(this.ttlMs / 1000)).catch(() => {});

    return session;
  }

  async getSession(token) {
    if (!token || typeof token !== "string") return null;

    let session = this.sessions.get(token);
    if (!session) {
      try {
        session = await distributedState.get("vault:session:" + token);
        if (session) this.sessions.set(token, session);
      } catch {}
    }

    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      distributedState.del("vault:session:" + token).catch(() => {});
      return null;
    }

    return session;
  }

  async destroySession(token) {
    if (!token || typeof token !== "string") return false;
    this.sessions.delete(token);
    await distributedState.del("vault:session:" + token).catch(() => {});
    return true;
  }
}

export const vaultSessionStore = new VaultSessionStore();

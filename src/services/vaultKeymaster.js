import crypto from "crypto";
import { config } from "../config.js";
import { distributedState } from "./distributedState.js";

/**
 * FORTRESS VAULT KEYMASTER
 * Manages Master Vault Passphrase & Per-User Client Keys.
 * Controls access so only approved individuals can use the API.
 * Keys are hashed with SHA-256 and persisted in Distributed State (Redis/Memory).
 */
const ALLOWED_ROLES = new Set(["CLIENT", "MASTER_ADMIN"]);
const NAME_PATTERN = /^[\w .@'-]{1,64}$/;
const MAX_QUOTA = 10_000_000;

class VaultKeymaster {
  constructor() {
    // In-memory key store (indexed by key and SHA-256 hash)
    this.keys = new Map();
    this.initialized = false;
  }

  hashKey(key) {
    return crypto.createHash("sha256").update(String(key)).digest("hex");
  }

  maskKey(key) {
    if (!key || typeof key !== "string") return "vlt_live_****";
    return key.length > 15 ? `${key.slice(0, 11)}...${key.slice(-4)}` : "vlt_live_****";
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Load initial pre-authorized client keys from VAULT_AUTHORIZED_KEYS env if present
    // Format: JSON string or "name:key,name:key"
    const rawKeys = process.env.VAULT_AUTHORIZED_KEYS || "";
    if (rawKeys) {
      try {
        if (rawKeys.trim().startsWith("{") || rawKeys.trim().startsWith("[")) {
          const parsed = JSON.parse(rawKeys);
          if (Array.isArray(parsed)) {
            parsed.forEach((k) => this.registerRawKey(k));
          } else {
            Object.entries(parsed).forEach(([name, key]) => {
              this.registerRawKey({ name, key });
            });
          }
        } else {
          // Comma-separated: "alex:vlt_123,sarah:vlt_456"
          rawKeys.split(",").forEach((entry) => {
            const [name, key] = entry.split(":").map((s) => s.trim());
            if (name && key) {
              this.registerRawKey({ name, key });
            }
          });
        }
      } catch (err) {
        console.error("Failed to parse VAULT_AUTHORIZED_KEYS from env:", err.message);
      }
    }

    // If FORTRESS_API_KEY was configured in legacy env, register it as a legacy client key
    if (config.fortressApiKey && config.fortressApiKey !== config.vaultMasterPass) {
      this.registerRawKey({
        name: "Legacy Client (FORTRESS_API_KEY)",
        key: config.fortressApiKey,
        role: "CLIENT",
      });
    }
  }

  registerRawKey({ name, key, role = "CLIENT", quota = 5000 }) {
    const hash = this.hashKey(key);
    const id = "key_" + hash.slice(0, 10);
    const maskedKey = this.maskKey(key);

    const record = {
      id,
      name,
      keyHash: hash,
      maskedKey,
      role,
      quota,
      usageCount: 0,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };

    this.keys.set(hash, record);
    this.keys.set(key, record);
    distributedState.set("vault:key:" + hash, record).catch(() => {});
    distributedState.sadd("vault:key_hashes", hash).catch(() => {});
  }

  /**
   * Verify an incoming credential (Master Vault Pass or Client Key)
   */
  verify(credential, { recordUsage = true } = {}) {
    this.init();

    if (!credential || typeof credential !== "string") {
      return { valid: false, reason: "Missing authentication credential." };
    }

    const trimmed = credential.trim();

    // 1. Check Master Vault Pass (Constant-Time SHA-256 comparison to prevent Timing Attacks)
    const masterPass = config.vaultMasterPass;
    if (masterPass && typeof masterPass === "string") {
      const inputHash = crypto.createHash("sha256").update(trimmed).digest();
      const masterHash = crypto.createHash("sha256").update(masterPass).digest();
      if (crypto.timingSafeEqual(inputHash, masterHash)) {
        return {
          valid: true,
          role: "MASTER_ADMIN",
          name: "Vault Master Admin",
          keyId: "master_root",
          quota: Infinity,
          remaining: Infinity,
        };
      }
    }

    // 2. Check Client Keys in memory (by raw key or SHA-256 hash)
    const hash = this.hashKey(trimmed);
    const clientRecord = this.keys.get(trimmed) || this.keys.get(hash);
    return this._evaluateClientRecord(clientRecord, hash, recordUsage);
  }

  /**
   * Asynchronous verification that checks distributed state on cold cache misses
   */
  async verifyAsync(credential, { recordUsage = true } = {}) {
    const syncCheck = this.verify(credential, { recordUsage });
    if (syncCheck.valid || syncCheck.reason !== "Invalid Vault Key or Master Pass. Access denied.") {
      return syncCheck;
    }

    if (!credential || typeof credential !== "string") return syncCheck;

    const trimmed = credential.trim();
    const hash = this.hashKey(trimmed);
    let record = null;
    try {
      record = await distributedState.get("vault:key:" + hash);
    } catch {}

    if (record) {
      this.keys.set(hash, record);
      this.keys.set(trimmed, record);
      return this._evaluateClientRecord(record, hash, recordUsage);
    }

    return syncCheck;
  }

  _evaluateClientRecord(clientRecord, hash, recordUsage) {
    if (clientRecord) {
      if (clientRecord.status !== "ACTIVE") {
        return {
          valid: false,
          reason: `Vault key has been ${clientRecord.status.toLowerCase()}. Contact administrator.`,
        };
      }

      if (clientRecord.usageCount >= clientRecord.quota) {
        return {
          valid: false,
          reason: "Vault key usage quota exhausted. Contact administrator to top-up.",
        };
      }

      // Record usage only on billable API calls
      if (recordUsage) {
        clientRecord.usageCount += 1;
        clientRecord.lastUsedAt = new Date().toISOString();
        if (hash) {
          distributedState.set("vault:key:" + hash, clientRecord).catch(() => {});
        }
      }

      return {
        valid: true,
        role: clientRecord.role,
        name: clientRecord.name,
        keyId: clientRecord.id,
        quota: clientRecord.quota,
        usageCount: clientRecord.usageCount,
        remaining: Math.max(0, clientRecord.quota - clientRecord.usageCount),
      };
    }

    return {
      valid: false,
      reason: "Invalid Vault Key or Master Pass. Access denied.",
    };
  }

  /**
   * Issue a new unique client key
   */
  issueKey({ name, role = "CLIENT", quota = 1000, notes = "" }) {
    this.init();

    if (!name || typeof name !== "string") {
      throw new Error("A recipient name or identifier is required to issue a key.");
    }

    const cleanName = name.trim();
    if (!NAME_PATTERN.test(cleanName)) {
      throw new Error("Name must be 1-64 characters: letters, digits, spaces, and . @ ' - _ only.");
    }

    const cleanRole = String(role || "CLIENT").toUpperCase();
    if (!ALLOWED_ROLES.has(cleanRole)) {
      throw new Error(`Invalid role '${role}'. Allowed roles: ${[...ALLOWED_ROLES].join(", ")}.`);
    }

    const numericQuota = Math.floor(Number(quota));
    const cleanQuota = Number.isFinite(numericQuota) && numericQuota > 0 ? Math.min(numericQuota, MAX_QUOTA) : 1000;

    const randomSecret = crypto.randomBytes(20).toString("hex");
    const rawKey = `vlt_live_${randomSecret}`;
    const hash = this.hashKey(rawKey);
    const id = "key_" + hash.slice(0, 10);
    const maskedKey = this.maskKey(rawKey);

    const record = {
      id,
      name: cleanName,
      key: rawKey,
      keyHash: hash,
      maskedKey,
      role: cleanRole,
      quota: cleanQuota,
      usageCount: 0,
      status: "ACTIVE",
      notes: String(notes || "").trim().slice(0, 500),
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };

    this.keys.set(hash, record);
    this.keys.set(rawKey, record);
    distributedState.set("vault:key:" + hash, record).catch(() => {});
    distributedState.sadd("vault:key_hashes", hash).catch(() => {});
    return record;
  }

  /**
   * Revoke an existing client key
   */
  revokeKey(keyOrId) {
    this.init();

    for (const [k, record] of this.keys.entries()) {
      if (k === keyOrId || record.id === keyOrId || record.keyHash === keyOrId) {
        record.status = "REVOKED";
        record.revokedAt = new Date().toISOString();
        if (record.keyHash) {
          distributedState.set("vault:key:" + record.keyHash, record).catch(() => {});
        }
        return { success: true, record };
      }
    }

    return { success: false, reason: "Key not found." };
  }

  /**
   * List all client keys (with secret masked for safety)
   */
  listKeys() {
    this.init();

    const seenIds = new Set();
    const list = [];
    for (const record of this.keys.values()) {
      if (seenIds.has(record.id)) continue;
      seenIds.add(record.id);

      const maskedKey = record.maskedKey || this.maskKey(record.key || "");
      list.push({
        id: record.id,
        name: record.name,
        maskedKey,
        role: record.role,
        status: record.status,
        quota: record.quota,
        usageCount: record.usageCount,
        remaining: Math.max(0, record.quota - record.usageCount),
        createdAt: record.createdAt,
        lastUsedAt: record.lastUsedAt,
        notes: record.notes,
      });
    }

    return list;
  }
}

export const vaultKeymaster = new VaultKeymaster();

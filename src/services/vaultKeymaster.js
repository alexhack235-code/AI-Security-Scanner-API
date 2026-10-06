import crypto from "crypto";
import { config } from "../config.js";

/**
 * FORTRESS VAULT KEYMASTER
 * Manages Master Vault Passphrase & Per-User Client Keys.
 * Controls access so only approved individuals can use the API.
 */
class VaultKeymaster {
  constructor() {
    // In-memory key store (can be populated from env or created at runtime)
    this.keys = new Map();
    this.initialized = false;
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
    const id = "key_" + crypto.createHash("sha256").update(key).digest("hex").slice(0, 10);
    this.keys.set(key, {
      id,
      name,
      key,
      role,
      quota,
      usageCount: 0,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    });
  }

  /**
   * Verify an incoming credential (Master Vault Pass or Client Key)
   */
  verify(credential) {
    this.init();

    if (!credential || typeof credential !== "string") {
      return { valid: false, reason: "Missing authentication credential." };
    }

    const trimmed = credential.trim();

    // 1. Check Master Vault Pass
    const masterPass = config.vaultMasterPass;
    if (masterPass && trimmed === masterPass) {
      return {
        valid: true,
        role: "MASTER_ADMIN",
        name: "Vault Master Admin",
        keyId: "master_root",
        quota: Infinity,
        remaining: Infinity,
      };
    }

    // 2. Check Client Keys
    const clientRecord = this.keys.get(trimmed);
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

      // Record usage
      clientRecord.usageCount += 1;
      clientRecord.lastUsedAt = new Date().toISOString();

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

    const randomSecret = crypto.randomBytes(20).toString("hex");
    const rawKey = `vlt_live_${randomSecret}`;
    const id = "key_" + crypto.createHash("sha256").update(rawKey).digest("hex").slice(0, 10);

    const record = {
      id,
      name: name.trim(),
      key: rawKey,
      role,
      quota: Number(quota) || 1000,
      usageCount: 0,
      status: "ACTIVE",
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };

    this.keys.set(rawKey, record);
    return record;
  }

  /**
   * Revoke an existing client key
   */
  revokeKey(keyOrId) {
    this.init();

    for (const [key, record] of this.keys.entries()) {
      if (key === keyOrId || record.id === keyOrId) {
        record.status = "REVOKED";
        record.revokedAt = new Date().toISOString();
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

    const list = [];
    for (const record of this.keys.values()) {
      const visibleStart = record.key.slice(0, 11);
      const visibleEnd = record.key.slice(-4);
      const maskedKey = `${visibleStart}...${visibleEnd}`;

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

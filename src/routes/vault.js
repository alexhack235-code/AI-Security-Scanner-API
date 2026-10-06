import express from "express";
import { vaultKeymaster } from "../services/vaultKeymaster.js";

const router = express.Router();

/**
 * 1. Verify a Vault Key or Passphrase
 * Publicly testable so clients can verify if their key works
 */
router.post("/verify", (req, res) => {
  const credential =
    req.body.key ||
    req.body.pass ||
    req.headers["x-vault-key"] ||
    req.headers["x-vault-pass"] ||
    (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, "") : "");

  const result = vaultKeymaster.verify(credential);
  if (!result.valid) {
    return res.status(401).json({
      valid: false,
      reason: result.reason,
    });
  }

  return res.status(200).json({
    valid: true,
    name: result.name,
    role: result.role,
    quota: result.quota,
    usage_count: result.usageCount,
    remaining: result.remaining,
    message: "Vault access credential verified successfully.",
  });
});

/**
 * Middleware: Require Master Vault Admin role for key management
 */
const requireMasterAdmin = (req, res, next) => {
  if (req.vaultUser && req.vaultUser.role === "MASTER_ADMIN") {
    return next();
  }
  return res.status(403).json({
    fortress_status: "REJECTED",
    threat_level: "HIGH",
    reason: "Keymaster management requires the Master Vault Passphrase.",
    action: "RESTRICT_ADMIN_PRIVILEGE",
  });
};

/**
 * 2. List all issued Client Keys (Master Admin only)
 */
router.get("/keys", requireMasterAdmin, (req, res) => {
  const keys = vaultKeymaster.listKeys();
  return res.status(200).json({
    status: "ACTIVE",
    total_keys: keys.length,
    keys,
  });
});

/**
 * 3. Issue a new Client Key (Master Admin only)
 * Body: { name: "Client Name", quota: 1000, notes: "..." }
 */
router.post("/keys", requireMasterAdmin, (req, res) => {
  const { name, quota = 1000, role = "CLIENT", notes = "" } = req.body || {};

  if (!name) {
    return res.status(400).json({
      error: "Field 'name' is required to issue a key (e.g. person's name or company name).",
    });
  }

  try {
    const newKey = vaultKeymaster.issueKey({ name, quota, role, notes });
    return res.status(201).json({
      success: true,
      message: `Vault Key successfully generated for '${name}'. Share this key with them.`,
      key_details: newKey,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * 4. Revoke a Client Key (Master Admin only)
 */
router.delete("/keys/:id", requireMasterAdmin, (req, res) => {
  const { id } = req.params;
  const result = vaultKeymaster.revokeKey(id);

  if (!result.success) {
    return res.status(404).json(result);
  }

  return res.status(200).json({
    success: true,
    message: `Vault key '${id}' has been permanently revoked.`,
    revocation: result.record,
  });
});

/**
 * 5. Logout / Clear Web Session
 */
router.post("/logout", (req, res) => {
  res.clearCookie("vault_token", { path: "/" });
  return res.status(200).json({ success: true, message: "Logged out from security vault." });
});

export default router;

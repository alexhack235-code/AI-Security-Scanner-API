import express from "express";
import { paymentShield } from "../services/paymentShield.js";

const router = express.Router();

// Cryptographic Webhook Signature & Replay Verification
router.post("/verify-webhook", (req, res) => {
  const { gateway, rawBody, headers, secret, eventId } = req.body || {};

  if (!gateway || !rawBody) {
    return res.status(400).json({ error: "Missing required fields: 'gateway' and 'rawBody'." });
  }

  // 1. Idempotency Check
  if (eventId) {
    const idemCheck = paymentShield.checkIdempotency(eventId);
    if (!idemCheck.clean) {
      return res.status(409).json({
        valid: false,
        threat_level: "CRITICAL",
        reason: idemCheck.reason,
        action: "DROP_REPLAY_ATTACK",
      });
    }
  }

  // 2. Cryptographic Signature Check
  const sigResult = paymentShield.verifyWebhookSignature({
    gateway,
    rawBody,
    headers: headers || req.headers,
    secret: secret || process.env[`${gateway.toUpperCase()}_WEBHOOK_SECRET`] || "",
  });

  if (!sigResult.valid) {
    return res.status(401).json({
      valid: false,
      threat_level: "CRITICAL",
      reason: sigResult.reason,
      action: "BLOCK_UNAUTHORIZED_WEBHOOK",
    });
  }

  return res.status(200).json({
    valid: true,
    gateway,
    status: "CRYPTOGRAPHICALLY_VERIFIED",
    message: `Payment webhook from ${gateway} passed HMAC authenticity and anti-replay checks.`,
  });
});

// Audit Transaction for Currency & Value Exploits
router.post("/audit-transaction", (req, res) => {
  const body = req.body || {};
  const issues = paymentShield.inspectPaymentPayload(body);

  if (issues.length > 0) {
    return res.status(400).json({
      fortress_status: "BREACHED",
      threat_level: "CRITICAL",
      action: "BLOCK_PAYMENT",
      issues,
    });
  }

  return res.status(200).json({
    fortress_status: "SECURE",
    threat_level: "NONE",
    action: "ALLOW_PAYMENT",
    message: "Transaction payload passed currency and positive-value checks.",
  });
});

export default router;

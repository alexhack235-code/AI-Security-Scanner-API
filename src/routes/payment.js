import express from "express";
import { paymentShield } from "../services/paymentShield.js";

const router = express.Router();

/**
 * 1. POST /api/payment/verify-webhook
 * Cryptographic Webhook Signature & Anti-Replay Verification
 * Supports: Stripe, Paystack, Flutterwave, Razorpay, Square, PayPal
 */
router.post("/verify-webhook", (req, res) => {
  const { gateway, rawBody, headers, secret, eventId, notificationUrl } = req.body || {};

  if (!gateway || !rawBody) {
    return res.status(400).json({ error: "Missing required fields: 'gateway' and 'rawBody'." });
  }

  // 1. Idempotency & Replay Attack Check
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

  // 2. Cryptographic Signature Verification
  const sigResult = paymentShield.verifyWebhookSignature({
    gateway,
    rawBody,
    headers: headers || req.headers,
    secret: secret || process.env[`${gateway.toUpperCase()}_WEBHOOK_SECRET`] || "",
    notificationUrl,
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

/**
 * 2. POST /api/payment/audit-transaction
 * Audit Transaction for Currency Arbitrage, Fractional Cent Salami Slicing, and Carding Attacks
 */
router.post("/audit-transaction", (req, res) => {
  const body = req.body || {};
  const clientIp = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  const issues = paymentShield.inspectPaymentPayload(body, { clientIp });

  if (issues.length > 0) {
    const isJailTriggered = issues.some((i) => i.action === "BAN_IP_24H");
    return res.status(400).json({
      fortress_status: "BREACHED",
      threat_level: isJailTriggered ? "CRITICAL" : "HIGH",
      action: isJailTriggered ? "BAN_IP_24H" : "BLOCK_PAYMENT",
      issues,
      sanitized_payload: paymentShield.maskCardholderData(body),
    });
  }

  return res.status(200).json({
    fortress_status: "SECURE",
    threat_level: "NONE",
    action: "ALLOW_PAYMENT",
    message: "Transaction payload passed currency, Luhn checksum, and positive-value checks.",
    sanitized_payload: paymentShield.maskCardholderData(body),
  });
});

/**
 * 3. POST /api/payment/carding-check
 * Direct Luhn Checksum & Card Testing Velocity Analyzer
 */
router.post("/carding-check", (req, res) => {
  const { cardNumber, card_number, pan, ip } = req.body || {};
  const targetCard = cardNumber || card_number || pan;
  const clientIp = ip || req.ip || req.headers["x-forwarded-for"] || "unknown";

  if (!targetCard) {
    return res.status(400).json({ error: "Missing required 'cardNumber' field." });
  }

  const luhn = paymentShield.validateLuhn(targetCard);
  const velocity = paymentShield.checkCardingVelocity({ ip: clientIp, cardNumber: targetCard });

  return res.status(200).json({
    status: "AUDITED",
    luhn_result: luhn,
    carding_velocity: velocity,
    fortress_verdict: velocity.isCardingAttack ? "CARDING_BOT_BLOCKED" : luhn.valid ? "VALID_CARD" : "INVALID_CHECKSUM",
  });
});

/**
 * 4. POST /api/payment/audit-checkout-script
 * Magecart Digital Web-Skimmer & Form-Jacking Heuristic Auditor
 */
router.post("/audit-checkout-script", (req, res) => {
  const { scriptContent, script_content, code } = req.body || {};
  const script = scriptContent || script_content || code;

  if (!script) {
    return res.status(400).json({ error: "Missing 'scriptContent' or 'code' to audit." });
  }

  const audit = paymentShield.auditCheckoutScript(script);

  return res.status(200).json({
    status: "SUCCESS",
    audit,
  });
});

/**
 * 5. GET /api/payment/telemetry
 * Real-Time Financial Defense Metrics
 */
router.get("/telemetry", (req, res) => {
  return res.status(200).json({
    status: "SUCCESS",
    payment_shield_metrics: paymentShield.getPaymentMetrics(),
  });
});

export default router;

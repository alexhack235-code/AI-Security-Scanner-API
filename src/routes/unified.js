import express from "express";
import { CloudDefenderEngine } from "../services/cloudDefenderEngine.js";
import { scanCodeWithGemini } from "../services/geminiScanner.js";
import { scanUrlWeaknesses } from "../services/urlWeaknessScanner.js";
import { paymentShield } from "../services/paymentShield.js";
import { BountyReporter } from "../services/bountyReporter.js";
import { ephemeralAuth } from "../services/ephemeralAuth.js";
import { jailService } from "../services/jailService.js";
import { SecretRedactor } from "../services/secretRedactor.js";

const router = express.Router();

/**
 * ALL-IN-ONE MASTER FORTRESS API
 * Automatically detects payload type and routes to the right defense engine.
 */
router.post("/", async (req, res, next) => {
  const payload = req.body || {};

  // 1. EMPTY / PING PAYLOAD
  if (!payload || Object.keys(payload).length === 0) {
    return res.status(200).json({
      fortress_status: "WAITING",
      service: "FORTRESS All-in-One Master API",
      message: "Send any payload: { path, body } for API defense, { code } for SAST audit, { url } for web scan, or { gateway } for payment verification.",
      examples: {
        defend_api: { path: "/api/checkout", body: { total: 50 } },
        scan_code: { code: "const total = req.body.price;" },
        inspect_web_url: { url: "https://example.com" },
        verify_payment: { gateway: "paystack", rawBody: "..." },
        data_leaks: { content: "sk_live_12345..." }
      }
    });
  }

  try {
    // 2. DETECT: Web URL Weakness Scanner ({ url: "https://..." })
    if (payload.url && typeof payload.url === "string") {
      const report = await scanUrlWeaknesses(payload.url.trim());
      return res.status(200).json(SecretRedactor.sanitize({
        mode: "WEB_WEAKNESS_AUDIT",
        ...report
      }));
    }

    // 3. DETECT: Deep Code SAST Audit ({ code: "..." })
    if (payload.code && typeof payload.code === "string") {
      const audit = await scanCodeWithGemini({
        code: payload.code.trim(),
        filename: payload.filename || "source_snippet.js",
        type: payload.type || "code"
      });
      return res.status(200).json(SecretRedactor.sanitize({
        mode: "DEEP_CODE_SAST",
        ...audit
      }));
    }

    // 4. DETECT: Payment Gateway Verification ({ gateway: "stripe|paystack|flutterwave", rawBody: "..." })
    if (payload.gateway && payload.rawBody) {
      if (payload.eventId) {
        const idem = paymentShield.checkIdempotency(payload.eventId);
        if (!idem.clean) {
          return res.status(409).json({
            mode: "PAYMENT_GATEWAY_SHIELD",
            valid: false,
            threat_level: "CRITICAL",
            reason: idem.reason
          });
        }
      }

      const sigResult = paymentShield.verifyWebhookSignature({
        gateway: payload.gateway,
        rawBody: payload.rawBody,
        headers: payload.headers || req.headers,
        secret: payload.secret || process.env[`${payload.gateway.toUpperCase()}_WEBHOOK_SECRET`] || ""
      });

      return res.status(sigResult.valid ? 200 : 401).json(SecretRedactor.sanitize({
        mode: "PAYMENT_GATEWAY_SHIELD",
        gateway: payload.gateway,
        ...sigResult
      }));
    }

    // 5. DETECT: Sensitive Data Leaks & Bug Bounty Generator ({ content: "..." })
    if (payload.content && typeof payload.content === "string") {
      const leaks = BountyReporter.scanDataLeaks(payload.content);
      let report = null;
      if (leaks.length > 0) {
        report = BountyReporter.generateReport({
          targetName: payload.target || "Application Payload",
          endpoint: payload.endpoint || "/api",
          vulnerabilityType: leaks[0].type,
          severity: leaks[0].severity,
          cvss: leaks[0].cvss,
          cwe: leaks[0].cwe,
          description: `Sensitive data leak detected: ${leaks[0].type}`,
          stepsToReproduce: "1. Inspect payload.\n2. Observe raw secret exposure.",
          impact: "Credential compromise.",
          remediation: "Redact all secrets prior to transmission."
        });
      }
      return res.status(200).json(SecretRedactor.sanitize({
        mode: "DATA_LEAK_AUDIT",
        leaks_found: leaks.length,
        leaks,
        bounty_report: report
      }));
    }

    // 6. DEFAULT / ALL-IN-ONE: Cloud Defender Request Shield ({ path, body, headers })
    const verdict = await CloudDefenderEngine.inspect({
      path: typeof payload.path === "string" ? payload.path : "/",
      method: typeof payload.method === "string" ? payload.method.toUpperCase() : req.method || "POST",
      headers: { ...(req.headers || {}), ...(payload.headers && typeof payload.headers === "object" ? payload.headers : {}) },
      body: payload.body !== undefined ? payload.body : payload,
      clientIp: req.clientIp || "unknown",
      deepAi: Boolean(payload.deepAi)
    });

    return res.status(200).json(verdict);

  } catch (err) {
    next(err);
  }
});

// GET /api Returns the live status & master manual
router.get("/", (req, res) => {
  return res.status(200).json({
    status: "ARMED_AND_ACTIVE",
    service: "FORTRESS Unified Master API",
    tagline: "One Single Master Endpoint for Real-time WAF, SAST, Payments, and Web Weakness",
    endpoint: "POST /api",
    shields: [
      "Layer 0: IP Auto-Jail (Fail2Ban)",
      "Layer 1: <2ms Instant Kill (XSS, SQLi, Traversal, Proto Pollution)",
      "Layer 2: Shopping & Payment Integrity (Price Tampering, Coupon Abuse)",
      "Layer 3: Cognitive Gemini 3.8 Flash Neural Engine"
    ]
  });
});

export default router;

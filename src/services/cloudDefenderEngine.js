import { scanCodeWithGemini } from "./geminiScanner.js";
import { jailService } from "./jailService.js";
import { SiteClassifier } from "./siteClassifier.js";
import { BountyReporter } from "./bountyReporter.js";

// Helper: Deep recursive URL decoding & Unicode unescaping
function deepDecode(str) {
  if (typeof str !== "string") return "";
  let decoded = str;
  try {
    for (let i = 0; i < 3; i++) {
      const prev = decoded;
      decoded = decodeURIComponent(decoded.replace(/\+/g, " "));
      if (decoded === prev) break;
    }
  } catch {}

  try {
    decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  } catch {}

  return decoded.replace(/\0/g, "");
}

// Extract all strings recursively from an object/array
function flattenStrings(input, acc = []) {
  if (typeof input === "string") {
    acc.push(input);
  } else if (Array.isArray(input)) {
    for (const item of input) flattenStrings(item, acc);
  } else if (typeof input === "object" && input !== null) {
    for (const [key, val] of Object.entries(input)) {
      acc.push(key);
      flattenStrings(val, acc);
    }
  }
  return acc;
}

// LAYER 1: INSTANT KILL RULES (<2ms)
const LAYER_1_PATTERNS = [
  // XSS
  {
    regex: /<\s*script|javascript\s*:|onerror\s*=|onload\s*=|innerHTML|dangerouslySetInnerHTML|eval\s*\(|<\s*iframe|<\s*embed|<\s*object/i,
    type: "XSS",
    threat: "HIGH",
    reason: "Cross-Site Scripting (XSS) payload detected in input.",
    fix: "Sanitize user input, use textContent instead of innerHTML, encode output.",
  },
  // SQLi / NoSQLi
  {
    regex: /union\s+select|select\s+.*\s+from|drop\s+table|insert\s+into|delete\s+from|or\s+1\s*=\s*1|'\s*or\s*'|"\s*or\s*"|\$where|\$ne|\$regex|information_schema/i,
    type: "SQL_NOSQL_INJECTION",
    threat: "CRITICAL",
    reason: "SQL/NoSQL injection signature detected in payload.",
    fix: "Use parameterized queries (prepared statements) or ORM abstraction.",
  },
  // Path Traversal
  {
    regex: /(\.\.[\/\\])+|\/etc\/passwd|\/etc\/shadow|c:\\windows\\system32|%2e%2e[\/\\]/i,
    type: "PATH_TRAVERSAL",
    threat: "CRITICAL",
    reason: "Directory/Path Traversal sequence detected.",
    fix: "Validate filenames against a strict allowlist and use path.resolve with root boundaries.",
  },
  // Prototype Pollution
  {
    regex: /__proto__|constructor\s*\.\s*prototype|prototype\s*\[/i,
    type: "PROTOTYPE_POLLUTION",
    threat: "HIGH",
    reason: "Object Prototype Pollution attempt detected.",
    fix: "Use Object.create(null) or validate against reserved object keys.",
  },
  // Command Injection
  {
    regex: /(;\s*rm\s+-rf)|(\|\s*cat\s+\/etc)|(&&\s*whoami)|(`\s*id\s*`)|(\$\(\s*id\s*\))/i,
    type: "COMMAND_INJECTION",
    threat: "CRITICAL",
    reason: "OS Command Injection sequence detected.",
    fix: "Never invoke exec() or spawn() with user-controlled input.",
  },
];

export class CloudDefenderEngine {
  /**
   * Run Multi-Tier Security Inspection on an incoming API request
   */
  static async inspect(reqData) {
    const startTime = Date.now();
    const {
      path = "/",
      method = "GET",
      headers = {},
      body = null,
      clientIp = "unknown",
      deepAi = false,
    } = reqData;

    // === AUTONOMOUS CONTEXT CLASSIFICATION ===
    // Automatically detects if target is E-Commerce, Fintech, Auth, or Normal Web API
    const siteContext = SiteClassifier.classify({ path, body, headers });

    // === TIER 1: INSTANT KILL PATTERN MATCH (<2ms) ===
    const allStrings = flattenStrings({ path, headers, body });
    for (const rawStr of allStrings) {
      const decoded = deepDecode(rawStr);
      for (const rule of LAYER_1_PATTERNS) {
        if (rule.regex.test(decoded)) {
          const action = rule.threat === "CRITICAL" ? "BAN_IP_24H" : "BLOCK";
          if (action === "BAN_IP_24H") {
            jailService.banIp(clientIp, rule.reason, "LAYER 1: Instant Kill");
          }

          jailService.recordEvent({
            ip: clientIp,
            wall: "LAYER 1: Instant Kill",
            threat_level: rule.threat,
            reason: rule.reason,
            action,
            path,
          });

          return {
            fortress_status: "BREACHED",
            threat_level: rule.threat,
            action,
            wall_failed: `LAYER 1: ${rule.type}`,
            reason: rule.reason,
            fix: rule.fix,
            site_classification: siteContext,
            duration_ms: Date.now() - startTime,
            tier: "TIER 1 (In-Memory Fast Shield)",
          };
        }
      }
    }

    // === TIER 2A: SENSITIVE DATA EXPOSURE AUDIT ===
    const dataLeaks = BountyReporter.scanDataLeaks(allStrings.join(" "));
    if (dataLeaks.length > 0) {
      const topLeak = dataLeaks[0];
      return {
        fortress_status: "BREACHED",
        threat_level: topLeak.severity,
        action: "BLOCK",
        wall_failed: `LAYER 2: Sensitive Data Exposure (${topLeak.type})`,
        reason: `Exposed secret or PCI-DSS card data detected in payload: ${topLeak.matched}`,
        fix: "Mask or redact credentials and card details before transmission.",
        site_classification: siteContext,
        duration_ms: Date.now() - startTime,
        tier: "TIER 2 (Data Leak Shield)",
      };
    }

    // === TIER 2B: SHOPPING SYSTEM BYPASS & E-COMMERCE SHIELD ===
    if (siteContext.category === "E_COMMERCE_SHOPPING" && body) {
      const shoppingViolations = SiteClassifier.auditShoppingBypass(body);
      if (shoppingViolations.length > 0) {
        const topViolation = shoppingViolations[0];
        jailService.recordEvent({
          ip: clientIp,
          wall: "LAYER 2: Shopping Fortress",
          threat_level: topViolation.severity,
          reason: topViolation.issue,
          action: "BLOCK",
          path,
        });

        return {
          fortress_status: "BREACHED",
          threat_level: topViolation.severity,
          action: "BLOCK",
          wall_failed: `LAYER 2: Shopping Bypass (${topViolation.type})`,
          reason: topViolation.issue,
          fix: topViolation.fix,
          site_classification: siteContext,
          duration_ms: Date.now() - startTime,
          tier: "TIER 2 (Shopping Fortress Shield)",
        };
      }
    }

    // === TIER 2C: FINANCIAL & PAYMENT RECALCULATION ENFORCEMENT (<5ms) ===
    const lowerPath = (path || "").toLowerCase();
    const isPaymentPath =
      lowerPath.includes("/pay") ||
      lowerPath.includes("/checkout") ||
      lowerPath.includes("/order") ||
      lowerPath.includes("/cart") ||
      lowerPath.includes("/billing");

    if (isPaymentPath && body && typeof body === "object") {
      // Forbidden Price Fields
      const forbiddenPriceFields = ["price", "total", "totalamount", "total_amount", "amount", "unit_price", "subtotal"];
      const bodyKeys = Object.keys(body).map((k) => k.toLowerCase());
      const caughtField = forbiddenPriceFields.find((f) => bodyKeys.includes(f));

      if (caughtField) {
        const reason = `Price manipulation vulnerability: client supplied financial field '${caughtField}' on payment path '${path}'.`;
        jailService.recordEvent({
          ip: clientIp,
          wall: "LAYER 2: Business Logic",
          threat_level: "CRITICAL",
          reason,
          action: "BLOCK",
          path,
        });

        return {
          fortress_status: "BREACHED",
          threat_level: "CRITICAL",
          action: "BLOCK",
          wall_failed: "LAYER 2: Logic (Price Manipulation)",
          reason,
          fix: "const canonicalPrice = await db.getProductPrice(item.productId); const total = canonicalPrice * item.quantity;",
          site_classification: siteContext,
          duration_ms: Date.now() - startTime,
          tier: "TIER 2 (Business Logic Shield)",
        };
      }

      // Negative or zero quantities
      if (body.quantity !== undefined || body.qty !== undefined) {
        const q = Number(body.quantity !== undefined ? body.quantity : body.qty);
        if (isNaN(q) || q <= 0 || !Number.isInteger(q)) {
          const reason = `Invalid cart quantity (${q}). Negative or non-integer quantities are disallowed.`;
          return {
            fortress_status: "BREACHED",
            threat_level: "HIGH",
            action: "BLOCK",
            wall_failed: "LAYER 2: Logic (Quantity Bypass)",
            reason,
            fix: "if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });",
            site_classification: siteContext,
            duration_ms: Date.now() - startTime,
            tier: "TIER 2 (Business Logic Shield)",
          };
        }
      }
    }

    // Webhook Signature Verification on Webhook Routes
    if (lowerPath.includes("/webhook") || lowerPath.includes("/callback")) {
      const hasSignature =
        headers["stripe-signature"] ||
        headers["x-paystack-signature"] ||
        headers["verif-hash"] ||
        headers["x-razorpay-signature"] ||
        headers["x-hub-signature"];

      if (!hasSignature) {
        const reason = "Payment webhook received without cryptographic signature header (Stripe, Paystack, Flutterwave, Razorpay).";
        return {
          fortress_status: "BREACHED",
          threat_level: "CRITICAL",
          action: "BLOCK",
          wall_failed: "LAYER 2: Logic (Missing Webhook Signature)",
          reason,
          fix: "paymentShield.verifyWebhookSignature({ gateway: 'stripe', rawBody, headers, secret });",
          site_classification: siteContext,
          duration_ms: Date.now() - startTime,
          tier: "TIER 2 (Business Logic Shield)",
        };
      }
    }

    // === TIER 3: DEEP AI LOGIC (Gemini 3.8 Flash) ===
    if (deepAi && body) {
      try {
        const aiResult = await scanCodeWithGemini({
          code: JSON.stringify({ method, path, headers, body, context: siteContext.category }, null, 2),
          filename: `request_${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
          type: "http_request_payload",
        });

        if (aiResult.fortress_status === "BREACHED") {
          jailService.recordEvent({
            ip: clientIp,
            wall: "LAYER 3: Deep AI",
            threat_level: aiResult.threat_level,
            reason: aiResult.verdict,
            action: "BLOCK",
            path,
          });

          return {
            fortress_status: "BREACHED",
            threat_level: aiResult.threat_level,
            action: "BLOCK",
            wall_failed: "LAYER 3: Deep AI",
            reason: aiResult.verdict,
            findings: aiResult.findings,
            fix: aiResult.findings?.[0]?.fix || "Verify server-side business rules.",
            site_classification: siteContext,
            duration_ms: Date.now() - startTime,
            tier: "TIER 3 (Deep AI Neural Scanner)",
          };
        }
      } catch (err) {
        console.warn("Deep AI scan fallback pass-through:", err.message);
      }
    }

    // === PASSED ALL FORTRESS WALLS ===
    jailService.recordEvent({
      ip: clientIp,
      wall: "NONE",
      threat_level: "NONE",
      reason: "Passed all fortress walls",
      action: "ALLOW",
      path,
    });

    return {
      fortress_status: "SECURE",
      threat_level: "NONE",
      action: "ALLOW",
      reason: "Passed all fortress walls",
      site_classification: siteContext,
      duration_ms: Date.now() - startTime,
      tier: "FORTRESS (Clean)",
    };
  }
}

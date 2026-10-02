import { scanCodeWithGemini } from "./geminiScanner.js";
import { jailService } from "./jailService.js";
import { SiteClassifier } from "./siteClassifier.js";
import { BountyReporter } from "./bountyReporter.js";
import { VpnDetector } from "./vpnDetector.js";
import { SecretRedactor } from "./secretRedactor.js";
import { SsrfShield } from "./ssrfShield.js";
import { AnomalyScorer } from "./anomalyScorer.js";
import { JwtAuditor } from "./jwtAuditor.js";
import { DeceptionEngine } from "./deceptionEngine.js";
import { canaryEngine } from "./canaryEngine.js";
import { requestSigner } from "./requestSigner.js";
import { virtualPatchEngine } from "./virtualPatchEngine.js";
import { threatProfiler } from "./threatProfiler.js";

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
      clientPort = "unknown",
      deepAi = false,
      mode = null,
    } = reqData;

    const userAgent = headers["user-agent"] || "unknown";

    // === RESOLVE DEFENSE MODE (BLOCK vs DECEPTION vs TARPIT) ===
    const defenseMode = DeceptionEngine.getMode(mode);

    // === AUTONOMOUS VPN & PROXY DETECTION ===
    const vpnInfo = VpnDetector.analyze({ headers, clientIp });

    // === AUTONOMOUS CONTEXT CLASSIFICATION ===
    const siteContext = SiteClassifier.classify({ path, body, headers });

    // Unified breach dispatcher supporting Honeypot Deception Mode & Attacker Forensics
    const handleBreach = async ({ wall, threat, reason, fix, type, tier, evidence }) => {
      const isDeception = defenseMode === "DECEPTION" || defenseMode === "TARPIT";
      if (defenseMode === "TARPIT") {
        await DeceptionEngine.sleep(1500); // 1.5s tarpit delay to drain botnet
      }

      const action = isDeception
        ? "DECEPTION_LURED"
        : threat === "CRITICAL"
        ? "BAN_IP_24H"
        : "BLOCK";

      if (!isDeception && action === "BAN_IP_24H") {
        jailService.banIp(clientIp, reason, wall, 24 * 60 * 60 * 1000, clientPort);
      }

      jailService.recordEvent({
        ip: clientIp,
        port: clientPort,
        wall,
        threat_level: threat,
        reason,
        action,
        path,
        user_agent: userAgent,
        evidence: evidence || "N/A",
      });

      threatProfiler.recordActivity({
        ip: clientIp,
        port: clientPort,
        path,
        method,
        userAgent,
        wallTriggered: wall,
        threatLevel: threat,
        payload: JSON.stringify(body || {}),
      });

      const dossier = threatProfiler.getDossier(clientIp);

      const response = {
        fortress_status: "BREACHED",
        threat_level: threat,
        action,
        wall: wall, // Exact wall descriptor
        wall_failed: wall,
        reason,
        fix,
        attacker_ip: clientIp,
        attacker_port: clientPort,
        attacker_logs: {
          ip: clientIp,
          port: clientPort,
          user_agent: userAgent,
          method: method,
          path: path,
          target_evidence: evidence || "N/A",
          jailed: action === "BAN_IP_24H",
          jailed_until: action === "BAN_IP_24H" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          timestamp: new Date().toISOString(),
        },
        threat_actor_profile: dossier.status === "DOSSIER_COMPILED" ? {
          persona: dossier.classifiedPersona,
          threat_score: dossier.threatScore,
          mitre_attack_techniques: dossier.mitreAttckTechniques,
        } : null,
        vpn_telemetry: vpnInfo,
        site_classification: siteContext,
        duration_ms: Date.now() - startTime,
        tier,
      };

      if (isDeception) {
        response.defense_mode = defenseMode;
        response.decoy_payload = DeceptionEngine.generateDecoy({ attackType: type || wall, path, body });
      }

      return SecretRedactor.sanitize(response);
    };

    // === TIER 0-CANARY: ACTIVE CANARY HONEYTOKEN TRIPWIRE ===
    const canaryMatch = canaryEngine.detectHoneytokens(JSON.stringify({ path, body, headers }));
    if (canaryMatch) {
      canaryEngine.tripwire({
        token: canaryMatch.token,
        clientIp,
        clientPort,
        userAgent,
        path,
        method,
        headers,
      });
      return handleBreach({
        wall: "LAYER 1: CANARY_TRIPWIRE",
        threat: "CRITICAL",
        reason: `Exfiltrated Canary Honeytoken (${canaryMatch.type.toUpperCase()}) detected in request context.`,
        fix: "Attacker attempted to utilize stolen bait credentials. Real credentials remain safe.",
        type: "CANARY_TRIPWIRE",
        tier: "TIER 0 (Canary Trap)",
        evidence: `Canary Token ID: ${canaryMatch.id} (${canaryMatch.type})`,
      });
    }

    // === TIER 0-SIGN: CLIENT-SIDE REQUEST SIGNATURE & ANTI-TAMPER SHIELD ===
    if (headers["x-fortress-signature"] || headers["X-Fortress-Signature"]) {
      const signCheck = requestSigner.verifySignature({ method, path, body, headers });
      if (!signCheck.valid) {
        return handleBreach({
          wall: "WALL: Request Signature Tampering",
          threat: "CRITICAL",
          reason: signCheck.reason,
          fix: "Ensure request originated from authentic Fortress SDK and payload was not modified in transit.",
          type: "REQUEST_TAMPERING",
          tier: "TIER 0 (Client Cryptographic Shield)",
          evidence: "HMAC Signature Mismatch / Replay Detected",
        });
      }
    }

    // === TIER 0-PATCH: AUTONOMOUS VIRTUAL PATCHING HOTPATCH EVALUATION ===
    const patchCheck = virtualPatchEngine.evaluate({ path, method, headers, body });
    if (patchCheck.triggered) {
      return handleBreach({
        wall: patchCheck.wall,
        threat: "HIGH",
        reason: patchCheck.reason,
        fix: patchCheck.fix,
        type: "VIRTUAL_PATCH_BREACH",
        tier: "TIER 1 (Virtual Patching Shield)",
        evidence: `Virtual Patch: ${patchCheck.patchId} (${patchCheck.cwe})`,
      });
    }

    // === TIER 0A: JSON RECURSION & COMPLEXITY GUARD (Billion Laughs / DoS) ===
    if (body && typeof body === "object") {
      const depth = AnomalyScorer.calculateObjectDepth(body);
      if (depth > 7) {
        return handleBreach({
          wall: "LAYER 0: Complexity (JSON Nesting DoS)",
          threat: "HIGH",
          reason: `Payload exceeds maximum safe nesting depth (${depth}/7 levels).`,
          fix: "Flatten object schema and avoid recursive payload nesting.",
          type: "JSON_NESTING_DOS",
          tier: "TIER 0 (DoS Complexity Shield)",
          evidence: `Object Depth: ${depth} levels`,
        });
      }
    }

    // === TIER 0B: HONEYPOT CANARY TRAPS ===
    const honeypot = AnomalyScorer.checkHoneypots(body);
    if (honeypot && honeypot.triggered) {
      return handleBreach({
        wall: "LAYER 0: Honeypot Canary Trap",
        threat: "CRITICAL",
        reason: honeypot.reason,
        fix: honeypot.fix,
        type: "HONEYPOT_TRAP",
        tier: "TIER 0 (Honeypot Trap)",
        evidence: `Canary Field: '${honeypot.field}'`,
      });
    }

    // === TIER 1: INSTANT KILL PATTERN MATCH (<2ms) ===
    const allStrings = flattenStrings({ path, headers, body });
    for (const rawStr of allStrings) {
      const decoded = deepDecode(rawStr);

      // Check SSRF Risks (Cloud Metadata & Private IPs)
      if (
        decoded.includes("169.254.169.254") ||
        decoded.includes("metadata.google") ||
        decoded.includes("instance-data") ||
        decoded.includes("http://") ||
        decoded.includes("https://") ||
        decoded.includes("127.0.0.1")
      ) {
        const ssrf = SsrfShield.isSsrfRisk(decoded);
        if (!ssrf.safe) {
          return handleBreach({
            wall: ssrf.wall || "LAYER 1: SSRF_CLOUD_METADATA",
            threat: ssrf.threat,
            reason: ssrf.reason || "Attempted Cloud Metadata Access",
            fix: ssrf.fix,
            type: "SSRF_CLOUD_METADATA",
            tier: "TIER 1 (SSRF Shield)",
            evidence: decoded,
          });
        }
      }

      // Check Regex Attack Signatures
      for (const rule of LAYER_1_PATTERNS) {
        if (rule.regex.test(decoded)) {
          return handleBreach({
            wall: `LAYER 1: ${rule.type}`,
            threat: rule.threat,
            reason: rule.reason,
            fix: rule.fix,
            type: rule.type,
            tier: "TIER 1 (In-Memory Fast Shield)",
            evidence: decoded,
          });
        }
      }
    }

    // === TIER 2A: SENSITIVE DATA EXPOSURE AUDIT ===
    const dataLeaks = BountyReporter.scanDataLeaks(allStrings.join(" "));
    if (dataLeaks.length > 0) {
      const topLeak = dataLeaks[0];
      return handleBreach({
        wall: `LAYER 2: Sensitive Data Exposure (${topLeak.type})`,
        threat: topLeak.severity,
        reason: `Exposed secret or PCI-DSS card data detected in payload: ${topLeak.matched}`,
        fix: "Mask or redact credentials and card details before transmission.",
        type: "DATA_LEAK",
        tier: "TIER 2 (Data Leak Shield)",
        evidence: topLeak.matched,
      });
    }

    // === TIER 2B: JWT DEEP SECURITY AUDIT ===
    const authHeader = headers["authorization"] || headers["Authorization"] || "";
    const jwtToken = authHeader.replace(/^Bearer\s+/i, "") || (body && typeof body === "object" ? body.token || body.jwt : null);
    if (typeof jwtToken === "string" && jwtToken.includes(".")) {
      const jwtAudit = JwtAuditor.auditToken(jwtToken);
      if (jwtAudit && jwtAudit.issues_count > 0) {
        const topIssue = jwtAudit.issues[0];
        if (topIssue.severity === "CRITICAL" || topIssue.severity === "HIGH") {
          return handleBreach({
            wall: `LAYER 2: JWT Security (${topIssue.type})`,
            threat: topIssue.severity,
            reason: topIssue.issue,
            fix: topIssue.fix,
            type: "JWT_ATTACK",
            tier: "TIER 2 (JWT Shield)",
            evidence: `Algorithm: ${jwtAudit.algorithm}`,
          });
        }
      }
    }

    // === TIER 2C: SHOPPING SYSTEM BYPASS & E-COMMERCE SHIELD ===
    if (siteContext.category === "E_COMMERCE_SHOPPING" && body) {
      const shoppingViolations = SiteClassifier.auditShoppingBypass(body);
      if (shoppingViolations.length > 0) {
        const topViolation = shoppingViolations[0];
        return handleBreach({
          wall: `LAYER 2: Shopping Bypass (${topViolation.type})`,
          threat: topViolation.severity,
          reason: topViolation.issue,
          fix: topViolation.fix,
          type: "SHOPPING_BYPASS",
          tier: "TIER 2 (Shopping Fortress Shield)",
          evidence: topViolation.type,
        });
      }
    }

    // === TIER 2D: FINANCIAL & PAYMENT RECALCULATION ENFORCEMENT (<5ms) ===
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
        return handleBreach({
          wall: "LAYER 2: Logic (Price Manipulation)",
          threat: "CRITICAL",
          reason: `Price manipulation vulnerability: client supplied financial field '${caughtField}' on payment path '${path}'.`,
          fix: "const canonicalPrice = await db.getProductPrice(item.productId); const total = canonicalPrice * item.quantity;",
          type: "PRICE_MANIPULATION",
          tier: "TIER 2 (Business Logic Shield)",
          evidence: `Field '${caughtField}' = ${body[caughtField]}`,
        });
      }

      // Negative or zero quantities
      if (body.quantity !== undefined || body.qty !== undefined) {
        const q = Number(body.quantity !== undefined ? body.quantity : body.qty);
        if (isNaN(q) || q <= 0 || !Number.isInteger(q)) {
          return handleBreach({
            wall: "LAYER 2: Logic (Quantity Bypass)",
            threat: "HIGH",
            reason: `Invalid cart quantity (${q}). Negative or non-integer quantities are disallowed.`,
            fix: "if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });",
            type: "QUANTITY_BYPASS",
            tier: "TIER 2 (Business Logic Shield)",
            evidence: `Quantity: ${q}`,
          });
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
        return handleBreach({
          wall: "LAYER 2: Logic (Missing Webhook Signature)",
          threat: "CRITICAL",
          reason: "Payment webhook received without cryptographic signature header (Stripe, Paystack, Flutterwave, Razorpay).",
          fix: "paymentShield.verifyWebhookSignature({ gateway: 'stripe', rawBody, headers, secret });",
          type: "UNSIGNED_WEBHOOK",
          tier: "TIER 2 (Business Logic Shield)",
          evidence: "Missing webhook headers",
        });
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
          return handleBreach({
            wall: "LAYER 3: Deep AI",
            threat: aiResult.threat_level,
            reason: aiResult.verdict,
            fix: aiResult.findings?.[0]?.fix || "Verify server-side business rules.",
            type: "DEEP_AI_BREACH",
            tier: "TIER 3 (Deep AI Neural Scanner)",
            evidence: aiResult.findings?.[0]?.issue || "AI Cognitive Breach",
          });
        }
      } catch (err) {
        console.warn("Deep AI scan fallback pass-through:", err.message);
      }
    }

    // === PASSED ALL FORTRESS WALLS ===
    jailService.recordEvent({
      ip: clientIp,
      port: clientPort,
      wall: "NONE",
      threat_level: "NONE",
      reason: "Passed all fortress walls",
      action: "ALLOW",
      path,
      user_agent: userAgent,
    });

    return SecretRedactor.sanitize({
      fortress_status: "SECURE",
      threat_level: "NONE",
      action: "ALLOW",
      reason: "Passed all fortress walls",
      client_ip: clientIp,
      client_port: clientPort,
      vpn_telemetry: vpnInfo,
      site_classification: siteContext,
      duration_ms: Date.now() - startTime,
      tier: "FORTRESS (Clean)",
    });
  }
}

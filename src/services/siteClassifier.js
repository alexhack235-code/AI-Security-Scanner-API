/**
 * Autonomous Application & API Classifier
 * Distinguishes between E-Commerce / Shopping, Fintech / Payment, Auth, and Standard Web APIs
 */
export class SiteClassifier {
  static classify({ path = "", body = {}, headers = {} }) {
    const lowerPath = (path || "").toLowerCase();
    const bodyStr = body ? (typeof body === "string" ? body : JSON.stringify(body)).toLowerCase() : "";
    const textCorpus = lowerPath + " " + bodyStr;

    // 1. E-Commerce / Shopping Indicators
    const ecommerceKeywords = [
      "cart",
      "checkout",
      "product",
      "products",
      "sku",
      "coupon",
      "voucher",
      "shipping",
      "order",
      "orders",
      "discount",
      "subtotal",
      "inventory",
      "catalog",
      "item_id",
      "itemid",
      "add_to_cart",
      "store",
      "shop",
    ];

    // 2. Fintech / Banking Indicators
    const fintechKeywords = [
      "wallet",
      "transfer",
      "deposit",
      "withdraw",
      "payout",
      "balance",
      "bank",
      "account_number",
      "recipient",
      "bvn",
      "iban",
      "swift",
      "beneficiary",
    ];

    // 3. Auth / Identity Indicators
    const authKeywords = [
      "login",
      "register",
      "signup",
      "signin",
      "oauth",
      "token",
      "password",
      "reset-password",
      "session",
      "2fa",
      "mfa",
      "jwt",
    ];

    let ecommerceScore = 0;
    let fintechScore = 0;
    let authScore = 0;

    ecommerceKeywords.forEach((kw) => {
      if (textCorpus.includes(kw)) ecommerceScore += 1;
    });

    fintechKeywords.forEach((kw) => {
      if (textCorpus.includes(kw)) fintechScore += 1;
    });

    authKeywords.forEach((kw) => {
      if (textCorpus.includes(kw)) authScore += 1;
    });

    if (ecommerceScore >= 2 || (ecommerceScore >= 1 && (path.includes("cart") || path.includes("checkout")))) {
      return {
        category: "E_COMMERCE_SHOPPING",
        confidence: Math.min(1.0, 0.4 + ecommerceScore * 0.2),
        active_defense_profile: "SHOPPING_FORTRESS_V3",
        enforced_rules: [
          "STRICT_CLIENT_PRICE_LOCKDOWN",
          "CART_NEGATIVE_QUANTITY_SHIELD",
          "DISCOUNT_STACKING_RESTRICTION",
          "ORDER_STATE_MACHINE_INTEGRITY",
        ],
      };
    }

    if (fintechScore >= 2 || path.includes("transfer") || path.includes("wallet")) {
      return {
        category: "FINTECH_BANKING",
        confidence: Math.min(1.0, 0.4 + fintechScore * 0.2),
        active_defense_profile: "FINTECH_TRANSACTION_GUARD",
        enforced_rules: [
          "IDEMPOTENCY_KEY_ENFORCEMENT",
          "DOUBLE_SPENDING_PREVENTION",
          "RECIPIENT_OWNERSHIP_AUDIT",
          "AMOUNT_SIGNING_VERIFICATION",
        ],
      };
    }

    if (authScore >= 2 || path.includes("auth") || path.includes("login")) {
      return {
        category: "AUTHENTICATION_IAM",
        confidence: Math.min(1.0, 0.4 + authScore * 0.2),
        active_defense_profile: "IAM_BRUTE_FORCE_SHIELD",
        enforced_rules: [
          "AGGRESSIVE_RATE_LIMITING",
          "CREDENTIAL_STUFFING_DETECTION",
          "TIMING_ATTACK_MITIGATION",
        ],
      };
    }

    return {
      category: "GENERIC_WEB_API",
      confidence: 0.6,
      active_defense_profile: "STANDARD_FORTRESS_SHIELD",
      enforced_rules: ["OWASP_TOP_10_DEFENSE", "INPUT_SANITATION"],
    };
  }

  /**
   * Applies shopping-specific bypass detection on the request
   */
  static auditShoppingBypass(body) {
    const violations = [];

    if (!body || typeof body !== "object") return violations;

    // 1. Coupon Stacking / Abuse Check
    if (Array.isArray(body.coupons) && body.coupons.length > 1) {
      violations.push({
        type: "COUPON_STACKING_BYPASS",
        severity: "HIGH",
        issue: `Multiple coupons submitted simultaneously (${body.coupons.join(", ")}). Unchecked coupon stacking can reduce order total to $0.`,
        fix: "Enforce max 1 promotional coupon per order on the backend.",
      });
    }

    // 2. Order State Tampering (e.g. { status: 'PAID' } sent from client)
    const dangerousStatusFields = ["status", "payment_status", "order_status", "is_paid", "paid"];
    for (const field of dangerousStatusFields) {
      if (body[field] !== undefined) {
        violations.push({
          type: "ORDER_STATE_TAMPERING",
          severity: "CRITICAL",
          issue: `Client attempted to dictate order state via '${field}: ${body[field]}'.`,
          fix: "Never accept order status from the client. Status must only be mutated by authenticated payment webhooks.",
        });
      }
    }

    // 3. Negative Shipping / Tax Manipulation
    if (body.shipping_fee !== undefined && Number(body.shipping_fee) < 0) {
      violations.push({
        type: "NEGATIVE_SHIPPING_TAMPERING",
        severity: "CRITICAL",
        issue: "Negative shipping fee submitted to artificially reduce total price.",
        fix: "Calculate shipping and taxes strictly server-side.",
      });
    }

    return violations;
  }
}

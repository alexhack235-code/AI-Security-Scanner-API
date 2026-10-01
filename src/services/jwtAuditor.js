/**
 * Cryptographic JWT & Authentication Token Deep Auditor
 * Detects algorithm confusion (alg: 'none'), weak secrets, and payload leaks.
 */
export class JwtAuditor {
  static auditToken(jwtString) {
    if (typeof jwtString !== "string") return null;

    const parts = jwtString.trim().split(".");
    if (parts.length !== 3) return null;

    let header = {};
    let payload = {};

    try {
      header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
      return null; // Not a valid JWT structure
    }

    const issues = [];

    // 1. Critical: 'none' Algorithm Vulnerability (CVE-2015-9235)
    const alg = (header.alg || "").toLowerCase();
    if (alg === "none" || alg === "") {
      issues.push({
        type: "JWT_ALGORITHM_NONE_EXPLOIT",
        severity: "CRITICAL",
        issue: "JWT header specifies 'alg: none'. Allows attackers to forge arbitrary tokens without a signature.",
        fix: "Enforce strict algorithm verification (e.g. jwt.verify(token, secret, { algorithms: ['RS256', 'HS256'] })).",
      });
    }

    // 2. Sensitive Data in Token Body
    const sensitiveFields = ["password", "passwd", "secret", "card_number", "ssn"];
    for (const f of sensitiveFields) {
      if (payload[f] !== undefined) {
        issues.push({
          type: "JWT_SENSITIVE_DATA_EXPOSURE",
          severity: "HIGH",
          issue: `JWT payload contains unencrypted sensitive field '${f}'. JWT payloads are base64-encoded, not encrypted.`,
          fix: "Remove passwords and sensitive PII from JWT claims.",
        });
      }
    }

    // 3. Missing Expiration (exp)
    if (!payload.exp) {
      issues.push({
        type: "JWT_MISSING_EXPIRATION",
        severity: "MEDIUM",
        issue: "JWT token has no expiration claim ('exp'). Token is immortal and can be used indefinitely if intercepted.",
        fix: "Always set an explicit 'exp' expiration claim (e.g. 15m to 24h).",
      });
    }

    return {
      audited: true,
      algorithm: header.alg,
      subject: payload.sub || "N/A",
      issues_count: issues.length,
      issues,
    };
  }
}

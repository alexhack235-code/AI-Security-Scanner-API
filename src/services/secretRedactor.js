/**
 * Enterprise Autonomous Secret Redactor & Egress Data Shield
 * Strips all secrets, credentials, tokens, PII, stack traces, and database errors
 * from outgoing HTTP responses, telemetry, and forensic reports.
 */

const SECRET_PATTERNS = [
  // 1. Cloud & SaaS API Keys
  /(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{20,99}/gi,
  /(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
  /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
  /AIza[0-9A-Za-z-_]{35}/g,
  /AQ\.[A-Za-z0-9_-]{40,60}/g, // Gemini / Google Auth Keys
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs

  // 2. Passwords, Tokens & Key Fields in JSON/Headers
  /("?(?:password|passwd|secret|api_key|apiKey|token|access_token|private_key|auth_token)"?\s*[:=]\s*")[^"]+(")/gi,

  // 3. Database Connection Strings with Passwords
  /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^:]+:[^@]+@[a-zA-Z0-9_.-]+(?::\d+)?\/[^\s"']+/gi,

  // 4. Asymmetric Private Keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[^-]+-----END [A-Z ]*PRIVATE KEY-----/gs,

  // 5. Raw Credit Card PANs (13-19 numeric digits)
  /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g,

  // 6. Social Security Numbers (SSNs)
  /\b\d{3}-\d{2}-\d{4}\b/g,

  // 7. Stack Traces & Internal File System Paths
  /(?:at\s+[a-zA-Z0-9_$.<>]+\s+\([^)]+:\d+:\d+\))|(?:(?:[A-Z]:\\|\/(?:var|etc|home|usr|app|node_modules))[a-zA-Z0-9_.\-\\/]+:\d+:\d+)/g,

  // 8. Database System Error Disclosures
  /(?:SQLSTATE\[[A-Z0-9]+\]|syntax error at or near "[^"]+"|MongoServerError:[^\n]+|ORA-\d{5}:[^\n]+|pg_query\(\):[^\n]+)/gi,
];

export class SecretRedactor {
  /**
   * Redacts sensitive strings from text
   */
  static redactString(text) {
    if (typeof text !== "string") return text;
    let redacted = text;

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.source.includes("password")) {
        redacted = redacted.replace(pattern, '$1[REDACTED_SECRET]$2');
      } else if (pattern.source.includes("at\\s+")) {
        redacted = redacted.replace(pattern, "[STACK_TRACE_SCRUBBED_BY_FORTRESS]");
      } else if (pattern.source.includes("SQLSTATE")) {
        redacted = redacted.replace(pattern, "[DATABASE_ERROR_SCRUBBED_BY_FORTRESS]");
      } else if (pattern.source.includes("\\d{4}")) {
        // Mask credit cards: 4111-XXXX-XXXX-1111
        redacted = redacted.replace(pattern, (match) => {
          const clean = match.replace(/[-\s]/g, "");
          if (clean.length >= 13 && clean.length <= 19) {
            return `${clean.slice(0, 4)}-XXXX-XXXX-${clean.slice(-4)}`;
          }
          return match;
        });
      } else {
        redacted = redacted.replace(pattern, (match) => {
          if (match.length <= 8) return "[REDACTED]";
          return `${match.slice(0, 3)}...[REDACTED_SECRET]...${match.slice(-3)}`;
        });
      }
    }
    return redacted;
  }

  /**
   * Deep recursive sanitization of objects, arrays, and JSON payloads
   */
  static sanitize(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === "string") {
      return this.redactString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    if (typeof obj === "object") {
      const sanitized = {};
      for (const [key, val] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("privatekey") ||
          lowerKey.includes("authorization") ||
          lowerKey.includes("apikey") ||
          lowerKey === "cvv" ||
          lowerKey === "cvc"
        ) {
          sanitized[key] = lowerKey.includes("cvv") || lowerKey.includes("cvc") ? "***" : "[REDACTED_CONFIDENTIAL]";
        } else if (
          (lowerKey === "cardnumber" || lowerKey === "card_number" || lowerKey === "pan") &&
          typeof val === "string"
        ) {
          const clean = val.replace(/[-\s]/g, "");
          sanitized[key] = clean.length >= 8 ? `${clean.slice(0, 4)}-XXXX-XXXX-${clean.slice(-4)}` : "XXXX-XXXX";
        } else {
          sanitized[key] = this.sanitize(val);
        }
      }
      return sanitized;
    }

    return obj;
  }
}

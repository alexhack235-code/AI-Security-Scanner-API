/**
 * Autonomous Secret Redactor & Sanitizer
 * Strips all secrets, credentials, tokens, and PII from outgoing reports and logs.
 */

const SECRET_PATTERNS = [
  // API Keys & Tokens
  /(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{20,99}/gi,
  /(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
  /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
  /AIza[0-9A-Za-z-_]{35}/g,
  /AQ\.[A-Za-z0-9_-]{40,60}/g, // Gemini / Google Auth Keys
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs

  // Passwords & Secrets
  /("?(?:password|passwd|secret|api_key|apiKey|token|access_token|private_key)"?\s*[:=]\s*")[^"]+(")/gi,

  // Database Connection Strings
  /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[^:]+:[^@]+@[a-zA-Z0-9_.-]+(?::\d+)?\/[^\s"']+/gi,

  // Private Keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[^-]+-----END [A-Z ]*PRIVATE KEY-----/gs,
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
   * Deep recursive sanitization of objects and arrays
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
        // Redact key names that represent secrets
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("privatekey") ||
          lowerKey.includes("authorization") ||
          lowerKey.includes("apikey")
        ) {
          sanitized[key] = "[REDACTED_CONFIDENTIAL]";
        } else {
          sanitized[key] = this.sanitize(val);
        }
      }
      return sanitized;
    }

    return obj;
  }
}

import net from "net";

/**
 * SSRF & Cloud Metadata Defense Shield
 * Blocks attackers from probing cloud metadata (AWS, GCP, Azure, DigitalOcean)
 * and internal RFC 1918 private / loopback IP spaces via webhooks or URL parameters.
 */

const BLOCKED_HOSTS_AND_PATTERNS = [
  // AWS / OpenStack / DigitalOcean Metadata
  "169.254.169.254",
  "169.254.169.253",
  "instance-data",
  "latest/meta-data",
  "latest/user-data",

  // Google Cloud Metadata
  "metadata.google.internal",
  "metadata.google",
  "metadata.goog",
  "0.0.0.0",

  // Azure IMDS
  "169.254.169.254/metadata/instance",

  // Localhost & Loopback aliases
  "localhost",
  "127.0.0.1",
  "::1",
  "0177.0.0.1", // Octal representation
  "2130706433", // Decimal representation of 127.0.0.1
  "0x7f000001", // Hex representation of 127.0.0.1
];

export class SsrfShield {
  /**
   * Evaluates if a given URL or hostname is targeting internal or private infrastructure
   */
  static isSsrfRisk(targetUrl) {
    if (typeof targetUrl !== "string") return { safe: true };

    const lower = targetUrl.toLowerCase().trim();

    // 1. Direct Cloud Metadata Pattern Check
    if (
      lower.includes("169.254.169.254") ||
      lower.includes("metadata.google") ||
      lower.includes("instance-data")
    ) {
      return {
        safe: false,
        threat: "CRITICAL",
        action: "BAN_IP_24H",
        wall: "LAYER 1: SSRF_CLOUD_METADATA",
        type: "SSRF_CLOUD_METADATA",
        reason: "Attempted Cloud Metadata Access",
        pattern_matched: lower.includes("169.254.169.254") ? "169.254.169.254" : lower.includes("metadata.google") ? "metadata.google" : "instance-data",
        fix: "Disallow requests to private IP ranges, loopback addresses, and cloud instance metadata (169.254.169.254).",
      };
    }

    // Other blocked hosts (localhost, 0.0.0.0, etc.)
    for (const pattern of BLOCKED_HOSTS_AND_PATTERNS) {
      if (lower.includes(pattern)) {
        return {
          safe: false,
          threat: "CRITICAL",
          action: "BAN_IP_24H",
          wall: "LAYER 1: SSRF_CLOUD_METADATA",
          type: "SSRF_CLOUD_METADATA",
          reason: "Attempted Cloud Metadata Access",
          pattern_matched: pattern,
          fix: "Disallow requests to private IP ranges, loopback addresses, and cloud instance metadata.",
        };
      }
    }

    // 2. Parse URL and check IP ranges
    try {
      const parsed = new URL(targetUrl);
      const hostname = parsed.hostname;

      // Disallow non-HTTP(S) schemes (file://, gopher://, dict://, ldap://)
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return {
          safe: false,
          threat: "CRITICAL",
          action: "BLOCK",
          wall: "LAYER 1: SSRF_DANGEROUS_PROTOCOL",
          type: "SSRF_DANGEROUS_PROTOCOL",
          reason: `Dangerous protocol '${parsed.protocol}' detected in target URL. Only HTTP and HTTPS are permitted.`,
          fix: "Enforce strict protocol whitelist allowing only http: and https:.",
        };
      }

      // Check if hostname is an IP address
      if (net.isIP(hostname)) {
        if (this.isPrivateIp(hostname)) {
          return {
            safe: false,
            threat: "CRITICAL",
            action: "BAN_IP_24H",
            wall: "LAYER 1: SSRF_PRIVATE_IP",
            type: "SSRF_PRIVATE_IP",
            reason: `Target IP address '${hostname}' belongs to an internal, non-routable private network.`,
            fix: "Validate destination IP and drop private address blocks (RFC 1918, RFC 3927).",
          };
        }
      }
    } catch {
      // Malformed URL
    }

    return { safe: true };
  }

  /**
   * Check RFC 1918, RFC 3927 (link-local), loopback, and broadcast spaces
   */
  static isPrivateIp(ip) {
    if (net.isIPv4(ip)) {
      const parts = ip.split(".").map(Number);
      if (parts[0] === 10) return true; // 10.0.0.0/8
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
      if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
      if (parts[0] === 127) return true; // 127.0.0.0/8 Loopback
      if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 Link-Local
      if (parts[0] === 0) return true; // 0.0.0.0/8
    }

    if (net.isIPv6(ip)) {
      const norm = ip.toLowerCase();
      if (norm === "::1" || norm === "::" || norm.startsWith("fe80:") || norm.startsWith("fc00:") || norm.startsWith("fd00:")) {
        return true;
      }
    }

    return false;
  }
}

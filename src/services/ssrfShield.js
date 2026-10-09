import net from "net";
import http from "http";
import https from "https";
import dns from "dns/promises";

/**
 * FORTRESS SSRF & CLOUD METADATA DEFENSE SHIELD
 * Blocks attackers from probing cloud metadata (AWS, GCP, Azure, DigitalOcean)
 * and internal RFC 1918 / RFC 3927 private / loopback IP spaces via webhooks,
 * URL parameters, DNS rebinding, or alternative IP encodings.
 */

const BLOCKED_HOST_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".localdomain",
  ".home.arpa",
  "instance-data",
  "metadata.google.internal",
  "metadata.google",
  "metadata.goog",
  // Known public wildcard DNS services pointing to loopback
  "localtest.me",
  "lvh.me",
  "vcap.me",
  ".nip.io",
  ".sslip.io",
];

const BLOCKED_PATTERNS = [
  "169.254.169.254",
  "169.254.169.253",
  "latest/meta-data",
  "latest/user-data",
  "metadata/instance",
  "metadata.google",
  "instance-data",
  "0.0.0.0",
];

// Non-routable / internal IPv4 space (RFC 1918, 3927, 6598, 5737, 2544, 6890, multicast, reserved, broadcast)
const BLOCKED_V4 = new net.BlockList();
[
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4], // includes 255.255.255.255
].forEach(([addr, prefix]) => BLOCKED_V4.addSubnet(addr, prefix, "ipv4"));

// Non-routable / internal / tunnelling IPv6 space
const BLOCKED_V6 = new net.BlockList();
BLOCKED_V6.addAddress("::", "ipv6"); // Unspecified
BLOCKED_V6.addAddress("::1", "ipv6"); // Loopback
[
  ["fc00::", 7], // Unique Local
  ["fe80::", 10], // Link-Local
  ["fec0::", 10], // Site-Local (deprecated, still routed internally by some stacks)
  ["ff00::", 8], // Multicast
  ["100::", 64], // Discard-only
  ["2001:db8::", 32], // Documentation
  ["2001::", 32], // Teredo (tunnels to arbitrary IPv4)
  ["2002::", 16], // 6to4 (embeds arbitrary IPv4, e.g. 2002:7f00:1:: -> 127.0.0.1)
  ["64:ff9b:1::", 48], // Local-use NAT64
].forEach(([addr, prefix]) => BLOCKED_V6.addSubnet(addr, prefix, "ipv6"));

export class SsrfShield {
  /**
   * Synchronous heuristic SSRF check for inline WAF inspections
   * @param {string} targetUrl - Target URL to evaluate
   * @returns {{ safe: boolean, threat?: string, action?: string, wall?: string, type?: string, reason?: string, fix?: string }}
   */
  static isSsrfRisk(targetUrl) {
    if (typeof targetUrl !== "string") return { safe: true };

    const lower = targetUrl.toLowerCase().trim();

    // 1. Direct Cloud Metadata Pattern Check
    for (const pattern of BLOCKED_PATTERNS) {
      if (lower.includes(pattern)) {
        return {
          safe: false,
          threat: "CRITICAL",
          action: "BAN_IP_24H",
          wall: "LAYER 1: SSRF_CLOUD_METADATA",
          type: "SSRF_CLOUD_METADATA",
          reason: `Target URL references protected cloud metadata endpoint or token: '${pattern}'.`,
          pattern_matched: pattern,
          fix: "Disallow requests to private IP ranges, loopback addresses, and cloud instance metadata (169.254.169.254).",
        };
      }
    }

    // 2. Parse URL structure
    try {
      const parsed = new URL(targetUrl);
      const hostname = parsed.hostname.toLowerCase();

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

      // Check loopback / internal domain aliases
      for (const suffix of BLOCKED_HOST_SUFFIXES) {
        if (hostname === suffix || hostname.endsWith(suffix)) {
          return {
            safe: false,
            threat: "CRITICAL",
            action: "BAN_IP_24H",
            wall: "LAYER 1: SSRF_PRIVATE_IP",
            type: "SSRF_PRIVATE_IP",
            reason: `Target host '${hostname}' resolves to loopback/internal infrastructure alias.`,
            fix: "Disallow requests targeting internal domain names, loopback aliases, or wildcard DNS resolution services.",
          };
        }
      }

      // Normalized IP check (handles literal IPs, IPv4-mapped IPv6, decimal IPs, octal, and hex)
      const normalizedIp = this.normalizeIpAddress(hostname);
      if (normalizedIp) {
        if (this.isPrivateIp(normalizedIp)) {
          return {
            safe: false,
            threat: "CRITICAL",
            action: "BAN_IP_24H",
            wall: "LAYER 1: SSRF_PRIVATE_IP",
            type: "SSRF_PRIVATE_IP",
            reason: `Target IP address '${normalizedIp}' belongs to an internal, non-routable private network.`,
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
   * Asynchronous deep SSRF check with active DNS resolution and IP verification
   * @param {string} targetUrl - Target URL to evaluate
   * @returns {Promise<{ safe: boolean, reason?: string, type?: string }>}
   */
  static async isSsrfRiskAsync(targetUrl) {
    const syncCheck = this.isSsrfRisk(targetUrl);
    if (!syncCheck.safe) return syncCheck;

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return { safe: true }; // Not a URL: nothing to resolve
    }

    // IP literals were fully classified by the sync check
    if (this.normalizeIpAddress(parsed.hostname)) return { safe: true };

    const hostname = parsed.hostname;
    let addresses;
    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch (err) {
      // FAIL CLOSED: an unresolvable host must never be treated as safe
      return {
        safe: false,
        threat: "MEDIUM",
        action: "BLOCK",
        wall: "LAYER 1: SSRF_DNS_UNRESOLVABLE",
        type: "SSRF_DNS_UNRESOLVABLE",
        reason: `Domain '${hostname}' could not be resolved (${err.code || err.message}). Blocked by fail-closed SSRF Guard.`,
        fix: "Only allow outbound requests to hosts that resolve to public IP addresses.",
      };
    }

    if (!addresses || addresses.length === 0) {
      return {
        safe: false,
        threat: "MEDIUM",
        action: "BLOCK",
        wall: "LAYER 1: SSRF_DNS_UNRESOLVABLE",
        type: "SSRF_DNS_UNRESOLVABLE",
        reason: `Domain '${hostname}' returned no addresses. Blocked by fail-closed SSRF Guard.`,
      };
    }

    for (const addr of addresses) {
      if (this.isPrivateIp(addr.address)) {
        return {
          safe: false,
          threat: "CRITICAL",
          action: "BAN_IP_24H",
          wall: "LAYER 1: SSRF_DNS_REBINDING",
          type: "SSRF_DNS_REBINDING",
          reason: `Domain '${hostname}' resolves to internal/private IP (${addr.address}) via DNS. Prohibited by SSRF Guard.`,
          fix: "Enforce pre-request DNS resolution validation to neutralize DNS rebinding attacks.",
        };
      }
    }

    return { safe: true };
  }

  /**
   * Drop-in `lookup` for http/https/net that validates EVERY resolved address at connect time.
   * Because the socket connects to exactly the address validated here, a DNS-rebinding domain
   * cannot pass a pre-check and then swap to 127.0.0.1 / 169.254.169.254 before the request.
   */
  static safeLookup(hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    options = options || {};

    dns
      .lookup(hostname, { all: true, family: options.family || 0 })
      .then((addresses) => {
        if (!addresses || addresses.length === 0) {
          const e = new Error(`SSRF Guard: '${hostname}' did not resolve to any address.`);
          e.code = "ENOTFOUND";
          throw e;
        }
        const blocked = addresses.find((a) => SsrfShield.isPrivateIp(a.address));
        if (blocked) {
          const e = new Error(
            `Target '${hostname}' resolved to prohibited IP (${blocked.address}) at connect time. Prohibited by SSRF Guard.`
          );
          e.code = "ESSRFBLOCKED";
          throw e;
        }
        if (options.all) {
          callback(null, addresses);
        } else {
          callback(null, addresses[0].address, addresses[0].family);
        }
      })
      .catch((err) => callback(err));
  }

  /**
   * Minimal SSRF-safe HTTP(S) request that pins the connection to a validated IP.
   * Resolves with { status, headers } where headers is a WHATWG Headers instance.
   * The response body is discarded.
   */
  static pinnedRequest(targetUrl, { method = "GET", headers = {}, timeoutMs = 8000 } = {}) {
    const url = typeof targetUrl === "string" ? new URL(targetUrl) : targetUrl;
    if (!["http:", "https:"].includes(url.protocol)) {
      return Promise.reject(new Error(`Protocol '${url.protocol}' blocked by SSRF Guard.`));
    }

    const literal = this.normalizeIpAddress(url.hostname);
    if (literal && this.isPrivateIp(literal)) {
      // Node skips `lookup` for IP literals, so they must be validated here
      return Promise.reject(new Error(`Target IP (${literal}) is a private/loopback address. Prohibited by SSRF Guard.`));
    }

    const transport = url.protocol === "https:" ? https : http;
    return new Promise((resolve, reject) => {
      const req = transport.request(
        url,
        { method, headers, lookup: SsrfShield.safeLookup, timeout: timeoutMs },
        (res) => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v));
            else responseHeaders.set(key, String(value));
          }
          res.destroy(); // Headers only: never buffer attacker-controlled bodies
          resolve({ status: res.statusCode, headers: responseHeaders });
        }
      );
      req.on("timeout", () => req.destroy(new Error(`Request to ${url.host} timed out after ${timeoutMs}ms.`)));
      req.on("error", reject);
      req.end();
    });
  }

  /**
   * Normalizes arbitrary IP representations (decimal, hex, bracketed IPv6) to a literal net.isIP() accepts.
   * Returns null when the hostname is not an IP literal.
   */
  static normalizeIpAddress(hostname) {
    if (!hostname || typeof hostname !== "string") return null;

    const clean = hostname.replace(/^\[|\]$/g, ""); // Strip IPv6 brackets [::1]

    // Direct IPv4 or IPv6 (IPv4-mapped/compatible forms are decoded by isPrivateIp)
    if (net.isIPv4(clean) || net.isIPv6(clean)) {
      return clean;
    }

    // Hex representation (e.g. 0x7f000001)
    if (/^0x[0-9a-fA-F]{8}$/i.test(clean)) {
      const intVal = parseInt(clean, 16);
      return this.intToIpv4(intVal);
    }

    // Decimal representation (e.g. 2130706433)
    if (/^\d{8,10}$/.test(clean)) {
      const intVal = parseInt(clean, 10);
      if (intVal >= 0 && intVal <= 4294967295) {
        return this.intToIpv4(intVal);
      }
    }

    return null;
  }

  static intToIpv4(intVal) {
    return [
      (intVal >>> 24) & 255,
      (intVal >>> 16) & 255,
      (intVal >>> 8) & 255,
      intVal & 255,
    ].join(".");
  }

  /**
   * Expand an IPv6 literal into 8 numeric hextets (handles '::' and a trailing dotted IPv4).
   * Returns null if the input is not a well-formed IPv6 address.
   */
  static expandIpv6(ip) {
    let addr = String(ip).toLowerCase().split("%")[0]; // drop zone id (fe80::1%eth0)

    const dotted = addr.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (dotted) {
      if (!net.isIPv4(dotted[2])) return null;
      const p = dotted[2].split(".").map(Number);
      addr = `${dotted[1]}${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
    }

    const halves = addr.split("::");
    if (halves.length > 2) return null;
    const head = halves[0] ? halves[0].split(":") : [];
    const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
    const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
    if (fill < 0) return null;

    const groups = [...head, ...Array(fill).fill("0"), ...tail].map((h) => (/^[0-9a-f]{1,4}$/.test(h) ? parseInt(h, 16) : NaN));
    if (groups.length !== 8 || groups.some((g) => Number.isNaN(g))) return null;
    return groups;
  }

  /**
   * Classify an IP as internal/non-routable. Unknown formats are treated as private (fail closed).
   * IPv6 forms that embed an IPv4 address (mapped, compatible, SIIT, NAT64) are decoded and the
   * embedded IPv4 is re-checked, defeating bypasses like [::ffff:7f00:1] or [64:ff9b::a9fe:a9fe].
   */
  static isPrivateIp(rawIp) {
    if (!rawIp || typeof rawIp !== "string") return true;

    const ip = rawIp.trim().replace(/^\[|\]$/g, "");

    if (net.isIPv4(ip)) {
      return BLOCKED_V4.check(ip, "ipv4");
    }

    if (net.isIPv6(ip)) {
      if (BLOCKED_V6.check(ip, "ipv6")) return true;

      const g = this.expandIpv6(ip);
      if (!g) return true;

      const embeddedV4 = `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
      const zeros = (from, to) => g.slice(from, to).every((x) => x === 0);

      // ::/96 IPv4-compatible (deprecated) and ::ffff:0:0/96 IPv4-mapped
      if (zeros(0, 5) && (g[5] === 0 || g[5] === 0xffff)) return BLOCKED_V4.check(embeddedV4, "ipv4");
      // ::ffff:0:0:0/96 IPv4-translated (SIIT)
      if (zeros(0, 4) && g[4] === 0xffff && g[5] === 0) return BLOCKED_V4.check(embeddedV4, "ipv4");
      // 64:ff9b::/96 well-known NAT64 prefix
      if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6)) return BLOCKED_V4.check(embeddedV4, "ipv4");

      return false;
    }

    return true; // Disallow unknown formats
  }
}

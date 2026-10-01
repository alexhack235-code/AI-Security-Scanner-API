/**
 * Autonomous VPN, Proxy, Tor, and Datacenter Detector
 * Detects anonymous traffic headers, proxy chains, and cloud bot infrastructure
 */

export class VpnDetector {
  static analyze(req) {
    const headers = req.headers || {};
    const normHeaders = Object.keys(headers).reduce((acc, k) => {
      acc[k.toLowerCase()] = headers[k];
      return acc;
    }, {});

    const flags = [];
    let isAnonymized = false;
    let proxyType = "DIRECT";

    // 1. Check for Standard Proxy & Relay Headers
    if (normHeaders["via"]) {
      flags.push("VIA_PROXY_HEADER");
      isAnonymized = true;
      proxyType = "HTTP_PROXY";
    }

    if (normHeaders["x-proxy-id"] || normHeaders["x-proxyuser-ip"]) {
      flags.push("EXPLICIT_PROXY_HEADER");
      isAnonymized = true;
      proxyType = "CORPORATE_OR_ANON_PROXY";
    }

    // 2. Multi-hop Proxy Chain in X-Forwarded-For
    const xForwardedFor = normHeaders["x-forwarded-for"];
    let chainLength = 1;
    if (xForwardedFor && typeof xForwardedFor === "string") {
      const hops = xForwardedFor.split(",").map((ip) => ip.trim());
      chainLength = hops.length;
      if (chainLength > 1) {
        flags.push(`MULTI_HOP_CHAIN (${chainLength}_HOPS)`);
        isAnonymized = true;
        proxyType = "MULTI_HOP_VPN_OR_PROXY";
      }
    }

    // 3. Tor / Anonymity Network Headers
    if (normHeaders["x-tor-exit-node"] || normHeaders["tor-circuit"]) {
      flags.push("TOR_EXIT_NODE");
      isAnonymized = true;
      proxyType = "TOR_ANONYMIZED_NETWORK";
    }

    // 4. Client User-Agent Anomaly (Common with automated proxy scrapers & scanners)
    const ua = (normHeaders["user-agent"] || "").toLowerCase();
    if (!ua || ua.includes("curl") || ua.includes("python") || ua.includes("go-http-client") || ua.includes("wget")) {
      flags.push("PROGRAMMATIC_OR_EMPTY_UA");
    }

    // 5. Cloudflare / CDN Relay Presence
    const isCdnRelayed = Boolean(normHeaders["cf-ray"] || normHeaders["x-vercel-id"]);
    if (isCdnRelayed && !isAnonymized) {
      proxyType = "CDN_OR_SERVERLESS_EDGE";
    }

    const confidence = isAnonymized
      ? Math.min(0.95, 0.6 + flags.length * 0.15)
      : 0.1;

    return {
      is_anonymized: isAnonymized,
      confidence,
      proxy_type: proxyType,
      flags,
      hops_count: chainLength,
      client_ip: req.clientIp || "unknown",
      analyzed_at: new Date().toISOString(),
    };
  }
}

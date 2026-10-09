import { config } from "../config.js";

/**
 * Extracts and sanitizes client IP address to prevent header spoofing.
 *
 * If trustProxy is NOT enabled, the connection socket address is used directly,
 * preventing attackers from injecting arbitrary X-Forwarded-For headers to frame
 * victims or bypass rate limits / IP bans.
 *
 * If trustProxy is enabled, Express's req.ip or the first hop from the proxy chain is used.
 */
export function getClientIp(req) {
  if (!req) return "127.0.0.1";

  // Pre-cached IP attached by ipJailMiddleware
  if (req.clientIp && req.clientIp !== "unknown") {
    return req.clientIp;
  }

  // If Express trust proxy is enabled, req.ip is computed safely by Express
  if (config.trustProxy) {
    if (req.ip) return normalizeIp(req.ip);

    const xff = req.headers?.["x-forwarded-for"];
    if (xff) {
      const firstIp = (Array.isArray(xff) ? xff[0] : xff).split(",")[0].trim();
      if (firstIp) return normalizeIp(firstIp);
    }
  }

  // Without trusted proxy, strictly use the direct TCP socket remote address
  const socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
  if (socketIp) {
    return normalizeIp(socketIp);
  }

  return "127.0.0.1";
}

function normalizeIp(ip) {
  if (!ip || typeof ip !== "string") return "127.0.0.1";
  let cleaned = ip.trim();
  // Strip IPv4-mapped IPv6 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  if (cleaned.startsWith("::ffff:")) {
    cleaned = cleaned.replace(/^::ffff:/, "");
  }
  return cleaned;
}

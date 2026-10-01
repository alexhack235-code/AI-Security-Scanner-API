import rateLimit from "express-rate-limit";
import { config } from "../config.js";

export const rateLimiterMiddleware = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      fortress_status: "BREACHED",
      threat_level: "HIGH",
      score: 0,
      walls_failed: ["WALL 2: Rate Limit / DoS Protection"],
      findings: [
        {
          type: "RATE_LIMIT_EXCEEDED",
          wall: "WALL 2: Traffic Control",
          severity: "HIGH",
          location: "API Gateway",
          issue: `Exceeded maximum quota of ${config.rateLimitMax} scans per ${config.rateLimitWindowMs / 1000}s.`,
          exploit_example: "Automated scanner flooding API and exhausting token allocations.",
          fix: "Implement client-side backoff or request elevated quota.",
        },
      ],
      verdict: "Scan blocked by FORTRESS Rate Limiting Shield.",
    });
  },
});

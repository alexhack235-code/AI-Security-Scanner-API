import { config } from "../config.js";

export const authMiddleware = (req, res, next) => {
  if (!config.fortressApiKey) {
    // Authentication disabled / public mode
    return next();
  }

  const clientKey =
    req.headers["x-fortress-key"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!clientKey || clientKey !== config.fortressApiKey) {
    return res.status(401).json({
      fortress_status: "BREACHED",
      threat_level: "HIGH",
      score: 0,
      walls_failed: ["WALL 3: Identity & Access Control"],
      findings: [
        {
          type: "UNAUTHORIZED_ACCESS",
          wall: "WALL 3: Authentication",
          severity: "HIGH",
          location: "Header: x-fortress-key or Authorization",
          issue: "Missing or invalid API key provided for FORTRESS Security Scanner.",
          exploit_example: "Unauthorized client querying private vulnerability scanning infrastructure.",
          fix: "Include valid 'x-fortress-key: <key>' or 'Authorization: Bearer <key>' header.",
        },
      ],
      verdict: "Access denied. Valid FORTRESS API credentials required.",
    });
  }

  next();
};

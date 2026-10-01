import { config } from "../config.js";

export const errorHandler = (err, req, res, next) => {
  console.error("🚨 FORTRESS INTERNAL ERROR:", err);

  const isDev = config.nodeEnv === "development";

  return res.status(err.status || 500).json({
    fortress_status: "ERROR",
    verdict: "An unexpected error occurred during security inspection.",
    error: isDev ? err.message : "Internal Scanner Error",
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  });
};

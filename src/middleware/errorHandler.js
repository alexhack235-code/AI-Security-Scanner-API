import { config } from "../config.js";
import { SecretRedactor } from "../services/secretRedactor.js";

export const errorHandler = (err, req, res, next) => {
  console.error("🚨 FORTRESS INTERNAL ERROR:", err);

  const isDev = config.nodeEnv === "development";
  const rawMessage = err.message || "Internal Scanner Error";
  const sanitizedMessage = SecretRedactor.redactString(rawMessage);

  return res.status(err.status || 500).json({
    fortress_status: "ERROR",
    verdict: "An unexpected error occurred during security inspection.",
    error: isDev ? sanitizedMessage : "Internal Scanner Error",
    ...(isDev && err.stack ? { stack: SecretRedactor.redactString(err.stack) } : {}),
  });
};

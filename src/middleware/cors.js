import cors from "cors";
import { config } from "../config.js";

const isDevelopment = config.nodeEnv === "development" || config.nodeEnv === "test";

if (config.allowedOrigins.includes("*") && !isDevelopment) {
  console.warn(
    "⚠️  [FORTRESS CORS] ALLOWED_ORIGINS contains '*', which is ignored outside development because credentials are enabled. List explicit origins instead."
  );
}

const isOriginAllowed = (origin) => {
  // Allow requests with no origin (like mobile apps, curl, server-to-server)
  if (!origin) return true;

  // Exact match against the explicit allowlist
  if (config.allowedOrigins.includes(origin)) return true;

  // Wildcard + any localhost port ONLY in development: combined with credentials:true these would let
  // any local app/dev-server/malicious package read authenticated production responses.
  if (isDevelopment) {
    if (config.allowedOrigins.includes("*")) return true;
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
};

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: Origin '${origin}' is not allowed by FORTRESS.`));
    }
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-fortress-key",
    "x-vault-key",
    "x-vault-pass",
    "x-fortress-session-id",
    "x-fortress-signature",
    "x-fortress-timestamp",
    "x-fortress-nonce",
  ],
  credentials: true,
  maxAge: 86400,
});

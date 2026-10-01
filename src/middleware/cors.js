import cors from "cors";
import { config } from "../config.js";

const isOriginAllowed = (origin) => {
  // Allow requests with no origin (like mobile apps, curl, server-to-server)
  if (!origin) return true;

  // Wildcard allow in development if explicitly set
  if (config.allowedOrigins.includes("*")) return true;

  // Exact match
  if (config.allowedOrigins.includes(origin)) return true;

  // Support Vercel preview deployments if explicitly configured or localhost with any port
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }
  } catch {
    return false;
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
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-fortress-key"],
  credentials: true,
  maxAge: 86400,
});

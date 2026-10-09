import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// Fail-safe default: anything that is not explicitly "development"/"test" is treated as production
// so verbose errors and stack traces are never exposed by an unset NODE_ENV.
const nodeEnv = process.env.NODE_ENV || "production";
const isProduction = nodeEnv !== "development" && nodeEnv !== "test";
const vaultEnforce = process.env.VAULT_ENFORCE !== "false";

// Values that have ever shipped in docs/examples. Never accept them as a real master key.
const KNOWN_PUBLIC_MASTER_KEYS = new Set([
  "fortress_master_vault_pass_2026!",
  "your_master_key_here",
  "changeme",
  "password",
  "admin",
]);
const MIN_MASTER_KEY_LENGTH = 24;

const fingerprint = (secret) => crypto.createHash("sha256").update(secret).digest("hex").slice(0, 12);

// Secure master vault key resolution: never fall back to a predictable hardcoded string.
let resolvedMasterPass = process.env.VAULT_MASTER_KEY || process.env.FORTRESS_API_KEY;

if (resolvedMasterPass) {
  const weakReasons = [];
  if (KNOWN_PUBLIC_MASTER_KEYS.has(resolvedMasterPass.trim())) weakReasons.push("it is a publicly documented example value");
  if (resolvedMasterPass.trim().length < MIN_MASTER_KEY_LENGTH) weakReasons.push(`it is shorter than ${MIN_MASTER_KEY_LENGTH} characters`);

  if (weakReasons.length > 0) {
    const message =
      `[FORTRESS SECURITY] VAULT_MASTER_KEY is unsafe: ${weakReasons.join(" and ")}. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`;
    if (isProduction && vaultEnforce) {
      throw new Error(message);
    }
    if (nodeEnv !== "test") console.warn(`⚠️  ${message}`);
  }
} else {
  if (isProduction && vaultEnforce) {
    // An unknown random key in production means nobody can administer the vault, and printing it
    // would leak the root credential into log aggregators. Fail fast instead.
    throw new Error(
      "[FORTRESS SECURITY] VAULT_MASTER_KEY is not set. Refusing to start in production without a master key. " +
        "Set VAULT_MASTER_KEY (32+ random bytes) or explicitly set NODE_ENV=development for local use."
    );
  }

  resolvedMasterPass = crypto.randomBytes(32).toString("hex");
  if (nodeEnv === "development") {
    console.warn("==================================================================");
    console.warn("⚠️  [FORTRESS SECURITY NOTICE] No VAULT_MASTER_KEY configured in environment!");
    console.warn("🔑 Generated ephemeral Master Vault Key for this DEVELOPMENT session:");
    console.warn(`   ${resolvedMasterPass}`);
    console.warn("   Set VAULT_MASTER_KEY in your .env file to persist a master key.");
    console.warn("==================================================================");
  }
}

if (isProduction && vaultEnforce && nodeEnv !== "test") {
  console.log(`🔐 [FORTRESS] Master vault key loaded (fingerprint ${fingerprint(resolvedMasterPass)}).`);
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv,
  isProduction,
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  fortressApiKey: process.env.FORTRESS_API_KEY || "",
  vaultMasterPass: resolvedMasterPass,
  vaultEnforce,
  trustProxy: process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1" ? 1 : false,
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  maxCodeChars: parseInt(process.env.MAX_CODE_CHARS || "30000", 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "20", 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
  reportIntervalHours: parseInt(process.env.REPORT_INTERVAL_HOURS || "24", 10),
  redisUrl: process.env.REDIS_URL || process.env.VALKEY_URL || "",
  deepAiMode: (process.env.DEEP_AI_MODE || "ASYNC").toUpperCase(),
  redosTimeoutMs: parseInt(process.env.REDOS_TIMEOUT_MS || "25", 10),
  maxPayloadStringLength: parseInt(process.env.MAX_PAYLOAD_STRING_LENGTH || "65536", 10),
};

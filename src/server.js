import app from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.port, () => {
  console.log("=================================================");
  console.log(`🛡️  FORTRESS SECURITY GUARD API - ONLINE`);
  console.log(`📡 Port:           ${config.port}`);
  console.log(`🤖 Model:          ${config.geminiModel}`);
  console.log(`🔒 Client Auth:    ${config.fortressApiKey ? "ENABLED" : "OPEN (Set FORTRESS_API_KEY to lock down)"}`);
  console.log(`🛡️  Rate Limit:     ${config.rateLimitMax} req / ${config.rateLimitWindowMs / 1000}s`);
  console.log(`🚀 Health Check:   http://localhost:${config.port}/health`);
  console.log(`⚡ Scan Endpoint:  POST http://localhost:${config.port}/api/scan`);
  console.log("=================================================");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down FORTRESS gracefully...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("\nFORTRESS standing down.");
  server.close(() => process.exit(0));
});

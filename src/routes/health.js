import express from "express";
import { config } from "../config.js";

const router = express.Router();

router.get("/", (req, res) => {
  return res.status(200).json({
    status: "OPERATIONAL",
    service: "FORTRESS Security Guard API",
    version: "1.0.0",
    scanner_model: config.geminiModel,
    api_key_configured: Boolean(config.geminiApiKey),
    client_auth_enabled: Boolean(config.fortressApiKey),
    timestamp: new Date().toISOString(),
    shields: [
      "WALL 1: Helmet & Strict CORS Defense",
      "WALL 2: Rate Limiting & DoS Mitigation",
      "WALL 3: Client Identity & Access Tokens",
      "WALL 4: Payload Boundary & Type Enforcement",
      "WALL 5: Prompt Injection Sanitization",
      "WALL 6: Gemini Structured AI Threat Engine",
      "WALL 7: Real-Time Breach Alert Dispatcher",
    ],
  });
});

export default router;

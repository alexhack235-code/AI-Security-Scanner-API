import express from "express";
import { requestSigner } from "../services/requestSigner.js";

const router = express.Router();

// Issue an ephemeral signing session for a legitimate frontend client
router.post("/session", (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  const session = requestSigner.createSession(clientIp);
  return res.status(201).json({
    service: "FORTRESS Client-Side Anti-Tamper Shield",
    ...session,
  });
});

// Verify request signature directly
router.post("/verify", (req, res) => {
  const { method = "POST", path = "", body = {} } = req.body || {};
  const verification = requestSigner.verifySignature({
    method,
    path,
    body,
    headers: req.headers,
  });

  return res.status(verification.valid ? 200 : 403).json(verification);
});

export default router;

import express from "express";
import { powShield } from "../services/powShield.js";

const router = express.Router();

// Request a fresh Proof-of-Work challenge
router.get("/challenge", (req, res) => {
  const difficulty = req.query.difficulty ? parseInt(req.query.difficulty, 10) : 4;
  const challenge = powShield.createChallenge(difficulty);
  return res.status(200).json({
    service: "FORTRESS Zero-Friction PoW Shield",
    challenge,
  });
});

// Verify a Proof-of-Work solution
router.post("/verify", (req, res) => {
  const { challengeId, nonce } = req.body || {};
  const verification = powShield.verifySolution(challengeId, nonce);

  if (!verification.success) {
    return res.status(400).json({
      success: false,
      fortress_status: "POW_REJECTED",
      reason: verification.reason,
    });
  }

  return res.status(200).json({
    success: true,
    fortress_status: "POW_VERIFIED",
    passToken: verification.passToken,
    expiresAt: verification.expiresAt,
    message: verification.message,
  });
});

export default router;

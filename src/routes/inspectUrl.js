import express from "express";
import { scanUrlWeaknesses, auditZeroVulnerabilityPosture } from "../services/urlWeaknessScanner.js";

const router = express.Router();

/**
 * 1. POST /api/inspect-url
 * Standard web header and weakness inspector
 */
router.post("/", async (req, res, next) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "Missing required parameter 'url' (e.g. { \"url\": \"https://example.com\" })",
    });
  }

  try {
    const report = await scanUrlWeaknesses(url.trim());
    return res.status(200).json(report);
  } catch (err) {
    next(err);
  }
});

/**
 * 2. POST /api/inspect-url/zero-vuln
 * 360-Degree Zero-Vulnerability Posture & Certification Audit
 */
router.post("/zero-vuln", async (req, res, next) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "Missing required parameter 'url' (e.g. { \"url\": \"https://example.com\" })",
    });
  }

  try {
    const audit = await auditZeroVulnerabilityPosture(url.trim());
    return res.status(200).json(audit);
  } catch (err) {
    next(err);
  }
});

export default router;

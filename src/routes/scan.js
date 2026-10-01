import express from "express";
import { validateScanPayload } from "../middleware/validator.js";
import { scanCodeWithGemini } from "../services/geminiScanner.js";
import { notifyBreach } from "../services/notifier.js";

const router = express.Router();

router.post("/", validateScanPayload, async (req, res, next) => {
  const { code, filename, type } = req.sanitizedScan;

  try {
    const startTime = Date.now();
    const auditReport = await scanCodeWithGemini({ code, filename, type });
    const durationMs = Date.now() - startTime;

    // Attach performance / scan metadata
    auditReport.scan_metadata = {
      filename,
      type,
      code_length: code.length,
      scan_duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };

    // Trigger asynchronous breach alerting (Telegram / Slack / Console)
    notifyBreach(auditReport, { filename, type }).catch((err) => {
      console.error("Breach notification failed:", err.message);
    });

    return res.status(200).json(auditReport);
  } catch (err) {
    return next(err);
  }
});

export default router;

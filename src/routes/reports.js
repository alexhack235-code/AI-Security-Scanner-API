import express from "express";
import { aiReportService } from "../services/aiReportService.js";

const router = express.Router();

/**
 * 1. GET /api/reports/latest
 * Fetch the latest CISO-grade AI Security Threat Digest
 */
router.get("/latest", async (req, res) => {
  let report = aiReportService.getLatestReport();

  // If no report exists yet, generate one on-demand
  if (!report) {
    report = await aiReportService.generateAndDispatchReport({ trigger: "INITIAL_DISCOVERY" });
  }

  return res.status(200).json({
    status: "SUCCESS",
    report,
  });
});

/**
 * 2. GET /api/reports
 * Fetch report history
 */
router.get("/", (req, res) => {
  const history = aiReportService.getReportHistory();
  return res.status(200).json({
    status: "SUCCESS",
    interval_hours: aiReportService.getIntervalHours(),
    total_reports: history.length,
    reports: history,
  });
});

/**
 * 3. POST /api/reports/generate-now
 * Force immediate AI threat intelligence report generation and multi-channel dispatch
 */
router.post("/generate-now", async (req, res) => {
  try {
    const report = await aiReportService.generateAndDispatchReport({ trigger: "ON_DEMAND" });
    return res.status(200).json({
      status: "SUCCESS",
      message: "AI Threat Digest successfully generated and dispatched to alert channels.",
      report,
    });
  } catch (err) {
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to generate AI security report: " + err.message,
    });
  }
});

/**
 * 4. POST /api/reports/schedule
 * Set report interval (e.g. 1 hour, 6 hours, 12 hours, 24 hours)
 */
router.post("/schedule", (req, res) => {
  const { intervalHours = 24 } = req.body || {};
  const newInterval = aiReportService.setIntervalHours(intervalHours);

  return res.status(200).json({
    status: "SCHEDULE_UPDATED",
    message: `AI Threat Digest scheduler set to trigger every ${newInterval} hour(s).`,
    interval_hours: newInterval,
  });
});

/**
 * 5. GET /api/reports/pci-dss
 * Specialized PCI-DSS v4.0 Payment Compliance Audit Report
 */
router.get("/pci-dss", (req, res) => {
  const report = aiReportService.generatePciDssReport();
  return res.status(200).json(report);
});

/**
 * 6. GET /api/reports/owasp
 * Specialized OWASP API Security Top 10 Scorecard
 */
router.get("/owasp", (req, res) => {
  const scorecard = aiReportService.generateOwaspScorecard();
  return res.status(200).json(scorecard);
});

/**
 * 7. GET /api/reports/threat-actors
 * Specialized MITRE ATT&CK Threat Actor Reconnaissance Dossier
 */
router.get("/threat-actors", (req, res) => {
  const dossier = aiReportService.generateThreatDossierReport();
  return res.status(200).json(dossier);
});

/**
 * 8. GET /api/reports/ai-overview
 * Real-Time Executive AI Overview powered by Google Gemini 2.0 Flash
 */
router.get("/ai-overview", async (req, res) => {
  const force = req.query.force === "true" || req.query.refresh === "true";
  try {
    const overview = await aiReportService.generateAiOverview({ forceRefresh: force });
    return res.status(200).json({
      status: "SUCCESS",
      ai_overview: overview,
    });
  } catch (err) {
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to generate AI Overview: " + err.message,
    });
  }
});

export default router;

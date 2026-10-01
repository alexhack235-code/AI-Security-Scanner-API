import express from "express";
import { BountyReporter } from "../services/bountyReporter.js";

const router = express.Router();

// Scan content for sensitive data leaks and auto-generate bug bounty report
router.post("/scan-leaks", (req, res) => {
  const { content, target, endpoint } = req.body || {};
  if (!content) {
    return res.status(400).json({ error: "Missing 'content' string to inspect for data leaks." });
  }

  const leaks = BountyReporter.scanDataLeaks(content);

  let bountyReport = null;
  if (leaks.length > 0) {
    const highestLeak = leaks[0];
    bountyReport = BountyReporter.generateReport({
      targetName: target || "Target API",
      endpoint: endpoint || "/api/response",
      vulnerabilityType: highestLeak.type,
      severity: highestLeak.severity,
      cvss: highestLeak.cvss,
      cwe: highestLeak.cwe,
      description: `Critical sensitive data exposure detected in API response: ${highestLeak.type}. Matched pattern: ${highestLeak.matched}`,
      stepsToReproduce: `1. Issue a standard request to ${endpoint || "/api/response"}.\n2. Inspect the response body.\n3. Observe cleartext disclosure of ${highestLeak.type}.`,
      impact: "Immediate exposure of credentials or payment cards enabling account takeover, financial theft, or infrastructure compromise.",
      remediation: "// Strip sensitive credentials and use data sanitization DTOs before responding\nconst safeResponse = sanitizeUserPayload(result);",
    });
  }

  return res.status(200).json({
    leaks_found: leaks.length,
    leaks,
    bounty_report: bountyReport,
  });
});

// Generate formal Bug Bounty disclosure report
router.post("/generate", (req, res) => {
  const report = BountyReporter.generateReport(req.body || {});
  return res.status(200).json(report);
});

export default router;

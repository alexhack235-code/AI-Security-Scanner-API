import express from "express";
import { threatProfiler } from "../services/threatProfiler.js";

const router = express.Router();

// Get summary of all tracked threat actors
router.get("/", (req, res) => {
  return res.status(200).json({
    service: "FORTRESS Autonomous Threat Actor Profiling & MITRE ATT&CK Matrix",
    summary: threatProfiler.getSummary(),
  });
});

// Export Cloudflare & AWS WAF compatible IP blocklist
router.get("/blocklist.txt", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  return res.status(200).send(threatProfiler.exportIpBlocklist() || "# No active blocked IPs");
});

// Export STIX 2.1 Threat Intelligence Bundle for SIEM / SOAR
router.get("/stix", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json(threatProfiler.exportStix21());
});

// Get individual threat dossier for an IP
router.get("/:ip", (req, res) => {
  const { ip } = req.params;
  const dossier = threatProfiler.getDossier(ip);
  return res.status(200).json(dossier);
});

export default router;

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

// Get individual threat dossier for an IP
router.get("/:ip", (req, res) => {
  const { ip } = req.params;
  const dossier = threatProfiler.getDossier(ip);
  return res.status(200).json(dossier);
});

export default router;

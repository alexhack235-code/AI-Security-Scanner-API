import express from "express";
import { honeyMazeService } from "../services/honeyMazeService.js";
import { requireMasterAdmin } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * HONEY-MAZE TELEMETRY ENDPOINT
 * Exposes real-time active trapped hackers, rooms visited, and bait credentials stolen.
 */
router.get("/telemetry", (req, res) => {
  return res.status(200).json({
    service: "FORTRESS CYBER DECEPTION LABYRINTH (HONEY-MAZE)",
    telemetry: honeyMazeService.getTelemetry(),
  });
});

/**
 * HONEY-MAZE SIMULATION ENDPOINT
 * Allows security engineers and pentesters to simulate navigating through the maze.
 */
router.post("/simulate", requireMasterAdmin, async (req, res) => {
  const { path = "/.env", userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ThreatHunter/1.0" } = req.body || {};

  const fakeReq = {
    path,
    originalUrl: path,
    method: "GET",
    headers: {
      "user-agent": userAgent,
      "x-forwarded-for": "198.51.100.42",
    },
    ip: "198.51.100.42",
    socket: { remoteAddress: "198.51.100.42" },
  };

  return honeyMazeService.handleMazeRequest(fakeReq, res);
});

export default router;

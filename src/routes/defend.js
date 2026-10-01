import express from "express";
import { CloudDefenderEngine } from "../services/cloudDefenderEngine.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  const { path, method, headers, body, deepAi, mode } = req.body || {};

  // If no payload is provided
  if (!path && !body) {
    return res.status(200).json({
      fortress_status: "WAITING",
      threat_level: "NONE",
      action: "ASK_FOR_PAYLOAD",
      reason: "No request payload provided. Supply 'path' or 'body' to scan.",
      example: { path: "/api/pay", body: { total: 50 } },
    });
  }

  try {
    const verdict = await CloudDefenderEngine.inspect({
      path: typeof path === "string" ? path : "/",
      method: typeof method === "string" ? method.toUpperCase() : "POST",
      headers: { ...(req.headers || {}), ...(headers && typeof headers === "object" ? headers : {}) },
      body: body || null,
      clientIp: req.clientIp || "unknown",
      deepAi: Boolean(deepAi),
      mode: mode || req.query.mode,
    });

    return res.status(200).json(verdict);
  } catch (err) {
    next(err);
  }
});

export default router;

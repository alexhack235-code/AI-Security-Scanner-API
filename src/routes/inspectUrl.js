import express from "express";
import { scanUrlWeaknesses } from "../services/urlWeaknessScanner.js";

const router = express.Router();

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

export default router;

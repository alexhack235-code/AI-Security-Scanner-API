import express from "express";
import { virtualPatchEngine } from "../services/virtualPatchEngine.js";
import { scanCodeWithGemini } from "../services/geminiScanner.js";

const router = express.Router();

// List all active virtual patches
router.get("/list", (req, res) => {
  return res.status(200).json({
    service: "FORTRESS Autonomous Virtual Patching Engine",
    patches: virtualPatchEngine.listPatches(),
  });
});

// Deploy a virtual patch rule
router.post("/apply", (req, res) => {
  const patchData = req.body || {};
  if (!patchData.path) {
    return res.status(400).json({ error: "Missing 'path' regex or route string in patch rule." });
  }

  const patch = virtualPatchEngine.applyPatch(patchData);
  return res.status(201).json({
    success: true,
    message: `Virtual patch '${patch.id}' deployed into active runtime firewall.`,
    patch,
  });
});

// Auto-synthesize virtual patches from code via Gemini SAST
router.post("/auto", async (req, res) => {
  const { code, filename = "handler.js" } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: "Missing 'code' to audit and generate virtual patch." });
  }

  try {
    const audit = await scanCodeWithGemini({ code, filename });
    const patches = virtualPatchEngine.autoPatchFromFindings(audit.findings || []);

    return res.status(200).json({
      success: true,
      findings_identified: audit.findings?.length || 0,
      patches_synthesized: patches.length,
      virtual_patches: patches,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to auto-generate virtual patches",
      details: err.message,
    });
  }
});

// Remove or deactivate a patch
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const removed = virtualPatchEngine.removePatch(id);
  return res.status(200).json({
    success: removed,
    message: removed ? `Virtual patch '${id}' deleted.` : `Patch '${id}' not found.`,
  });
});

export default router;

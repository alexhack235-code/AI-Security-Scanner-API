import express from "express";
import { virtualPatchEngine } from "../services/virtualPatchEngine.js";
import { scanCodeWithGemini } from "../services/geminiScanner.js";

const router = express.Router();

const requireMasterAdmin = (req, res, next) => {
  if (req.vaultUser?.role !== "MASTER_ADMIN") {
    return res.status(403).json({
      fortress_status: "ACCESS_DENIED",
      threat_level: "HIGH",
      reason: "Administrative privilege required. Only MASTER_ADMIN can manage or deploy virtual runtime patches.",
      authenticated_role: req.vaultUser?.role || "ANONYMOUS",
    });
  }
  next();
};

// List all active virtual patches (Read-only)
router.get("/list", (req, res) => {
  return res.status(200).json({
    service: "FORTRESS Autonomous Virtual Patching Engine",
    patches: virtualPatchEngine.listPatches(),
  });
});

// Deploy a virtual patch rule (Restricted to MASTER_ADMIN)
router.post("/apply", requireMasterAdmin, (req, res) => {
  const patchData = req.body || {};
  if (!patchData.path) {
    return res.status(400).json({ error: "Missing 'path' regex or route string in patch rule." });
  }

  try {
    const patch = virtualPatchEngine.applyPatch(patchData);
    return res.status(201).json({
      success: true,
      message: `Virtual patch '${patch.id}' deployed into active runtime firewall.`,
      patch,
    });
  } catch (err) {
    return res.status(400).json({
      error: "Failed to deploy virtual patch",
      details: err.message,
    });
  }
});

// Auto-synthesize virtual patches from code via Gemini SAST (Restricted to MASTER_ADMIN)
router.post("/auto", requireMasterAdmin, async (req, res) => {
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

// Remove or deactivate a patch (Restricted to MASTER_ADMIN)
router.delete("/:id", requireMasterAdmin, (req, res) => {
  const { id } = req.params;
  const removed = virtualPatchEngine.removePatch(id);
  return res.status(200).json({
    success: removed,
    message: removed ? `Virtual patch '${id}' deleted.` : `Patch '${id}' not found.`,
  });
});

export default router;

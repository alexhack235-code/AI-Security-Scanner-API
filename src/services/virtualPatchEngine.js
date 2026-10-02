import crypto from "crypto";

/**
 * Autonomous Virtual Patching Engine (Self-Healing Runtime Shield)
 * Deploys in-memory WAF filters to neutralize zero-days and identified code vulnerabilities
 * instantly at runtime without code deployment or server downtime.
 */
class VirtualPatchEngine {
  constructor() {
    this.patches = new Map(); // patchId -> PatchRule
    this.initializeDefaultPatches();
  }

  /**
   * Initialize industry standard emergency hotpatches
   */
  initializeDefaultPatches() {
    this.applyPatch({
      id: "VP-DEFAULT-001",
      name: "Emergency IDOR Hotpatch on User & Invoice Endpoints",
      path: "^/api/(?:users?|invoices?|orders?)/[^/]+$",
      method: "ALL",
      cwe: "CWE-639",
      rules: [
        {
          field: "headers.authorization",
          op: "MUST_EXIST",
          message: "Anonymous access to private entity resource is blocked by Virtual Patch VP-DEFAULT-001.",
        },
      ],
      active: true,
      description: "Blocks unauthorized entity traversal where Authorization header is absent.",
    });

    this.applyPatch({
      id: "VP-DEFAULT-002",
      name: "Strict Numeric ID Validator",
      path: "^/api/users?/(\\d+)$",
      method: "ALL",
      cwe: "CWE-89",
      rules: [
        {
          field: "params.id",
          op: "IS_NUMERIC",
          message: "ID parameter contains non-numeric injection characters.",
        },
      ],
      active: true,
      description: "Enforces numeric-only IDs on standard REST endpoints.",
    });
  }

  /**
   * Apply or update a virtual patch
   */
  applyPatch({ id, name, path, method = "ALL", cwe = "CWE-OTHER", rules = [], active = true, description = "" }) {
    const patchId = id || "VP-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const regexPath = path instanceof RegExp ? path : new RegExp(path, "i");

    const patchRecord = {
      id: patchId,
      name: name || `Hotpatch for ${path}`,
      pathPattern: regexPath.source,
      pathRegex: regexPath,
      method: method.toUpperCase(),
      cwe,
      rules,
      active: Boolean(active),
      description,
      appliedAt: new Date().toISOString(),
      stats: { matches: 0, blocks: 0 },
    };

    this.patches.set(patchId, patchRecord);
    return patchRecord;
  }

  /**
   * Automatically generate virtual patch rules from Gemini SAST findings
   */
  autoPatchFromFindings(findings = []) {
    const generated = [];

    for (const finding of findings) {
      const cat = (finding.category || "").toLowerCase();
      const issue = (finding.issue || "").toLowerCase();
      const cwe = finding.cwe || "CWE-UNKNOWN";

      // 1. SQL Injection Hotpatch
      if (cat.includes("sql") || issue.includes("sql injection") || cwe === "CWE-89") {
        const p = this.applyPatch({
          name: `Auto-Patch: Mitigation for ${finding.issue?.slice(0, 40) || 'SQLi'}`,
          path: "^/api/.*$",
          method: "ALL",
          cwe: "CWE-89",
          description: "Synthesized automatically from Gemini SAST finding",
          rules: [
            {
              field: "query.*",
              op: "DISALLOW_SQL_SYNTAX",
              message: "Virtual Patch: Dropped SQL syntax keywords in query parameters.",
            },
            {
              field: "body.*",
              op: "DISALLOW_SQL_SYNTAX",
              message: "Virtual Patch: Dropped SQL syntax keywords in request body.",
            },
          ],
        });
        generated.push(p);
      }

      // 2. Cross-Site Scripting (XSS) Hotpatch
      if (cat.includes("xss") || issue.includes("xss") || cwe === "CWE-79") {
        const p = this.applyPatch({
          name: `Auto-Patch: Mitigation for XSS`,
          path: "^/api/.*$",
          method: "ALL",
          cwe: "CWE-79",
          description: "Auto-generated sanitization rule for XSS",
          rules: [
            {
              field: "body.*",
              op: "DISALLOW_SCRIPT_TAGS",
              message: "Virtual Patch: Dropped dangerous HTML/Script tags in JSON payload.",
            },
          ],
        });
        generated.push(p);
      }
    }

    return generated;
  }

  /**
   * Evaluate a request against all active virtual patches
   * @param {object} context - { path, method, headers, query, body, params }
   */
  evaluate({ path = "", method = "GET", headers = {}, query = {}, body = {}, params = {} }) {
    for (const patch of this.patches.values()) {
      if (!patch.active) continue;

      // Method match
      if (patch.method !== "ALL" && patch.method !== method.toUpperCase()) {
        continue;
      }

      // Path match
      if (!patch.pathRegex.test(path)) {
        continue;
      }

      patch.stats.matches += 1;

      // Evaluate rules
      for (const rule of patch.rules) {
        const violation = this.checkRuleViolation(rule, { headers, query, body, params, path });
        if (violation) {
          patch.stats.blocks += 1;
          return {
            triggered: true,
            patchId: patch.id,
            patchName: patch.name,
            cwe: patch.cwe,
            wall: `LAYER 1.5: VIRTUAL_PATCH [${patch.id}]`,
            action: "BLOCK",
            reason: rule.message || violation,
            fix: "Virtual hotpatch actively protecting vulnerable application logic.",
          };
        }
      }
    }

    return { triggered: false };
  }

  /**
   * Helper to check a specific rule violation
   */
  checkRuleViolation(rule, context) {
    const { field, op } = rule;

    // Helper: retrieve value by dot-notation (e.g. "headers.authorization")
    const getValue = (pathStr) => {
      const parts = pathStr.split(".");
      let cur = context;
      for (const p of parts) {
        if (!cur || typeof cur !== "object") return undefined;
        cur = cur[p];
      }
      return cur;
    };

    if (op === "MUST_EXIST") {
      const val = getValue(field);
      if (val === undefined || val === null || val === "") {
        return `Missing required parameter '${field}' mandated by virtual patch.`;
      }
    }

    if (op === "IS_NUMERIC") {
      const val = getValue(field);
      if (val !== undefined && isNaN(Number(val))) {
        return `Field '${field}' must be strictly numeric.`;
      }
    }

    if (op === "DISALLOW_SQL_SYNTAX") {
      const text = JSON.stringify(context.body || {}) + " " + JSON.stringify(context.query || {});
      const sqlPattern = /(?:\b(?:union\s+all\s+select|information_schema|order\s+by\s+\d+|drop\s+table|exec\s*\(|benchmark\s*\()\b|--|\/\*)/i;
      if (sqlPattern.test(text)) {
        return "Disallowed SQL syntax detected in request context.";
      }
    }

    if (op === "DISALLOW_SCRIPT_TAGS") {
      const text = JSON.stringify(context.body || {});
      if (/<script\b|javascript:|onerror\s*=|onload\s*=/i.test(text)) {
        return "Disallowed executable HTML/script tokens detected in payload.";
      }
    }

    return null;
  }

  /**
   * Toggle patch state
   */
  togglePatch(id, active) {
    const p = this.patches.get(id);
    if (!p) return null;
    p.active = Boolean(active);
    return p;
  }

  /**
   * Delete patch
   */
  removePatch(id) {
    return this.patches.delete(id);
  }

  /**
   * List all registered patches
   */
  listPatches() {
    return Array.from(this.patches.values());
  }
}

export const virtualPatchEngine = new VirtualPatchEngine();

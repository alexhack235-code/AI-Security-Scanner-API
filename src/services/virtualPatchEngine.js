import crypto from "crypto";
import { RedosShield } from "./redosShield.js";

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
    
    let regexPath;
    if (path instanceof RegExp) {
      regexPath = path;
    } else {
      if (typeof path !== "string" || path.length > 500) {
        throw new Error("Virtual patch 'path' must be a valid regex string under 500 characters.");
      }
      try {
        regexPath = new RegExp(path, "i");
      } catch (err) {
        throw new Error(`Invalid regular expression for patch path: ${err.message}`);
      }
    }

    if (RedosShield.isHazardousRegex(regexPath)) {
      throw new Error(`Rejected hazardous path regex due to catastrophic backtracking risk (ReDoS): ${regexPath.source}`);
    }

    // Precompile rule regexes and check for catastrophic backtracking vulnerabilities
    for (const rule of rules) {
      if ((rule.op === "DISALLOW_PATTERN" || rule.op === "REGEX_MATCH") && rule.pattern) {
        if (typeof rule.pattern !== "string" || rule.pattern.length > 500) {
          throw new Error("Rule pattern must be a string under 500 characters.");
        }
        try {
          const compiled = new RegExp(rule.pattern, "i");
          if (RedosShield.isHazardousRegex(compiled)) {
            throw new Error(`Rejected hazardous rule pattern due to catastrophic backtracking risk (ReDoS): ${rule.pattern}`);
          }
          rule._compiledRegex = compiled;
        } catch (err) {
          throw new Error(`Invalid regular expression for rule pattern: ${err.message}`);
        }
      }
    }

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

      // Path match (guarded against ReDoS backtracking)
      const pathCheck = RedosShield.safeTest(patch.pathRegex, path);
      if (!pathCheck.matched) {
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

    if (op === "DISALLOW_PATTERN" || op === "REGEX_MATCH") {
      const text = (typeof context.body === "string" ? context.body : JSON.stringify(context.body || {})) + " " + JSON.stringify(context.query || {}) + " " + (context.path || "");
      try {
        const regex = rule._compiledRegex || (rule._compiledRegex = new RegExp(rule.pattern, "i"));
        const result = RedosShield.safeTest(regex, text);
        if (result.redosBlocked) {
          console.warn(`🚨 [VIRTUAL PATCH ENGINE] ReDoS timeout intercepted for rule pattern: '${rule.pattern}'`);
        }
        if (result.matched) {
          return rule.message || `Disallowed pattern '${rule.pattern}' matched by autonomous virtual patch.`;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Autonomous Self-Healing Immune Reflex
   * Dynamically synthesizes and deploys an in-memory hotpatch when a zero-day or novel exploit is detected
   */
  autoSynthesizeZeroDayPatch({ payload = "", path = "^/.*$", attackType = "ZERO_DAY", cwe = "CWE-ZERO-DAY" }) {
    const rawStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (!rawStr || rawStr.length < 3) return null;

    // Extract signature snippet safely escaped
    const signature = rawStr
      .slice(0, 80)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape regex characters

    const patch = this.applyPatch({
      name: `Autonomous Immune Patch: ${attackType} [${new Date().toLocaleTimeString()}]`,
      path: path.includes("^") ? path : `^${path}.*`,
      method: "ALL",
      cwe,
      description: `Synthesized dynamically in <50ms by Autonomous Immune Reflex to neutralize detected ${attackType} exploit.`,
      rules: [
        {
          field: "all",
          op: "DISALLOW_PATTERN",
          pattern: signature,
          message: `Blocked by Autonomous Self-Healing Immune Patch against ${attackType}.`,
        },
      ],
    });

    console.warn(`🧬 [AUTONOMOUS IMMUNE SYSTEM] Zero-Day Hotpatch deployed! Rule ID: ${patch.id} for '${attackType}'`);
    return patch;
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

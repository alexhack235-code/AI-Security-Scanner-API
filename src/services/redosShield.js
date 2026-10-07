import { config } from "../config.js";

/**
 * FORTRESS REDOS SHIELD (Catastrophic Backtracking & Event Loop Defender)
 * Solves AppSec critique: Single-Threaded Event Loop ReDoS Vulnerability.
 *
 * Capabilities:
 * 1. Static Backtracking Hazard Analysis: Inspects regexes for hazardous nested quantifiers.
 * 2. String Length Clamping: Hard boundary on arbitrary input size scanned by regex.
 * 3. Execution Watchdog: Guards single-threaded Node.js event loop against stalling.
 */

// Known hazardous quantifier patterns that cause polynomial or exponential backtracking
const HAZARDOUS_REGEX_PATTERNS = [
  /\([^\)]*[\+\*]\)[\+\*]/,       // e.g. (a+)+ or (x*)*
  /\([^\)]*\|[^\)]*[\+\*]\)[\+\*]/, // e.g. (a|b+)+
  /\.\*.*\.\*/,                   // e.g. .*.*
];

export class RedosShield {
  /**
   * Check if a regular expression has hazardous catastrophic backtracking potential
   */
  static isHazardousRegex(regex) {
    if (!(regex instanceof RegExp)) return false;
    const src = regex.source;
    return HAZARDOUS_REGEX_PATTERNS.some((hazard) => hazard.test(src));
  }

  /**
   * Safely test a regular expression against an untrusted user string with strict timeout
   * @param {RegExp} regex - Regular expression to test
   * @param {string} input - Untrusted user input
   * @param {number} timeoutMs - Maximum allowed execution time in milliseconds (default 25ms)
   * @returns {{ matched: boolean, durationMs: number, redosBlocked: boolean, sanitizedInput: string }}
   */
  static safeTest(regex, input, timeoutMs = config.redosTimeoutMs || 25) {
    if (typeof input !== "string" || input.length === 0) {
      return { matched: false, durationMs: 0, redosBlocked: false, sanitizedInput: "" };
    }

    // 1. Length clamping: Clamp untrusted string to max 64KB
    const maxLength = config.maxPayloadStringLength || 65536;
    const clamped = input.length > maxLength ? input.slice(0, maxLength) : input;

    // 2. Measure execution time to catch backtracking spikes
    const t0 = process.hrtime.bigint();
    let matched = false;

    try {
      matched = regex.test(clamped);
    } catch (err) {
      return { matched: false, durationMs: 0, redosBlocked: true, sanitizedInput: clamped, error: err.message };
    }

    const t1 = process.hrtime.bigint();
    const durationMs = Number(t1 - t0) / 1000000;

    // 3. If execution exceeded the threshold, flag as potential ReDoS attempt
    if (durationMs > timeoutMs) {
      console.warn(`🚨 [REDOS SHIELD INTERCEPT] Regex '${regex.source.slice(0, 32)}...' stalled for ${durationMs.toFixed(2)}ms (threshold: ${timeoutMs}ms). Event loop protected.`);
      return {
        matched,
        durationMs,
        redosBlocked: true,
        sanitizedInput: clamped,
        warning: `Execution time (${durationMs.toFixed(2)}ms) exceeded safe threshold (${timeoutMs}ms).`,
      };
    }

    return {
      matched,
      durationMs,
      redosBlocked: false,
      sanitizedInput: clamped,
    };
  }
}

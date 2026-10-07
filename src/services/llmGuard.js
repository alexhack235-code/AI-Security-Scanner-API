import { UnicodeDeobfuscator } from "./unicodeDeobfuscator.js";

/**
 * FORTRESS LLM GUARD
 * Military-Grade AI & LLM Prompt Injection Firewall (<1ms)
 * Protects AI APIs and chatbots against jailbreaks, prompt overrides, and token exfiltration.
 */

const PROMPT_INJECTION_RULES = [
  // 1. Direct Directive Overrides
  {
    regex: /(?:ignore|disregard|forget|override|negate|bypass)\s+(?:all\s+)?(?:previous|prior|above|former|initial|existing)\s+(?:instructions|prompts|directives|rules|guidelines|system\s+messages?)/i,
    type: "PROMPT_INJECTION_OVERRIDE",
    severity: "CRITICAL",
    reason: "Adversarial prompt injection attempt: Instruction override detected.",
    fix: "Sanitize user inputs and isolate untrusted text with XML boundaries (e.g. <user_data>...</user_data>).",
  },
  {
    regex: /(?:from\s+now\s+on|starting\s+now)[,\s]+(?:you\s+must|you\s+will|act\s+as|pretend|behave)\s+(?:as\s+)?(?:an?\s+)?(?:unfiltered|unrestricted|unaligned|evil|jailbroken|DAN)/i,
    type: "ROLEPLAY_JAILBREAK",
    severity: "CRITICAL",
    reason: "Adversarial persona injection / jailbreak attempt detected.",
    fix: "Enforce strict system persona boundary and reject roleplay overrides.",
  },

  // 2. Persona Jailbreaks (DAN, Developer Mode, etc.)
  {
    regex: /\b(?:DAN\s+mode|Do\s+Anything\s+Now|Developer\s+Mode\s+(?:enabled|activated|v\d+)|AIM\s+persona|Always\s+Intelligent\s+and\s+Machiavellian)\b/i,
    type: "KNOWN_JAILBREAK_SIGNATURE",
    severity: "CRITICAL",
    reason: "Signature match for public LLM jailbreak exploit (DAN / Developer Mode).",
    fix: "Block jailbreak tokens before dispatching to foundation model.",
  },

  // 3. System Prompt Extraction & Secret Leaks
  {
    regex: /(?:repeat|print|output|display|show|reveal|echo|disclose)\s+(?:your\s+)?(?:entire\s+|full\s+|exact\s+)?(?:system\s+prompt|initial\s+instructions|system\s+message|hidden\s+prompt|secret\s+instructions)/i,
    type: "SYSTEM_PROMPT_EXTRACTION",
    severity: "HIGH",
    reason: "System prompt extraction probe detected.",
    fix: "Instruct model to refuse meta-queries about its underlying system architecture.",
  },
  {
    regex: /(?:what\s+(?:were|are)\s+the\s+instructions\s+given\s+to\s+you\s+(?:before|at\s+the\s+start))/i,
    type: "SYSTEM_PROMPT_EXTRACTION",
    severity: "HIGH",
    reason: "Reconnaissance query probing internal AI prompt instructions.",
    fix: "Filter prompt extraction queries at the gateway tier.",
  },

  // 4. Token & Delimiter Hijacking (ChatML, Llama, Anthropic delimiters)
  {
    regex: /<\|(?:im_start|im_end|endoftext|system|user|assistant)\|>|\[\/?INST\]|<<SYS>>|<\/SYS>>/i,
    type: "LLM_DELIMITER_HIJACKING",
    severity: "CRITICAL",
    reason: "Special LLM control tokens detected in raw user payload (ChatML/Llama injection).",
    fix: "Strip or escape raw control delimiters from user-supplied strings.",
  },

  // 5. Out-of-Band Markdown Exfiltration
  {
    regex: /!\[.*?\]\(https?:\/\/[^\s\)]+[\?&](?:leak|data|token|cookie|secret|stolen)=/i,
    type: "MARKDOWN_DATA_EXFILTRATION",
    severity: "CRITICAL",
    reason: "Prompt injection attempting out-of-band data exfiltration via markdown image tags.",
    fix: "Sanitize markdown image rendering or disable untrusted external image endpoints.",
  },
];

export class LlmGuard {
  /**
   * Inspect untrusted text payload for prompt injections and jailbreaks
   */
  static inspect(text) {
    if (typeof text !== "string" || text.trim().length < 7) {
      return { safe: true, threat_level: "NONE" };
    }

    // High-speed pre-filter: Skip full rule iteration if string contains no prompt injection / jailbreak markers
    if (
      !/(?:ignore|disregard|forget|override|negate|bypass|from\s+now|act\s+as|pretend|behave|DAN|Developer|AIM|system|prompt|instruction|<\||\[\/?INST\]|<<|!\[)/i.test(
        text
      )
    ) {
      return { safe: true, threat_level: "NONE" };
    }

    // Pre-process with Unicode deobfuscator to defeat zero-width and homoglyph evasion
    const normalized = UnicodeDeobfuscator.clean(text);

    for (const rule of PROMPT_INJECTION_RULES) {
      if (rule.regex.test(normalized)) {
        return {
          safe: false,
          threat_level: rule.severity,
          type: rule.type,
          reason: rule.reason,
          fix: rule.fix,
          evidence: normalized.slice(0, 150),
        };
      }
    }

    return { safe: true, threat_level: "NONE" };
  }
}

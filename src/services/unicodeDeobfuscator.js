/**
 * FORTRESS UNICODE DEOBFUSCATOR & HOMOGLYPH NEUTRALIZER
 * Strips zero-width evasion characters, canonicalizes fullwidth Unicode,
 * and translates Cyrillic/Greek homoglyphs designed to evade regex filters.
 */

// Common Cyrillic & Greek homoglyphs mapped to ASCII equivalents
const HOMOGLYPH_MAP = {
  // Cyrillic lowercase
  "а": "a", "с": "c", "е": "e", "о": "o", "р": "p", "ѕ": "s", "х": "x", "у": "y", "і": "i", "ј": "j",
  // Cyrillic uppercase
  "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "І": "I", "Ј": "J", "К": "K", "М": "M", "О": "O", "Р": "P", "Т": "T", "Х": "X",
  // Greek lowercase
  "α": "a", "ο": "o", "ν": "v", "ρ": "p", "τ": "t",
};

// Zero-width & invisible character regex
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u2060\u00AD\u180E\u2000-\u200A\u202F\u205F\u3000]/g;

export class UnicodeDeobfuscator {
  /**
   * Neutralize obfuscation techniques from an input string
   */
  static clean(input) {
    if (typeof input !== "string" || input.length === 0) return "";

    // 1. Strip zero-width & invisible formatting characters
    let cleaned = input.replace(ZERO_WIDTH_REGEX, "");

    // 2. Apply Unicode Normalization Form KC (NFKC)
    // Converts full-width characters (e.g. ＜ｓｃｒｉｐｔ＞) into standard ASCII (<script>)
    try {
      cleaned = cleaned.normalize("NFKC");
    } catch {}

    // 3. Replace common lookalike homoglyphs
    let unhomoglyphed = "";
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      unhomoglyphed += HOMOGLYPH_MAP[char] || char;
    }

    return unhomoglyphed;
  }
}

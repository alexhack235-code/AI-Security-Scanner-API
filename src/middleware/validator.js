import { config } from "../config.js";

export const validateScanPayload = (req, res, next) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({
      fortress_status: "BREACHED",
      threat_level: "MEDIUM",
      score: 0,
      walls_failed: ["WALL 4: Input Validation"],
      findings: [
        {
          type: "INVALID_BODY",
          wall: "WALL 4: Payload Integrity",
          severity: "MEDIUM",
          location: "Request Body",
          issue: "Payload must be a valid JSON object.",
          exploit_example: "Sending malformed or primitive types to crash JSON parser.",
          fix: "Send JSON body: { \"code\": \"...\", \"filename\": \"...\" }",
        },
      ],
      verdict: "Invalid scan payload structure.",
    });
  }

  const { code, filename, type } = req.body;

  if (typeof code !== "string" || code.trim().length === 0) {
    return res.status(400).json({
      fortress_status: "BREACHED",
      threat_level: "LOW",
      score: 0,
      walls_failed: ["WALL 4: Input Validation"],
      findings: [
        {
          type: "MISSING_CODE",
          wall: "WALL 4: Input Validation",
          severity: "LOW",
          location: "body.code",
          issue: "Field 'code' is required and must be a non-empty string.",
          exploit_example: "Triggering internal exceptions by submitting non-string types.",
          fix: "Provide target source code as a string in 'code'.",
        },
      ],
      verdict: "Target code must be provided as a string.",
    });
  }

  if (code.length > config.maxCodeChars) {
    return res.status(413).json({
      fortress_status: "BREACHED",
      threat_level: "MEDIUM",
      score: 0,
      walls_failed: ["WALL 4: Payload Size Limit"],
      findings: [
        {
          type: "PAYLOAD_TOO_LARGE",
          wall: "WALL 4: Input Limits",
          severity: "MEDIUM",
          location: "body.code",
          issue: `Code length (${code.length} chars) exceeds maximum allowed limit of ${config.maxCodeChars} chars.`,
          exploit_example: "Buffer/token exhaustion attack against AI scanner.",
          fix: `Keep code snippet within ${config.maxCodeChars} characters.`,
        },
      ],
      verdict: "Code snippet exceeds allowed maximum length.",
    });
  }

  // Sanitize filename and type
  req.sanitizedScan = {
    code: code.trim(),
    filename: typeof filename === "string" ? filename.slice(0, 120) : "unknown_file",
    type: typeof type === "string" ? type.slice(0, 50) : "source_code",
  };

  next();
};

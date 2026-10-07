/**
 * Sensitive Data Exposure Detector & Automated Bug Bounty Report Generator
 * Compliant with CVSS v3.1 and HackerOne / Bugcrowd disclosure standards
 */

// Luhn algorithm check for valid credit card numbers
function isValidLuhn(numberStr) {
  const digits = numberStr.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

const SECRET_PATTERNS = [
  {
    type: "AWS_ACCESS_KEY",
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
    severity: "CRITICAL",
    cvss: 9.1,
    cwe: "CWE-798: Use of Hard-coded Credentials",
  },
  {
    type: "STRIPE_SECRET_KEY",
    regex: /(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99}/,
    severity: "CRITICAL",
    cvss: 9.3,
    cwe: "CWE-798: Hardcoded Financial Gateway Secret",
  },
  {
    type: "PRIVATE_KEY",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    severity: "CRITICAL",
    cvss: 9.8,
    cwe: "CWE-312: Cleartext Storage of Sensitive Information",
  },
  {
    type: "GITHUB_TOKEN",
    regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/,
    severity: "HIGH",
    cvss: 8.2,
    cwe: "CWE-522: Insufficiently Protected Credentials",
  },
  {
    type: "JWT_TOKEN",
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    severity: "MEDIUM",
    cvss: 6.5,
    cwe: "CWE-200: Exposure of Sensitive Information to an Unauthorized Actor",
  },
  {
    type: "DATABASE_CONNECTION_STRING",
    regex: /(?:mongodb|postgres|postgresql|mysql):\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_]+/,
    severity: "CRITICAL",
    cvss: 9.8,
    cwe: "CWE-256: Unprotected Storage of Credentials",
  },
  {
    type: "PLAINTEXT_PASSWORD_EXPOSURE",
    regex: /"(?:password|passwd|user_password|secret)":\s*"[^"]{3,}"/i,
    severity: "HIGH",
    cvss: 7.5,
    cwe: "CWE-312: Cleartext Storage of Sensitive Information",
  },
  {
    type: "INTERNAL_STACK_TRACE_LEAK",
    regex: /(?:at [a-zA-Z0-9_.]+\s+\([\/a-zA-Z0-9_.:-]+\)|node_modules\/[a-zA-Z0-9_.-]+)/,
    severity: "LOW",
    cvss: 4.3,
    cwe: "CWE-209: Generation of Error Message Containing Sensitive Information",
  },
];

export class BountyReporter {
  /**
   * Scans text/JSON payload for any leaked credentials or sensitive data
   */
  static scanDataLeaks(content) {
    if (typeof content !== "string") {
      content = JSON.stringify(content || "");
    }

    if (!content || content.length < 10) return [];

    const leaks = [];

    // 1. Credit Card Match - only run if content contains at least 13 digits
    if (/(?:\d[ -]*?){13}/.test(content)) {
      const ccMatches = content.match(/\b(?:\d[ -]*?){13,16}\b/g) || [];
      for (const match of ccMatches) {
        const cleanDigits = match.replace(/\D/g, "");
        if (isValidLuhn(cleanDigits)) {
          leaks.push({
            type: "CREDIT_CARD_NUMBER_LEAK",
            severity: "CRITICAL",
            cvss: 8.8,
            cwe: "CWE-359: Exposure of Private Personal Information (PCI-DSS)",
            matched: cleanDigits.slice(0, 4) + " **** **** " + cleanDigits.slice(-4),
          });
          break;
        }
      }
    }

    // 2. Secret Patterns - only test regexes if content contains secret markers or credentials
    if (/(?:A[3-9A-Z]|sk_|rk_|BEGIN|gh[pousr]_|eyJ|postgres|mongodb|mysql|password|passwd|secret|node_modules|at\s+)/i.test(content)) {
      for (const pat of SECRET_PATTERNS) {
        const match = content.match(pat.regex);
        if (match) {
          const secretVal = match[0];
          const masked = secretVal.length > 8 ? secretVal.slice(0, 4) + "..." + secretVal.slice(-4) : "****";
          leaks.push({
            type: pat.type,
            severity: pat.severity,
            cvss: pat.cvss,
            cwe: pat.cwe,
            matched: masked,
          });
        }
      }
    }

    return leaks;
  }

  /**
   * Generates a formal, professional Bug Bounty Report ready for submission
   */
  static generateReport({ targetName, endpoint, vulnerabilityType, severity, cvss, cwe, description, stepsToReproduce, impact, remediation }) {
    const reportDate = new Date().toISOString().split("T")[0];
    const reportId = "BTY-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const markdown = `# 🛡️ VULNERABILITY DISCLOSURE REPORT [${reportId}]

**Target:** \`${targetName || "Application Endpoint"}\`  
**Endpoint:** \`${endpoint || "N/A"}\`  
**Date:** \`${reportDate}\`  
**Severity:** **${severity || "HIGH"}** (CVSS v3.1: **${cvss || 7.5}**)  
**Weakness Classification:** \`${cwe || "CWE-200"}\`  

---

## 1. Summary
${description || "A security vulnerability was discovered that compromises the integrity or confidentiality of the application."}

## 2. Technical Vulnerability Details
- **Vulnerability Type:** \`${vulnerabilityType}\`
- **Affected Route / Component:** \`${endpoint}\`
- **CVSS Score:** \`${cvss}\`

## 3. Steps to Reproduce (Proof of Concept)
${stepsToReproduce || "1. Send a crafted HTTP request to the target endpoint.\n2. Observe the unauthorized data leak or state bypass."}

## 4. Business & Security Impact
${impact || "An attacker can exploit this weakness to bypass business logic, manipulate transaction values, or access confidential credentials without proper authorization."}

## 5. Remediation & Fix
\`\`\`javascript
${remediation || "// Implement strict backend validation and strip sensitive parameters"}
\`\`\`

---
*Report automatically generated by FORTRESS CLOUD DEFENDER v3.5 Security Engine*
`;

    return {
      report_id: reportId,
      title: `[${severity}] ${vulnerabilityType} on ${endpoint}`,
      severity,
      cvss,
      cwe,
      markdown,
    };
  }
}

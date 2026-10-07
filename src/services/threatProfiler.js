import crypto from "crypto";

/**
 * Autonomous Threat Actor Profiling & MITRE ATT&CK Matrix Engine
 * Builds behavioral DNA fingerprints of attackers across multiple sessions.
 * Classifies personas (Script Kiddie vs Targeted APT vs Botnet) and maps
 * offensive actions to official MITRE ATT&CK enterprise techniques.
 */
class ThreatProfiler {
  constructor() {
    this.profiles = new Map(); // ip -> AttackerProfile
    this.maxProfiles = 1000;
  }

  /**
   * Record an observed event from a client
   */
  recordActivity({
    ip = "unknown",
    port = "unknown",
    path = "",
    method = "GET",
    userAgent = "unknown",
    wallTriggered = "NONE",
    threatLevel = "LOW",
    payload = "",
  }) {
    if (!ip || ip === "unknown" || ip === "127.0.0.1") return;

    let profile = this.profiles.get(ip);
    if (!profile) {
      profile = {
        ip,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        requestCount: 0,
        portsUsed: new Set(),
        userAgents: new Set(),
        pathsTargeted: new Set(),
        wallsTriggered: new Set(),
        timestamps: [],
        techniquesObserved: new Set(),
        threatScore: 0,
        persona: "BENIGN_USER",
      };
      this.profiles.set(ip, profile);
    }

    profile.lastSeen = new Date().toISOString();
    profile.requestCount += 1;
    if (port && port !== "unknown") profile.portsUsed.add(port);
    if (userAgent && userAgent !== "unknown") profile.userAgents.add(userAgent);
    if (path) profile.pathsTargeted.add(path);
    if (wallTriggered && wallTriggered !== "NONE") profile.wallsTriggered.add(wallTriggered);
    profile.timestamps.push(Date.now());

    // Keep timestamp history manageable
    if (profile.timestamps.length > 50) profile.timestamps.shift();

    // MITRE Mapping
    this.mapMitreTechniques(profile, { wallTriggered, path, payload, userAgent });

    // Compute Threat Score & Persona
    this.computePersona(profile);

    // Evict oldest if profile table gets too large
    if (this.profiles.size > this.maxProfiles) {
      const oldestKey = this.profiles.keys().next().value;
      this.profiles.delete(oldestKey);
    }
  }

  /**
   * Correlate action to MITRE ATT&CK Techniques
   */
  mapMitreTechniques(profile, { wallTriggered = "", path = "", payload = "", userAgent = "" }) {
    const wallUpper = wallTriggered.toUpperCase();
    const uaLower = userAgent.toLowerCase();
    const pathLower = path.toLowerCase();

    // T1552.001 - Cloud Instance Metadata Access (SSRF)
    if (wallUpper.includes("SSRF") || payload.includes("169.254.169.254") || payload.includes("metadata.google")) {
      profile.techniquesObserved.add("T1552.001 (Cloud Instance Metadata)");
      profile.threatScore += 35;
    }

    // T1190 - Exploit Public-Facing Application (SQLi / Logic / RCE)
    if (wallUpper.includes("SQL") || wallUpper.includes("INJECTION") || wallUpper.includes("COMMAND")) {
      profile.techniquesObserved.add("T1190 (Exploit Public-Facing Application: SQLi/RCE)");
      profile.threatScore += 25;
    }

    // T1059.007 - Command and Scripting Interpreter: JavaScript (XSS)
    if (wallUpper.includes("XSS") || payload.includes("<script") || payload.includes("javascript:")) {
      profile.techniquesObserved.add("T1059.007 (Command & Scripting: JavaScript / XSS)");
      profile.threatScore += 15;
    }

    // T1078 - Valid Accounts / Business Logic & Order State Tampering
    if (wallUpper.includes("PRICE") || wallUpper.includes("LOGIC") || wallUpper.includes("ORDER")) {
      profile.techniquesObserved.add("T1078 (Valid Accounts: Financial State Tampering)");
      profile.threatScore += 30;
    }

    // T1595.002 - Vulnerability Scanning
    if (uaLower.includes("sqlmap") || uaLower.includes("nikto") || uaLower.includes("gobuster") || profile.pathsTargeted.size > 8) {
      profile.techniquesObserved.add("T1595.002 (Active Scanning: Vulnerability Scanners)");
      profile.threatScore += 20;
    }

    // T1110.001 - Password Guessing / Brute Force
    if (pathLower.includes("login") || pathLower.includes("auth")) {
      if (profile.requestCount > 5) {
        profile.techniquesObserved.add("T1110.001 (Brute Force: Credential Probing)");
        profile.threatScore += 15;
      }
    }
  }

  /**
   * Classify threat actor persona based on behavioral cadence and techniques
   */
  computePersona(profile) {
    const totalThreat = Math.min(100, profile.threatScore);
    profile.threatScore = totalThreat;

    const uas = Array.from(profile.userAgents).join(" ").toLowerCase();
    const isAutomatedTool = /sqlmap|nikto|zgrab|gobuster|python-requests|curl\//.test(uas);

    // Calculate request velocity & interval variance (jitter)
    let avgDeltaMs = 0;
    if (profile.timestamps.length >= 2) {
      const deltas = [];
      for (let i = 1; i < profile.timestamps.length; i++) {
        deltas.push(profile.timestamps[i] - profile.timestamps[i - 1]);
      }
      avgDeltaMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    }

    if (totalThreat >= 60) {
      if (profile.techniquesObserved.has("T1078 (Valid Accounts: Financial State Tampering)") && avgDeltaMs > 3000) {
        profile.persona = "TARGETED_HUMAN_PENTESTER (Slow & Methodical Logic Exploitation)";
      } else if (isAutomatedTool || avgDeltaMs < 400) {
        profile.persona = "SCRIPT_KIDDIE_AUTOMATED (High Velocity Tool Fuzzing)";
      } else if (profile.techniquesObserved.has("T1552.001 (Cloud Instance Metadata)")) {
        profile.persona = "CLOUD_INFRASTRUCTURE_EXPLOITER (Targeted Cloud Breach)";
      } else {
        profile.persona = "ADVANCED_PERSISTENT_THREAT (Multi-Stage Intruder)";
      }
    } else if (totalThreat >= 25) {
      if (isAutomatedTool) {
        profile.persona = "MASS_INTERNET_SCANNER (Reconnaissance Bot)";
      } else {
        profile.persona = "SUSPICIOUS_RECONNAISSANCE_ACTOR";
      }
    } else {
      profile.persona = "BENIGN_USER";
    }
  }

  /**
   * Generate an Executive Threat Dossier for a given IP
   */
  getDossier(ip) {
    const profile = this.profiles.get(ip);
    if (!profile) {
      return {
        status: "NO_RECORD",
        message: `No security telemetry recorded for IP: ${ip}`,
      };
    }

    return {
      status: "DOSSIER_COMPILED",
      ip: profile.ip,
      threatScore: profile.threatScore,
      severity: profile.threatScore >= 75 ? "CRITICAL" : profile.threatScore >= 40 ? "HIGH" : "ELEVATED",
      classifiedPersona: profile.persona,
      mitreAttckTechniques: Array.from(profile.techniquesObserved),
      telemetry: {
        firstSeen: profile.firstSeen,
        lastSeen: profile.lastSeen,
        totalRequests: profile.requestCount,
        uniquePorts: Array.from(profile.portsUsed),
        uniqueUserAgents: Array.from(profile.userAgents),
        targetedEndpoints: Array.from(profile.pathsTargeted),
        wallsBreached: Array.from(profile.wallsTriggered),
      },
      recommendedCountermeasures: [
        profile.threatScore >= 70 ? "Execute immediate 24h Fail2Ban edge jail" : "Monitor traffic under Deception Honeypot",
        "Enable Canary Honeytokens in API responses to track exfiltration",
        "Enforce Cryptographic Proof-of-Work challenge on originating ASN",
      ],
    };
  }

  /**
   * Get global profiling intelligence summary
   */
  getSummary() {
    const list = Array.from(this.profiles.values())
      .map((p) => ({
        ip: p.ip,
        threatScore: p.threatScore,
        persona: p.persona,
        techniquesCount: p.techniquesObserved.size,
        lastSeen: p.lastSeen,
      }))
      .sort((a, b) => b.threatScore - a.threatScore);

    return {
      trackedActors: this.profiles.size,
      topThreats: list.slice(0, 10),
    };
  }

  /**
   * Export IP Blocklist (One IP per line) for Cloudflare, AWS WAF, and iptables
   */
  exportIpBlocklist() {
    const maliciousIps = Array.from(this.profiles.values())
      .filter((p) => p.threatScore >= 40)
      .map((p) => p.ip);
    return maliciousIps.join("\n");
  }

  /**
   * Export STIX 2.1 Threat Intelligence Bundle for SIEM / SOAR / MISP
   */
  exportStix21() {
    const objects = [];
    const now = new Date().toISOString();

    for (const p of this.profiles.values()) {
      if (p.threatScore < 20) continue;

      const indicatorId = `indicator--${crypto.randomBytes(16).toString("hex")}`;
      objects.push({
        type: "indicator",
        spec_version: "2.1",
        id: indicatorId,
        created: p.firstSeen,
        modified: p.lastSeen,
        name: `Malicious Prober IP ${p.ip}`,
        description: `Threat Actor: ${p.persona} (Threat Score: ${p.threatScore})`,
        indicator_types: ["malicious-activity", "anonymizer"],
        pattern: `[ipv4-addr:value = '${p.ip}']`,
        pattern_type: "stix",
        valid_from: p.firstSeen,
        confidence: Math.min(p.threatScore, 100),
      });

      // Map MITRE Techniques
      for (const tech of p.techniquesObserved) {
        const attackId = `attack-pattern--${crypto.randomBytes(16).toString("hex")}`;
        objects.push({
          type: "attack-pattern",
          spec_version: "2.1",
          id: attackId,
          created: p.firstSeen,
          modified: now,
          name: tech,
          external_references: [
            { source_name: "mitre-attack", external_id: tech.split(" ")[0] },
          ],
        });
      }
    }

    return {
      type: "bundle",
      id: `bundle--${crypto.randomBytes(16).toString("hex")}`,
      objects,
    };
  }
}

export const threatProfiler = new ThreatProfiler();

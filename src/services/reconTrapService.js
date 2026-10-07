import { jailService } from "./jailService.js";
import { threatProfiler } from "./threatProfiler.js";
import { canaryEngine } from "./canaryEngine.js";
import { honeyMazeService } from "./honeyMazeService.js";

/**
 * FORTRESS AUTONOMOUS RECONNAISSANCE HONEY-TRAP
 * Traps automated vulnerability scanners and malicious crawlers
 * that probe for sensitive configuration files, admin panels, and database dumps.
 * Integrates directly with HoneyMazeService for zero-error deception labyrinths.
 */

const RECON_BAIT_PATHS = [
  // Environment & Configuration files
  { path: "/.env", type: "CONFIG_EXPOSURE_PROBE", category: "ENV_FILE" },
  { path: "/.env.local", type: "CONFIG_EXPOSURE_PROBE", category: "ENV_FILE" },
  { path: "/.env.production", type: "CONFIG_EXPOSURE_PROBE", category: "ENV_FILE" },
  { path: "/.env.backup", type: "CONFIG_EXPOSURE_PROBE", category: "ENV_FILE" },
  { path: "/config.json", type: "CONFIG_EXPOSURE_PROBE", category: "CONFIG_FILE" },
  { path: "/settings.py", type: "CONFIG_EXPOSURE_PROBE", category: "CONFIG_FILE" },

  // Source Control Exposure
  { path: "/.git", type: "GIT_EXPOSURE_PROBE", category: "GIT_REPO" },
  { path: "/.git/HEAD", type: "GIT_EXPOSURE_PROBE", category: "GIT_REPO" },
  { path: "/.git/config", type: "GIT_EXPOSURE_PROBE", category: "GIT_REPO" },

  // Cloud & SSH Credentials
  { path: "/.aws/credentials", type: "CREDENTIAL_THEFT_PROBE", category: "AWS_CREDS" },
  { path: "/.aws/config", type: "CREDENTIAL_THEFT_PROBE", category: "AWS_CONFIG" },
  { path: "/.ssh/id_rsa", type: "SSH_KEY_THEFT_PROBE", category: "SSH_KEY" },
  { path: "/.ssh/id_ed25519", type: "SSH_KEY_THEFT_PROBE", category: "SSH_KEY" },

  // CMS & Admin Exploitation
  { path: "/wp-login.php", type: "CMS_EXPLOITATION_PROBE", category: "WORDPRESS" },
  { path: "/wp-admin", type: "CMS_EXPLOITATION_PROBE", category: "WORDPRESS" },
  { path: "/xmlrpc.php", type: "CMS_EXPLOITATION_PROBE", category: "WORDPRESS" },
  { path: "/phpmyadmin", type: "DATABASE_ADMIN_PROBE", category: "PHPMYADMIN" },
  { path: "/pma", type: "DATABASE_ADMIN_PROBE", category: "PHPMYADMIN" },

  // Microservices & Spring Boot Actuators
  { path: "/actuator/env", type: "ACTUATOR_EXPOSURE_PROBE", category: "SPRING_BOOT" },
  { path: "/actuator/heapdump", type: "ACTUATOR_EXPOSURE_PROBE", category: "SPRING_BOOT" },

  // Web Shells & Backdoors
  { path: "/shell.php", type: "WEB_SHELL_PROBE", category: "BACKDOOR" },
  { path: "/c99.php", type: "WEB_SHELL_PROBE", category: "BACKDOOR" },
  { path: "/alfa.php", type: "WEB_SHELL_PROBE", category: "BACKDOOR" },

  // Database Backups
  { path: "/dump.sql", type: "DATABASE_LEAK_PROBE", category: "SQL_DUMP" },
  { path: "/backup.sql", type: "DATABASE_LEAK_PROBE", category: "SQL_DUMP" },
];

export class ReconTrapService {
  /**
   * Check if an incoming request path matches any known reconnaissance bait paths
   */
  static isReconBait(path) {
    if (!path || typeof path !== "string") return null;
    const cleanPath = path.split("?")[0].toLowerCase();

    return RECON_BAIT_PATHS.find(
      (b) => cleanPath === b.path || cleanPath.startsWith(`${b.path}/`)
    );
  }

  /**
   * Trigger autonomous jail and generate deception payload for trapped attacker
   */
  static triggerTrap({ path, ip, userAgent, method, res }) {
    const bait = this.isReconBait(path);
    const reason = `Automated Reconnaissance Probing Detected: Request to forbidden bait path '${path}'.`;

    // 1. Immediately Auto-Jail the Malicious Scanner for 24 Hours
    jailService.banIp(ip, reason, "LAYER 0: RECON_HONEY_TRAP", 24 * 60 * 60 * 1000);

    // 2. Record Forensics Event
    jailService.recordEvent({
      ip,
      wall: "LAYER 0: RECON_HONEY_TRAP",
      threat_level: "CRITICAL",
      reason,
      action: "BAN_IP_24H",
      path,
      user_agent: userAgent,
      evidence: `Recon Category: ${bait?.category || "PROBING"}`,
    });

    // 3. Update Threat Actor Dossier
    threatProfiler.recordActivity({
      ip,
      path,
      method,
      userAgent,
      wallTriggered: "LAYER 0: RECON_HONEY_TRAP",
      threatLevel: "CRITICAL",
      payload: JSON.stringify({ baitType: bait?.type, category: bait?.category }),
    });

    // 4. Return Zero-Error Cyber Deception Labyrinth Response via HoneyMazeService
    return honeyMazeService.handleMazeRequest(
      {
        path,
        originalUrl: path,
        method,
        headers: {
          "user-agent": userAgent,
          "x-forwarded-for": ip,
        },
        ip,
        socket: { remoteAddress: ip },
      },
      res
    );
  }
}

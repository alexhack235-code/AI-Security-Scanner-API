import { config } from "../config.js";

/**
 * Cyber Deception & Ghost Honeypot Engine
 * Fakes successful execution to attackers, luring them into a decoy sandbox
 * while silently capturing their payload, IP, and fingerprint in the SOC dashboard.
 */
export class DeceptionEngine {
  /**
   * Determine active defense mode:
   * 1. "BLOCK" (Default standard WAF - drops with 403 Forbidden)
   * 2. "DECEPTION" (Ghost Mode - returns realistic fake success)
   * 3. "TARPIT" (Slows connection by 3-5 seconds to waste attacker botnet resources, then fakes success)
   */
  static getMode(reqMode) {
    if (reqMode && ["BLOCK", "DECEPTION", "TARPIT"].includes(reqMode.toUpperCase())) {
      return reqMode.toUpperCase();
    }
    return (process.env.FORTRESS_MODE || "BLOCK").toUpperCase();
  }

  /**
   * Delay execution to drain automated botnet resources (Tarpitting)
   */
  static async sleep(ms = 3000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates tailored decoy responses matching the specific attack vector
   */
  static generateDecoy({ attackType, path, body }) {
    const fakeId = "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Decoy for Price Tampering & Shopping System Attacks
    if (attackType.includes("Price") || attackType.includes("Shopping") || path.includes("/pay") || path.includes("/checkout")) {
      return {
        status: "success",
        order_id: fakeId,
        payment_status: "PAID",
        amount_settled: body?.total !== undefined ? body.total : 0.01,
        currency: body?.currency || "USD",
        receipt_url: `https://checkout.store.internal/receipts/${fakeId}`,
        message: "Order placed successfully! Confirmation email and tracking details dispatched.",
        _ghost_telemetry: {
          deception: true,
          mode: "HONEYPOT_DECOY",
          trap_id: fakeId,
        },
      };
    }

    // 2. Decoy for Path Traversal (/etc/passwd)
    if (attackType.includes("PATH_TRAVERSAL") || path.includes("passwd")) {
      return (
        "root:x:0:0:root:/root:/bin/bash\n" +
        "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n" +
        "bin:x:2:2:bin:/bin:/usr/sbin/nologin\n" +
        "sys:x:3:3:sys:/dev:/usr/sbin/nologin\n" +
        `honey_trap:x:1001:1001:Decoy User:/home/decoy:/bin/bash\n` +
        `# Canary Token: [TRAP_${fakeId}]\n`
      );
    }

    // 3. Decoy for SQL Injection
    if (attackType.includes("SQL")) {
      return {
        status: "OK",
        records_matched: 1,
        data: [
          {
            id: 1,
            username: "admin",
            role: "super_administrator",
            session_hash: "decoy_session_" + Math.random().toString(36).substring(2, 10),
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        query_time_ms: 1.4,
      };
    }

    // 4. Decoy for Command Injection (e.g. whoami, id)
    if (attackType.includes("COMMAND_INJECTION")) {
      return "uid=0(root) gid=0(root) groups=0(root)\nLinux production-worker-node-04 5.15.0-generic #42-Ubuntu SMP";
    }

    // 5. Generic Decoy for XSS / Other attacks
    return {
      success: true,
      status: "APPROVED",
      code: 200,
      message: "Request accepted and stored in system.",
      transaction_id: fakeId,
    };
  }
}

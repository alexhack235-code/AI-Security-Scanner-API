import { config } from "../config.js";
import { canaryEngine } from "./canaryEngine.js";

/**
 * Cyber Deception & Ghost Honeypot Engine
 * Fakes successful execution to attackers, luring them into a decoy sandbox
 * while silently capturing their payload, IP, and fingerprint in the SOC dashboard.
 * Injects active Canary Honeytokens (AWS, Stripe, JWT) into decoys so exfiltrated
 * bait credentials trigger emergency alarms when used.
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
  static generateDecoy({ attackType = "", path = "", body = {} }) {
    const fakeId = "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Decoy for Price Tampering & Shopping System Attacks (Injects Canary Stripe Token)
    if (attackType.includes("Price") || attackType.includes("Shopping") || path.includes("/pay") || path.includes("/checkout")) {
      const stripeCanary = canaryEngine.generateHoneytoken("stripe", { attackType, path });
      return {
        status: "success",
        order_id: fakeId,
        payment_status: "PAID",
        amount_settled: body?.total !== undefined ? body.total : 0.01,
        currency: body?.currency || "USD",
        receipt_url: `https://checkout.store.internal/receipts/${fakeId}`,
        message: "Order placed successfully! Confirmation email and tracking details dispatched.",
        payment_gateway_ref: stripeCanary.token,
        _ghost_telemetry: {
          deception: true,
          mode: "HONEYPOT_DECOY",
          trap_id: fakeId,
          canary_token_id: stripeCanary.id,
        },
      };
    }

    // 2. Decoy for Path Traversal (/etc/passwd) (Injects Canary AWS Keys in comments)
    if (attackType.includes("PATH_TRAVERSAL") || path.includes("passwd")) {
      const awsCanary = canaryEngine.generateHoneytoken("aws", { attackType, path });
      return (
        "root:x:0:0:root:/root:/bin/bash\n" +
        "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n" +
        "bin:x:2:2:bin:/bin:/usr/sbin/nologin\n" +
        "sys:x:3:3:sys:/dev:/usr/sbin/nologin\n" +
        `deployer:x:1001:1001:CI Deployer:/home/deployer:/bin/bash\n` +
        `# AWS_ACCESS_KEY_ID=${awsCanary.metadata.keyId}\n` +
        `# AWS_SECRET_ACCESS_KEY=${awsCanary.metadata.secret}\n`
      );
    }

    // 3. Decoy for SQL Injection (Executes against In-Memory Ghost Database Sandbox)
    if (attackType.includes("SQL")) {
      const sqlQuery = typeof body === "string" ? body : (body?.query || body?.username || body?.id || "SELECT * FROM auth_users");
      const jwtCanary = canaryEngine.generateHoneytoken("jwt", { attackType, path, query: String(sqlQuery) });
      const awsCanary = canaryEngine.generateHoneytoken("aws", { attackType, path, query: String(sqlQuery) });
      
      return {
        database_engine: "PostgreSQL/16.3 (Production Cluster)",
        status: "OK",
        records_matched: 3,
        execution_plan: "Index Scan using idx_users_auth on auth_users (cost=0.28..8.29 rows=1 width=128)",
        data: [
          {
            id: "usr_99a1f2b0-4491-4c1b",
            username: "admin_root",
            role: "super_administrator",
            auth_token: jwtCanary.token,
            aws_backend_role: awsCanary.metadata.keyId,
            session_hash: "sess_" + Math.random().toString(36).substring(2, 12),
            created_at: "2024-01-01T00:00:00Z",
          },
          {
            id: "usr_c340d12e-1823-4df5",
            username: "deployer_service",
            role: "ci_deployer",
            auth_token: jwtCanary.token,
            session_hash: "sess_" + Math.random().toString(36).substring(2, 12),
            created_at: "2024-01-02T12:00:00Z",
          }
        ],
        query_time_ms: 1.4,
        _sandbox: "GHOST_DATABASE_ACTIVE",
      };
    }

    // 4. Decoy for Command Injection (e.g. whoami, id)
    if (attackType.includes("COMMAND_INJECTION")) {
      const dbCanary = canaryEngine.generateHoneytoken("database", { attackType, path });
      return (
        "uid=0(root) gid=0(root) groups=0(root)\n" +
        "Linux production-worker-node-04 5.15.0-generic #42-Ubuntu SMP\n" +
        `DATABASE_URL=${dbCanary.token}`
      );
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

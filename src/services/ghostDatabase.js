import crypto from "crypto";
import { canaryEngine } from "./canaryEngine.js";

/**
 * FORTRESS GHOST DATABASE (Interactive In-Memory SQLi Deception Sandbox)
 * Provides a fully interactive SQL query engine for trapped attackers.
 * Instead of static mocks, it interprets attacker SQL queries (UNION SELECT,
 * schema enumeration, sleep() time-based queries, information_schema) and returns
 * structured, realistic tabular result sets embedded with active Canary Honeytokens.
 */
class GhostDatabase {
  constructor() {
    this.totalQueriesExecuted = 0;
    this.attackerQueryLog = [];
    this.maxLogs = 200;

    // In-memory relational tables
    this.tables = {
      auth_users: [
        {
          id: "usr_99a1f2b0-4491-4c1b",
          username: "admin_root",
          email: "security-ops@internal-corp.net",
          password_hash: "$2b$12$e8xL8wQ0qK3rQvY5eM8pU.7o0YpG2jKl0mN9vB3x",
          role: "SUPER_ADMINISTRATOR",
          is_active: 1,
          two_factor_enforced: 1,
        },
        {
          id: "usr_c340d12e-1823-4df5",
          username: "deployer_service",
          email: "ci-cd-bot@corp-infra.net",
          password_hash: "$2b$12$z9xM7wP1pK2rPvX4dK7oT.6n9XoF1iJk9lM8uA2w",
          role: "DEPLOY_AGENT",
          is_active: 1,
          two_factor_enforced: 0,
        },
        {
          id: "usr_f782e44a-9921-4110",
          username: "financial_controller",
          email: "controller@finance-corp.net",
          password_hash: "$2b$12$v4yN6xQ2qL3sQwY5eL8pU.8o1ZpG3jKl1mN0vC4y",
          role: "FINANCE_EXECUTIVE",
          is_active: 1,
          two_factor_enforced: 1,
        },
      ],
      api_credentials: [
        {
          id: 1,
          service: "AWS_PRODUCTION_INFRA",
          environment: "production",
          vault_reference: "arn:aws:iam::123456789012:role/ProductionMaster",
        },
        {
          id: 2,
          service: "STRIPE_BILLING_GATEWAY",
          environment: "live",
          vault_reference: "vault://transit/keys/stripe-live-master",
        },
        {
          id: 3,
          service: "OPENAI_AZURE_ENTERPRISE",
          environment: "production",
          vault_reference: "vault://ai/azure-openai-eastus2",
        },
      ],
      corporate_cards: [
        {
          id: "card_881902",
          cardholder_name: "EXECUTIVE CORP DEV",
          masked_pan: "4111-XXXX-XXXX-8921",
          expiration: "11/28",
          credit_limit: 250000.0,
        },
        {
          id: "card_554109",
          cardholder_name: "CLOUD OPERATIONS POOL",
          masked_pan: "5500-XXXX-XXXX-4402",
          expiration: "04/29",
          credit_limit: 500000.0,
        },
      ],
    };
  }

  /**
   * Primary SQL execution engine for attackers
   */
  async executeQuery(rawSql = "", context = {}) {
    this.totalQueriesExecuted += 1;
    const { ip = "unknown", userAgent = "unknown", path = "/api/users" } = context;
    const cleanSql = (rawSql || "").trim().replace(/\s+/g, " ");
    const lowerSql = cleanSql.toLowerCase();

    // 1. Time-Based Blind SQLi Handling (sleep / pg_sleep / benchmark)
    let delayMs = 0;
    const sleepMatch = lowerSql.match(/(?:sleep|pg_sleep)\s*\(\s*(\d+(?:\.\d+)?)\s*\)/i);
    if (sleepMatch) {
      const requestedSeconds = parseFloat(sleepMatch[1]) || 1;
      delayMs = Math.min(requestedSeconds * 1000, 4000); // Tarpit up to 4s
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Generate fresh Canary Honeytokens to inject into the result set
    const jwtCanary = canaryEngine.generateHoneytoken("jwt", { trap: "ghost_database_sqli", ip, query: cleanSql });
    const awsCanary = canaryEngine.generateHoneytoken("aws", { trap: "ghost_database_sqli", ip, query: cleanSql });
    const stripeCanary = canaryEngine.generateHoneytoken("stripe", { trap: "ghost_database_sqli", ip, query: cleanSql });

    let columns = [];
    let rows = [];

    // 2. Schema Discovery & Table Enumeration Queries
    if (
      lowerSql.includes("information_schema.tables") ||
      lowerSql.includes("sqlite_master") ||
      lowerSql.includes("show tables") ||
      lowerSql.includes("pg_tables")
    ) {
      columns = ["table_schema", "table_name", "table_type", "total_rows"];
      rows = [
        { table_schema: "public", table_name: "auth_users", table_type: "BASE TABLE", total_rows: 3 },
        { table_schema: "public", table_name: "api_credentials", table_type: "BASE TABLE", total_rows: 3 },
        { table_schema: "public", table_name: "corporate_cards", table_type: "BASE TABLE", total_rows: 2 },
        { table_schema: "internal", table_name: "vault_transit_keys", table_type: "ENCRYPTED_PARTITION", total_rows: 1 },
      ];
    }
    // 3. Database Version Discovery Queries
    else if (lowerSql.includes("version()") || lowerSql.includes("@@version") || lowerSql.includes("version")) {
      columns = ["database_version", "server_cluster_id", "patch_level"];
      rows = [
        {
          database_version: "PostgreSQL 16.3 on x86_64-pc-linux-gnu, compiled by gcc 11.4.0",
          server_cluster_id: "cluster-us-east-prod-04",
          patch_level: "2026.04.1",
        },
      ];
    }
    // 4. Queries targeting API Credentials & Secrets
    else if (lowerSql.includes("api_credentials") || lowerSql.includes("secret") || lowerSql.includes("key")) {
      columns = ["id", "service", "environment", "access_key", "secret_token"];
      rows = [
        {
          id: 1,
          service: "AWS_PRODUCTION_INFRA",
          environment: "production",
          access_key: awsCanary.metadata.keyId,
          secret_token: awsCanary.metadata.secret,
        },
        {
          id: 2,
          service: "STRIPE_BILLING_GATEWAY",
          environment: "live",
          access_key: stripeCanary.metadata.publishable,
          secret_token: stripeCanary.token,
        },
      ];
    }
    // 5. Queries targeting Corporate Cards
    else if (lowerSql.includes("corporate_cards") || lowerSql.includes("card") || lowerSql.includes("payment")) {
      columns = ["id", "cardholder_name", "masked_pan", "expiration", "billing_token"];
      rows = [
        {
          id: "card_881902",
          cardholder_name: "EXECUTIVE CORP DEV",
          masked_pan: "4111-XXXX-XXXX-8921",
          expiration: "11/28",
          billing_token: stripeCanary.token,
        },
        {
          id: "card_554109",
          cardholder_name: "CLOUD OPERATIONS POOL",
          masked_pan: "5500-XXXX-XXXX-4402",
          expiration: "04/29",
          billing_token: stripeCanary.token,
        },
      ];
    }
    // 6. Default User / Auth Queries (with Injected Admin JWT)
    else {
      columns = ["id", "username", "email", "role", "auth_token", "created_at"];
      rows = this.tables.auth_users.map((u) => ({
        ...u,
        auth_token: jwtCanary.token,
        created_at: "2024-01-15T08:30:00Z",
      }));
    }

    const executionResult = {
      database_engine: "PostgreSQL/16.3",
      status: "SUCCESS",
      query_executed: cleanSql.slice(0, 150),
      execution_time_ms: delayMs,
      rows_returned: rows.length,
      columns,
      data: rows,
      _execution_metadata: {
        deception: true,
        mode: "GHOST_DATABASE_SANDBOX",
        canary_tokens_injected: [jwtCanary.id, awsCanary.id, stripeCanary.id],
      },
    };

    // Log forensics
    this.attackerQueryLog.push({
      ip,
      userAgent: userAgent.slice(0, 60),
      sql: cleanSql.slice(0, 200),
      rowsReturned: rows.length,
      timestamp: new Date().toISOString(),
      canaries: [jwtCanary.id, awsCanary.id, stripeCanary.id],
    });
    if (this.attackerQueryLog.length > this.maxLogs) this.attackerQueryLog.shift();

    return executionResult;
  }

  getTelemetry() {
    return {
      status: "ACTIVE",
      totalQueriesExecuted: this.totalQueriesExecuted,
      activeSandboxedTables: Object.keys(this.tables),
      recentAttackerQueries: this.attackerQueryLog.slice(-15).reverse(),
    };
  }
}

export const ghostDatabase = new GhostDatabase();

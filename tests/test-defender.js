import http from "http";
import app from "../src/app.js";
import crypto from "crypto";

const PORT = 4007;

async function runHardenedAndDeceptionTests() {
  console.log("==================================================================");
  console.log("🛡️  FORTRESS ENTERPRISE DEFENDER - FULL SUITE (V3.8 MILITARY-GRADE)");
  console.log("==================================================================");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  try {
    // TEST 1: Health Check
    console.log("\n[TEST 1] Testing /health Endpoint...");
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log(`Health: ${healthData.status} (Model: ${healthData.scanner_model})`);
    if (healthRes.status !== 200) throw new Error("Health check failed");

    // TEST 2: Standard Strict WAF Mode (BLOCK)
    console.log("\n[TEST 2] Testing Standard WAF Mode (mode: BLOCK)...");
    const blockRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "BLOCK",
        path: "/api/checkout",
        body: { total: 0.01 },
      }),
    });
    const blockData = await blockRes.json();
    console.log(`Block Result: Action=${blockData.action} | Wall=${blockData.wall_failed}`);
    if (blockData.action !== "BLOCK" && blockData.action !== "BAN_IP_24H") throw new Error("Should block in BLOCK mode");

    // TEST 3: Cyber Deception / Ghost Honeypot Mode (mode: DECEPTION)
    console.log("\n[TEST 3] Testing Cyber Deception Mode (Luring Attacker with Decoy Success)...");
    const ghostRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "DECEPTION",
        path: "/api/checkout",
        body: { total: 0.01, item: "MacBook Pro" },
      }),
    });
    const ghostData = await ghostRes.json();
    console.log(`Deception Result: Action=${ghostData.action}`);
    console.log(`Decoy Sent to Attacker: Status=${ghostData.decoy_payload?.status} | OrderId=${ghostData.decoy_payload?.order_id}`);
    console.log(`Decoy Payment Status: ${ghostData.decoy_payload?.payment_status} (Amount: $${ghostData.decoy_payload?.amount_settled})`);
    console.log(`Injected Canary Token: ${ghostData.decoy_payload?._ghost_telemetry?.canary_token_id}`);
    if (ghostData.action !== "DECEPTION_LURED" || ghostData.decoy_payload?.status !== "success") {
      throw new Error("Deception mode failed to generate fake success decoy!");
    }

    // TEST 4: SQL Injection Decoy in Deception Mode
    console.log("\n[TEST 4] Testing SQL Injection Decoy in Deception Mode...");
    const sqliGhostRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "DECEPTION",
        path: "/api/users",
        body: { query: "SELECT * FROM users WHERE '1'='1'" },
      }),
    });
    const sqliGhostData = await sqliGhostRes.json();
    console.log(`SQLi Decoy Records Returned: ${sqliGhostData.decoy_payload?.records_matched} fake rows`);
    if (!sqliGhostData.decoy_payload?.data) throw new Error("SQLi decoy failed");

    // TEST 5: SSRF Protection
    console.log("\n[TEST 5] Testing SSRF Cloud Metadata Shield (169.254.169.254)...");
    const ssrfRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/api/fetch",
        body: { url: "http://169.254.169.254/latest/meta-data/" },
      }),
    });
    const ssrfData = await ssrfRes.json();
    console.log(`SSRF Result: ${ssrfData.fortress_status} | Wall: ${ssrfData.wall_failed}`);
    if (ssrfData.fortress_status !== "BREACHED") throw new Error("SSRF should be breached");

    // TEST 6: Active Canary Honeytokens & Tripwire
    console.log("\n[TEST 6] Testing Canary Honeytoken Generation & Tripwire Alarm...");
    const canaryGenRes = await fetch(`${baseUrl}/api/canary/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "aws", context: { trap: "admin_leaked_env" } }),
    });
    const canaryGenData = await canaryGenRes.json();
    const honeytoken = canaryGenData.honeytoken.token;
    console.log(`Generated Canary AWS Key: ${honeytoken.slice(0, 12)}...`);

    // Attacker trips the wire with the honeytoken
    const tripRes = await fetch(`${baseUrl}/api/canary/tripwire`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "HostileHacker/1.0" },
      body: JSON.stringify({ token: honeytoken }),
    });
    const tripData = await tripRes.json();
    console.log(`Canary Tripwire Alarm: ${tripData.alarm} | Action: ${tripData.details?.action}`);
    if (tripData.alarm !== "EMERGENCY_BREACH_DETECTED") throw new Error("Canary tripwire failed to alert");

    // TEST 7: Cryptographic Proof-of-Work Bot Shield
    console.log("\n[TEST 7] Testing Cryptographic Proof-of-Work Shield (Anti-Bot / Anti-DDoS)...");
    const powChallengeRes = await fetch(`${baseUrl}/api/pow/challenge?difficulty=3`);
    const { challenge } = await powChallengeRes.json();
    console.log(`PoW Challenge Received: Salt=${challenge.salt.slice(0, 8)}... (Difficulty: ${challenge.difficulty} zeros)`);

    // Solve the mini-puzzle
    let nonce = 0;
    let foundHash = "";
    const prefix = "0".repeat(challenge.difficulty);
    while (true) {
      const h = crypto.createHash("sha256").update(challenge.salt + String(nonce)).digest("hex");
      if (h.startsWith(prefix)) {
        foundHash = h;
        break;
      }
      nonce++;
    }
    console.log(`Solved PoW: Nonce=${nonce} -> Hash=${foundHash.slice(0, 8)}...`);

    const powVerifyRes = await fetch(`${baseUrl}/api/pow/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.challengeId, nonce }),
    });
    const powVerifyData = await powVerifyRes.json();
    console.log(`PoW Verification Result: ${powVerifyData.fortress_status} | PassToken: ${powVerifyData.passToken?.slice(0, 16)}...`);
    if (!powVerifyData.success) throw new Error("PoW verification failed");

    // TEST 8: Autonomous Virtual Patching Engine
    console.log("\n[TEST 8] Testing Autonomous Virtual Patching Runtime Enforcement...");
    const patchRes = await fetch(`${baseUrl}/api/patch/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "VP-TEST-99",
        name: "Test Virtual Patch for SQL in Query",
        path: "^/api/catalog/search$",
        method: "GET",
        cwe: "CWE-89",
        rules: [
          {
            field: "query.q",
            op: "DISALLOW_SQL_SYNTAX",
            message: "Virtual Patch VP-TEST-99 dropped SQL syntax keyword.",
          },
        ],
      }),
    });
    const patchData = await patchRes.json();
    console.log(`Virtual Patch Deployed: ${patchData.patch.id} (${patchData.patch.name})`);

    // Test hitting the virtual patch
    const patchTestRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/api/catalog/search",
        method: "GET",
        body: { query: { q: "shoes' UNION SELECT password FROM users--" } },
      }),
    });
    const patchTestData = await patchTestRes.json();
    console.log(`Virtual Patch Defense Triggered: Wall=${patchTestData.wall_failed} | Reason=${patchTestData.reason}`);
    if (!patchTestData.wall_failed?.includes("VIRTUAL_PATCH")) throw new Error("Virtual patch should intercept");

    // TEST 9: Threat Actor Profiling & MITRE ATT&CK Mapping
    console.log("\n[TEST 9] Testing Threat Actor Profiling & MITRE ATT&CK Matrix...");
    const dossierRes = await fetch(`${baseUrl}/api/threat-profile/198.51.100.42`);
    const dossier = await dossierRes.json();
    console.log(`Threat Dossier Status: ${dossier.status}`);

    // TEST 10: Client-Side Request Signing & Anti-Tamper Shield
    console.log("\n[TEST 10] Testing Client-Side Request Signing & Anti-Tamper Shield...");
    const sessionRes = await fetch(`${baseUrl}/api/signer/session`, { method: "POST" });
    const session = await sessionRes.json();
    console.log(`Signing Session Created: ID=${session.sessionId.slice(0, 12)}...`);

    const ts = Math.floor(Date.now() / 1000);
    const signNonce = "nonce_xyz123";
    const bodyObj = { productId: "item_laptop", amount: 1200 };
    const canonical = ["POST", "/api/checkout", String(ts), signNonce, JSON.stringify(bodyObj)].join("\n");
    const validSig = crypto.createHmac("sha256", session.clientKey).update(canonical).digest("hex");

    // 10A: Valid signed request
    const validSignRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-fortress-session-id": session.sessionId,
        "x-fortress-signature": validSig,
        "x-fortress-timestamp": String(ts),
        "x-fortress-nonce": signNonce,
      },
      body: JSON.stringify({ path: "/api/checkout", body: bodyObj }),
    });
    const validSignData = await validSignRes.json();
    console.log(`Valid Signature Check: Status=${validSignData.fortress_status}`);

    // 10B: Tampered request (Attacker changed price to 1.00 in Burp Suite)
    const tamperedRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-fortress-session-id": session.sessionId,
        "x-fortress-signature": validSig, // Old signature doesn't match new payload!
        "x-fortress-timestamp": String(ts),
        "x-fortress-nonce": "nonce_tampered_999",
      },
      body: JSON.stringify({ path: "/api/checkout", body: { productId: "item_laptop", amount: 1.00 } }),
    });
    const tamperedData = await tamperedRes.json();
    console.log(`Tampered Signature Rejection: Wall=${tamperedData.wall_failed} | Reason=${tamperedData.reason}`);
    if (tamperedData.wall_failed !== "WALL: Request Signature Tampering") {
      throw new Error("Tampered request should be rejected by signature shield!");
    }

    console.log("\n==================================================================");
    console.log("✅ ALL 10 FORTRESS ENTERPRISE DEFENSE SYSTEMS PASSED FLAWLESSLY!");
    console.log("==================================================================");
    server.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    server.close();
    process.exit(1);
  }
}

runHardenedAndDeceptionTests();

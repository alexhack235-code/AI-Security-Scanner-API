import http from "http";
import app from "../src/app.js";

const PORT = 4007;

async function runHardenedAndDeceptionTests() {
  console.log("==================================================================");
  console.log("🛡️  FORTRESS ENTERPRISE DEFENDER - DECEPTION & GHOST HONEYPOT SUITE");
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

    console.log("\n==================================================================");
    console.log("✅ ALL CYBER DECEPTION & GHOST HONEYPOT TESTS PASSED FLAWLESSLY!");
    console.log("==================================================================");
    server.close();
  } catch (err) {
    console.error("\n❌ DECEPTION TEST FAILED:", err);
    server.close();
  }
}

runHardenedAndDeceptionTests();

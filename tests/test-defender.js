import http from "http";
import app from "../src/app.js";

const PORT = 4006;

async function runStrengthenedDefenderTests() {
  console.log("==================================================================");
  console.log("🛡️  FORTRESS ENTERPRISE DEFENDER - ADVANCED SHIELD HARDENING");
  console.log("==================================================================");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  try {
    // TEST 1: Health & Root
    console.log("\n[TEST 1] Testing /health & /...");
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log(`Health: ${healthData.status} (Model: ${healthData.scanner_model})`);
    if (healthRes.status !== 200) throw new Error("Health check failed");

    // TEST 2: SSRF & Cloud Metadata Protection
    console.log("\n[TEST 2] Testing SSRF & Cloud Metadata Shield (169.254.169.254)...");
    const ssrfRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/api/fetch-avatar",
        body: { avatarUrl: "http://169.254.169.254/latest/meta-data/iam/security-credentials" },
      }),
    });
    const ssrfData = await ssrfRes.json();
    console.log(`SSRF Result: ${ssrfData.fortress_status} | Wall: ${ssrfData.wall_failed}`);
    if (ssrfData.fortress_status !== "BREACHED") throw new Error("SSRF should be blocked!");

    // TEST 3: Honeypot Canary Trap
    console.log("\n[TEST 3] Testing Honeypot Canary Parameter Trap (__admin / is_superuser)...");
    const honeyRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/api/profile",
        body: { username: "bob", __admin: true },
      }),
    });
    const honeyData = await honeyRes.json();
    console.log(`Honeypot Trap Result: ${honeyData.fortress_status} | Wall: ${honeyData.wall_failed}`);
    if (honeyData.fortress_status !== "BREACHED") throw new Error("Honeypot should trigger ban!");

    // TEST 4: JSON Nesting Depth DoS Protection
    console.log("\n[TEST 4] Testing JSON Depth DoS Shield (Excessive Object Nesting)...");
    // Generate 10-level nested object
    let deepObject = { leaf: "payload" };
    for (let i = 0; i < 9; i++) {
      deepObject = { nest: deepObject };
    }
    const depthRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/api/data",
        body: deepObject,
      }),
    });
    const depthData = await depthRes.json();
    console.log(`Depth DoS Result: ${depthData.fortress_status} | Wall: ${depthData.wall_failed}`);
    if (depthData.fortress_status !== "BREACHED") throw new Error("Nested JSON DoS should be blocked!");

    // TEST 5: JWT 'None' Algorithm Confusion Attack
    console.log("\n[TEST 5] Testing JWT 'None' Algorithm Attack Shield (CVE-2015-9235)...");
    // Header: { "alg": "none", "typ": "JWT" } -> eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
    // Payload: { "sub": "admin", "admin": true } -> eyJzdWIiOiJhZG1pbiIsImFkbWluIjp0cnVlfQ
    const noneAlgJwt = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImFkbWluIjp0cnVlfQ.";
    const jwtRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${noneAlgJwt}`,
      },
      body: JSON.stringify({
        path: "/api/admin/dashboard",
        body: {},
      }),
    });
    const jwtData = await jwtRes.json();
    console.log(`JWT None Alg Result: ${jwtData.fortress_status} | Wall: ${jwtData.wall_failed}`);
    if (jwtData.fortress_status !== "BREACHED") throw new Error("JWT 'none' algorithm must be blocked!");

    // TEST 6: Unified Master API (POST /api)
    console.log("\n[TEST 6] Testing Unified Master API (POST /api)...");
    const masterRes = await fetch(`${baseUrl}/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/checkout", body: { total: 0.01 } }),
    });
    const masterData = await masterRes.json();
    console.log(`Master API Result: ${masterData.fortress_status} | Reason: ${masterData.reason}`);
    if (masterData.fortress_status !== "BREACHED") throw new Error("Master API should catch price tampering!");

    console.log("\n==================================================================");
    console.log("✅ ALL 6 NEW ADVANCED DEFENSE SHIELDS VERIFIED FLAWLESSLY!");
    console.log("==================================================================");
    server.close();
  } catch (err) {
    console.error("\n❌ HARDENED TEST SUITE FAILED:", err);
    server.close();
  }
}

runStrengthenedDefenderTests();

import http from "http";
import app from "../src/app.js";

const PORT = 4004;

async function runEnterpriseDefenderTests() {
  console.log("==================================================================");
  console.log("🛡️  FORTRESS ENTERPRISE DEFENDER - ADVANCED STEALTH & TELEMETRY");
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

    // TEST 2: VPN / Tor & Proxy Detection
    console.log("\n[TEST 2] Testing Autonomous VPN / Tor & Proxy Detection...");
    const vpnRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "via": "1.1 anonymous-vpn.net",
        "x-forwarded-for": "185.220.101.5, 10.0.0.1",
        "x-tor-exit-node": "yes",
      },
      body: JSON.stringify({
        path: "/api/login",
        body: { username: "alice" },
      }),
    });
    const vpnData = await vpnRes.json();
    console.log(`VPN Anonymized: ${vpnData.vpn_telemetry?.is_anonymized} | Proxy Type: ${vpnData.vpn_telemetry?.proxy_type}`);
    console.log(`Flags: ${vpnData.vpn_telemetry?.flags?.join(", ")}`);
    if (!vpnData.vpn_telemetry?.is_anonymized) throw new Error("VPN headers should be detected!");

    // TEST 3: Zero Secrets Leak Policy (Secret Redaction Verification)
    console.log("\n[TEST 3] Testing Zero Secrets Leak Policy (Redaction Engine)...");
    const secretRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/api/test",
        body: {
          testToken: "AQ.Ab8RN6LV5DWZuLn76L6idErm5ql3h91cdXrpsdBdh-yzl5mUIw",
          password: "my_secret_password_123",
        },
      }),
    });
    const secretData = await secretRes.json();
    const strData = JSON.stringify(secretData);
    const leakedRawKey = strData.includes("AQ.Ab8RN6LV5DWZuLn76L6idErm5ql3h91cdXrpsdBdh-yzl5mUIw");
    const leakedPassword = strData.includes("my_secret_password_123");
    console.log(`Raw API Key Leaked? ${leakedRawKey ? "YES (FAIL)" : "NO (Cleanly Redacted)"}`);
    console.log(`Raw Password Leaked? ${leakedPassword ? "YES (FAIL)" : "NO (Cleanly Redacted)"}`);
    if (leakedRawKey || leakedPassword) throw new Error("Zero secrets policy failed: raw credentials found in output!");

    // TEST 4: Ephemeral One-Way Time-Bombed Handshake (Issue -> Claim -> Replay Lockout)
    console.log("\n[TEST 4] Testing Ephemeral One-Way Handshake...");
    const issueRes = await fetch(`${baseUrl}/api/admin/handshake/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttl_seconds: 20 }),
    });
    const issueData = await issueRes.json();
    console.log(`Issued Ticket: ${issueData.token.slice(0, 16)}... (TTL: ${issueData.ttl_seconds}s)`);

    // Claim ticket
    const claimRes = await fetch(`${baseUrl}/api/admin/handshake/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: issueData.token }),
    });
    const claimData = await claimRes.json();
    console.log(`Handshake Claim Status: ${claimData.status} -> ${claimData.message}`);
    if (claimRes.status !== 200) throw new Error("Ticket claim failed");

    // Replay attack test (Trying to use the same single-use token again)
    const replayRes = await fetch(`${baseUrl}/api/admin/handshake/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: issueData.token }),
    });
    console.log(`Replay Attack Rejection: Status ${replayRes.status} (Locked down successfully)`);
    if (replayRes.status !== 403) throw new Error("Single-use token replay must be rejected!");

    // TEST 5: Reconnaissance Bot Stealth Shield
    console.log("\n[TEST 5] Testing Anti-Reconnaissance Stealth Shield (Blocking Hostile Scanners)...");
    const botRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "sqlmap/1.5.2#stable (http://sqlmap.org)",
      },
      body: JSON.stringify({ path: "/api/users" }),
    });
    const botData = await botRes.json();
    console.log(`Hostile Scanner Blocked: Status ${botRes.status} -> ${botData.reason}`);
    if (botRes.status !== 403) throw new Error("Hostile scanner should be blocked!");

    console.log("\n==================================================================");
    console.log("✅ ALL ADVANCED STEALTH & TELEMETRY TESTS PASSED FLAWLESSLY!");
    console.log("==================================================================");
    server.close();
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    server.close();
  }
}

runEnterpriseDefenderTests();

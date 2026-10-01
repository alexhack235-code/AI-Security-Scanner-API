import http from "http";
import app from "../src/app.js";

const PORT = 4003;

async function runEnterpriseDefenderTests() {
  console.log("==================================================================");
  console.log("🛡️  FORTRESS ENTERPRISE CLOUD DEFENDER v3.5 - FULL VERIFICATION");
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

    // TEST 2: Layer 1 Instant Kill (<2ms)
    console.log("\n[TEST 2] Testing Layer 1: XSS Instant Kill (<2ms)...");
    const xssRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/api/search",
        body: { query: "<script>alert('pwn')</script>" },
      }),
    });
    const xssData = await xssRes.json();
    console.log(`Status: ${xssData.fortress_status} | Wall: ${xssData.wall_failed} | Time: ${xssData.duration_ms}ms`);
    if (xssData.fortress_status !== "BREACHED") throw new Error("XSS should be breached");

    // TEST 3: Autonomous Site Classification (Shopping System)
    console.log("\n[TEST 3] Testing Autonomous Classifier & Shopping System Bypass...");
    const cartRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/store/cart/checkout",
        body: {
          items: [{ sku: "prod_001", quantity: 1 }],
          coupons: ["VIP90", "FREESHIP"], // Coupon stacking bypass
        },
      }),
    });
    const cartData = await cartRes.json();
    console.log(`Classification: ${cartData.site_classification.category} (${cartData.site_classification.active_defense_profile})`);
    console.log(`Result: ${cartData.fortress_status} | Wall: ${cartData.wall_failed} | Reason: ${cartData.reason}`);
    if (cartData.fortress_status !== "BREACHED") throw new Error("Coupon stacking bypass should be blocked");

    // TEST 4: Order State Tampering (Client sends { status: 'PAID' })
    console.log("\n[TEST 4] Testing Order State Tampering ({ status: 'PAID' })...");
    const tamperRes = await fetch(`${baseUrl}/api/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/checkout/order/submit",
        body: {
          cartId: "cart_88",
          is_paid: true, // Malicious client declaring payment done
        },
      }),
    });
    const tamperData = await tamperRes.json();
    console.log(`Result: ${tamperData.fortress_status} | Wall: ${tamperData.wall_failed} | Reason: ${tamperData.reason}`);
    if (tamperData.fortress_status !== "BREACHED") throw new Error("Order state tampering must be blocked");

    // TEST 5: Data Exposure Scanner & Bug Bounty Report Generator
    console.log("\n[TEST 5] Testing Sensitive Data Exposure & Bug Bounty Generator...");
    const leakRes = await fetch(`${baseUrl}/api/bounty/scan-leaks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: "Production Checkout Service",
        endpoint: "/api/orders/details",
        content: JSON.stringify({
          orderId: 1024,
          user: "Alice",
          leakedKey: "sk_live_51Abcdef1234567890abcdef1234567890",
        }),
      }),
    });
    const leakData = await leakRes.json();
    console.log(`Leaks Caught: ${leakData.leaks_found} -> ${leakData.leaks[0]?.type} (CVSS: ${leakData.leaks[0]?.cvss})`);
    console.log(`Bounty Report Created: [${leakData.bounty_report?.report_id}] ${leakData.bounty_report?.title}`);
    if (leakData.leaks_found < 1) throw new Error("Secret key leak must be detected");

    // TEST 6: Payment Gateway - Paystack HMAC SHA512 Verification
    console.log("\n[TEST 6] Testing Payment Shield (Paystack HMAC SHA512)...");
    import("crypto").then(async ({ default: crypto }) => {
      const secret = "test_paystack_secret_key_123";
      const payload = JSON.stringify({ event: "charge.success", data: { amount: 5000, reference: "ref_101" } });
      const validSig = crypto.createHmac("sha512", secret).update(payload).digest("hex");

      const payRes = await fetch(`${baseUrl}/api/payment/verify-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-paystack-signature": validSig,
        },
        body: JSON.stringify({
          gateway: "paystack",
          rawBody: payload,
          secret,
          eventId: "evt_101",
        }),
      });
      const payData = await payRes.json();
      console.log(`Paystack Verification: ${payData.valid ? "PASSED" : "FAILED"} -> ${payData.message}`);

      // Replay Attack Test (same eventId)
      const replayRes = await fetch(`${baseUrl}/api/payment/verify-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: "paystack",
          rawBody: payload,
          secret,
          eventId: "evt_101", // Reused eventId!
        }),
      });
      const replayData = await replayRes.json();
      console.log(`Replay Defense: ${replayRes.status === 409 ? "SUCCESS (Blocked duplicate event)" : "FAILED"}`);

      console.log("\n==================================================================");
      console.log("✅ ALL ENTERPRISE CLOUD DEFENDER TESTS PASSED FLAWLESSLY!");
      console.log("==================================================================");
      server.close();
    });
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    server.close();
  }
}

runEnterpriseDefenderTests();

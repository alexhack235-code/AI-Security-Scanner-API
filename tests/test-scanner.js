import http from "http";
import app from "../src/app.js";
import { config } from "../src/config.js";

const PORT = 4001; // Separate port for testing

// Sample Vulnerable Code with Price Manipulation & SQLi
const VULNERABLE_SNIPPET = `
app.post('/api/checkout', async (req, res) => {
  const { cart, total, couponCode } = req.body;
  
  // Vulnerability 1: Trusting client-supplied price/total
  const chargeAmount = total; 
  
  // Vulnerability 2: SQL Injection
  const query = "SELECT * FROM coupons WHERE code = '" + couponCode + "'";
  const coupon = await db.query(query);
  
  // Vulnerability 3: IDOR
  const user = await User.findById(req.body.userId);
  
  await chargeCard(user.stripeCustomer, chargeAmount);
  res.json({ success: true });
});
`;

// Sample Secure Code
const SECURE_SNIPPET = `
app.post('/api/checkout', authenticateUser, async (req, res) => {
  const { cartItems, couponCode } = req.body;
  const userId = req.user.id;

  // Recalculate price server-side from canonical database
  let serverCalculatedTotal = 0;
  for (const item of cartItems) {
    const product = await Product.findById(item.productId);
    if (!product || item.quantity <= 0) {
      return res.status(400).json({ error: 'Invalid product or quantity' });
    }
    serverCalculatedTotal += product.price * item.quantity;
  }

  // Parameterized query against SQL injection
  const [coupon] = await db.execute('SELECT * FROM coupons WHERE code = ? AND active = 1', [couponCode]);
  if (coupon) {
    serverCalculatedTotal = Math.max(0, serverCalculatedTotal - coupon.discount);
  }

  const paymentResult = await processPayment({ userId, amount: serverCalculatedTotal });
  return res.json({ success: true, orderId: paymentResult.id });
});
`;

async function runTests() {
  console.log("====================================================");
  console.log("🛡️  FORTRESS SECURITY SCANNER TEST SUITE");
  console.log("====================================================");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  try {
    // TEST 1: Health Check
    console.log("\n[TEST 1] Checking /health endpoint...");
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log(`Status: ${healthRes.status} -> ${healthData.status} (Model: ${healthData.scanner_model})`);
    if (healthRes.status !== 200) throw new Error("Health check failed");

    // TEST 2: Input Validation (Empty payload rejection)
    console.log("\n[TEST 2] Testing Input Validation Guard (Empty Payload)...");
    const emptyRes = await fetch(`${baseUrl}/api/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vault-pass": config.vaultMasterPass,
      },
      body: JSON.stringify({}),
    });
    const emptyData = await emptyRes.json();
    console.log(`Status: ${emptyRes.status} -> Verdict: ${emptyData.verdict}`);
    if (emptyRes.status !== 400) throw new Error("Empty payload should be rejected with 400");

    // TEST 3: Scan Execution
    if (!config.geminiApiKey) {
      console.log("\n⚠️  [SKIPPING LIVE AI SCAN]: GEMINI_API_KEY not configured in .env.");
      console.log("👉 Add GEMINI_API_KEY to your .env file to enable live AI scanning tests.");
    } else {
      console.log("\n[TEST 3] Running Live AI Scan on Vulnerable Snippet (Price Tampering + SQLi + IDOR)...");
      const scanRes = await fetch(`${baseUrl}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vault-pass": config.vaultMasterPass,
        },
        body: JSON.stringify({
          filename: "checkoutController.js",
          type: "express_route",
          code: VULNERABLE_SNIPPET,
        }),
      });

      const scanData = await scanRes.json();
      console.log("\n--- FORTRESS SCAN RESULTS ---");
      console.log(`Fortress Status: ${scanData.fortress_status}`);
      console.log(`Threat Level:    ${scanData.threat_level}`);
      console.log(`Security Score:  ${scanData.score}/100`);
      console.log(`Walls Failed:    ${scanData.walls_failed?.join(", ")}`);
      console.log(`Verdict:         ${scanData.verdict}`);
      console.log(`\nFindings (${scanData.findings?.length || 0}):`);
      scanData.findings?.forEach((f, idx) => {
        console.log(`  ${idx + 1}. [${f.severity}] ${f.type} (${f.location}): ${f.issue}`);
      });
      console.log("----------------------------");
    }

    console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
  } finally {
    server.close();
  }
}

runTests();

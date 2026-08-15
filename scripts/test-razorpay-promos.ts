import { db } from "../lib/prisma";

async function testRazorpayAndPromos() {
  console.log("=================================================");
  console.log("   TESTING RAZORPAY GATEWAY & PROMO CODES        ");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Admin Authentication
  console.log("[1/7] Authenticating as Admin...");
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@vectorspaceacademy.com",
      password: "Admin@12345"
    })
  });

  if (!adminLogin.ok) throw new Error("Admin login failed");
  const adminCookie = adminLogin.headers.get("set-cookie")!.split(";")[0];
  console.log("✓ Admin authenticated.\n");

  // 2. Admin Creates a New Promo Code
  console.log("[2/7] Admin creates new promo code via API...");
  const testPromoCode = `FLAT${Math.floor(1000 + Math.random() * 9000)}`;
  const createPromoRes = await fetch(`${baseUrl}/api/admin/promos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      code: testPromoCode,
      description: "Flat off special offer",
      discountType: "FLAT",
      discountValue: 250000, // in paise
      minOrderPaise: 500000,
      active: true,
      usageLimit: 100
    })
  });

  const createPromoData = await createPromoRes.json();
  if (!createPromoData.ok) throw new Error(`Failed to create promo: ${createPromoData.error}`);
  console.log(`✓ Admin created promo code: "${createPromoData.promoCode.code}" (${createPromoData.promoCode.discountType} discount).`);

  // 3. Student Authentication
  console.log("\n[3/7] Authenticating as Student...");
  const testStudentEmail = `tester${Date.now()}@gmail.com`;
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Checkout Tester",
      email: testStudentEmail,
      password: "Password@123",
      phone: "9876543210"
    })
  });

  if (!registerRes.ok) {
    const errData = await registerRes.json();
    throw new Error(`Student registration failed: ${JSON.stringify(errData)}`);
  }
  const studentCookie = registerRes.headers.get("set-cookie")!.split(";")[0];
  console.log(`✓ Student "${testStudentEmail}" authenticated.`);

  // Find a published course
  const course = await db.course.findFirst({
    where: { published: true }
  });
  if (!course) throw new Error("No course found");
  console.log(`✓ Testing with course: "${course.title}" (Original Price: ₹${course.pricePaise / 100})`);

  // 4. Validate Promo Codes
  console.log("\n[4/7] Testing Promo Code Validation API (/api/promos/validate)...");

  // 4a. Valid AI50 promo code (50% off)
  const val50Res = await fetch(`${baseUrl}/api/promos/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ code: "AI50", courseId: course.id })
  });
  const val50Data = await val50Res.json();
  console.log("✓ Validation AI50 (50% OFF):", {
    valid: val50Data.valid,
    originalAmount: `₹${val50Data.originalAmountPaise / 100}`,
    discount: `-₹${val50Data.discountPaise / 100}`,
    finalAmount: `₹${val50Data.finalAmountPaise / 100}`
  });
  if (!val50Data.valid || val50Data.discountPaise <= 0) {
    throw new Error("AI50 validation failed");
  }

  // 4b. Invalid promo code
  const valBadRes = await fetch(`${baseUrl}/api/promos/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ code: "NONEXISTENT_CODE", courseId: course.id })
  });
  const valBadData = await valBadRes.json();
  console.log("✓ Validation for invalid code properly rejected:", valBadData.error);
  if (valBadData.valid) throw new Error("Invalid promo was incorrectly approved");

  // 5. Checkout & Razorpay Order Creation with AI50
  console.log("\n[5/7] Testing Checkout Order Creation with Promo Code (/api/orders)...");
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ courseId: course.id, promoCode: "AI50" })
  });
  const orderData = await orderRes.json();
  console.log("✓ Order created successfully:", {
    orderNumber: orderData.orderNumber,
    originalAmount: `₹${orderData.originalAmountPaise / 100}`,
    discount: `-₹${orderData.discountPaise / 100}`,
    finalAmount: `₹${orderData.amountPaise / 100}`,
    gatewayOrderId: orderData.gatewayOrderId,
    gatewayKeyId: orderData.keyId,
    isDemo: orderData.isDemo
  });

  if (!orderData.orderId || orderData.amountPaise !== val50Data.finalAmountPaise) {
    throw new Error("Order creation with discount failed");
  }

  // 6. Payment Confirmation via Razorpay Gateway
  console.log("\n[6/7] Testing Payment Confirmation (/api/orders/confirm)...");
  const confirmRes = await fetch(`${baseUrl}/api/orders/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      orderId: orderData.orderId,
      gatewayOrderId: orderData.gatewayOrderId,
      gatewayPaymentId: `pay_test_rzp_${Date.now()}`
    })
  });
  const confirmData = await confirmRes.json();
  console.log("✓ Payment confirmation result:", confirmData);
  if (!confirmData.ok) throw new Error("Payment confirmation failed");

  // Verify enrollment in database
  const enrollment = await db.enrollment.findFirst({
    where: { courseId: course.id, user: { email: testStudentEmail } }
  });
  if (!enrollment || enrollment.status !== "ACTIVE") {
    throw new Error("Enrollment was not activated after payment!");
  }
  console.log("✓ Active enrollment verified in PostgreSQL database.");

  // 7. Admin Orders Ledger Audit
  console.log("\n[7/7] Testing Admin Orders Ledger (/api/admin/orders)...");
  const adminOrdersRes = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Cookie: adminCookie }
  });
  const adminOrdersData = await adminOrdersRes.json();
  const matchedOrder = adminOrdersData.orders.find((o: any) => o.id === orderData.orderId);

  console.log("✓ Admin Orders Ledger verified. Found placed order:", {
    orderNumber: matchedOrder?.orderNumber,
    student: matchedOrder?.user?.email,
    promoCode: matchedOrder?.promoCode?.code,
    discount: `-₹${matchedOrder?.discountPaise / 100}`,
    finalPaid: `₹${matchedOrder?.amountPaise / 100}`,
    status: matchedOrder?.status
  });

  if (!matchedOrder || matchedOrder.status !== "PAID") {
    throw new Error("Order was not found as PAID in admin ledger");
  }

  console.log("\n=================================================");
  console.log("   🎉 ALL RAZORPAY & PROMO CODE TESTS PASSED!    ");
  console.log("=================================================");
}

testRazorpayAndPromos().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

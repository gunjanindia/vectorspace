import { db } from "../lib/prisma";

async function testFreeScholarshipPromo() {
  console.log("Testing 100% Scholarship / Free Enrollment Promo...");
  const baseUrl = "http://localhost:3000";

  // Register student
  const studentEmail = `scholar_${Date.now()}@gmail.com`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Scholar Student",
      email: studentEmail,
      password: "Password@123"
    })
  });
  if (!regRes.ok) throw new Error("Registration failed");
  const cookie = regRes.headers.get("set-cookie")!.split(";")[0];

  const course = await db.course.findFirst({ where: { published: true } });
  if (!course) throw new Error("Course not found");

  // Validate GENAI100
  const valRes = await fetch(`${baseUrl}/api/promos/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ code: "GENAI100", courseId: course.id })
  });
  const valData = await valRes.json();
  console.log("✓ GENAI100 Validation (100% FREE):", {
    valid: valData.valid,
    finalAmount: `₹${valData.finalAmountPaise / 100}`
  });

  if (valData.finalAmountPaise !== 0) throw new Error("100% discount failed");

  // Create order
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ courseId: course.id, promoCode: "GENAI100" })
  });
  const orderData = await orderRes.json();
  console.log("✓ Free order created:", {
    orderNumber: orderData.orderNumber,
    amount: `₹${orderData.amountPaise / 100}`,
    gatewayOrderId: orderData.gatewayOrderId
  });

  // Confirm free grant
  const confirmRes = await fetch(`${baseUrl}/api/orders/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      orderId: orderData.orderId,
      gatewayOrderId: orderData.gatewayOrderId,
      gatewayPaymentId: `free_grant_${Date.now()}`
    })
  });
  const confirmData = await confirmRes.json();
  console.log("✓ Free enrollment confirmation:", confirmData);
  if (!confirmData.ok) throw new Error("Free enrollment confirmation failed");

  console.log("✓ 100% Free scholarship promo verified successfully!");
}

testFreeScholarshipPromo().catch(e => {
  console.error("Free promo test failed:", e);
  process.exit(1);
});

import { db } from "../lib/prisma";

async function testBatchesAndInstructors() {
  console.log("=================================================");
  console.log("   TESTING BATCHES, INSTRUCTORS & SEAT CAPACITY  ");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Admin Authentication
  console.log("[1/6] Authenticating as Admin...");
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

  // 2. Instructor Management API
  console.log("[2/6] Testing Faculty/Instructor Management API...");
  const newInstEmail = `faculty_${Date.now()}@vectorspaceacademy.com`;
  const createInstRes = await fetch(`${baseUrl}/api/admin/instructors`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "Dr. Marcus Vance",
      email: newInstEmail,
      title: "Senior AI Systems Architect",
      bio: "Specializing in distributed inference, quantization, and agentic workflows.",
      phone: "+91 98888 77777"
    })
  });

  const createInstData = await createInstRes.json();
  if (!createInstData.ok) throw new Error(`Failed to create instructor: ${createInstData.error}`);
  console.log(`✓ Instructor created: "${createInstData.instructor.name}" (${createInstData.instructor.title})`);

  const instId = createInstData.instructor.id;

  // 3. Batch Creation with Limited Seat Capacity (2 Seats)
  console.log("\n[3/6] Creating Limited-Seat Hybrid Batch (Capacity = 2)...");
  const course = await db.course.findFirst({ where: { published: true } });
  if (!course) throw new Error("Course not found");

  const createBatchRes = await fetch(`${baseUrl}/api/admin/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: `Limited Seat AI Cohort ${Date.now()}`,
      courseId: course.id,
      instructorId: instId,
      mode: "HYBRID",
      startDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
      schedule: "Sat & Sun, 2:00 PM – 5:00 PM IST",
      classroom: "Tech Lab 4A, Campus",
      meetingLink: "https://meet.google.com/test-limited-cohort",
      capacity: 2, // Strict 2 seats
      status: "UPCOMING"
    })
  });

  const createBatchData = await createBatchRes.json();
  if (!createBatchData.ok) throw new Error(`Failed to create batch: ${createBatchData.error}`);
  const batchId = createBatchData.batch.id;
  console.log(`✓ Batch created: "${createBatchData.batch.name}" (Mode: ${createBatchData.batch.mode}, Capacity: ${createBatchData.batch.capacity} seats).`);

  // 4. Public Batches API Query
  console.log("\n[4/6] Querying Public Batches API (/api/batches)...");
  const publicBatchesRes = await fetch(`${baseUrl}/api/batches?courseId=${course.id}`);
  const publicBatchesData = await publicBatchesRes.json();
  const matchedBatch = publicBatchesData.batches.find((b: any) => b.id === batchId);

  console.log("✓ Public batch verification:", {
    name: matchedBatch?.name,
    capacity: matchedBatch?.capacity,
    enrolled: matchedBatch?.enrolledCount,
    remaining: matchedBatch?.remainingSeats,
    isFull: matchedBatch?.isFull
  });

  if (!matchedBatch || matchedBatch.remainingSeats !== 2) {
    throw new Error("Batch capacity mismatch in public API");
  }

  // 5. Test Limited-Seat Enrollments & Overcapacity Rejection
  console.log("\n[5/6] Testing Limited-Seat Enrollment & Overcapacity Guard...");

  // Register Student 1
  const student1Email = `student1_${Date.now()}@gmail.com`;
  const s1Reg = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Student Alpha", email: student1Email, password: "Password@123" })
  });
  const s1Cookie = s1Reg.headers.get("set-cookie")!.split(";")[0];

  // Student 1 Checkout for the Batch
  const s1Order = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: s1Cookie },
    body: JSON.stringify({ courseId: course.id, batchId, promoCode: "GENAI100" })
  });
  const s1OrderData = await s1Order.json();
  if (!s1OrderData.orderId) throw new Error(`Student 1 order failed: ${JSON.stringify(s1OrderData)}`);

  // Confirm Student 1 Enrollment
  await fetch(`${baseUrl}/api/orders/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: s1Cookie },
    body: JSON.stringify({
      orderId: s1OrderData.orderId,
      gatewayOrderId: s1OrderData.gatewayOrderId,
      gatewayPaymentId: `pay_s1_${Date.now()}`
    })
  });
  console.log("✓ Student 1 enrolled successfully into limited batch (1 / 2 seats filled).");

  // Register Student 2
  const student2Email = `student2_${Date.now()}@gmail.com`;
  const s2Reg = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Student Beta", email: student2Email, password: "Password@123" })
  });
  const s2Cookie = s2Reg.headers.get("set-cookie")!.split(";")[0];

  // Student 2 Checkout for the Batch (Fills the 2nd seat)
  const s2Order = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: s2Cookie },
    body: JSON.stringify({ courseId: course.id, batchId, promoCode: "GENAI100" })
  });
  const s2OrderData = await s2Order.json();
  if (!s2OrderData.orderId) throw new Error(`Student 2 order failed: ${JSON.stringify(s2OrderData)}`);

  await fetch(`${baseUrl}/api/orders/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: s2Cookie },
    body: JSON.stringify({
      orderId: s2OrderData.orderId,
      gatewayOrderId: s2OrderData.gatewayOrderId,
      gatewayPaymentId: `pay_s2_${Date.now()}`
    })
  });
  console.log("✓ Student 2 enrolled successfully into limited batch (2 / 2 seats filled - BATCH FULL).");

  // Register Student 3 and attempt to enroll in FULL batch
  const student3Email = `student3_${Date.now()}@gmail.com`;
  const s3Reg = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Student Gamma", email: student3Email, password: "Password@123" })
  });
  const s3Cookie = s3Reg.headers.get("set-cookie")!.split(";")[0];

  const s3Order = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: s3Cookie },
    body: JSON.stringify({ courseId: course.id, batchId, promoCode: "GENAI100" })
  });
  const s3OrderData = await s3Order.json();
  console.log("✓ Student 3 enrollment in full batch properly rejected by guard:", s3OrderData.error);

  if (s3Order.ok) {
    throw new Error("Overcapacity batch enrollment was incorrectly allowed!");
  }

  // 6. Admin Batch Student Roster Verification
  console.log("\n[6/6] Verifying Admin Student Roster (/api/admin/batches/[id])...");
  const rosterRes = await fetch(`${baseUrl}/api/admin/batches/${batchId}`, {
    headers: { Cookie: adminCookie }
  });
  const rosterData = await rosterRes.json();
  console.log(`✓ Admin Batch Roster verified: ${rosterData.batch.enrollments.length} / ${rosterData.batch.capacity} learners enrolled:`);
  rosterData.batch.enrollments.forEach((e: any, idx: number) => {
    console.log(`   ${idx + 1}. ${e.user.name} (${e.user.email}) - ⭐ ${e.user.stars} Stars`);
  });

  if (rosterData.batch.enrollments.length !== 2) {
    throw new Error("Roster did not match expected 2 enrollments");
  }

  console.log("\n=================================================");
  console.log("   🎉 ALL BATCH, INSTRUCTOR & SEAT TESTS PASSED! ");
  console.log("=================================================");
}

testBatchesAndInstructors().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});

import { db } from "../lib/prisma";

async function testLearningPaths() {
  console.log("=================================================");
  console.log("   TESTING LEARNING PATHS & COURSES RELATION     ");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Admin login
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
  const cookieHeader = adminLogin.headers.get("set-cookie")!.split(";")[0];
  console.log("✓ Admin authenticated.\n");

  // 2. Fetch all learning paths via Admin API
  console.log("[2/6] Testing GET /api/admin/learning-paths...");
  const getPathsRes = await fetch(`${baseUrl}/api/admin/learning-paths`, {
    headers: { Cookie: cookieHeader }
  });
  const getPathsData = await getPathsRes.json();
  console.log(`✓ Admin fetched ${getPathsData.learningPaths?.length} learning paths.`);
  getPathsData.learningPaths.forEach((lp: any) => {
    console.log(`  - ${lp.icon} ${lp.title} (${lp.courses.length} linked courses: ${lp.courses.map((c: any) => c.course.title).join(", ")})`);
  });

  // 3. Create a new test learning path
  console.log("\n[3/6] Testing POST /api/admin/learning-paths (Create Learning Path)...");
  const courses = await db.course.findMany({ take: 2 });
  if (courses.length === 0) throw new Error("No courses found in database");

  const createRes = await fetch(`${baseUrl}/api/admin/learning-paths`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      title: "AI Solutions Architect",
      slug: "ai-solutions-architect-test",
      icon: "🏗️",
      level: "Advanced",
      shortDescription: "Architect resilient, scalable enterprise generative AI systems.",
      description: "<p>Learn how to design multi-agent systems and enterprise RAG pipelines.</p>",
      published: true,
      featured: false,
      sortOrder: 4,
      courseIds: courses.map(c => c.id)
    })
  });

  const createData = await createRes.json();
  if (!createData.ok) throw new Error(`Create failed: ${createData.error}`);
  const createdId = createData.learningPath.id;
  console.log(`✓ Successfully created Learning Path: "${createData.learningPath.title}" (ID: ${createdId}) with ${createData.learningPath.courses.length} linked courses.`);

  // 4. Fetch specific learning path by ID
  console.log("\n[4/6] Testing GET /api/admin/learning-paths/[id]...");
  const getSingleRes = await fetch(`${baseUrl}/api/admin/learning-paths/${createdId}`, {
    headers: { Cookie: cookieHeader }
  });
  const getSingleData = await getSingleRes.json();
  console.log(`✓ Fetched Learning Path: "${getSingleData.learningPath.title}"`);
  console.log(`✓ Available courses to link: ${getSingleData.allCourses.length}`);

  // 5. Update and reorder course sequence
  console.log("\n[5/6] Testing PATCH /api/admin/learning-paths/[id] (Reordering sequence & metadata)...");
  const reversedCourseIds = [...courses.map(c => c.id)].reverse();

  const patchRes = await fetch(`${baseUrl}/api/admin/learning-paths/${createdId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      title: "AI Solutions Architect (Enterprise)",
      shortDescription: "Updated short description for enterprise architecture.",
      courseIds: reversedCourseIds
    })
  });

  const patchData = await patchRes.json();
  if (!patchData.ok) throw new Error(`Patch failed: ${patchData.error}`);
  console.log(`✓ Updated title: "${patchData.learningPath.title}"`);
  console.log(`✓ Reordered courses sequence:`, patchData.learningPath.courses.map((c: any) => `Step ${c.sortOrder}: ${c.course.title}`));

  // 6. Delete test learning path
  console.log("\n[6/6] Testing DELETE /api/admin/learning-paths/[id]...");
  const deleteRes = await fetch(`${baseUrl}/api/admin/learning-paths/${createdId}`, {
    method: "DELETE",
    headers: { Cookie: cookieHeader }
  });
  const deleteData = await deleteRes.json();
  if (!deleteData.ok) throw new Error("Delete failed");
  console.log("✓ Test learning path deleted successfully.");

  console.log("\n=================================================");
  console.log("   🎉 ALL LEARNING PATHS & COURSES TESTS PASSED! ");
  console.log("=================================================");
}

testLearningPaths().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

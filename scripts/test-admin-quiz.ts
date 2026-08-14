import { db } from "../lib/prisma";

async function testAdminQuiz() {
  console.log("Testing Admin Quiz CRUD endpoints...");

  const baseUrl = "http://localhost:3000";

  // Login as Admin
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

  const course = await db.course.findFirst({
    where: { slug: "generative-ai-prompt-engineering" },
    include: { modules: { include: { lessons: true } } }
  });

  if (!course) throw new Error("Course not found");
  const module1 = course.modules[0];
  const quizLesson = module1.lessons.find(l => l.type === "QUIZ") || module1.lessons[0];

  const quizApiUrl = `${baseUrl}/api/admin/courses/${course.id}/modules/${module1.id}/lessons/${quizLesson.id}/quiz`;

  // 1. GET quiz questions as admin
  const getRes = await fetch(quizApiUrl, { headers: { Cookie: cookieHeader } });
  const getData = await getRes.json();
  console.log("✓ Admin GET quiz questions count:", getData.questions?.length);

  // 2. POST single question
  const postRes = await fetch(quizApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      question: "What is System Prompt?",
      options: ["Persistent instructions", "Hardware voltage", "CSS style", "Database index"],
      correctAnswer: 0,
      hint: "It sets the role and rules for the AI.",
      explanation: "System prompts establish the overarching context and persona.",
      starsReward: 10
    })
  });

  const postData = await postRes.json();
  if (!postData.ok) throw new Error("Admin POST question failed");
  console.log("✓ Admin added new question with ID:", postData.question?.id);

  // 3. DELETE the newly created test question
  const deleteRes = await fetch(`${quizApiUrl}?questionId=${postData.question.id}`, {
    method: "DELETE",
    headers: { Cookie: cookieHeader }
  });
  const deleteData = await deleteRes.json();
  if (!deleteData.ok) throw new Error("Admin DELETE question failed");
  console.log("✓ Admin successfully deleted question:", postData.question.id);

  console.log("✓ Admin Quiz CRUD fully verified!");
}

testAdminQuiz().catch(e => {
  console.error("Admin test failed:", e);
  process.exit(1);
});

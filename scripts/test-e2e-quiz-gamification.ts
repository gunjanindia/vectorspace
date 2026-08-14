import { db } from "../lib/prisma";

async function runE2ETests() {
  console.log("=================================================");
  console.log("   RUNNING QUIZ & GAMIFICATION E2E TEST SUITE   ");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Test Student Login
  console.log("[1/8] Testing Student Authentication...");
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "student@vectorspaceacademy.com",
      password: "Student@12345"
    })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("No session cookie returned from login");
  }

  const cookieHeader = setCookie.split(";")[0];
  console.log("✓ Student logged in successfully. Session cookie acquired.\n");

  // 2. Test /api/auth/me
  console.log("[2/8] Testing /api/auth/me with stars...");
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookieHeader }
  });
  const meData = await meRes.json();
  console.log("✓ /api/auth/me returned user:", {
    id: meData.id,
    name: meData.name,
    email: meData.email,
    stars: meData.stars
  });
  const initialStars = meData.stars;

  // 3. Find Quiz Lesson in Database
  console.log("\n[3/8] Locating Quiz Lesson...");
  const quizLesson = await db.lesson.findFirst({
    where: { type: "QUIZ" },
    include: { quizQuestions: { orderBy: { sortOrder: "asc" } } }
  });

  if (!quizLesson) {
    throw new Error("No quiz lesson found in database!");
  }
  console.log(`✓ Found Quiz Lesson: "${quizLesson.title}" with ${quizLesson.quizQuestions.length} questions.`);

  // 4. Test GET /api/quiz/[lessonId]
  console.log("\n[4/8] Testing GET /api/quiz/[lessonId]...");
  const quizGetRes = await fetch(`${baseUrl}/api/quiz/${quizLesson.id}`, {
    headers: { Cookie: cookieHeader }
  });
  const quizGetData = await quizGetRes.json();
  console.log(`✓ Quiz GET status: ${quizGetRes.status}`);
  console.log(`✓ Lesson Title: ${quizGetData.lesson.title}`);
  console.log(`✓ Questions returned: ${quizGetData.questions.length}`);
  console.log(`✓ Sample Question Hint: "${quizGetData.questions[0]?.hint}"`);

  // Ensure correct answers are hidden for students before passing
  if (quizGetData.questions[0]?.correctAnswer !== undefined && !quizGetData.lesson.passed) {
    throw new Error("Security check failed: correctAnswer was exposed to student before completion!");
  }
  console.log("✓ Security verified: correctAnswer is protected on server.");

  // 5. Test Submitting INCORRECT Answers to Quiz (with Hint)
  console.log("\n[5/8] Testing Quiz Submission with WRONG answer (Testing Retry flow)...");
  const wrongAnswers: Record<string, number> = {};
  quizLesson.quizQuestions.forEach(q => {
    // Choose an answer that is definitely wrong
    wrongAnswers[q.id] = (q.correctAnswer + 1) % q.options.length;
  });

  const wrongSubmitRes = await fetch(`${baseUrl}/api/quiz/${quizLesson.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ answers: wrongAnswers, hintsUsed: 1 })
  });
  const wrongSubmitData = await wrongSubmitRes.json();
  console.log("✓ Wrong submission result:", {
    passed: wrongSubmitData.passed,
    score: `${wrongSubmitData.score}/${wrongSubmitData.totalQuestions}`,
    starsAwarded: wrongSubmitData.starsAwarded
  });

  if (wrongSubmitData.passed !== false || wrongSubmitData.starsAwarded !== 0) {
    throw new Error("Wrong answer evaluation failed: Expected passed=false and starsAwarded=0");
  }
  console.log("✓ Incorrect answer properly rejected. Retry allowed.");

  // 6. Test Submitting CORRECT Answers to Quiz
  console.log("\n[6/8] Testing Quiz Submission with CORRECT answers (Earning Stars)...");
  const correctAnswers: Record<string, number> = {};
  quizLesson.quizQuestions.forEach(q => {
    correctAnswers[q.id] = q.correctAnswer;
  });

  const correctSubmitRes = await fetch(`${baseUrl}/api/quiz/${quizLesson.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ answers: correctAnswers, hintsUsed: 1 })
  });
  const correctSubmitData = await correctSubmitRes.json();
  console.log("✓ Correct submission result:", {
    passed: correctSubmitData.passed,
    score: `${correctSubmitData.score}/${correctSubmitData.totalQuestions}`,
    starsAwarded: correctSubmitData.starsAwarded,
    totalStars: correctSubmitData.totalStars
  });

  if (!correctSubmitData.passed || correctSubmitData.score !== quizLesson.quizQuestions.length) {
    throw new Error("Correct answer evaluation failed!");
  }
  console.log(`✓ Quiz passed! Awarded +${correctSubmitData.starsAwarded} ⭐ Stars (Total: ${correctSubmitData.totalStars} ⭐).`);

  // Verify LessonProgress in DB
  const progressRecord = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: meData.id, lessonId: quizLesson.id } }
  });
  if (!progressRecord || !progressRecord.completed) {
    throw new Error("Lesson progress was not marked as completed in DB!");
  }
  console.log("✓ Lesson progress verified in DB: completed=true (Next lesson unlocked).");

  // 7. Test Anti-Farming: Retrying an already passed quiz should NOT award duplicate stars
  console.log("\n[7/8] Testing Anti-Duplicate Star Farming on Quiz Retake...");
  const retakeRes = await fetch(`${baseUrl}/api/quiz/${quizLesson.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ answers: correctAnswers, hintsUsed: 0 })
  });
  const retakeData = await retakeRes.json();
  console.log("✓ Retake result:", {
    passed: retakeData.passed,
    score: retakeData.score,
    starsAwarded: retakeData.starsAwarded,
    totalStars: retakeData.totalStars
  });

  if (retakeData.starsAwarded !== 0) {
    throw new Error("Anti-farming failed: duplicate stars were awarded on retake!");
  }
  console.log("✓ Anti-farming verified: Retakes allow mastery without infinite star inflation.");

  // 8. Test /api/gamification profile & Badges
  console.log("\n[8/8] Testing /api/gamification Profile, Level, & Badges...");
  const gamificationRes = await fetch(`${baseUrl}/api/gamification`, {
    headers: { Cookie: cookieHeader }
  });
  const gData = await gamificationRes.json();
  console.log("✓ Gamification Profile:", {
    userName: gData.user.name,
    totalStars: gData.user.stars,
    rankLevel: `Level ${gData.rank.level}: ${gData.rank.title} ${gData.rank.badgeIcon}`,
    progressPercent: `${gData.rank.progressPercent}% to next rank`,
    unlockedBadges: gData.badges.filter((b: any) => b.unlocked).map((b: any) => `${b.icon} ${b.title}`),
    recentActivityCount: gData.recentActivity.length
  });

  console.log("\n=================================================");
  console.log("   🎉 ALL QUIZ & GAMIFICATION TESTS PASSED!    ");
  console.log("=================================================");
}

runE2ETests().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});

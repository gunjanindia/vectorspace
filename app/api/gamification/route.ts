import { NextResponse } from "next/server";
import { getCurrentUser, calculateUserRank } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        progress: { where: { completed: true } },
        quizAttempts: true,
        enrollments: true,
        starTransactions: {
          orderBy: { createdAt: "desc" },
          take: 15
        }
      }
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const totalStars = fullUser.stars || 0;
    const rank = calculateUserRank(totalStars);

    const completedLessonsCount = fullUser.progress.length;
    const passedQuizAttempts = fullUser.quizAttempts.filter(a => a.passed);
    const uniqueSolvedQuizzes = new Set(passedQuizAttempts.map(a => a.lessonId)).size;
    const completedCoursesCount = fullUser.enrollments.filter(e => e.status === "COMPLETED").length;
    const totalHintsUsed = fullUser.quizAttempts.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);

    const badges = [
      {
        id: "first_lesson",
        title: "First Steps",
        description: "Completed your first lesson",
        icon: "🚀",
        unlocked: completedLessonsCount >= 1,
        tier: "Bronze"
      },
      {
        id: "first_quiz",
        title: "Quiz Solver",
        description: "Passed your first knowledge check quiz",
        icon: "🎯",
        unlocked: uniqueSolvedQuizzes >= 1,
        tier: "Bronze"
      },
      {
        id: "curious_mind",
        title: "Curious Mind",
        description: "Used a hint to deepen your learning",
        icon: "💡",
        unlocked: totalHintsUsed >= 1,
        tier: "Silver"
      },
      {
        id: "star_collector_25",
        title: "Rising Star",
        description: "Accumulated 25 total stars",
        icon: "⭐",
        unlocked: totalStars >= 25,
        tier: "Silver"
      },
      {
        id: "star_collector_50",
        title: "Star Collector",
        description: "Accumulated 50 total stars",
        icon: "🌟",
        unlocked: totalStars >= 50,
        tier: "Gold"
      },
      {
        id: "quiz_master",
        title: "Quiz Master",
        description: "Passed 2 or more quizzes with mastery",
        icon: "⚡",
        unlocked: uniqueSolvedQuizzes >= 2,
        tier: "Gold"
      },
      {
        id: "course_finisher",
        title: "Graduate",
        description: "Completed a full course curriculum",
        icon: "🏆",
        unlocked: completedCoursesCount >= 1,
        tier: "Platinum"
      },
      {
        id: "ai_grandmaster",
        title: "Grandmaster",
        description: "Accumulated 200+ stars on the platform",
        icon: "👑",
        unlocked: totalStars >= 200,
        tier: "Diamond"
      }
    ];

    return NextResponse.json({
      user: {
        id: fullUser.id,
        name: fullUser.name,
        email: fullUser.email,
        stars: totalStars
      },
      rank,
      stats: {
        totalStars,
        completedLessonsCount,
        uniqueSolvedQuizzes,
        totalHintsUsed,
        enrolledCoursesCount: fullUser.enrollments.length,
        completedCoursesCount,
        unlockedBadgesCount: badges.filter(b => b.unlocked).length,
        totalBadgesCount: badges.length
      },
      badges,
      recentActivity: fullUser.starTransactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error("Error fetching gamification data:", error);
    return NextResponse.json({ error: "Failed to load gamification data" }, { status: 500 });
  }
}

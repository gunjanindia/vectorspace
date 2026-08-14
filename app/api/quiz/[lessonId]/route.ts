import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;

  try {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        quizQuestions: {
          orderBy: { sortOrder: "asc" }
        },
        module: {
          select: { courseId: true }
        }
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const progress = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId } }
    });

    const lastAttempt = await db.quizAttempt.findFirst({
      where: { userId: user.id, lessonId },
      orderBy: { createdAt: "desc" }
    });

    const hasPassed = Boolean(progress?.completed || lastAttempt?.passed);

    // If student and not passed yet, hide answers for integrity, but always provide hints
    const questions = lesson.quizQuestions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      hint: q.hint,
      starsReward: q.starsReward,
      sortOrder: q.sortOrder,
      ...(hasPassed ? { correctAnswer: q.correctAnswer, explanation: q.explanation } : {})
    }));

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        passed: hasPassed,
        durationMin: lesson.durationMin
      },
      questions,
      previousAttempt: lastAttempt
        ? {
            score: lastAttempt.score,
            totalQuestions: lastAttempt.totalQuestions,
            passed: lastAttempt.passed,
            starsAwarded: lastAttempt.starsAwarded,
            createdAt: lastAttempt.createdAt
          }
        : null,
      userStars: user.stars
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json({ error: "Failed to load quiz" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;

  try {
    const body = await req.json();
    const answers: Record<string, number> = body.answers || {};
    const hintsUsed: number = Number(body.hintsUsed) || 0;

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        quizQuestions: {
          orderBy: { sortOrder: "asc" }
        },
        module: {
          select: { courseId: true }
        }
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const questions = lesson.quizQuestions;
    if (questions.length === 0) {
      return NextResponse.json({ error: "No questions found for this quiz" }, { status: 400 });
    }

    let correctCount = 0;
    const results = questions.map(q => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        question: q.question,
        selectedOption: selected !== undefined ? selected : null,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
        hint: q.hint,
        starsReward: q.starsReward
      };
    });

    const passed = correctCount === questions.length;
    const totalPossibleStars = questions.reduce((sum, q) => sum + (q.starsReward || 10), 0);

    // Check if user already passed this quiz previously to avoid duplicate star farming
    const previousPassedAttempt = await db.quizAttempt.findFirst({
      where: {
        userId: user.id,
        lessonId,
        passed: true
      }
    });

    let starsToAward = 0;
    if (passed && !previousPassedAttempt) {
      starsToAward = totalPossibleStars > 0 ? totalPossibleStars : 20;
    }

    // Save quiz attempt
    await db.quizAttempt.create({
      data: {
        userId: user.id,
        lessonId,
        score: correctCount,
        totalQuestions: questions.length,
        passed,
        starsAwarded: starsToAward,
        hintsUsed,
        answers
      }
    });

    // If passed, mark lesson progress as completed
    if (passed) {
      await db.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId } },
        update: { completed: true, updatedAt: new Date() },
        create: { userId: user.id, lessonId, completed: true }
      });

      // Award stars and log transaction if first time passing
      if (starsToAward > 0) {
        await db.user.update({
          where: { id: user.id },
          data: { stars: { increment: starsToAward } }
        });

        await db.starTransaction.create({
          data: {
            userId: user.id,
            amount: starsToAward,
            type: "QUIZ_SOLVE",
            description: `Solved Quiz: ${lesson.title}`,
            lessonId: lesson.id,
            courseId: lesson.module.courseId
          }
        });
      }
    }

    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      select: { stars: true }
    });

    return NextResponse.json({
      ok: true,
      passed,
      score: correctCount,
      totalQuestions: questions.length,
      starsAwarded: starsToAward,
      totalStars: updatedUser?.stars ?? user.stars + starsToAward,
      results
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 });
  }
}

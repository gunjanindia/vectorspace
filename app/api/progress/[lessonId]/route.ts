import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;

  try {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const existingProgress = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId } }
    });

    const isFirstTime = !existingProgress || !existingProgress.completed;

    const progress = await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      update: { completed: true, updatedAt: new Date() },
      create: { userId: user.id, lessonId, completed: true }
    });

    let starsAwarded = 0;
    // For non-quiz lessons, award 5 stars on first completion
    if (isFirstTime && lesson.type !== "QUIZ") {
      starsAwarded = 5;

      await db.user.update({
        where: { id: user.id },
        data: { stars: { increment: starsAwarded } }
      });

      await db.starTransaction.create({
        data: {
          userId: user.id,
          amount: starsAwarded,
          type: "LESSON_COMPLETE",
          description: `Completed lesson: ${lesson.title}`,
          lessonId: lesson.id,
          courseId: lesson.module.courseId
        }
      });
    }

    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      select: { stars: true }
    });

    return NextResponse.json({
      progress,
      ok: true,
      starsAwarded,
      totalStars: updatedUser?.stars ?? user.stars + starsAwarded
    });
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}

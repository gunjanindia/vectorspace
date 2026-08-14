import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;

  try {
    const questions = await db.quizQuestion.findMany({
      where: { lessonId },
      orderBy: { sortOrder: "asc" }
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Admin error fetching quiz questions:", error);
    return NextResponse.json({ error: "Failed to fetch quiz questions" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;

  try {
    const body = await req.json();

    // Support single question creation or bulk update
    if (Array.isArray(body.questions)) {
      // Delete existing and replace with new questions in a transaction
      await db.$transaction(async tx => {
        await tx.quizQuestion.deleteMany({ where: { lessonId } });
        if (body.questions.length > 0) {
          await tx.quizQuestion.createMany({
            data: body.questions.map((q: any, index: number) => ({
              lessonId,
              question: String(q.question || ""),
              options: Array.isArray(q.options) ? q.options : ["Option 1", "Option 2"],
              correctAnswer: Number(q.correctAnswer) || 0,
              explanation: q.explanation ? String(q.explanation) : null,
              hint: q.hint ? String(q.hint) : null,
              starsReward: Number(q.starsReward) || 10,
              sortOrder: index + 1
            }))
          });
        }
      });

      const updated = await db.quizQuestion.findMany({
        where: { lessonId },
        orderBy: { sortOrder: "asc" }
      });
      return NextResponse.json({ ok: true, questions: updated });
    } else {
      const q = body;
      const count = await db.quizQuestion.count({ where: { lessonId } });
      const created = await db.quizQuestion.create({
        data: {
          lessonId,
          question: String(q.question || "New Quiz Question"),
          options: Array.isArray(q.options) && q.options.length ? q.options : ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: Number(q.correctAnswer) || 0,
          explanation: q.explanation ? String(q.explanation) : null,
          hint: q.hint ? String(q.hint) : null,
          starsReward: Number(q.starsReward) || 10,
          sortOrder: count + 1
        }
      });
      return NextResponse.json({ ok: true, question: created });
    }
  } catch (error) {
    console.error("Admin error saving quiz question:", error);
    return NextResponse.json({ error: "Failed to save quiz question" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId");

  if (!questionId) {
    return NextResponse.json({ error: "Question ID required" }, { status: 400 });
  }

  try {
    await db.quizQuestion.delete({ where: { id: questionId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin error deleting quiz question:", error);
    return NextResponse.json({ error: "Failed to delete quiz question" }, { status: 500 });
  }
}

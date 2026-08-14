import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;

  try {
    const progress = await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      update: { completed: true, updatedAt: new Date() },
      create: { userId: user.id, lessonId, completed: true }
    });
    return NextResponse.json({ progress, ok: true });
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}

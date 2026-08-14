import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;

  try {
    const enrollment = await db.enrollment.update({
      where: { userId_courseId: { userId: user.id, courseId } },
      data: { completedAt: new Date(), status: "COMPLETED" }
    });
    return NextResponse.json({ enrollment, ok: true });
  } catch (error) {
    console.error("Error marking course complete:", error);
    return NextResponse.json({ error: "Failed to mark course complete" }, { status: 500 });
  }
}

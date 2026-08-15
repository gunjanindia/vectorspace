import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const instructor = await db.user.findFirst({
      where: { id, role: "INSTRUCTOR" },
      include: {
        taughtCourses: { select: { id: true, title: true, slug: true, level: true, mode: true } },
        taughtBatches: {
          select: { id: true, name: true, mode: true, schedule: true, capacity: true, status: true },
          orderBy: { startDate: "desc" }
        }
      }
    });

    if (!instructor) {
      return NextResponse.json({ error: "Instructor not found" }, { status: 404 });
    }

    return NextResponse.json({ instructor });
  } catch (error) {
    console.error("Error fetching instructor:", error);
    return NextResponse.json({ error: "Failed to fetch instructor" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updateData: any = {};

    if ("name" in body) updateData.name = body.name;
    if ("title" in body) updateData.title = body.title;
    if ("bio" in body) updateData.bio = body.bio;
    if ("phone" in body) updateData.phone = body.phone;
    if ("stars" in body) updateData.stars = Number(body.stars);

    const instructor = await db.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ ok: true, instructor });
  } catch (error) {
    console.error("Error updating instructor:", error);
    return NextResponse.json({ error: "Failed to update instructor" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Demote instructor to Student role instead of destructive user delete
    await db.user.update({
      where: { id },
      data: { role: "STUDENT" }
    });

    return NextResponse.json({ ok: true, demoted: true });
  } catch (error) {
    console.error("Error demoting instructor:", error);
    return NextResponse.json({ error: "Failed to demote instructor" }, { status: 500 });
  }
}

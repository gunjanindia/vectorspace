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
    const batch = await db.batch.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, slug: true, durationHours: true, pricePaise: true } },
        instructor: { select: { id: true, name: true, email: true, title: true, phone: true } },
        enrollments: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, stars: true } }
          },
          orderBy: { enrolledAt: "asc" }
        }
      }
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (error) {
    console.error("Error fetching batch:", error);
    return NextResponse.json({ error: "Failed to fetch batch" }, { status: 500 });
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
    if ("courseId" in body) updateData.courseId = body.courseId;
    if ("instructorId" in body) updateData.instructorId = body.instructorId || null;
    if ("mode" in body) updateData.mode = body.mode;
    if ("startDate" in body) updateData.startDate = new Date(body.startDate);
    if ("endDate" in body) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if ("schedule" in body) updateData.schedule = body.schedule;
    if ("classroom" in body) updateData.classroom = body.classroom || null;
    if ("meetingLink" in body) updateData.meetingLink = body.meetingLink || null;
    if ("capacity" in body) updateData.capacity = Number(body.capacity);
    if ("status" in body) updateData.status = body.status;

    const batch = await db.batch.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { title: true } },
        instructor: { select: { name: true } }
      }
    });

    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    console.error("Error updating batch:", error);
    return NextResponse.json({ error: "Failed to update batch" }, { status: 500 });
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
    await db.batch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting batch:", error);
    return NextResponse.json({ error: "Failed to delete batch" }, { status: 500 });
  }
}

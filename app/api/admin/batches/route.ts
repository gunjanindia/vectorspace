import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const batches = await db.batch.findMany({
      orderBy: { startDate: "asc" },
      include: {
        course: { select: { id: true, title: true, slug: true, level: true, pricePaise: true } },
        instructor: { select: { id: true, name: true, email: true, title: true } },
        _count: { select: { enrollments: true, orders: true } }
      }
    });

    const courses = await db.course.findMany({
      where: { published: true },
      select: { id: true, title: true, level: true, mode: true },
      orderBy: { title: "asc" }
    });

    const instructors = await db.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: { id: true, name: true, email: true, title: true },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ batches, courses, instructors });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      courseId,
      instructorId,
      mode = "HYBRID",
      startDate,
      endDate,
      schedule,
      classroom,
      meetingLink,
      capacity = 30,
      status = "UPCOMING"
    } = body;

    if (!name || !courseId || !startDate || !schedule) {
      return NextResponse.json({ error: "Name, Course, Start Date, and Schedule are required" }, { status: 400 });
    }

    const batch = await db.batch.create({
      data: {
        name,
        courseId,
        instructorId: instructorId || null,
        mode: mode as any,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        schedule,
        classroom: classroom || null,
        meetingLink: meetingLink || null,
        capacity: Number(capacity) || 30,
        status: status || "UPCOMING"
      },
      include: {
        course: { select: { title: true } },
        instructor: { select: { name: true } }
      }
    });

    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    console.error("Error creating batch:", error);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}

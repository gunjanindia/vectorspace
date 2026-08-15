import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const mode = searchParams.get("mode");

    const where: any = {
      status: { in: ["UPCOMING", "ONGOING"] }
    };

    if (courseId) where.courseId = courseId;
    if (mode && mode !== "ALL") where.mode = mode;

    const batches = await db.batch.findMany({
      where,
      orderBy: { startDate: "asc" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            level: true,
            durationHours: true,
            pricePaise: true,
            mode: true
          }
        },
        instructor: {
          select: {
            id: true,
            name: true,
            title: true,
            bio: true
          }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    });

    const formatted = batches.map(b => {
      const enrolledCount = b._count.enrollments;
      const remainingSeats = Math.max(0, b.capacity - enrolledCount);
      const isFull = remainingSeats <= 0;
      const isFillingFast = remainingSeats > 0 && remainingSeats <= 6;

      return {
        id: b.id,
        name: b.name,
        mode: b.mode,
        startDate: b.startDate,
        endDate: b.endDate,
        schedule: b.schedule,
        classroom: b.classroom,
        meetingLink: b.meetingLink,
        capacity: b.capacity,
        enrolledCount,
        remainingSeats,
        isFull,
        isFillingFast,
        status: b.status,
        course: b.course,
        instructor: b.instructor
      };
    });

    return NextResponse.json({ batches: formatted });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

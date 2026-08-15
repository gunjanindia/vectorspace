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
    const learningPath = await db.learningPath.findUnique({
      where: { id },
      include: {
        courses: {
          orderBy: { sortOrder: "asc" },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                level: true,
                durationHours: true,
                pricePaise: true,
                mode: true,
                published: true
              }
            }
          }
        }
      }
    });

    if (!learningPath) {
      return NextResponse.json({ error: "Learning path not found" }, { status: 404 });
    }

    const allCourses = await db.course.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        level: true,
        durationHours: true,
        pricePaise: true,
        mode: true,
        published: true
      },
      orderBy: { title: "asc" }
    });

    return NextResponse.json({ learningPath, allCourses });
  } catch (error) {
    console.error("Error fetching learning path:", error);
    return NextResponse.json({ error: "Failed to fetch learning path" }, { status: 500 });
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

    const dataToUpdate: any = {};
    if ("title" in body) dataToUpdate.title = body.title;
    if ("slug" in body) {
      dataToUpdate.slug = body.slug
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    if ("shortDescription" in body) dataToUpdate.shortDescription = body.shortDescription;
    if ("description" in body) dataToUpdate.description = body.description;
    if ("level" in body) dataToUpdate.level = body.level;
    if ("icon" in body) dataToUpdate.icon = body.icon;
    if ("published" in body) dataToUpdate.published = Boolean(body.published);
    if ("featured" in body) dataToUpdate.featured = Boolean(body.featured);
    if ("sortOrder" in body) dataToUpdate.sortOrder = Number(body.sortOrder);

    // Update learning path metadata
    const learningPath = await db.learningPath.update({
      where: { id },
      data: dataToUpdate
    });

    // Handle course links if courseIds array is provided
    if (Array.isArray(body.courseIds)) {
      await db.$transaction(async tx => {
        // Remove existing links
        await tx.learningPathCourse.deleteMany({ where: { learningPathId: id } });

        // Insert new ordered links
        if (body.courseIds.length > 0) {
          await tx.learningPathCourse.createMany({
            data: body.courseIds.map((cId: string, idx: number) => ({
              learningPathId: id,
              courseId: cId,
              sortOrder: idx + 1
            }))
          });
        }
      });
    }

    const updated = await db.learningPath.findUnique({
      where: { id },
      include: {
        courses: {
          orderBy: { sortOrder: "asc" },
          include: {
            course: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, learningPath: updated });
  } catch (error) {
    console.error("Error updating learning path:", error);
    return NextResponse.json({ error: "Failed to update learning path" }, { status: 500 });
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
    await db.learningPath.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting learning path:", error);
    return NextResponse.json({ error: "Failed to delete learning path" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const learningPaths = await db.learningPath.findMany({
      orderBy: { sortOrder: "asc" },
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

    return NextResponse.json({ learningPaths });
  } catch (error) {
    console.error("Error fetching learning paths:", error);
    return NextResponse.json({ error: "Failed to fetch learning paths" }, { status: 500 });
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
      title,
      slug,
      shortDescription,
      description,
      level = "All Levels",
      icon = "🚀",
      published = true,
      featured = false,
      sortOrder = 1,
      courseIds = []
    } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existing = await db.learningPath.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      return NextResponse.json({ error: "A learning path with this slug already exists" }, { status: 409 });
    }

    const learningPath = await db.learningPath.create({
      data: {
        title,
        slug: cleanSlug,
        shortDescription: shortDescription || title,
        description: description || shortDescription || title,
        level,
        icon: icon || "🚀",
        published: Boolean(published),
        featured: Boolean(featured),
        sortOrder: Number(sortOrder) || 1,
        courses: {
          create: (Array.isArray(courseIds) ? courseIds : []).map((cId: string, idx: number) => ({
            courseId: cId,
            sortOrder: idx + 1
          }))
        }
      },
      include: {
        courses: {
          include: {
            course: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, learningPath });
  } catch (error) {
    console.error("Error creating learning path:", error);
    return NextResponse.json({ error: "Failed to create learning path" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const b = await req.json();

    if (!b.title || !b.title.trim()) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 });
    }

    const shortDescription = sanitizeRichText(b.shortDescription?.trim() || b.title);
    const description = sanitizeRichText(b.description?.trim() || b.shortDescription || b.title);
    const instructorId = b.instructorId || user.id;

    let baseSlug = slugify(b.slug || b.title);
    if (!baseSlug) baseSlug = "course-" + Date.now();

    let slug = baseSlug;
    let count = 1;
    while (await db.course.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const course = await db.course.create({
      data: {
        title: b.title.trim(),
        slug,
        shortDescription,
        description,
        level: b.level || "Beginner",
        durationHours: Number(b.durationHours) || 10,
        pricePaise: Math.round(Number(b.price || 0) * 100),
        mode: b.mode || "ONLINE",
        published: Boolean(b.published),
        featured: Boolean(b.featured),
        instructorId
      }
    });

    return NextResponse.json({ id: course.id });
  } catch (e) {
    console.error("Failed to create course:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create course" },
      { status: 500 }
    );
  }
}


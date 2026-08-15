import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const instructors = await db.user.findMany({
      where: { role: "INSTRUCTOR" },
      orderBy: { createdAt: "desc" },
      include: {
        taughtCourses: { select: { id: true, title: true, slug: true, level: true } },
        taughtBatches: { select: { id: true, name: true, mode: true, status: true, capacity: true } }
      }
    });

    return NextResponse.json({ instructors });
  } catch (error) {
    console.error("Error fetching instructors:", error);
    return NextResponse.json({ error: "Failed to fetch instructors" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, title, bio, phone, password } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      // Promote existing user to instructor role
      const updated = await db.user.update({
        where: { id: existing.id },
        data: {
          role: "INSTRUCTOR",
          title: title || existing.title || "AI Faculty & Mentor",
          bio: bio || existing.bio,
          phone: phone || existing.phone
        }
      });
      return NextResponse.json({ ok: true, instructor: updated, promoted: true });
    }

    const passwordHash = await bcrypt.hash(password || "Instructor@12345", 12);

    const instructor = await db.user.create({
      data: {
        name,
        email: cleanEmail,
        passwordHash,
        role: "INSTRUCTOR",
        title: title || "AI Faculty & Mentor",
        bio: bio || null,
        phone: phone || null,
        stars: 100
      }
    });

    return NextResponse.json({ ok: true, instructor });
  } catch (error) {
    console.error("Error creating instructor:", error);
    return NextResponse.json({ error: "Failed to create instructor" }, { status: 500 });
  }
}

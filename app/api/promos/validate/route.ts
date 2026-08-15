import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { validatePromoCode } from "@/lib/promos";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to apply promo code" }, { status: 401 });
    }

    const { code, courseId } = await req.json();

    if (!code || !courseId) {
      return NextResponse.json({ error: "Promo code and course ID are required" }, { status: 400 });
    }

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const result = await validatePromoCode(code, course.id, course.pricePaise);

    if (!result.valid) {
      return NextResponse.json({ error: result.error, valid: false }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error validating promo code:", error);
    return NextResponse.json({ error: "Failed to validate promo code" }, { status: 500 });
  }
}

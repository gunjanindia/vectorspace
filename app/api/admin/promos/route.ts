import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const promoCodes = await db.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          select: { id: true, title: true, slug: true }
        },
        _count: {
          select: { orders: true }
        }
      }
    });

    const courses = await db.course.findMany({
      select: { id: true, title: true, pricePaise: true, level: true },
      orderBy: { title: "asc" }
    });

    return NextResponse.json({ promoCodes, courses });
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    return NextResponse.json({ error: "Failed to fetch promo codes" }, { status: 500 });
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
      code,
      description,
      discountType = "PERCENTAGE",
      discountValue,
      maxDiscountPaise,
      minOrderPaise = 0,
      validFrom,
      validUntil,
      usageLimit,
      active = true,
      applicableCourseId
    } = body;

    if (!code || discountValue === undefined || discountValue === null) {
      return NextResponse.json({ error: "Code and discount value are required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await db.promoCode.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return NextResponse.json({ error: `Promo code "${cleanCode}" already exists` }, { status: 409 });
    }

    const promoCode = await db.promoCode.create({
      data: {
        code: cleanCode,
        description: description || null,
        discountType: discountType === "FLAT" ? "FLAT" : "PERCENTAGE",
        discountValue: Number(discountValue),
        maxDiscountPaise: maxDiscountPaise ? Number(maxDiscountPaise) : null,
        minOrderPaise: minOrderPaise ? Number(minOrderPaise) : 0,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        active: Boolean(active),
        applicableCourseId: applicableCourseId || null
      },
      include: {
        course: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json({ ok: true, promoCode });
  } catch (error) {
    console.error("Error creating promo code:", error);
    return NextResponse.json({ error: "Failed to create promo code" }, { status: 500 });
  }
}

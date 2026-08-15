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
    const promoCode = await db.promoCode.findUnique({
      where: { id },
      include: {
        course: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            amountPaise: true,
            discountPaise: true,
            status: true,
            createdAt: true,
            user: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!promoCode) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    return NextResponse.json({ promoCode });
  } catch (error) {
    console.error("Error fetching promo code:", error);
    return NextResponse.json({ error: "Failed to fetch promo code" }, { status: 500 });
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

    if ("description" in body) updateData.description = body.description;
    if ("discountType" in body) updateData.discountType = body.discountType === "FLAT" ? "FLAT" : "PERCENTAGE";
    if ("discountValue" in body) updateData.discountValue = Number(body.discountValue);
    if ("maxDiscountPaise" in body) updateData.maxDiscountPaise = body.maxDiscountPaise ? Number(body.maxDiscountPaise) : null;
    if ("minOrderPaise" in body) updateData.minOrderPaise = Number(body.minOrderPaise);
    if ("validUntil" in body) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if ("usageLimit" in body) updateData.usageLimit = body.usageLimit ? Number(body.usageLimit) : null;
    if ("active" in body) updateData.active = Boolean(body.active);
    if ("applicableCourseId" in body) updateData.applicableCourseId = body.applicableCourseId || null;

    const promoCode = await db.promoCode.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json({ ok: true, promoCode });
  } catch (error) {
    console.error("Error updating promo code:", error);
    return NextResponse.json({ error: "Failed to update promo code" }, { status: 500 });
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
    await db.promoCode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting promo code:", error);
    return NextResponse.json({ error: "Failed to delete promo code" }, { status: 500 });
  }
}

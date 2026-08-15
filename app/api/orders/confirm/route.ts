import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { verifyGatewayPayment } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { orderId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        promoCode: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "PAID") {
      return NextResponse.json({ ok: true, courseSlug: order.course.slug, alreadyPaid: true });
    }

    // Verify payment authenticity
    const isValid = verifyGatewayPayment({
      orderId: order.id,
      gatewayOrderId: gatewayOrderId || order.gatewayOrderId || `order_demo_${Date.now()}`,
      gatewayPaymentId: gatewayPaymentId || `pay_demo_${Date.now()}`,
      gatewaySignature
    });

    if (!isValid) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const effectivePaymentId = gatewayPaymentId || `pay_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Execute atomic transaction
    await db.$transaction(async tx => {
      // 1. Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          gatewayPaymentId: effectivePaymentId
        }
      });

      // 2. Increment promo code used count if a promo was applied
      if (order.promoCodeId) {
        await tx.promoCode.update({
          where: { id: order.promoCodeId },
          data: { usedCount: { increment: 1 } }
        });
      }

      // 3. Upsert enrollment
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: user.id, courseId: order.courseId } },
        update: { status: "ACTIVE", enrolledAt: new Date() },
        create: { userId: user.id, courseId: order.courseId, status: "ACTIVE" }
      });

      // 4. Award enrollment star bounty (+10 Stars)
      await tx.user.update({
        where: { id: user.id },
        data: { stars: { increment: 10 } }
      });

      await tx.starTransaction.create({
        data: {
          userId: user.id,
          amount: 10,
          type: "ENROLLMENT",
          description: `Enrolled in ${order.course.title}`,
          courseId: order.courseId
        }
      });
    });

    return NextResponse.json({
      ok: true,
      courseSlug: order.course.slug,
      orderNumber: order.orderNumber,
      amountPaise: order.amountPaise
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json({ error: "Payment confirmation failed" }, { status: 500 });
  }
}

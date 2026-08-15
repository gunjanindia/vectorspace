import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { validatePromoCode } from "@/lib/promos";
import { createGatewayOrder } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required to checkout" }, { status: 401 });
    }

    const { courseId, promoCode } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, slug: true, pricePaise: true, published: true }
    });

    if (!course || !course.published) {
      return NextResponse.json({ error: "Course not available" }, { status: 404 });
    }

    const existingEnrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } }
    });

    if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
      return NextResponse.json({ error: "You are already enrolled in this course" }, { status: 409 });
    }

    let originalAmountPaise = course.pricePaise;
    let discountPaise = 0;
    let finalAmountPaise = course.pricePaise;
    let promoCodeId: string | null = null;

    if (promoCode && typeof promoCode === "string" && promoCode.trim() !== "") {
      const promoResult = await validatePromoCode(promoCode, course.id, course.pricePaise);
      if (!promoResult.valid) {
        return NextResponse.json({ error: promoResult.error }, { status: 400 });
      }

      discountPaise = promoResult.discountPaise;
      finalAmountPaise = promoResult.finalAmountPaise;
      promoCodeId = promoResult.promo?.id || null;
    }

    const orderNumber = `VSA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create payment gateway order (Razorpay or Demo)
    const gatewayOrder = await createGatewayOrder({
      amountPaise: finalAmountPaise,
      receipt: orderNumber,
      notes: {
        courseId: course.id,
        courseTitle: course.title,
        userId: user.id,
        promoCode: promoCode || ""
      }
    });

    // Create order record in database
    const order = await db.order.create({
      data: {
        orderNumber,
        userId: user.id,
        courseId: course.id,
        originalAmountPaise,
        discountPaise,
        amountPaise: finalAmountPaise,
        status: "PENDING",
        promoCodeId,
        gatewayOrderId: gatewayOrder.gatewayOrderId
      }
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountPaise: order.amountPaise,
      originalAmountPaise: order.originalAmountPaise,
      discountPaise: order.discountPaise,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      keyId: gatewayOrder.keyId,
      isDemo: gatewayOrder.isDemo,
      currency: gatewayOrder.currency,
      courseTitle: course.title,
      courseSlug: course.slug,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone || "9999999999"
      }
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  }
}

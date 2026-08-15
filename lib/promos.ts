import { db } from "./prisma";
import { PromoCode } from "@prisma/client";

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  promo?: {
    id: string;
    code: string;
    description: string | null;
    discountType: "PERCENTAGE" | "FLAT";
    discountValue: number;
    maxDiscountPaise: number | null;
    minOrderPaise: number;
  };
  discountPaise: number;
  finalAmountPaise: number;
  originalAmountPaise: number;
}

export function calculatePromoDiscount(
  coursePricePaise: number,
  promo: {
    discountType: "PERCENTAGE" | "FLAT";
    discountValue: number;
    maxDiscountPaise: number | null;
  }
): { discountPaise: number; finalAmountPaise: number } {
  let discount = 0;

  if (promo.discountType === "PERCENTAGE") {
    discount = Math.round((coursePricePaise * promo.discountValue) / 100);
    if (promo.maxDiscountPaise && promo.maxDiscountPaise > 0) {
      discount = Math.min(discount, promo.maxDiscountPaise);
    }
  } else if (promo.discountType === "FLAT") {
    discount = promo.discountValue;
  }

  // Ensure discount does not exceed course price
  discount = Math.min(discount, coursePricePaise);
  const finalAmountPaise = Math.max(0, coursePricePaise - discount);

  return { discountPaise: discount, finalAmountPaise };
}

export async function validatePromoCode(
  rawCode: string,
  courseId: string,
  coursePricePaise: number
): Promise<PromoValidationResult> {
  const cleanCode = rawCode.trim().toUpperCase();

  if (!cleanCode) {
    return {
      valid: false,
      error: "Promo code is required",
      discountPaise: 0,
      finalAmountPaise: coursePricePaise,
      originalAmountPaise: coursePricePaise
    };
  }

  const promo = await db.promoCode.findUnique({
    where: { code: cleanCode }
  });

  if (!promo) {
    return {
      valid: false,
      error: `Promo code "${cleanCode}" is invalid`,
      discountPaise: 0,
      finalAmountPaise: coursePricePaise,
      originalAmountPaise: coursePricePaise
    };
  }

  if (!promo.active) {
    return {
      valid: false,
      error: `Promo code "${cleanCode}" is no longer active`,
      discountPaise: 0,
      finalAmountPaise: coursePricePaise,
      originalAmountPaise: coursePricePaise
    };
  }

  const now = new Date();
  if (promo.validFrom && now < promo.validFrom) {
    return {
      valid: false,
      error: `Promo code "${cleanCode}" is not active yet`,
      discountPaise: 0,
      finalAmountPaise: coursePricePaise,
      originalAmountPaise: coursePricePaise
    };
  }

  if (promo.validUntil && now > promo.validUntil) {
    return {
      valid: false,
      error: `Promo code "${cleanCode}" has expired`,
      discountPaise: 0,
      finalAmountPaise: coursePricePaise,
      originalAmountPaise: coursePricePaise
    };
  }

  if (promo.usageLimit !== null && promo.usageLimit !== undefined && promo.usedCount >= promo.usageLimit) {
    return {
      valid: false,
      error: `Promo code "${cleanCode}" usage limit has been reached`,
      discountPaise: 0,
      finalAmountPaise: coursePricePaise,
      originalAmountPaise: coursePricePaise
    };
  }

  if (promo.applicableCourseId && promo.applicableCourseId !== courseId) {
    return {
      valid: false,
      error: `Promo code "${cleanCode}" is not applicable to this course`,
      discountPaise: 0,
      finalAmountPaise: coursePricePaise,
      originalAmountPaise: coursePricePaise
    };
  }

  if (promo.minOrderPaise && coursePricePaise < promo.minOrderPaise) {
    const minRs = (promo.minOrderPaise / 100).toLocaleString("en-IN");
    return {
      valid: false,
      error: `Minimum order value of ₹${minRs} required for this promo code`,
      discountPaise: 0,
      finalAmountPaise: coursePricePaise,
      originalAmountPaise: coursePricePaise
    };
  }

  const { discountPaise, finalAmountPaise } = calculatePromoDiscount(coursePricePaise, promo);

  return {
    valid: true,
    promo: {
      id: promo.id,
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxDiscountPaise: promo.maxDiscountPaise,
      minOrderPaise: promo.minOrderPaise
    },
    discountPaise,
    finalAmountPaise,
    originalAmountPaise: coursePricePaise
  };
}

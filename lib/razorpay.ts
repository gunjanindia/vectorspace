import crypto from "crypto";

export interface RazorpayOrderResult {
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  isDemo: boolean;
  keyId: string;
}

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const isDemo = !keyId || keyId.trim() === "" || keyId.startsWith("rzp_test_demo");

  return {
    keyId: isDemo ? "rzp_test_demo_vectorspace" : keyId,
    keySecret,
    isDemo
  };
}

export async function createGatewayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResult> {
  const { amountPaise, receipt, notes = {} } = params;
  const config = getRazorpayConfig();

  // If amount is 0 (100% discount coupon), create a free zero-cost order
  if (amountPaise <= 0) {
    return {
      gatewayOrderId: `order_free_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amountPaise: 0,
      currency: "INR",
      isDemo: true,
      keyId: config.keyId
    };
  }

  // If real Razorpay keys are configured (non-demo)
  if (!config.isDemo && config.keySecret) {
    try {
      const authHeader = "Basic " + Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt,
          notes
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Razorpay API order creation failed:", errorData);
        throw new Error(errorData.error?.description || "Razorpay order creation failed");
      }

      const orderData = await res.json();
      return {
        gatewayOrderId: orderData.id,
        amountPaise: orderData.amount,
        currency: orderData.currency,
        isDemo: false,
        keyId: config.keyId
      };
    } catch (err) {
      console.warn("Falling back to demo gateway order due to Razorpay API error:", err);
    }
  }

  // Demo / Sandbox Gateway Mode
  const demoOrderId = `order_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    gatewayOrderId: demoOrderId,
    amountPaise,
    currency: "INR",
    isDemo: true,
    keyId: config.keyId
  };
}

export function verifyGatewayPayment(params: {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
}): boolean {
  const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = params;
  const config = getRazorpayConfig();

  // If demo mode or 100% coupon zero-cost order
  if (config.isDemo || gatewayOrderId.startsWith("order_demo_") || gatewayOrderId.startsWith("order_free_")) {
    return Boolean(gatewayPaymentId && gatewayPaymentId.length > 0);
  }

  // Real Razorpay signature verification
  if (config.keySecret && gatewaySignature) {
    const text = `${gatewayOrderId}|${gatewayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", config.keySecret)
      .update(text)
      .digest("hex");
    return expectedSignature === gatewaySignature;
  }

  return true;
}

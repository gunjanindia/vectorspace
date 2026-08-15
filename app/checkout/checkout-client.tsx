"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BatchOption {
  id: string;
  name: string;
  mode: string;
  startDate?: string;
  schedule: string;
  classroom?: string | null;
  capacity: number;
  instructor?: { name: string; title?: string | null } | null;
  _count?: { enrollments: number };
}

interface CheckoutClientProps {
  courseId: string;
  courseTitle: string;
  coursePricePaise: number;
  defaultPromo?: string;
  defaultBatchId?: string;
  batches?: BatchOption[];
  userName: string;
  userEmail: string;
  userPhone: string;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function CheckoutClient({
  courseId,
  courseTitle,
  coursePricePaise,
  defaultPromo = "",
  defaultBatchId = "",
  batches = [],
  userName,
  userEmail,
  userPhone
}: CheckoutClientProps) {
  const router = useRouter();

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    defaultBatchId || (batches.length > 0 ? batches[0].id : "")
  );

  const [promoInput, setPromoInput] = useState(defaultPromo);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    description: string | null;
    discountType: "PERCENTAGE" | "FLAT";
    discountValue: number;
    discountPaise: number;
  } | null>(null);

  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  const [originalPricePaise] = useState(coursePricePaise);
  const [discountPaise, setDiscountPaise] = useState(0);
  const [finalPricePaise, setFinalPricePaise] = useState(coursePricePaise);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successPaid, setSuccessPaid] = useState(false);

  // Demo gateway modal state
  const [showDemoGatewayModal, setShowDemoGatewayModal] = useState(false);
  const [demoOrderInfo, setDemoOrderInfo] = useState<any>(null);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Auto-apply promo if passed in URL
  useEffect(() => {
    if (defaultPromo) {
      applyPromoCode(defaultPromo);
    }
  }, [defaultPromo]);

  async function applyPromoCode(codeToApply?: string) {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    if (!code) {
      setPromoError("Please enter a promo code");
      return;
    }

    try {
      setValidatingPromo(true);
      setPromoError("");
      setPromoSuccess("");

      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, courseId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid promo code");
      }

      setAppliedPromo({
        code: data.promo.code,
        description: data.promo.description,
        discountType: data.promo.discountType,
        discountValue: data.promo.discountValue,
        discountPaise: data.discountPaise
      });

      setDiscountPaise(data.discountPaise);
      setFinalPricePaise(data.finalAmountPaise);
      setPromoSuccess(`✓ Offer "${data.promo.code}" applied! You save ₹${(data.discountPaise / 100).toLocaleString("en-IN")}`);
      setPromoInput(data.promo.code);
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Failed to apply promo code");
      setAppliedPromo(null);
      setDiscountPaise(0);
      setFinalPricePaise(originalPricePaise);
    } finally {
      setValidatingPromo(false);
    }
  }

  function removePromoCode() {
    setAppliedPromo(null);
    setDiscountPaise(0);
    setFinalPricePaise(originalPricePaise);
    setPromoInput("");
    setPromoError("");
    setPromoSuccess("");
  }

  async function handlePayment() {
    try {
      setLoading(true);
      setError("");

      // 1. Create order on server
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          batchId: selectedBatchId || undefined,
          promoCode: appliedPromo?.code || undefined
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Unable to initiate order");
      }

      // If 100% scholarship / free order (amount = 0)
      if (orderData.amountPaise <= 0) {
        await confirmPayment({
          orderId: orderData.orderId,
          gatewayOrderId: orderData.gatewayOrderId,
          gatewayPaymentId: `free_grant_${Date.now()}`
        });
        return;
      }

      // Check if real Razorpay Checkout is available and configured with non-demo keys
      const hasRealRazorpay =
        typeof window !== "undefined" &&
        window.Razorpay &&
        !orderData.isDemo &&
        orderData.keyId &&
        !orderData.keyId.startsWith("rzp_test_demo");

      if (hasRealRazorpay) {
        // Open standard Razorpay Checkout Modal
        const options = {
          key: orderData.keyId,
          amount: orderData.amountPaise,
          currency: orderData.currency || "INR",
          name: "Vector Space Skills Academy",
          description: `Enrollment: ${courseTitle}`,
          order_id: orderData.gatewayOrderId,
          prefill: {
            name: userName,
            email: userEmail,
            contact: userPhone
          },
          theme: {
            color: "#2563eb"
          },
          handler: async function (response: any) {
            await confirmPayment({
              orderId: orderData.orderId,
              gatewayOrderId: response.razorpay_order_id,
              gatewayPaymentId: response.razorpay_payment_id,
              gatewaySignature: response.razorpay_signature
            });
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Open interactive Demo Razorpay Sandbox modal
        setDemoOrderInfo(orderData);
        setShowDemoGatewayModal(true);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment error occurred");
      setLoading(false);
    }
  }

  async function confirmPayment(paymentParams: {
    orderId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature?: string;
  }) {
    try {
      setLoading(true);
      const confirmRes = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentParams)
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmData.error || "Payment confirmation failed");
      }

      // Notify Navbar of new enrollment stars (+10 ⭐)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("starsUpdated", { detail: { amount: 10 } }));
      }

      setSuccessPaid(true);
      setShowDemoGatewayModal(false);

      setTimeout(() => {
        router.push(`/learn/${confirmData.courseSlug || courseId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  if (successPaid) {
    return (
      <div style={{ textAlign: "center", padding: "30px 10px" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 26, color: "var(--navy)", margin: "0 0 8px" }}>
          Payment & Enrollment Confirmed!
        </h2>
        <p className="muted" style={{ margin: "0 0 16px" }}>
          Welcome aboard! +10 Stars ⭐ added to your profile. Redirecting to your learning player...
        </p>
        <div style={{ display: "inline-block", padding: "8px 18px", background: "#ecfdf5", border: "1px solid #10b981", borderRadius: 999, color: "#065f46", fontWeight: 700 }}>
          ✓ ACTIVE ENROLLMENT
        </div>
      </div>
    );
  }

  const isFree = finalPricePaise <= 0;

  return (
    <div>
      <h3 style={{ margin: "0 0 18px", fontSize: 20, color: "var(--navy)" }}>
        Checkout & Enrollment
      </h3>

      {/* Batch / Cohort Selection */}
      {batches && batches.length > 0 && (
        <div style={{ marginBottom: 22, padding: "16px", background: "#f8fafc", borderRadius: 12, border: "1px solid var(--border)" }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: 8 }}>
            👥 Select Your Learning Cohort / Schedule:
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {batches.map(b => {
              const filled = b._count?.enrollments || 0;
              const remaining = Math.max(0, b.capacity - filled);
              const isFull = remaining <= 0;
              const isSelected = selectedBatchId === b.id;

              return (
                <label
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: isSelected ? "2px solid var(--blue)" : "1px solid var(--border)",
                    background: isSelected ? "#eff6ff" : "#fff",
                    cursor: isFull ? "not-allowed" : "pointer",
                    opacity: isFull ? 0.6 : 1,
                    transition: "all 0.15s ease"
                  }}
                >
                  <input
                    type="radio"
                    name="batchOption"
                    value={b.id}
                    disabled={isFull}
                    checked={isSelected}
                    onChange={() => setSelectedBatchId(b.id)}
                    style={{ marginTop: 3 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <strong style={{ color: "var(--navy)", fontSize: 14 }}>{b.name}</strong>
                      <span
                        className="badge"
                        style={{
                          background: b.mode === "HYBRID" ? "#e0f2fe" : b.mode === "OFFLINE" ? "#fef3c7" : "#dcfce7",
                          color: b.mode === "HYBRID" ? "#0369a1" : b.mode === "OFFLINE" ? "#92400e" : "#15803d",
                          fontSize: 10,
                          padding: "1px 6px"
                        }}
                      >
                        {b.mode}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      📅 {b.schedule} {b.classroom ? `· 📍 ${b.classroom}` : ""}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: isFull ? "var(--error)" : remaining <= 6 ? "var(--orange)" : "var(--blue)", fontWeight: 700 }}>
                        {isFull ? "🔒 Cohort Full" : remaining <= 6 ? `🔥 Only ${remaining} seats left!` : `🟢 ${remaining} seats open`}
                      </span>
                      {b.instructor && (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          Mentor: {b.instructor.name}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}

            {/* Flexible Option */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                border: selectedBatchId === "" ? "2px solid var(--blue)" : "1px solid var(--border)",
                background: selectedBatchId === "" ? "#eff6ff" : "#fff",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="radio"
                name="batchOption"
                value=""
                checked={selectedBatchId === ""}
                onChange={() => setSelectedBatchId("")}
                style={{ marginTop: 3 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong style={{ color: "var(--navy)", fontSize: 14 }}>⚡ Flexible Self-Paced (On-Demand)</strong>
                  <span className="badge" style={{ fontSize: 10, padding: "1px 6px", background: "#f1f5f9", color: "var(--navy)" }}>
                    FLEXIBLE
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Start immediately. Complete video modules and quizzes at your own pace with no fixed class timings.
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Promo Code Section */}
      <div style={{ marginBottom: 22, padding: "16px", background: "#f8fafc", borderRadius: 12, border: "1px solid var(--border)" }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: 6 }}>
          🏷️ Have a Promo / Offer Code?
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Enter promo code (e.g. AI50)"
            value={promoInput}
            onChange={e => setPromoInput(e.target.value.toUpperCase())}
            disabled={validatingPromo || Boolean(appliedPromo)}
            style={{ margin: 0, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}
          />
          {appliedPromo ? (
            <button
              type="button"
              onClick={removePromoCode}
              className="btn btn-secondary"
              style={{ padding: "11px 16px", color: "#e11d48", borderColor: "#fca5a5" }}
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={() => applyPromoCode()}
              disabled={validatingPromo || !promoInput.trim()}
              className="btn btn-primary"
              style={{ padding: "11px 20px" }}
            >
              {validatingPromo ? "..." : "Apply"}
            </button>
          )}
        </div>

        {promoSuccess && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#059669", fontWeight: 600 }}>
            {promoSuccess}
          </div>
        )}

        {promoError && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#e11d48", fontWeight: 500 }}>
            ✕ {promoError}
          </div>
        )}
      </div>

      {/* Price Ledger Breakdown */}
      <div style={{ marginBottom: 25, padding: "16px 20px", background: "#f1f5f9", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8, color: "var(--muted)" }}>
          <span>Course Tuition Price:</span>
          <span>₹{(originalPricePaise / 100).toLocaleString("en-IN")}</span>
        </div>

        {discountPaise > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8, color: "#059669", fontWeight: 700 }}>
            <span>Promo Discount ({appliedPromo?.code}):</span>
            <span>-₹{(discountPaise / 100).toLocaleString("en-IN")}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "var(--navy)", paddingTop: 10, borderTop: "1px solid #cbd5e1" }}>
          <span>Total Amount Payable:</span>
          <span style={{ color: "var(--blue)" }}>
            {isFree ? "FREE (₹0)" : `₹${(finalPricePaise / 100).toLocaleString("en-IN")}`}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #f87171", borderRadius: 8, color: "#991b1b", fontSize: 13, marginBottom: 16 }}>
          ✕ {error}
        </div>
      )}

      {/* Payment Action Button */}
      {isFree ? (
        <button
          onClick={handlePayment}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: "100%", padding: "14px 20px", fontSize: 16, background: "#059669" }}
        >
          {loading ? "Activating Scholarship..." : "Claim 100% Free Enrollment ✓"}
        </button>
      ) : (
        <button
          onClick={handlePayment}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: "100%", padding: "14px 20px", fontSize: 16, background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" }}
        >
          {loading ? "Processing..." : `Pay ₹${(finalPricePaise / 100).toLocaleString("en-IN")} with Razorpay ⚡`}
        </button>
      )}

      {/* Payment Gateway Trust Badges */}
      <div style={{ marginTop: 18, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          <span>🔒 256-Bit SSL Encryption</span>
          <span>·</span>
          <span>⚡ Razorpay Secured Gateway</span>
          <span>·</span>
          <span>UPI / Cards / NetBanking</span>
        </div>
      </div>

      {/* Interactive Demo Razorpay Modal */}
      {showDemoGatewayModal && demoOrderInfo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(11,31,58,0.65)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: 20
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 460,
              padding: "28px 24px",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>⚡</span>
                <div>
                  <strong style={{ color: "var(--navy)", fontSize: 16 }}>Razorpay Payment Gateway</strong>
                  <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>DEMO / SANDBOX ENVIRONMENT</div>
                </div>
              </div>
              <button
                onClick={() => setShowDemoGatewayModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 10, marginBottom: 18, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span className="muted">Order Ref:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{demoOrderInfo.orderNumber}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span className="muted">Course:</span>
                <strong style={{ color: "var(--navy)" }}>{courseTitle}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <span>Amount:</span>
                <span style={{ color: "var(--blue)" }}>₹{(demoOrderInfo.amountPaise / 100).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>
              Select a payment method simulation to authorize the transaction:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() =>
                  confirmPayment({
                    orderId: demoOrderInfo.orderId,
                    gatewayOrderId: demoOrderInfo.gatewayOrderId,
                    gatewayPaymentId: `pay_upi_demo_${Date.now()}`
                  })
                }
                className="btn btn-primary"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: "var(--navy)" }}
              >
                <span>📱 Pay via UPI (GPay / PhonePe / Paytm)</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  confirmPayment({
                    orderId: demoOrderInfo.orderId,
                    gatewayOrderId: demoOrderInfo.gatewayOrderId,
                    gatewayPaymentId: `pay_card_demo_${Date.now()}`
                  })
                }
                className="btn btn-primary"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}
              >
                <span>💳 Credit / Debit Card (Visa, Mastercard, RuPay)</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  confirmPayment({
                    orderId: demoOrderInfo.orderId,
                    gatewayOrderId: demoOrderInfo.gatewayOrderId,
                    gatewayPaymentId: `pay_nb_demo_${Date.now()}`
                  })
                }
                className="btn btn-secondary"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}
              >
                <span>🏦 NetBanking & Corporate Accounts</span>
                <span>→</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDemoGatewayModal(false)}
              style={{ width: "100%" }}
            >
              Cancel Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

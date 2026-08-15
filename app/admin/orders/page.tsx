import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      course: { select: { title: true, slug: true } },
      promoCode: { select: { code: true, discountType: true, discountValue: true } }
    }
  });

  const totalPaidOrders = orders.filter(o => o.status === "PAID");
  const totalRevenuePaise = totalPaidOrders.reduce((sum, o) => sum + (o.amountPaise || 0), 0);
  const totalDiscountsPaise = totalPaidOrders.reduce((sum, o) => sum + (o.discountPaise || 0), 0);

  return (
    <main className="dashboard">
      <div className="container">
        <div className="admin-page-head">
          <div>
            <Link
              href="/admin"
              style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4, marginBottom: 8 }}
            >
              ← Admin Dashboard
            </Link>
            <h1 style={{ margin: "4px 0 0" }}>💳 Orders & Payments Ledger</h1>
            <p className="muted">Complete transaction ledger of course sales, discounts, and Razorpay gateway IDs.</p>
          </div>
          <Link className="btn btn-secondary" href="/admin/promos">
            🏷️ Manage Promo Codes →
          </Link>
        </div>

        {/* Financial Metrics */}
        <div className="stats" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 20 }}>
          <div className="stat">Total Orders<strong>{orders.length}</strong></div>
          <div className="stat">Completed Payments<strong>{totalPaidOrders.length}</strong></div>
          <div className="stat">Total Paid Volume<strong>₹{(totalRevenuePaise / 100).toLocaleString("en-IN")}</strong></div>
          <div className="stat">Total Promo Savings<strong>₹{(totalDiscountsPaise / 100).toLocaleString("en-IN")}</strong></div>
        </div>

        {/* Orders Table */}
        <div className="card" style={{ marginTop: 25, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "14px 16px", color: "var(--navy)" }}>ORDER # / DATE</th>
                <th style={{ padding: "14px 16px", color: "var(--navy)" }}>STUDENT</th>
                <th style={{ padding: "14px 16px", color: "var(--navy)" }}>COURSE</th>
                <th style={{ padding: "14px 16px", color: "var(--navy)" }}>ORIGINAL</th>
                <th style={{ padding: "14px 16px", color: "var(--navy)" }}>PROMO USED</th>
                <th style={{ padding: "14px 16px", color: "var(--navy)" }}>FINAL PAID</th>
                <th style={{ padding: "14px 16px", color: "var(--navy)" }}>GATEWAY ID</th>
                <th style={{ padding: "14px 16px", color: "var(--navy)" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <strong style={{ color: "var(--navy)", fontFamily: "monospace" }}>{o.orderNumber}</strong>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      {new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <strong>{o.user.name}</strong>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.user.email}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{o.course.title}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--muted)" }}>
                    ₹{((o.originalAmountPaise || o.amountPaise) / 100).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {o.promoCode ? (
                      <span className="badge" style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}>
                        🏷️ {o.promoCode.code} (-₹{(o.discountPaise / 100).toLocaleString("en-IN")})
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <strong style={{ color: "var(--blue)", fontSize: 15 }}>
                      ₹{(o.amountPaise / 100).toLocaleString("en-IN")}
                    </strong>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                      {o.gatewayPaymentId || o.gatewayOrderId || "Pending"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={`status-pill ${o.status === "PAID" ? "pill-completed" : "pill-active"}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}

              {!orders.length && (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                    No payment orders placed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

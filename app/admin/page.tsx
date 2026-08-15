import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import Link from "next/link";

export default async function Admin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [students, courses, learningPaths, promos, orders, paidOrders] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.course.count(),
    db.learningPath.count(),
    db.promoCode.count(),
    db.order.count(),
    db.order.findMany({ where: { status: "PAID" }, select: { amountPaise: true } })
  ]);

  const totalRevenuePaise = paidOrders.reduce((sum, o) => sum + (o.amountPaise || 0), 0);

  return (
    <main className="dashboard">
      <div className="container">
        <h1>Admin Dashboard</h1>
        <div className="stats" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          <div className="stat">Students<strong>{students}</strong></div>
          <div className="stat">Courses<strong>{courses}</strong></div>
          <div className="stat">Learning Paths<strong>{learningPaths}</strong></div>
          <div className="stat">Active Promos<strong>{promos}</strong></div>
          <div className="stat">Paid Revenue<strong>₹{(totalRevenuePaise / 100).toLocaleString("en-IN")}</strong></div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 25, gap: 20 }}>
          <div className="card">
            <h2>Course Management</h2>
            <p className="muted">Create courses and build the curriculum with modules, lessons, quizzes, ordering and publishing.</p>
            <Link className="btn btn-primary" href="/admin/courses" style={{ marginTop: 15 }}>Manage Courses</Link>
          </div>

          <div className="card">
            <h2>Learning Paths</h2>
            <p className="muted">Create structured learning paths, link courses in progressive roadmap sequences, and manage skills.</p>
            <Link className="btn btn-primary" href="/admin/learning-paths" style={{ marginTop: 15, background: "var(--navy)" }}>Manage Learning Paths</Link>
          </div>

          <div className="card">
            <h2>🏷️ Promo & Offer Codes</h2>
            <p className="muted">Configure discount coupons, percentage/flat offers, course-specific promos, expiry dates, and usage limits.</p>
            <Link className="btn btn-primary" href="/admin/promos" style={{ marginTop: 15, background: "var(--orange)" }}>Manage Promo Codes</Link>
          </div>

          <div className="card">
            <h2>💳 Orders & Razorpay Payments</h2>
            <p className="muted">View complete financial ledger, student checkout orders, promo discounts applied, and Razorpay gateway IDs ({orders} total orders).</p>
            <Link className="btn btn-primary" href="/admin/orders" style={{ marginTop: 15 }}>View Orders Ledger</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

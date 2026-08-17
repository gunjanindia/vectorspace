import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, calculateUserRank } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    include: {
      enrollments: {
        include: {
          course: { select: { id: true, title: true, slug: true } }
        }
      },
      orders: {
        where: { status: "PAID" },
        select: { id: true, amountPaise: true }
      },
      quizAttempts: {
        where: { passed: true },
        select: { id: true }
      }
    }
  });

  const totalStarsDistributed = students.reduce((sum, s) => sum + (s.stars || 0), 0);
  const totalActiveEnrollments = students.reduce((sum, s) => sum + s.enrollments.length, 0);
  const totalQuizzesPassed = students.reduce((sum, s) => sum + s.quizAttempts.length, 0);

  return (
    <main className="dashboard">
      <div className="container">
        {/* Header */}
        <div className="admin-page-head">
          <div>
            <Link
              href="/admin"
              style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4, marginBottom: 8 }}
            >
              ← Admin Dashboard
            </Link>
            <h1 style={{ margin: "4px 0 0" }}>🎓 Student Learners Directory</h1>
            <p className="muted">Manage registered students, track course enrollments, star achievements, and quiz progress.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link className="btn btn-secondary" href="/admin/orders">
              💳 View Orders Ledger →
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="stats" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 20 }}>
          <div className="stat">Total Students<strong>{students.length}</strong></div>
          <div className="stat">Active Enrollments<strong>{totalActiveEnrollments}</strong></div>
          <div className="stat">Total Stars Earned<strong>⭐ {totalStarsDistributed}</strong></div>
          <div className="stat">Quizzes Solved<strong>🎯 {totalQuizzesPassed}</strong></div>
        </div>

        {/* Students Table */}
        <div className="card" style={{ marginTop: 25, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>STUDENT</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>RANK & STARS</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>ENROLLED COURSES</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>QUIZZES PASSED</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>PAID ORDERS</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>JOINED DATE</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const rank = calculateUserRank(s.stars || 0);
                const totalSpentPaise = s.orders.reduce((sum, o) => sum + (o.amountPaise || 0), 0);

                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #1e3a5f 0%, #0b1f3a 100%)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 800,
                            fontSize: 14,
                            flexShrink: 0
                          }}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: "var(--navy)", fontSize: 15 }}>{s.name}</strong>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.email}</div>
                          {s.phone && <div style={{ fontSize: 11, color: "var(--muted)" }}>📞 {s.phone}</div>}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fffbeb", border: "1px solid #fde68a", padding: "4px 10px", borderRadius: 999 }}>
                        <span style={{ fontSize: 14 }}>{rank.badgeIcon}</span>
                        <strong style={{ color: "#92400e", fontSize: 13 }}>⭐ {s.stars || 0}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                        Level {rank.level}: {rank.title}
                      </div>
                    </td>

                    <td style={{ padding: "14px 18px" }}>
                      {s.enrollments.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {s.enrollments.map(e => (
                            <Link
                              key={e.id}
                              href={`/courses/${e.course.slug}`}
                              className="badge"
                              style={{
                                background: "#f1f5f9",
                                color: "var(--navy)",
                                border: "1px solid #cbd5e1",
                                fontSize: 11,
                                padding: "3px 8px"
                              }}
                            >
                              📚 {e.course.title}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 13 }}>
                          No active enrollments
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "14px 18px" }}>
                      <span style={{ fontWeight: 700, color: "var(--navy)" }}>{s.quizAttempts.length}</span>
                      <span className="muted" style={{ fontSize: 12 }}> solved</span>
                    </td>

                    <td style={{ padding: "14px 18px" }}>
                      <strong style={{ color: "var(--blue)" }}>
                        ₹{(totalSpentPaise / 100).toLocaleString("en-IN")}
                      </strong>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {s.orders.length} {s.orders.length === 1 ? "order" : "orders"}
                      </div>
                    </td>

                    <td style={{ padding: "14px 18px", color: "var(--muted)", fontSize: 13 }}>
                      {new Date(s.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                );
              })}

              {!students.length && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                    No student accounts found yet.
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

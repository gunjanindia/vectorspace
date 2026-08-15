import { redirect } from "next/navigation";
import { getCurrentUser, calculateUserRank } from "@/lib/auth";
import { db } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [students, courses, learningPaths, promos, orders, paidOrders, recentOrders, topStudents, batchesCount, instructorsCount] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.course.count(),
    db.learningPath.count(),
    db.promoCode.count({ where: { active: true } }),
    db.order.count(),
    db.order.findMany({ where: { status: "PAID" }, select: { amountPaise: true, discountPaise: true } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true, slug: true } },
        promoCode: { select: { code: true } }
      }
    }),
    db.user.findMany({
      where: { role: "STUDENT" },
      orderBy: [{ stars: "desc" }, { createdAt: "desc" }],
      take: 4,
      include: {
        _count: { select: { enrollments: true, quizAttempts: true } }
      }
    }),
    db.batch.count(),
    db.user.count({ where: { role: "INSTRUCTOR" } })
  ]);

  const totalRevenuePaise = paidOrders.reduce((sum, o) => sum + (o.amountPaise || 0), 0);
  const totalDiscountsPaise = paidOrders.reduce((sum, o) => sum + (o.discountPaise || 0), 0);

  const stats = [
    {
      label: "Students",
      value: students,
      icon: "🎓",
      subtext: "Registered learners",
      href: "/admin/students",
      color: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      lightBg: "#eff6ff",
      borderColor: "#bfdbfe"
    },
    {
      label: "Courses",
      value: courses,
      icon: "📚",
      subtext: "Curricula & quizzes",
      href: "/admin/courses",
      color: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
      lightBg: "#f0f9ff",
      borderColor: "#bae6fd"
    },
    {
      label: "Batches",
      value: batchesCount,
      icon: "👥",
      subtext: "Live cohorts & schedules",
      href: "/admin/batches",
      color: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
      lightBg: "#eef2ff",
      borderColor: "#c7d2fe"
    },
    {
      label: "Faculty",
      value: instructorsCount,
      icon: "👨‍🏫",
      subtext: "Mentors & instructors",
      href: "/admin/instructors",
      color: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
      lightBg: "#f0fdfa",
      borderColor: "#99f6e4"
    },
    {
      label: "Learning Paths",
      value: learningPaths,
      icon: "🗺️",
      subtext: "Sequenced roadmaps",
      href: "/admin/learning-paths",
      color: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
      lightBg: "#f5f3ff",
      borderColor: "#ddd6fe"
    },
    {
      label: "Active Promos",
      value: promos,
      icon: "🏷️",
      subtext: "Discount coupons",
      href: "/admin/promos",
      color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      lightBg: "#fffbeb",
      borderColor: "#fde68a"
    },
    {
      label: "Paid Revenue",
      value: `₹${(totalRevenuePaise / 100).toLocaleString("en-IN")}`,
      icon: "💳",
      subtext: `From ${paidOrders.length} paid orders`,
      href: "/admin/orders",
      color: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      lightBg: "#ecfdf5",
      borderColor: "#a7f3d0"
    }
  ];

  return (
    <main className="dashboard" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <div className="container">
        {/* Welcome Hero Header */}
        <div
          className="card"
          style={{
            padding: "32px 36px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #0b1f3a 0%, #1e3a5f 100%)",
            color: "#fff",
            marginBottom: 30,
            boxShadow: "0 15px 35px rgba(11,31,58,0.15)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span className="badge" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
                  ADMIN CONTROL CENTER
                </span>
                <span className="badge" style={{ background: "#10b981", color: "#fff" }}>
                  🟢 SYSTEM ONLINE
                </span>
              </div>
              <h1 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", margin: "6px 0 10px", color: "#fff" }}>
                Welcome back, Vector Space Admin 👋
              </h1>
              <p style={{ fontSize: 16, color: "#cbd5e1", margin: 0, maxWidth: 680 }}>
                Manage academy courses, learning roadmaps, promo discounts, student achievements, and live Razorpay payment settlements.
              </p>
            </div>

            {/* Quick Action Shortcut Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link
                href="/admin/courses/new"
                className="btn btn-primary"
                style={{ background: "var(--blue)", padding: "10px 16px", fontSize: 13 }}
              >
                + New Course
              </Link>
              <Link
                href="/admin/learning-paths/new"
                className="btn btn-primary"
                style={{ background: "#8b5cf6", padding: "10px 16px", fontSize: 13 }}
              >
                + New Path
              </Link>
              <Link
                href="/admin/promos"
                className="btn btn-primary"
                style={{ background: "var(--orange)", padding: "10px 16px", fontSize: 13 }}
              >
                + Promo Code
              </Link>
            </div>
          </div>
        </div>

        {/* 5 Interactive Clickable Stat Cards Linking to Lists */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, color: "var(--navy)", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>
              📊 Key Performance Metrics
            </h2>
            <span className="muted" style={{ fontSize: 13 }}>Click any card to view detailed list →</span>
          </div>

          <div
            className="stats"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16
            }}
          >
            {stats.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="card admin-metric-card"
                style={{
                  padding: "20px 22px",
                  borderRadius: "14px",
                  border: `1px solid ${s.borderColor}`,
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  textDecoration: "none",
                  transition: "all 0.22s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {/* Top Accent Strip */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: s.color
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      background: s.lightBg,
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center"
                    }}
                  >
                    {s.icon}
                  </span>
                </div>

                <div>
                  <strong style={{ fontSize: 28, color: "var(--navy)", display: "block", lineHeight: 1.1, marginBottom: 4 }}>
                    {s.value}
                  </strong>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{s.subtext}</span>
                    <span style={{ fontSize: 13, color: "var(--blue)", fontWeight: 800 }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2-Column Live Activity Snapshot */}
        <div className="grid grid-2" style={{ marginTop: 35, gap: 25, alignItems: "stretch" }}>
          {/* Recent Orders Panel */}
          <div className="card" style={{ padding: "26px", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>💳</span>
                  <h3 style={{ margin: 0, fontSize: 18, color: "var(--navy)" }}>Recent Orders & Payments</h3>
                </div>
                <Link href="/admin/orders" style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700 }}>
                  View All Orders →
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "#f8fafc",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      fontSize: 13
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--navy)", display: "block" }}>{o.user.name}</strong>
                      <span className="muted" style={{ fontSize: 11 }}>{o.course.title}</span>
                      {o.promoCode && (
                        <span className="badge" style={{ marginLeft: 6, fontSize: 10, background: "#ecfdf5", color: "#065f46" }}>
                          🏷️ {o.promoCode.code}
                        </span>
                      )}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{ color: "var(--blue)", fontSize: 14 }}>
                        ₹{(o.amountPaise / 100).toLocaleString("en-IN")}
                      </strong>
                      <div style={{ marginTop: 2 }}>
                        <span className={`status-pill ${o.status === "PAID" ? "pill-completed" : "pill-active"}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {!recentOrders.length && (
                  <p className="muted" style={{ fontSize: 13, textAlign: "center", padding: 20 }}>
                    No payment orders recorded yet.
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
              <span>Total Lifetime Orders: <strong>{orders}</strong></span>
              <span>Discounts Granted: <strong>₹{(totalDiscountsPaise / 100).toLocaleString("en-IN")}</strong></span>
            </div>
          </div>

          {/* Student Learners Snapshot */}
          <div className="card" style={{ padding: "26px", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>🎓</span>
                  <h3 style={{ margin: 0, fontSize: 18, color: "var(--navy)" }}>Student Achievers Directory</h3>
                </div>
                <Link href="/admin/students" style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700 }}>
                  View All Students →
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topStudents.map((s) => {
                  const rank = calculateUserRank(s.stars || 0);
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#f8fafc",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        fontSize: 13
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "var(--blue)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 800,
                            fontSize: 12
                          }}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: "var(--navy)", display: "block" }}>{s.name}</strong>
                          <span className="muted" style={{ fontSize: 11 }}>{s.email}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 999 }}>
                          <span>{rank.badgeIcon}</span>
                          <strong style={{ color: "#92400e", fontSize: 12 }}>⭐ {s.stars || 0}</strong>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                          {s._count.enrollments} {s._count.enrollments === 1 ? "course" : "courses"}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!topStudents.length && (
                  <p className="muted" style={{ fontSize: 13, textAlign: "center", padding: 20 }}>
                    No students registered yet.
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
              <span>Total Active Learners: <strong>{students}</strong></span>
              <Link href="/admin/students" style={{ color: "var(--blue)", fontWeight: 700 }}>
                Manage Student Access →
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Feature Management Hub Cards */}
        <div style={{ marginTop: 35 }}>
          <h2 style={{ fontSize: 18, color: "var(--navy)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
            🛠️ Academy Management Modules
          </h2>

          <div className="grid grid-2" style={{ gap: 20 }}>
            <div className="card" style={{ padding: "24px 26px", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>👥</span>
                <h3 style={{ margin: 0, fontSize: 20, color: "var(--navy)" }}>Batches & Live Cohorts</h3>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
                Schedule Hybrid/Offline classroom sessions, manage limited seat rosters, set meeting links, and assign faculty leaders.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="btn btn-primary" href="/admin/batches" style={{ padding: "10px 18px", fontSize: 13, background: "#6366f1" }}>
                  Manage Batches ({batchesCount}) →
                </Link>
              </div>
            </div>

            <div className="card" style={{ padding: "24px 26px", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>👨‍🏫</span>
                <h3 style={{ margin: 0, fontSize: 20, color: "var(--navy)" }}>Faculty & Instructors</h3>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
                Manage teaching faculty profiles, research bios, academic titles, assigned courses, and active mentor cohorts.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="btn btn-primary" href="/admin/instructors" style={{ padding: "10px 18px", fontSize: 13, background: "#0d9488" }}>
                  Manage Faculty ({instructorsCount}) →
                </Link>
              </div>
            </div>

            <div className="card" style={{ padding: "24px 26px", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>📚</span>
                <h3 style={{ margin: 0, fontSize: 20, color: "var(--navy)" }}>Course Curriculum Builder</h3>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
                Create courses, organize modules, build interactive quiz questions with hints and retry mechanisms, and publish lessons.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="btn btn-primary" href="/admin/courses" style={{ padding: "10px 18px", fontSize: 13 }}>
                  Manage Courses ({courses}) →
                </Link>
                <Link className="btn btn-secondary" href="/admin/courses/new" style={{ padding: "10px 14px", fontSize: 13 }}>
                  + New Course
                </Link>
              </div>
            </div>

            <div className="card" style={{ padding: "24px 26px", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🗺️</span>
                <h3 style={{ margin: 0, fontSize: 20, color: "var(--navy)" }}>Learning Paths & Roadmaps</h3>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
                Sequence multi-course career tracks (Step 1, Step 2...), manage syllabus overviews, and link courses into guided roadmaps.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="btn btn-primary" href="/admin/learning-paths" style={{ padding: "10px 18px", fontSize: 13, background: "#8b5cf6" }}>
                  Manage Paths ({learningPaths}) →
                </Link>
                <Link className="btn btn-secondary" href="/admin/learning-paths/new" style={{ padding: "10px 14px", fontSize: 13 }}>
                  + New Path
                </Link>
              </div>
            </div>

            <div className="card" style={{ padding: "24px 26px", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🏷️</span>
                <h3 style={{ margin: 0, fontSize: 20, color: "var(--navy)" }}>Promo & Offer Codes</h3>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
                Configure percentage and flat discount vouchers, course-specific targeting, scholarship coupons, and redemption limits.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="btn btn-primary" href="/admin/promos" style={{ padding: "10px 18px", fontSize: 13, background: "var(--orange)" }}>
                  Manage Promos ({promos} Active) →
                </Link>
              </div>
            </div>

            <div className="card" style={{ padding: "24px 26px", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>💳</span>
                <h3 style={{ margin: 0, fontSize: 20, color: "var(--navy)" }}>Razorpay Payments & Orders</h3>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
                Audit financial records, student checkout transactions, discount breakdown, gateway transaction IDs, and settlement status.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="btn btn-primary" href="/admin/orders" style={{ padding: "10px 18px", fontSize: 13, background: "#10b981" }}>
                  View Orders Ledger ({orders} Orders) →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

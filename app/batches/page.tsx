import { db } from "@/lib/prisma";
import Link from "next/link";

export default async function BatchesDirectoryPage() {
  const batches = await db.batch.findMany({
    where: {
      status: { in: ["UPCOMING", "ONGOING"] }
    },
    orderBy: { startDate: "asc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          level: true,
          durationHours: true,
          pricePaise: true,
          shortDescription: true
        }
      },
      instructor: {
        select: {
          id: true,
          name: true,
          title: true,
          bio: true
        }
      },
      _count: {
        select: { enrollments: true }
      }
    }
  });

  return (
    <main className="dashboard" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div className="container">
        {/* Hero Section */}
        <div
          className="card"
          style={{
            padding: "40px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #0b1f3a 0%, #1e3a5f 100%)",
            color: "#fff",
            marginBottom: 35,
            boxShadow: "0 15px 40px rgba(11,31,58,0.18)"
          }}
        >
          <span
            className="badge"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fde68a",
              border: "1px solid rgba(255,255,255,0.25)",
              marginBottom: 12
            }}
          >
            👥 2026 LIVE COHORTS & ADMISSIONS
          </span>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", margin: "8px 0 12px", color: "#fff" }}>
            Upcoming Batches & Class Schedules
          </h1>
          <p style={{ fontSize: 17, color: "#cbd5e1", margin: 0, maxWidth: 740, lineHeight: 1.6 }}>
            Learn alongside peers with structured schedules, live doubt-clearing sessions, dedicated research faculty, and hands-on laboratory workshops. Limited seats per cohort.
          </p>
        </div>

        {/* Value Highlights */}
        <div className="grid grid-3" style={{ gap: 16, marginBottom: 35 }}>
          <div className="card" style={{ padding: "18px 22px", borderRadius: 14, background: "#fff", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🌐</div>
            <strong style={{ color: "var(--navy)", display: "block", fontSize: 15 }}>Hybrid Learning</strong>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
              Join in-person tech lab workshops or stream live remotely via high-definition interactive classroom video.
            </p>
          </div>

          <div className="card" style={{ padding: "18px 22px", borderRadius: 14, background: "#fff", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🏛️</div>
            <strong style={{ color: "var(--navy)", display: "block", fontSize: 15 }}>In-Person Offline</strong>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
              Immersive weekend classroom bootcamps with 1-on-1 mentor guidance, peer pairing, and hardware access.
            </p>
          </div>

          <div className="card" style={{ padding: "18px 22px", borderRadius: 14, background: "#fff", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🎯</div>
            <strong style={{ color: "var(--navy)", display: "block", fontSize: 15 }}>Capped Cohort Sizes</strong>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
              Strict capacity limits (20-30 learners) ensuring individual project reviews and direct faculty interaction.
            </p>
          </div>
        </div>

        {/* Batches Catalog */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, color: "var(--navy)", margin: 0 }}>
            📅 Open Cohorts for Enrollment ({batches.length})
          </h2>
          <Link href="/courses" style={{ fontSize: 14, color: "var(--blue)", fontWeight: 700 }}>
            Browse All Courses →
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {batches.map(b => {
            const filled = b._count.enrollments;
            const remaining = Math.max(0, b.capacity - filled);
            const isFull = remaining <= 0;
            const isFillingFast = remaining > 0 && remaining <= 6;
            const fillPercent = Math.min(100, Math.round((filled / b.capacity) * 100));

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: "28px 32px",
                  borderRadius: 18,
                  border: isFillingFast ? "2px solid #f59e0b" : "1px solid var(--border)",
                  boxShadow: isFillingFast ? "0 8px 25px rgba(245,158,11,0.12)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span
                        className="badge"
                        style={{
                          background: b.mode === "HYBRID" ? "#e0f2fe" : b.mode === "OFFLINE" ? "#fef3c7" : "#dcfce7",
                          color: b.mode === "HYBRID" ? "#0369a1" : b.mode === "OFFLINE" ? "#92400e" : "#15803d",
                          fontWeight: 800,
                          fontSize: 12
                        }}
                      >
                        {b.mode === "HYBRID" ? "🌐 Hybrid Cohort" : b.mode === "OFFLINE" ? "🏛️ In-Person Classroom" : "💻 Live Online"}
                      </span>

                      {isFillingFast && (
                        <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 800 }}>
                          🔥 FILLING FAST ({remaining} SEATS LEFT)
                        </span>
                      )}

                      {isFull && (
                        <span className="badge" style={{ background: "#f1f5f9", color: "#64748b" }}>
                          🔒 FULL / JOIN WAITLIST
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: "0 0 6px", fontSize: 22, color: "var(--navy)" }}>{b.name}</h3>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
                      Part of <Link href={`/courses/${b.course.slug}`} style={{ color: "var(--blue)", fontWeight: 700 }}>{b.course.title}</Link> ({b.course.level} · {b.course.durationHours} hrs)
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "var(--navy)" }}>
                      ₹{(b.course.pricePaise / 100).toLocaleString("en-IN")}
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>All inclusive · Lifetime access</span>
                  </div>
                </div>

                {/* Batch Specifications Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    padding: "16px 20px",
                    background: "#f8fafc",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    fontSize: 13
                  }}
                >
                  <div>
                    <span className="muted" style={{ display: "block", fontSize: 11, textTransform: "uppercase" }}>
                      📅 Start Date & Timings
                    </span>
                    <strong style={{ color: "var(--navy)", display: "block", marginTop: 2 }}>
                      {new Date(b.startDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </strong>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>{b.schedule}</span>
                  </div>

                  <div>
                    <span className="muted" style={{ display: "block", fontSize: 11, textTransform: "uppercase" }}>
                      👨‍🏫 Lead Faculty / Mentor
                    </span>
                    <strong style={{ color: "var(--navy)", display: "block", marginTop: 2 }}>
                      {b.instructor?.name || "AI Faculty Lead"}
                    </strong>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>{b.instructor?.title || "Director of AI"}</span>
                  </div>

                  <div>
                    <span className="muted" style={{ display: "block", fontSize: 11, textTransform: "uppercase" }}>
                      📍 Classroom / Format
                    </span>
                    <strong style={{ color: "var(--navy)", display: "block", marginTop: 2 }}>
                      {b.classroom ? b.classroom : b.mode === "ONLINE" ? "Live Stream (HD Meet)" : "Hybrid Tech Lab"}
                    </strong>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>Interactive Q&A included</span>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>Cohort Capacity</span>
                      <strong style={{ color: remaining <= 6 && remaining > 0 ? "var(--orange)" : "var(--navy)" }}>
                        {filled} / {b.capacity} Enrolled ({remaining} seats open)
                      </strong>
                    </div>
                    <div style={{ width: "100%", height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${fillPercent}%`,
                          height: "100%",
                          background: fillPercent >= 100 ? "var(--error)" : fillPercent >= 75 ? "var(--orange)" : "var(--blue)",
                          borderRadius: 999
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    ✨ Includes verified completion certificate, +20 Stars/quiz, and portfolio project review.
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <Link
                      href={`/courses/${b.course.slug}`}
                      className="btn btn-secondary"
                      style={{ padding: "10px 18px", fontSize: 13 }}
                    >
                      View Syllabus
                    </Link>

                    {!isFull ? (
                      <Link
                        href={`/checkout?course=${b.course.id}&batch=${b.id}`}
                        className="btn btn-primary"
                        style={{ padding: "10px 22px", fontSize: 14, background: "var(--blue)" }}
                      >
                        Enroll in this Batch →
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="btn"
                        style={{ padding: "10px 22px", fontSize: 14, background: "#cbd5e1", color: "#64748b", cursor: "not-allowed" }}
                      >
                        Batch Full
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {!batches.length && (
            <div className="card" style={{ padding: 50, textAlign: "center" }}>
              <p className="muted" style={{ fontSize: 16 }}>No active batches scheduled at this moment.</p>
              <Link href="/courses" className="btn btn-primary" style={{ marginTop: 10 }}>
                Browse Courses
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

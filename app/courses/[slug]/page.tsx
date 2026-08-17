import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";

export const dynamic = "force-dynamic";

export default async function CourseDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      instructor: { select: { name: true } },
      modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" } } } },
      batches: {
        where: { status: { in: ["UPCOMING", "ONGOING"] } },
        orderBy: { startDate: "asc" },
        include: {
          instructor: { select: { name: true, title: true } },
          _count: { select: { enrollments: true } }
        }
      },
      learningPaths: {
        orderBy: { sortOrder: "asc" },
        include: {
          learningPath: {
            select: { id: true, title: true, slug: true, icon: true, level: true }
          }
        }
      },
      promoCodes: {
        where: { active: true },
        take: 2
      }
    }
  });

  if (!course || !course.published) notFound();

  // Find featured promo offer for this course (either course-specific or global)
  const globalPromo = await db.promoCode.findFirst({
    where: { active: true, applicableCourseId: null },
    orderBy: { discountValue: "desc" }
  });

  const featuredPromo = course.promoCodes[0] || globalPromo;

  return (
    <main className="section">
      <div className="container">
        {/* Linked Learning Paths Banner */}
        {course.learningPaths.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 18px",
              background: "linear-gradient(135deg, #eef5ff 0%, #f0f7ff 100%)",
              border: "1px solid #bfdbfe",
              borderRadius: "12px",
              marginBottom: 25,
              flexWrap: "wrap"
            }}
          >
            <span style={{ fontSize: 20 }}>🚀</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>
              Part of Learning Path:
            </span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {course.learningPaths.map(lpc => (
                <Link
                  key={lpc.id}
                  href={`/learning-paths/${lpc.learningPath.slug}`}
                  className="badge"
                  style={{
                    background: "#fff",
                    border: "1px solid var(--blue)",
                    color: "var(--blue)",
                    fontSize: 13,
                    padding: "4px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>{lpc.learningPath.icon || "⚡"}</span>
                  <span>{lpc.learningPath.title} (Step {lpc.sortOrder})</span>
                  <span>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-2" style={{ gap: 40, alignItems: "flex-start" }}>
          <div>
            <span className="badge">{course.mode}</span>
            <h1 style={{ margin: "8px 0 14px", fontSize: 32, color: "var(--navy)" }}>{course.title}</h1>
            <div className="rich-view course-description" dangerouslySetInnerHTML={{ __html: sanitizeRichText(course.description) }} />
            <p className="muted" style={{ margin: "16px 0" }}>
              {course.level} · {course.durationHours} hours · Instructor: <strong>{course.instructor.name}</strong>
            </p>

            {/* Special Promo / Offer Callout */}
            {featuredPromo && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px dashed #f59e0b",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  margin: "20px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🏷️</span>
                    <strong style={{ color: "#92400e", fontSize: 14 }}>
                      SPECIAL OFFER: Use code{" "}
                      <span style={{ fontFamily: "monospace", background: "#fef3c7", padding: "2px 8px", borderRadius: 4, color: "#b45309" }}>
                        {featuredPromo.code}
                      </span>
                    </strong>
                  </div>
                  <div style={{ fontSize: 12, color: "#78350f", marginTop: 4 }}>
                    {featuredPromo.description ||
                      `Get ${featuredPromo.discountType === "PERCENTAGE" ? `${featuredPromo.discountValue}% OFF` : `₹${featuredPromo.discountValue / 100} Flat Discount`} at checkout.`}
                  </div>
                </div>

                <Link
                  className="btn btn-secondary"
                  href={`/checkout?course=${course.id}&promo=${featuredPromo.code}`}
                  style={{ padding: "6px 14px", fontSize: 13, borderColor: "#f59e0b", color: "#b45309" }}
                >
                  Apply Code →
                </Link>
              </div>
            )}

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px 16px", borderRadius: 10, margin: "20px 0 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎓</span>
                <strong style={{ color: "#166534", fontSize: 13 }}>
                  All-Inclusive Program: Self-Paced Player + Live Faculty Cohort
                </strong>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#15803d", lineHeight: 1.5 }}>
                Your enrollment includes 24/7 digital curriculum access, interactive quizzes, plus your choice of a Live Mentor Cohort schedule at no extra charge.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 15, flexWrap: "wrap" }}>
              <div>
                <span className="muted" style={{ fontSize: 12, display: "block" }}>Total Program Tuition</span>
                <p className="price" style={{ margin: 0, fontSize: 28 }}>₹{(course.pricePaise / 100).toLocaleString("en-IN")}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link
                  className="btn btn-primary"
                  href={course.batches.length > 0 ? `#upcoming-batches` : `/checkout?course=${course.id}${featuredPromo ? `&promo=${featuredPromo.code}` : ""}`}
                  style={{ padding: "12px 26px", fontSize: 15 }}
                >
                  {course.batches.length > 0 ? "Select Cohort & Enroll →" : "Enroll Now →"}
                </Link>
                {course.batches.length > 0 && (
                  <span className="muted" style={{ fontSize: 11, textAlign: "center" }}>
                    Choose schedule below or at checkout
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 26, borderRadius: 14 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 18, color: "var(--navy)" }}>What you'll master</h3>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 14, color: "var(--text)" }}>
              <li>Practical Generative AI architectures & token mechanics</li>
              <li>Advanced Prompt engineering patterns (Few-Shot, Chain-of-Thought)</li>
              <li>Hands-on interactive quizzes with hints and instant retries</li>
              <li>Production AI projects, RAG systems, and AI agent frameworks</li>
              <li>Earn Gamification Stars ⭐ and Verified Certificate on completion</li>
            </ul>
          </div>
        </div>

        {/* Upcoming Live Batches & Cohorts */}
        <section id="upcoming-batches" style={{ marginTop: 50, scrollMarginTop: 90 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>INCLUDED WITH ENROLLMENT</span>
                <span className="badge" style={{ background: "#ecfdf5", color: "#065f46" }}>ZERO EXTRA CHARGE</span>
              </div>
              <h2 style={{ margin: "4px 0 0", fontSize: 24, color: "var(--navy)" }}>
                👥 Choose Your Learning Schedule & Cohort
              </h2>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                Pick the batch schedule that best fits your weekly routine. You can also switch schedules later if needed.
              </p>
            </div>
            <Link href="/batches" style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700 }}>
              View All Batches Calendar →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {course.batches.map(b => {
              const filled = b._count.enrollments;
              const remaining = Math.max(0, b.capacity - filled);
              const isFull = remaining <= 0;
              const isFillingFast = remaining > 0 && remaining <= 6;

              return (
                <div
                  key={b.id}
                  className="card"
                  style={{
                    padding: "20px 24px",
                    borderRadius: 14,
                    border: isFillingFast ? "2px solid #f59e0b" : "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        className="badge"
                        style={{
                          background: b.mode === "HYBRID" ? "#e0f2fe" : b.mode === "OFFLINE" ? "#fef3c7" : "#dcfce7",
                          color: b.mode === "HYBRID" ? "#0369a1" : b.mode === "OFFLINE" ? "#92400e" : "#15803d",
                          fontWeight: 800,
                          fontSize: 11
                        }}
                      >
                        {b.mode === "HYBRID" ? "🌐 Hybrid Cohort" : b.mode === "OFFLINE" ? "🏛️ In-Person Classroom" : "💻 Live Online"}
                      </span>
                      {isFillingFast && (
                        <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 11 }}>
                          🔥 ONLY {remaining} SEATS LEFT
                        </span>
                      )}
                    </div>

                    <strong style={{ fontSize: 17, color: "var(--navy)", display: "block" }}>{b.name}</strong>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                      📅 Kickoff: <strong>{new Date(b.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong> · Timings: <strong>{b.schedule}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--navy)", marginTop: 3 }}>
                      {b.classroom ? `🏛️ Location: ${b.classroom}` : `💻 Mode: Interactive Live HD Stream + Q&A`}
                      {b.instructor && ` · 👨‍🏫 Mentor: ${b.instructor.name}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <span className="muted" style={{ fontSize: 11, display: "block" }}>Cohort Availability</span>
                      <strong style={{ fontSize: 13, color: isFull ? "var(--error)" : isFillingFast ? "var(--orange)" : "var(--navy)" }}>
                        {isFull ? "Cohort Full" : `${remaining} / ${b.capacity} Seats Open`}
                      </strong>
                    </div>

                    {!isFull ? (
                      <Link
                        className="btn btn-primary"
                        href={`/checkout?course=${course.id}&batch=${b.id}${featuredPromo ? `&promo=${featuredPromo.code}` : ""}`}
                        style={{ padding: "10px 20px", fontSize: 14 }}
                      >
                        Reserve Seat & Enroll →
                      </Link>
                    ) : (
                      <button disabled className="btn" style={{ padding: "10px 20px", fontSize: 14, background: "#cbd5e1", color: "#64748b", cursor: "not-allowed" }}>
                        Cohort Full
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Flexible Self-Paced Option Card */}
            <div
              className="card"
              style={{
                padding: "18px 24px",
                borderRadius: 14,
                border: "1px dashed #94a3b8",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16
              }}
            >
              <div>
                <span className="badge" style={{ background: "#f1f5f9", color: "var(--navy)", marginBottom: 4 }}>
                  ⚡ ON-DEMAND / FLEXIBLE
                </span>
                <strong style={{ fontSize: 16, color: "var(--navy)", display: "block" }}>
                  Flexible Self-Paced (No Fixed Class Timings)
                </strong>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                  Prefer learning at your own pace without scheduled live workshops? Start immediately with 24/7 video lessons & quizzes.
                </p>
              </div>

              <Link
                className="btn btn-secondary"
                href={`/checkout?course=${course.id}${featuredPromo ? `&promo=${featuredPromo.code}` : ""}`}
                style={{ padding: "10px 20px", fontSize: 14 }}
              >
                Enroll as Self-Paced →
              </Link>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 50 }}>
          <h2>Course Curriculum</h2>
          {course.modules.map(m => (
            <div className="card" style={{ marginTop: 15 }} key={m.id}>
              <h3>Module {m.sortOrder}: {m.title}</h3>
              {m.lessons.map(l => (
                <div className="lesson-item" key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{l.type === "QUIZ" ? "⭐" : "📄"}</span>
                    <span>{l.title}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {l.type === "QUIZ" && <span className="quiz-mini-tag">QUIZ</span>}
                    <span className="muted">{l.durationMin} min</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

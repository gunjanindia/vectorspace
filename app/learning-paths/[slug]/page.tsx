import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeRichText } from "@/lib/richText";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lp = await db.learningPath.findUnique({ where: { slug } });
  if (!lp) return { title: "Learning Path Not Found" };
  return {
    title: `${lp.title} | Learning Path`,
    description: lp.shortDescription
  };
}

export default async function LearningPathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const learningPath = await db.learningPath.findUnique({
    where: { slug },
    include: {
      courses: {
        orderBy: { sortOrder: "asc" },
        include: {
          course: {
            include: {
              instructor: { select: { name: true } },
              modules: {
                orderBy: { sortOrder: "asc" },
                include: { lessons: { select: { id: true, title: true, type: true, durationMin: true } } }
              }
            }
          }
        }
      }
    }
  });

  if (!learningPath || !learningPath.published) {
    notFound();
  }

  // If user is logged in, fetch their enrollment records
  let userEnrollments: Record<string, string> = {};
  if (user) {
    const enrollments = await db.enrollment.findMany({
      where: { userId: user.id }
    });
    enrollments.forEach(e => {
      userEnrollments[e.courseId] = e.status;
    });
  }

  const totalHours = learningPath.courses.reduce((sum, c) => sum + (c.course.durationHours || 0), 0);
  const totalLessons = learningPath.courses.reduce(
    (sum, c) => sum + c.course.modules.reduce((mSum, m) => mSum + m.lessons.length, 0),
    0
  );

  return (
    <main className="section" style={{ paddingTop: 40 }}>
      <div className="container">
        {/* Breadcrumb Navigation */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/learning-paths"
            style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4 }}
          >
            ← All Learning Paths
          </Link>
        </div>

        {/* Hero Section */}
        <div
          className="card"
          style={{
            padding: "40px 36px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #0b1f3a 0%, #1e3a5f 100%)",
            color: "#fff",
            marginBottom: 40,
            boxShadow: "0 15px 40px rgba(11,31,58,0.18)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <span style={{ fontSize: 36 }}>{learningPath.icon || "🚀"}</span>
            <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
              LEARNING PATH ROADMAP
            </span>
            <span className="badge" style={{ background: "var(--orange)", color: "#fff" }}>
              {learningPath.level}
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(30px, 4vw, 44px)", margin: "8px 0 16px", color: "#fff" }}>
            {learningPath.title}
          </h1>

          <p style={{ fontSize: 18, color: "#cbd5e1", maxWidth: 840, lineHeight: 1.6, margin: "0 0 25px" }}>
            {learningPath.shortDescription}
          </p>

          {/* Quick Metrics Bar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 25, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Courses</div>
              <strong style={{ fontSize: 20, color: "#fff" }}>{learningPath.courses.length} Courses</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Total Duration</div>
              <strong style={{ fontSize: 20, color: "#fff" }}>{totalHours} Hours</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Curriculum</div>
              <strong style={{ fontSize: 20, color: "#fff" }}>{totalLessons} Guided Lessons</strong>
            </div>
          </div>
        </div>

        {/* Path Description & Overview */}
        {learningPath.description && (
          <div className="card" style={{ padding: 30, marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 22, color: "var(--navy)" }}>Pathway Overview</h2>
            <div
              className="rich-view"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(learningPath.description) }}
              style={{ lineHeight: 1.7 }}
            />
          </div>
        )}

        {/* Step-by-Step Course Roadmap */}
        <div>
          <div style={{ marginBottom: 25 }}>
            <h2 style={{ fontSize: 28, color: "var(--navy)", margin: "0 0 6px" }}>
              Sequential Course Roadmap
            </h2>
            <p className="muted" style={{ fontSize: 16 }}>
              Complete each course in order to build comprehensive expertise from start to finish.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 25, position: "relative" }}>
            {learningPath.courses.map((lpc, idx) => {
              const c = lpc.course;
              const enrollmentStatus = userEnrollments[c.id];
              const isEnrolled = Boolean(enrollmentStatus);
              const isCompleted = enrollmentStatus === "COMPLETED";

              return (
                <div
                  key={lpc.id}
                  className="card roadmap-step-card"
                  style={{
                    padding: 30,
                    borderRadius: 16,
                    border: "2px solid var(--border)",
                    position: "relative",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 15 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span
                          style={{
                            background: "var(--blue)",
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: 12,
                            padding: "4px 12px",
                            borderRadius: 999
                          }}
                        >
                          STEP {idx + 1}
                        </span>
                        <span className="badge">{c.level}</span>
                        <span className="badge" style={{ background: "#f1f5f9", color: "var(--muted)" }}>
                          {c.mode}
                        </span>

                        {isCompleted ? (
                          <span className="status-pill pill-completed">✓ Course Completed</span>
                        ) : isEnrolled ? (
                          <span className="status-pill pill-active">In Progress</span>
                        ) : null}
                      </div>

                      <h3 style={{ margin: "4px 0 10px", fontSize: 24, color: "var(--navy)" }}>{c.title}</h3>

                      <div
                        className="muted rich-view short-description"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichText(c.shortDescription) }}
                        style={{ fontSize: 15, marginBottom: 15 }}
                      />

                      <div style={{ display: "flex", gap: 15, fontSize: 13, color: "var(--muted)" }}>
                        <span><strong>{c.durationHours}</strong> hours</span>
                        <span>·</span>
                        <span><strong>{c.modules.length}</strong> modules</span>
                        <span>·</span>
                        <span>Instructor: <strong>{c.instructor.name}</strong></span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right", minWidth: 160 }}>
                      <p className="price" style={{ margin: "0 0 10px" }}>
                        ₹{(c.pricePaise / 100).toLocaleString("en-IN")}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {isEnrolled ? (
                          <Link className="btn btn-primary" href={`/learn/${c.slug}`}>
                            Continue Learning →
                          </Link>
                        ) : (
                          <Link className="btn btn-primary" href={`/courses/${c.slug}`}>
                            View & Enroll →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modules Preview Accordion/List */}
                  {c.modules.length > 0 && (
                    <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                      <strong style={{ fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 8 }}>
                        Curriculum Modules Included:
                      </strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {c.modules.map((m, mIdx) => (
                          <span
                            key={m.id}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              padding: "4px 10px",
                              fontSize: 12,
                              color: "var(--text)"
                            }}
                          >
                            Module {mIdx + 1}: {m.title} ({m.lessons.length} lessons)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

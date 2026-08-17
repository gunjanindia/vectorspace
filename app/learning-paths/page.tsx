import Link from "next/link";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Learning Paths | Vector Space Skills Academy",
  description: "Explore curated step-by-step learning paths to master Generative AI, Prompt Engineering, and Full-Stack AI development."
};

export default async function LearningPathsPage() {
  const learningPaths = await db.learningPath.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    include: {
      courses: {
        orderBy: { sortOrder: "asc" },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              level: true,
              durationHours: true,
              pricePaise: true,
              mode: true
            }
          }
        }
      }
    }
  });

  return (
    <main className="section">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 40px" }}>
          <span className="badge" style={{ marginBottom: 12 }}>STRUCTURED ROADMAPS</span>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", margin: "8px 0 14px", color: "var(--navy)" }}>
            AI Learning Paths
          </h1>
          <p className="muted" style={{ fontSize: 18, lineHeight: 1.6 }}>
            Follow carefully sequenced, industry-aligned course pathways from foundations to advanced full-stack AI applications.
          </p>
        </div>

        <div className="grid grid-2" style={{ gap: 30 }}>
          {learningPaths.map((lp, idx) => {
            const totalHours = lp.courses.reduce((sum, c) => sum + (c.course.durationHours || 0), 0);

            return (
              <div
                className="card learning-path-card"
                key={lp.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "30px",
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
              >
                <div>
                  {/* Top metadata */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 32 }}>{lp.icon || "🚀"}</span>
                      <span className="badge">PATH {idx + 1}</span>
                    </div>
                    <span className="badge" style={{ background: "#f8fafc", color: "var(--muted)", border: "1px solid var(--border)" }}>
                      {lp.level}
                    </span>
                  </div>

                  <h2 style={{ margin: "0 0 10px", fontSize: 24, color: "var(--navy)" }}>{lp.title}</h2>
                  <p className="muted" style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.6 }}>
                    {lp.shortDescription}
                  </p>

                  {/* Course Roadmap Steps */}
                  <div style={{ margin: "20px 0", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #edf2f7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "var(--navy)", marginBottom: 10 }}>
                      <span>Curriculum Roadmap ({lp.courses.length} {lp.courses.length === 1 ? "Course" : "Courses"})</span>
                      <span className="muted">{totalHours} total hours</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {lp.courses.map((lpc, sIdx) => (
                        <div
                          key={lpc.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            background: "#fff",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            fontSize: 13
                          }}
                        >
                          <span
                            style={{
                              background: "var(--blue)",
                              color: "#fff",
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                              fontWeight: 800,
                              flexShrink: 0
                            }}
                          >
                            {sIdx + 1}
                          </span>
                          <span style={{ fontWeight: 600, color: "var(--text)", flex: 1 }}>{lpc.course.title}</span>
                          <span className="muted" style={{ fontSize: 12 }}>{lpc.course.durationHours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Link className="btn btn-primary" href={`/learning-paths/${lp.slug}`} style={{ width: "100%", padding: "13px 20px" }}>
                    Explore Roadmap & Courses →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

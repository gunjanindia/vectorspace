import Link from "next/link";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";
import CourseRatingDisplay from "@/components/CourseRatingDisplay";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [courses, learningPaths] = await Promise.all([
    db.course.findMany({
      where: { published: true, featured: true },
      include: {
        instructor: { select: { name: true } },
        reviews: { select: { rating: true } }
      },
      take: 6
    }),
    db.learningPath.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: {
        courses: {
          orderBy: { sortOrder: "asc" },
          include: {
            course: {
              select: { id: true, title: true, slug: true, durationHours: true, level: true }
            }
          }
        }
      },
      take: 3
    })
  ]);

  const featuredPath = learningPaths[0];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge">ONLINE + OFFLINE + HYBRID AI TRAINING</span>
            <h1>Master AI.<br /><span style={{ color: "var(--blue)" }}>Build the Future.</span></h1>
            <p>Learn Generative AI, Prompt Engineering, Python, AI Agents and practical AI development through structured courses, live classes and real projects.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 25, flexWrap: "wrap" }}>
              <Link className="btn btn-primary" href="/courses">Explore Courses</Link>
              <Link className="btn btn-secondary" href="/learning-paths">View Learning Paths</Link>
              <Link className="btn btn-dark" href="/register">Join Academy</Link>
            </div>
          </div>

          {featuredPath ? (
            <div className="hero-card">
              <span className="badge">Featured learning path</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 6px" }}>
                <span style={{ fontSize: 26 }}>{featuredPath.icon || "🚀"}</span>
                <h2 style={{ margin: 0, fontSize: 24 }}>{featuredPath.title}</h2>
              </div>
              <p className="muted" style={{ margin: "6px 0 14px" }}>
                {featuredPath.courses.map(c => c.course.title).join(" → ") || featuredPath.shortDescription}
              </p>
              <div style={{ marginTop: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Career-focused</span><strong>✓</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}><span>{featuredPath.courses.length} Sequenced Courses</span><strong>✓</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}><span>Certificate & Stars</span><strong>✓</strong></div>
              </div>
              <Link className="btn btn-primary" href={`/learning-paths/${featuredPath.slug}`} style={{ width: "100%", marginTop: 20 }}>
                Explore Pathway →
              </Link>
            </div>
          ) : (
            <div className="hero-card">
              <span className="badge">Featured learning path</span>
              <h2>AI Developer</h2>
              <p className="muted">Python → GenAI → Prompt Engineering → RAG → AI Applications → Projects</p>
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Career-focused</span><strong>✓</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}><span>Hybrid classes</span><strong>✓</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}><span>Certificate</span><strong>✓</strong></div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Dynamic Learning Paths Section */}
      <section className="section" id="learning-paths">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 15, marginBottom: 25 }}>
            <div>
              <span className="badge" style={{ marginBottom: 8 }}>PROGRESSIVE CURRICULUM</span>
              <h2 style={{ margin: "4px 0 0" }}>Structured AI Learning Paths</h2>
              <p className="muted">Follow step-by-step pathways linking foundational concepts to production-grade applications.</p>
            </div>
            <Link className="btn btn-secondary" href="/learning-paths">
              View All Paths →
            </Link>
          </div>

          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {learningPaths.map((lp, i) => (
              <div
                className="card"
                key={lp.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "24px",
                  borderRadius: "14px"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 26 }}>{lp.icon || "🚀"}</span>
                    <span className="badge">PATH {i + 1}</span>
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "var(--navy)" }}>{lp.title}</h3>
                  <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
                    {lp.shortDescription}
                  </p>

                  {/* Linked Courses Sequence Tags */}
                  {lp.courses.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                        Roadmap Sequence:
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {lp.courses.map((lpc, sIdx) => (
                          <div
                            key={lpc.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              background: "#f8fafc",
                              padding: "6px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              border: "1px solid #edf2f7"
                            }}
                          >
                            <span style={{ background: "var(--blue)", color: "#fff", width: 18, height: 18, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>
                              {sIdx + 1}
                            </span>
                            <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {lpc.course.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link className="btn btn-primary" href={`/learning-paths/${lp.slug}`} style={{ width: "100%", padding: "10px 16px", fontSize: 14 }}>
                  Explore Path & Courses →
                </Link>
              </div>
            ))}

            {!learningPaths.length && (
              <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 30 }}>
                <p className="muted">No learning paths created yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="section" style={{ background: "#fff" }} id="batches">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 15, marginBottom: 25 }}>
            <div>
              <h2>Featured Courses</h2>
              <p className="muted">Start with a focused AI skill and build toward advanced applications.</p>
            </div>
            <Link className="btn btn-secondary" href="/courses">
              Browse All Courses →
            </Link>
          </div>

          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {courses.length ? (
              courses.map(c => (
                <div className="card course-card" key={c.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
                      <span className="badge">{c.level}</span>
                      <CourseRatingDisplay reviews={c.reviews} size="sm" />
                    </div>
                    <h3 style={{ marginTop: 4, marginBottom: 10 }}>{c.title}</h3>
                    <div
                      className="muted rich-view short-description"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(c.shortDescription) }}
                    />
                    <p style={{ marginTop: 12, marginBottom: 4 }}><strong>{c.durationHours} hours</strong> · {c.mode}</p>
                    <p className="muted" style={{ margin: "4px 0 12px" }}>Instructor: {c.instructor.name}</p>
                  </div>

                  <div>
                    <p className="price" style={{ margin: "10px 0 14px" }}>₹{(c.pricePaise / 100).toLocaleString("en-IN")}</p>
                    <Link className="btn btn-primary" href={`/courses/${c.slug}`} style={{ width: "100%", textAlign: "center" }}>
                      View Course
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="card">No featured courses yet. Run the seed command.</div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

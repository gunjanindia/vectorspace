import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";

export default async function CourseDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      instructor: { select: { name: true } },
      modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" } } } },
      batches: { orderBy: { startDate: "asc" } },
      learningPaths: {
        orderBy: { sortOrder: "asc" },
        include: {
          learningPath: {
            select: { id: true, title: true, slug: true, icon: true, level: true }
          }
        }
      }
    }
  });

  if (!course || !course.published) notFound();

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

        <div className="grid grid-2">
          <div>
            <span className="badge">{course.mode}</span>
            <h1>{course.title}</h1>
            <div className="rich-view course-description" dangerouslySetInnerHTML={{ __html: sanitizeRichText(course.description) }} />
            <p className="muted">{course.level} · {course.durationHours} hours · Instructor: {course.instructor.name}</p>
            <p className="price">₹{(course.pricePaise / 100).toLocaleString("en-IN")}</p>
            <Link className="btn btn-primary" href={`/checkout?course=${course.id}`}>Enroll Now</Link>
          </div>
          <div className="card">
            <h3>What you'll learn</h3>
            <ul>
              <li>Practical Generative AI concepts</li>
              <li>Prompt engineering patterns</li>
              <li>Hands-on exercises and quizzes</li>
              <li>Projects and assessment</li>
              <li>Certificate & Gamification Stars on completion</li>
            </ul>
          </div>
        </div>

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

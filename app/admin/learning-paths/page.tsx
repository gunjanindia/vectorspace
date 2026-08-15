import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function AdminLearningPathsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const learningPaths = await db.learningPath.findMany({
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
    }
  });

  return (
    <main className="dashboard">
      <div className="container">
        <div className="admin-page-head">
          <div>
            <Link href="/admin" style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4, marginBottom: 8 }}>
              ← Admin Dashboard
            </Link>
            <h1 style={{ margin: "4px 0 0" }}>Learning Paths Management</h1>
            <p className="muted">Create and manage structured learning roadmaps linked to academy courses.</p>
          </div>
          <Link className="btn btn-primary" href="/admin/learning-paths/new">
            + New Learning Path
          </Link>
        </div>

        <div className="grid" style={{ marginTop: 25, gap: 20 }}>
          {learningPaths.map((lp, idx) => (
            <div className="card" key={lp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{lp.icon || "🚀"}</span>
                  <span className="badge">{lp.level}</span>
                  <span className={`status-pill ${lp.published ? "pill-completed" : "pill-active"}`}>
                    {lp.published ? "Published" : "Draft"}
                  </span>
                  {lp.featured && <span className="badge badge-gold">Featured</span>}
                </div>

                <h2 style={{ margin: "6px 0 8px", fontSize: 22, color: "var(--navy)" }}>{lp.title}</h2>
                <p className="muted" style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.5 }}>
                  {lp.shortDescription}
                </p>

                {/* Linked Courses Sequence */}
                <div>
                  <strong style={{ fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 6 }}>
                    Linked Courses ({lp.courses.length}):
                  </strong>
                  {lp.courses.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {lp.courses.map((lpc, sIdx) => (
                        <span
                          key={lpc.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 13,
                            color: "var(--text)"
                          }}
                        >
                          <span style={{ background: "var(--blue)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>
                            {sIdx + 1}
                          </span>
                          <span>{lpc.course.title}</span>
                          <span style={{ color: "var(--muted)", fontSize: 11 }}>({lpc.course.durationHours}h)</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: "#e11d48", fontStyle: "italic" }}>
                      No courses linked yet. Click Edit to link courses to this path.
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Link className="btn btn-secondary" href={`/learning-paths/${lp.slug}`} target="_blank">
                  View Public Page ↗
                </Link>
                <Link className="btn btn-primary" href={`/admin/learning-paths/${lp.id}`}>
                  Edit & Link Courses
                </Link>
              </div>
            </div>
          ))}

          {!learningPaths.length && (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <p className="muted">No learning paths created yet.</p>
              <Link className="btn btn-primary" href="/admin/learning-paths/new" style={{ marginTop: 12 }}>
                Create Your First Learning Path
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

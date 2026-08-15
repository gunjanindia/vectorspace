"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  durationHours: number;
  level: string;
  pricePaise: number;
  mode: string;
}

interface LinkedCourseItem {
  id: string;
  learningPathId: string;
  courseId: string;
  sortOrder: number;
  course: CourseItem;
}

interface LearningPathDetail {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  level: string;
  icon: string;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  courses: LinkedCourseItem[];
}

export default function EditLearningPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPathDetail | null>(null);
  const [allCourses, setAllCourses] = useState<CourseItem[]>([]);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    icon: "🚀",
    level: "All Levels",
    shortDescription: "",
    description: "",
    featured: false,
    published: true,
    sortOrder: 1
  });

  const [linkedCourses, setLinkedCourses] = useState<CourseItem[]>([]);
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/learning-paths/${id}`);
        if (!res.ok) throw new Error("Failed to load learning path");
        const data = await res.json();

        const lp: LearningPathDetail = data.learningPath;
        setLearningPath(lp);
        setAllCourses(data.allCourses || []);

        setForm({
          title: lp.title,
          slug: lp.slug,
          icon: lp.icon || "🚀",
          level: lp.level || "All Levels",
          shortDescription: lp.shortDescription || "",
          description: lp.description || "",
          featured: lp.featured,
          published: lp.published,
          sortOrder: lp.sortOrder || 1
        });

        // Extract ordered courses
        const ordered = lp.courses.map(c => c.course);
        setLinkedCourses(ordered);
      } catch (err) {
        console.error("Error loading learning path:", err);
        alert("Error loading learning path");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  function moveCourse(index: number, direction: -1 | 1) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= linkedCourses.length) return;

    const copy = [...linkedCourses];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setLinkedCourses(copy);
  }

  function removeCourse(courseId: string) {
    setLinkedCourses(prev => prev.filter(c => c.id !== courseId));
  }

  function addCourseToPath() {
    if (!selectedCourseToAdd) return;
    const courseObj = allCourses.find(c => c.id === selectedCourseToAdd);
    if (!courseObj) return;

    if (linkedCourses.some(c => c.id === selectedCourseToAdd)) {
      alert("This course is already in the path.");
      return;
    }

    setLinkedCourses(prev => [...prev, courseObj]);
    setSelectedCourseToAdd("");
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      return alert("Title and slug are required");
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/learning-paths/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          courseIds: linkedCourses.map(c => c.id)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save learning path");
      }

      alert("Learning Path and Course relationships saved successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving learning path");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete learning path “${form.title}”?`)) return;

    try {
      const res = await fetch(`/api/admin/learning-paths/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/admin/learning-paths");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting path");
    }
  }

  if (loading) {
    return (
      <main className="dashboard">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p className="muted">Loading learning path details...</p>
        </div>
      </main>
    );
  }

  const unlinkedCourses = allCourses.filter(ac => !linkedCourses.some(lc => lc.id === ac.id));
  const totalHours = linkedCourses.reduce((sum, c) => sum + (c.durationHours || 0), 0);

  return (
    <main className="dashboard">
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="admin-page-head">
          <div>
            <Link
              href="/admin/learning-paths"
              style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4, marginBottom: 8 }}
            >
              ← Back to Learning Paths
            </Link>
            <h1 style={{ margin: "4px 0 0" }}>Manage Learning Path: {form.title}</h1>
            <p className="muted">Configure path details and sequence linked courses in progressive order.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link className="btn btn-secondary" href={`/learning-paths/${form.slug}`} target="_blank">
              View Public Page ↗
            </Link>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete Path
            </button>
          </div>
        </div>

        {/* Section 1: Linked Courses Sequencer */}
        <div className="card" style={{ padding: 26, marginBottom: 25, border: "2px solid var(--blue)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: "var(--navy)" }}>
                📚 Linked Courses Roadmap ({linkedCourses.length} Courses · {totalHours} Hours)
              </h2>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                Arrange courses in the exact sequence learners should complete them.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
              {saving ? "Saving Changes..." : "Save Path & Sequence ✓"}
            </button>
          </div>

          {/* List of Ordered Courses */}
          {linkedCourses.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {linkedCourses.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    background: "#f8fafc",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    gap: 15,
                    flexWrap: "wrap"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 240 }}>
                    <div
                      style={{
                        background: "var(--blue)",
                        color: "#fff",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: 14,
                        flexShrink: 0
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <strong style={{ fontSize: 16, color: "var(--navy)", display: "block" }}>{c.title}</strong>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
                        <span className="badge" style={{ padding: "2px 8px", fontSize: 11 }}>{c.level}</span>
                        <span>{c.durationHours} hours</span>
                        <span>·</span>
                        <span>{c.mode}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => moveCourse(idx, -1)}
                      disabled={idx === 0}
                      style={{ padding: "8px 12px", opacity: idx === 0 ? 0.4 : 1 }}
                      title="Move Step Up"
                    >
                      ↑ Up
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => moveCourse(idx, 1)}
                      disabled={idx === linkedCourses.length - 1}
                      style={{ padding: "8px 12px", opacity: idx === linkedCourses.length - 1 ? 0.4 : 1 }}
                      title="Move Step Down"
                    >
                      ↓ Down
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeCourse(c.id)}
                      style={{ padding: "8px 12px" }}
                      title="Unlink Course from Path"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: "center", background: "#f8fafc", borderRadius: 10, border: "1px dashed var(--border)" }}>
              <p className="muted">No courses linked to this learning path yet.</p>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
                Use the selector below to link courses and establish the learning roadmap.
              </p>
            </div>
          )}

          {/* Add Course Selector */}
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select
              className="input"
              value={selectedCourseToAdd}
              onChange={e => setSelectedCourseToAdd(e.target.value)}
              style={{ margin: 0, flex: 1, minWidth: 260 }}
            >
              <option value="">-- Select a course to link as Step {linkedCourses.length + 1} --</option>
              {unlinkedCourses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.level} · {c.durationHours}h)
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              onClick={addCourseToPath}
              disabled={!selectedCourseToAdd}
              style={{ padding: "12px 20px" }}
            >
              + Link Course to Path
            </button>
          </div>
        </div>

        {/* Section 2: Path Metadata Form */}
        <form onSubmit={handleSave} className="card" style={{ padding: 26 }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 20, color: "var(--navy)" }}>Learning Path Details</h2>

          <div className="grid grid-2">
            <label>
              Path Title
              <input
                className="input"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label>
              Slug
              <input
                className="input"
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="grid grid-2">
            <label>
              Icon Emoji
              <input
                className="input"
                value={form.icon}
                onChange={e => setForm({ ...form, icon: e.target.value })}
              />
            </label>
            <label>
              Difficulty Level
              <select
                className="input"
                value={form.level}
                onChange={e => setForm({ ...form, level: e.target.value })}
              >
                <option>Beginner</option>
                <option>Beginner to Intermediate</option>
                <option>Intermediate</option>
                <option>Intermediate to Advanced</option>
                <option>Advanced</option>
                <option>All Levels</option>
              </select>
            </label>
          </div>

          <label>
            Short Description (Summary)
            <textarea
              className="input"
              rows={2}
              value={form.shortDescription}
              onChange={e => setForm({ ...form, shortDescription: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </label>

          <label>
            Full Description / Syllabus Overview
            <RichTextEditor
              value={form.description}
              onChange={v => setForm({ ...form, description: v })}
              placeholder="Describe path outcomes, curriculum progression, and target roles..."
              minHeight={200}
            />
          </label>

          <div style={{ display: "flex", gap: 20, margin: "20px 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.published}
                onChange={e => setForm({ ...form, published: e.target.checked })}
              />
              <strong>Published</strong>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={e => setForm({ ...form, featured: e.target.checked })}
              />
              <strong>Featured on Homepage</strong>
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 25 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Learning Path"}
            </button>
            <Link href="/admin/learning-paths" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

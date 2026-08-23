"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";

interface CourseOption {
  id: string;
  title: string;
  durationHours: number;
  level: string;
}

export default function NewLearningPathPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    icon: "🚀",
    level: "Beginner to Intermediate",
    shortDescription: "",
    description: "",
    featured: false,
    published: true,
    selectedCourseIds: [] as string[]
  });

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch("/api/admin/courses");
        if (res.ok) {
          const data = await res.json();
          setCourses(data.courses || []);
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      }
    }
    loadCourses();
  }, []);

  function handleTitleChange(val: string) {
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm(prev => ({ ...prev, title: val, slug: autoSlug }));
  }

  function toggleCourse(cId: string) {
    setForm(prev => {
      const exists = prev.selectedCourseIds.includes(cId);
      return {
        ...prev,
        selectedCourseIds: exists
          ? prev.selectedCourseIds.filter(id => id !== cId)
          : [...prev.selectedCourseIds, cId]
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      return alert("Title and slug are required");
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/learning-paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          icon: form.icon,
          level: form.level,
          shortDescription: form.shortDescription,
          description: form.description,
          featured: form.featured,
          published: form.published,
          courseIds: form.selectedCourseIds
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create learning path");
      }

      router.push(`/admin/learning-paths/${data.learningPath.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating learning path");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      <div className="container" style={{ maxWidth: 860 }}>
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/admin/learning-paths"
            style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4, marginBottom: 8 }}
          >
            ← Back to Learning Paths
          </Link>
          <h1 style={{ margin: "4px 0 0" }}>Create New Learning Path</h1>
          <p className="muted">Define a structured multi-course pathway for learners.</p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 30 }}>
          <div className="grid grid-2">
            <label>
              Path Title
              <input
                className="input"
                placeholder="e.g. Full-Stack AI Developer"
                value={form.title}
                onChange={e => handleTitleChange(e.target.value)}
                required
              />
            </label>
            <label>
              Slug
              <input
                className="input"
                placeholder="e.g. full-stack-ai-developer"
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
                placeholder="e.g. 🤖, ⚡, 🧠, 🚀, 🎓"
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
              placeholder="Brief summary of this learning path..."
              value={form.shortDescription}
              onChange={e => setForm({ ...form, shortDescription: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </label>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", marginBottom: 4 }}>Full Description / Syllabus Overview</div>
            <RichTextEditor
              value={form.description}
              onChange={v => setForm({ ...form, description: v })}
              placeholder="Describe what learners will achieve, milestones, and prerequisites..."
              minHeight={180}
            />
          </div>

          {/* Linked Courses Section */}
          <div style={{ marginTop: 25, padding: "18px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--navy)" }}>Link Courses to this Path</h3>
            <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
              Select initial courses to include in this path sequence (you can reorder and manage sequence in detail after creation):
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {courses.map(c => {
                const checked = form.selectedCourseIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: checked ? "#eaf2ff" : "#fff",
                      border: `1px solid ${checked ? "var(--blue)" : "var(--border)"}`,
                      borderRadius: 8,
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCourse(c.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <strong>{c.title}</strong>
                      <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                        ({c.level} · {c.durationHours} hrs)
                      </span>
                    </div>
                  </label>
                );
              })}

              {!courses.length && <p className="muted" style={{ margin: 0 }}>No courses created yet.</p>}
            </div>
          </div>

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
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Learning Path →"}
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

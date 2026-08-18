"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";

type Instructor = { id: string; name: string; email: string };

export default function CourseEditor({ instructors }: { instructors: Instructor[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    level: "Beginner",
    durationHours: "10",
    price: "0",
    mode: "ONLINE",
    instructorId: instructors[0]?.id || "",
    featured: false,
    published: false
  });

  const update = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Please enter a course title.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        instructorId: form.instructorId || instructors[0]?.id || ""
      };

      const r = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save course");

      router.push(`/admin/courses/${d.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save course");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} style={{ marginTop: 20 }}>
      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontWeight: 600,
            fontSize: 14
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <label>
        Course title *
        <input
          className="input"
          value={form.title}
          onChange={e => update("title", e.target.value)}
          placeholder="e.g. Generative AI & Prompt Engineering Fundamentals"
          required
        />
      </label>

      <label>
        URL Slug (optional)
        <input
          className="input"
          value={form.slug}
          onChange={e => update("slug", e.target.value)}
          placeholder="Auto-generated if left blank (e.g. generative-ai-fundamentals)"
        />
      </label>

      <label>
        Short description
        <RichTextEditor
          value={form.shortDescription}
          onChange={v => update("shortDescription", v)}
          placeholder="Write a concise summary of what learners will gain..."
          minHeight={110}
        />
      </label>

      <label>
        Full description
        <RichTextEditor
          value={form.description}
          onChange={v => update("description", v)}
          placeholder="Write the detailed course overview, prerequisites, and learning goals..."
          minHeight={220}
        />
      </label>

      <div className="grid grid-2">
        <label>
          Level
          <input
            className="input"
            value={form.level}
            onChange={e => update("level", e.target.value)}
            placeholder="e.g. Beginner, Intermediate, All Levels"
            required
          />
        </label>

        <label>
          Duration (hours)
          <input
            className="input"
            type="number"
            min="0"
            value={form.durationHours}
            onChange={e => update("durationHours", e.target.value)}
            required
          />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Price (₹)
          <input
            className="input"
            type="number"
            min="0"
            value={form.price}
            onChange={e => update("price", e.target.value)}
            required
          />
        </label>

        <label>
          Mode
          <select className="input" value={form.mode} onChange={e => update("mode", e.target.value)}>
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="HYBRID">HYBRID</option>
            <option value="SELF_PACED">SELF_PACED</option>
          </select>
        </label>
      </div>

      <label>
        Lead Instructor *
        <select
          className="input"
          value={form.instructorId}
          onChange={e => update("instructorId", e.target.value)}
          required
        >
          {instructors.map(i => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.email})
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.featured}
            onChange={e => update("featured", e.target.checked)}
          />
          Featured course (shown on home page banner)
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={e => update("published", e.target.checked)}
          />
          Publish immediately (make visible in public course directory)
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn btn-primary" disabled={saving} style={{ padding: "12px 24px" }}>
          {saving ? "Saving Course..." : "Create Course"}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push("/admin/courses")}
          style={{ padding: "12px 20px" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}


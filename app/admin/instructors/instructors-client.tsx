"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InstructorItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  bio?: string | null;
  stars?: number;
  taughtCourses: Array<{ id: string; title: string; slug: string; level: string; mode: string }>;
  taughtBatches: Array<{ id: string; name: string; mode: string; schedule: string; capacity: number; status: string }>;
}

interface AdminInstructorsClientProps {
  initialInstructors: InstructorItem[];
}

export default function AdminInstructorsClient({
  initialInstructors
}: AdminInstructorsClientProps) {
  const router = useRouter();
  const [instructors, setInstructors] = useState<InstructorItem[]>(initialInstructors);
  const [showModal, setShowModal] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<InstructorItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    title: "AI Faculty & Mentor",
    bio: "",
    phone: "",
    password: ""
  });

  function openCreateModal() {
    setEditingInstructor(null);
    setForm({
      name: "",
      email: "",
      title: "Senior AI Faculty & Mentor",
      bio: "Industry expert with hands-on production LLM and machine learning systems experience.",
      phone: "",
      password: "Instructor@12345"
    });
    setError("");
    setShowModal(true);
  }

  function openEditModal(inst: InstructorItem) {
    setEditingInstructor(inst);
    setForm({
      name: inst.name,
      email: inst.email,
      title: inst.title || "AI Faculty & Mentor",
      bio: inst.bio || "",
      phone: inst.phone || "",
      password: ""
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (editingInstructor) {
        const res = await fetch(`/api/admin/instructors/${editingInstructor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            title: form.title,
            bio: form.bio,
            phone: form.phone
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update instructor");

        setInstructors(prev =>
          prev.map(i => (i.id === editingInstructor.id ? { ...i, ...data.instructor } : i))
        );
      } else {
        const res = await fetch("/api/admin/instructors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create instructor");

        const fullInst: InstructorItem = {
          ...data.instructor,
          taughtCourses: [],
          taughtBatches: []
        };
        setInstructors(prev => [fullInst, ...prev]);
      }

      setShowModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemote(id: string) {
    if (!confirm("Are you sure you want to demote this instructor to a student role?")) return;

    try {
      const res = await fetch(`/api/admin/instructors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to demote instructor");
      setInstructors(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to demote");
    }
  }

  return (
    <main className="dashboard" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <div className="container">
        {/* Header */}
        <div className="admin-page-head" style={{ marginBottom: 20 }}>
          <div>
            <Link
              href="/admin"
              style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4, marginBottom: 8 }}
            >
              ← Admin Dashboard
            </Link>
            <h1 style={{ margin: "4px 0 0" }}>👨‍🏫 Faculty & Instructors Manager</h1>
            <p className="muted">
              Manage academy professors, research scientists, bio profiles, assigned courses, and active cohort leadership.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link className="btn btn-secondary" href="/admin/batches">
              👥 View Batches →
            </Link>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Add New Instructor
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 15, marginBottom: 25 }}>
          <div className="stat">Total Faculty<strong>{instructors.length}</strong></div>
          <div className="stat">Courses Led<strong>{instructors.reduce((sum, i) => sum + i.taughtCourses.length, 0)}</strong></div>
          <div className="stat">Active Batches Assigned<strong>{instructors.reduce((sum, i) => sum + i.taughtBatches.length, 0)}</strong></div>
        </div>

        {/* Instructors List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {instructors.map(inst => (
            <div
              key={inst.id}
              className="card"
              style={{
                padding: "24px 28px",
                borderRadius: 16,
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #1e3a5f 0%, #0b1f3a 100%)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    {inst.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 20, color: "var(--navy)" }}>{inst.name}</h3>
                      <span className="badge" style={{ background: "#fef3c7", color: "#92400e", fontWeight: 800 }}>
                        ⭐ {inst.stars || 0} XP
                      </span>
                    </div>

                    <div style={{ fontSize: 14, color: "var(--blue)", fontWeight: 700, marginTop: 2 }}>
                      {inst.title || "AI Faculty & Mentor"}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      📧 {inst.email} {inst.phone && `· 📞 ${inst.phone}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => openEditModal(inst)}
                    style={{ padding: "8px 14px", fontSize: 13, background: "#f1f5f9", color: "var(--navy)" }}
                  >
                    ✏️ Edit Profile & Bio
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDemote(inst.id)}
                    style={{ padding: "8px 12px", fontSize: 13 }}
                  >
                    Demote
                  </button>
                </div>
              </div>

              {/* Bio */}
              {inst.bio && (
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, color: "var(--text)" }}>
                  <strong style={{ color: "var(--navy)", display: "block", marginBottom: 2 }}>Professional Bio:</strong>
                  {inst.bio}
                </div>
              )}

              {/* Courses & Batches Row */}
              <div className="grid grid-2" style={{ gap: 14 }}>
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>
                    📚 Taught Courses ({inst.taughtCourses.length})
                  </span>
                  {inst.taughtCourses.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {inst.taughtCourses.map(c => (
                        <Link
                          key={c.id}
                          href={`/courses/${c.slug}`}
                          className="badge"
                          style={{ background: "#e0f2fe", color: "#0369a1", textDecoration: "none" }}
                        >
                          {c.title}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="muted" style={{ fontSize: 12, fontStyle: "italic" }}>No courses assigned</span>
                  )}
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>
                    👥 Active Cohorts ({inst.taughtBatches.length})
                  </span>
                  {inst.taughtBatches.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {inst.taughtBatches.map(b => (
                        <span
                          key={b.id}
                          className="badge"
                          style={{ background: "#f1f5f9", color: "var(--navy)", border: "1px solid #cbd5e1" }}
                        >
                          {b.name} ({b.mode})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="muted" style={{ fontSize: 12, fontStyle: "italic" }}>No active cohorts</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!instructors.length && (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <p className="muted" style={{ margin: "0 0 14px" }}>No instructors found.</p>
              <button className="btn btn-primary" onClick={openCreateModal}>
                + Add First Instructor
              </button>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(11,31,58,0.6)",
              display: "grid",
              placeItems: "center",
              zIndex: 100,
              padding: 20
            }}
          >
            <div
              className="card"
              style={{
                width: "min(560px, 96%)",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "30px",
                borderRadius: 18
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, color: "var(--navy)" }}>
                  {editingInstructor ? "✏️ Edit Instructor Profile" : "➕ Add Faculty Member"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--muted)" }}
                >
                  ✕
                </button>
              </div>

              {error && (
                <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSave}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Full Name</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Dr. Sarah Chen"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Email</label>
                    <input
                      className="input"
                      type="email"
                      required
                      disabled={!!editingInstructor}
                      placeholder="faculty@vectorspaceacademy.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Phone (Optional)</label>
                    <input
                      className="input"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Academic / Professional Title</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Principal ML Research Scientist"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Biography & Research Background</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Brief background, industry experience, research interests..."
                    value={form.bio}
                    onChange={e => setForm({ ...form, bio: e.target.value })}
                  />
                </div>

                {!editingInstructor && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Initial Password</label>
                    <input
                      className="input"
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Saving..." : editingInstructor ? "Update Profile" : "Add Faculty"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

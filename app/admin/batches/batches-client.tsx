"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BatchItem {
  id: string;
  name: string;
  mode: "ONLINE" | "OFFLINE" | "HYBRID" | "SELF_PACED";
  startDate: string;
  endDate?: string | null;
  schedule: string;
  classroom?: string | null;
  meetingLink?: string | null;
  capacity: number;
  status: string;
  courseId: string;
  instructorId?: string | null;
  course: { id: string; title: string; slug: string; level: string; pricePaise: number };
  instructor?: { id: string; name: string; email: string; title?: string | null } | null;
  enrollments: Array<{
    id: string;
    enrolledAt: string;
    user: { id: string; name: string; email: string; phone?: string | null; stars?: number };
  }>;
}

interface AdminBatchesClientProps {
  initialBatches: BatchItem[];
  courses: Array<{ id: string; title: string; level: string; mode: string }>;
  instructors: Array<{ id: string; name: string; email: string; title?: string | null }>;
}

export default function AdminBatchesClient({
  initialBatches,
  courses,
  instructors
}: AdminBatchesClientProps) {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchItem[]>(initialBatches);
  const [filterMode, setFilterMode] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchItem | null>(null);
  const [rosterBatch, setRosterBatch] = useState<BatchItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    courseId: courses[0]?.id || "",
    instructorId: instructors[0]?.id || "",
    mode: "HYBRID",
    startDate: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
    endDate: new Date(Date.now() + 86400000 * 45).toISOString().split("T")[0],
    schedule: "Sat & Sun, 10:00 AM – 1:00 PM IST",
    classroom: "Lab 3B, Vector Space Tech Block",
    meetingLink: "https://meet.google.com/vsa-cohort",
    capacity: 25,
    status: "UPCOMING"
  });

  const totalSeats = batches.reduce((sum, b) => sum + b.capacity, 0);
  const totalEnrolled = batches.reduce((sum, b) => sum + b.enrollments.length, 0);
  const activeCohortsCount = batches.filter(b => b.status === "UPCOMING" || b.status === "ONGOING").length;

  const filteredBatches = batches.filter(b => {
    if (filterMode === "ALL") return true;
    return b.mode === filterMode;
  });

  function openCreateModal() {
    setEditingBatch(null);
    setForm({
      name: "",
      courseId: courses[0]?.id || "",
      instructorId: instructors[0]?.id || "",
      mode: "HYBRID",
      startDate: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
      endDate: new Date(Date.now() + 86400000 * 45).toISOString().split("T")[0],
      schedule: "Sat & Sun, 10:00 AM – 1:00 PM IST",
      classroom: "Lab 3B, Vector Space Tech Block",
      meetingLink: "https://meet.google.com/vsa-cohort",
      capacity: 25,
      status: "UPCOMING"
    });
    setError("");
    setShowModal(true);
  }

  function openEditModal(batch: BatchItem) {
    setEditingBatch(batch);
    setForm({
      name: batch.name,
      courseId: batch.courseId,
      instructorId: batch.instructorId || "",
      mode: batch.mode,
      startDate: batch.startDate ? new Date(batch.startDate).toISOString().split("T")[0] : "",
      endDate: batch.endDate ? new Date(batch.endDate).toISOString().split("T")[0] : "",
      schedule: batch.schedule,
      classroom: batch.classroom || "",
      meetingLink: batch.meetingLink || "",
      capacity: batch.capacity,
      status: batch.status
    });
    setError("");
    setShowModal(true);
  }

  async function handleSaveBatch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (editingBatch) {
        const res = await fetch(`/api/admin/batches/${editingBatch.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update batch");

        setBatches(prev =>
          prev.map(b => (b.id === editingBatch.id ? { ...b, ...data.batch } : b))
        );
      } else {
        const res = await fetch("/api/admin/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create batch");

        const fullBatch: BatchItem = {
          ...data.batch,
          enrollments: []
        };
        setBatches(prev => [fullBatch, ...prev]);
      }

      setShowModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteBatch(id: string) {
    if (!confirm("Are you sure you want to delete this batch?")) return;

    try {
      const res = await fetch(`/api/admin/batches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete batch");
      setBatches(prev => prev.filter(b => b.id !== id));
      if (rosterBatch?.id === id) setRosterBatch(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete");
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
            <h1 style={{ margin: "4px 0 0" }}>👥 Batch & Cohort Management</h1>
            <p className="muted">
              Manage time-bound batches, hybrid/offline classroom sessions, instructor assignments, and limited seat rosters.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link className="btn btn-secondary" href="/admin/instructors">
              👨‍🏫 Manage Faculty →
            </Link>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Create New Batch
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="stats" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 15, marginBottom: 25 }}>
          <div className="stat">Total Batches<strong>{batches.length}</strong></div>
          <div className="stat">Active / Upcoming<strong>{activeCohortsCount}</strong></div>
          <div className="stat">Seats Filled<strong>{totalEnrolled} / {totalSeats}</strong></div>
          <div className="stat">Seat Fill Rate<strong>{totalSeats > 0 ? `${Math.round((totalEnrolled / totalSeats) * 100)}%` : "0%"}</strong></div>
        </div>

        {/* Mode Filter Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["ALL", "HYBRID", "OFFLINE", "ONLINE"].map(m => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className="btn"
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  background: filterMode === m ? "var(--navy)" : "#fff",
                  color: filterMode === m ? "#fff" : "var(--navy)",
                  border: "1px solid var(--border)"
                }}
              >
                {m === "ALL" ? "All Batches" : m}
              </button>
            ))}
          </div>

          <span className="muted" style={{ fontSize: 13 }}>
            Showing <strong>{filteredBatches.length}</strong> {filteredBatches.length === 1 ? "cohort" : "cohorts"}
          </span>
        </div>

        {/* Batches Grid / List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredBatches.map(b => {
            const filled = b.enrollments.length;
            const remaining = Math.max(0, b.capacity - filled);
            const fillPercent = Math.min(100, Math.round((filled / b.capacity) * 100));

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: "22px 26px",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        className="badge"
                        style={{
                          background: b.mode === "HYBRID" ? "#e0f2fe" : b.mode === "OFFLINE" ? "#fef3c7" : "#dcfce7",
                          color: b.mode === "HYBRID" ? "#0369a1" : b.mode === "OFFLINE" ? "#92400e" : "#15803d",
                          fontWeight: 800
                        }}
                      >
                        {b.mode === "HYBRID" ? "🌐 Hybrid (Classroom + Online)" : b.mode === "OFFLINE" ? "🏛️ In-Person Classroom" : "💻 Live Online"}
                      </span>

                      <span
                        className={`status-pill ${b.status === "UPCOMING" ? "pill-active" : b.status === "ONGOING" ? "pill-completed" : "pill-archived"}`}
                        style={{ fontSize: 11 }}
                      >
                        {b.status}
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: 19, color: "var(--navy)" }}>{b.name}</h3>
                    <div style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, marginTop: 4 }}>
                      📚 {b.course.title}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setRosterBatch(b)}
                      style={{ padding: "8px 14px", fontSize: 13 }}
                    >
                      👥 View Roster ({filled})
                    </button>
                    <button
                      className="btn"
                      onClick={() => openEditModal(b)}
                      style={{ padding: "8px 12px", fontSize: 13, background: "#f1f5f9", color: "var(--navy)" }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteBatch(b.id)}
                      style={{ padding: "8px 12px", fontSize: 13 }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Info Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 14,
                    padding: "14px 18px",
                    background: "#f8fafc",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 13
                  }}
                >
                  <div>
                    <span className="muted" style={{ display: "block", fontSize: 11, textTransform: "uppercase" }}>
                      📅 Schedule & Timings
                    </span>
                    <strong style={{ color: "var(--navy)" }}>{b.schedule}</strong>
                  </div>

                  <div>
                    <span className="muted" style={{ display: "block", fontSize: 11, textTransform: "uppercase" }}>
                      👨‍🏫 Assigned Instructor
                    </span>
                    <strong style={{ color: "var(--navy)" }}>
                      {b.instructor?.name || "Unassigned"}
                    </strong>
                    {b.instructor?.title && (
                      <span className="muted" style={{ display: "block", fontSize: 11 }}>{b.instructor.title}</span>
                    )}
                  </div>

                  <div>
                    <span className="muted" style={{ display: "block", fontSize: 11, textTransform: "uppercase" }}>
                      📍 Location / Meeting Link
                    </span>
                    {b.classroom && <div style={{ color: "var(--navy)" }}>🏛️ {b.classroom}</div>}
                    {b.meetingLink && (
                      <a href={b.meetingLink} target="_blank" rel="noreferrer" style={{ color: "var(--blue)", textDecoration: "underline", fontSize: 12 }}>
                        🔗 Live Class Link
                      </a>
                    )}
                    {!b.classroom && !b.meetingLink && <span className="muted">To be shared before kickoff</span>}
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>Seat Capacity</span>
                      <strong style={{ color: remaining <= 5 && remaining > 0 ? "var(--orange)" : "var(--navy)" }}>
                        {filled} / {b.capacity} Seats ({remaining} left)
                      </strong>
                    </div>
                    <div style={{ width: "100%", height: 7, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${fillPercent}%`,
                          height: "100%",
                          background: fillPercent >= 100 ? "var(--error)" : fillPercent >= 80 ? "var(--orange)" : "var(--blue)",
                          borderRadius: 999
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!filteredBatches.length && (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <p className="muted" style={{ margin: "0 0 14px" }}>No batches found in this category.</p>
              <button className="btn btn-primary" onClick={openCreateModal}>
                + Create First Batch
              </button>
            </div>
          )}
        </div>

        {/* Student Roster Modal / Drawer */}
        {rosterBatch && (
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
                width: "min(680px, 96%)",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "26px",
                borderRadius: 18
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span className="badge" style={{ background: "#e0f2fe", color: "#0369a1", marginBottom: 6 }}>
                    STUDENT ROSTER ({rosterBatch.enrollments.length} / {rosterBatch.capacity} SEATS)
                  </span>
                  <h2 style={{ margin: "4px 0 0", color: "var(--navy)", fontSize: 20 }}>{rosterBatch.name}</h2>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>{rosterBatch.course.title}</p>
                </div>
                <button
                  onClick={() => setRosterBatch(null)}
                  style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--muted)" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 15 }}>
                {rosterBatch.enrollments.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                        <th style={{ padding: "10px 14px" }}>STUDENT</th>
                        <th style={{ padding: "10px 14px" }}>STARS</th>
                        <th style={{ padding: "10px 14px" }}>ENROLLED ON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterBatch.enrollments.map(e => (
                        <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 14px" }}>
                            <strong style={{ color: "var(--navy)" }}>{e.user.name}</strong>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.user.email}</div>
                            {e.user.phone && <div style={{ fontSize: 10, color: "var(--muted)" }}>📞 {e.user.phone}</div>}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ color: "#92400e", fontWeight: 700 }}>⭐ {e.user.stars || 0}</span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "var(--muted)" }}>
                            {new Date(e.enrolledAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted" style={{ textAlign: "center", padding: 30 }}>
                    No students have enrolled in this batch yet.
                  </p>
                )}
              </div>

              <div style={{ marginTop: 20, textAlign: "right" }}>
                <button className="btn btn-secondary" onClick={() => setRosterBatch(null)}>
                  Close Roster
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Batch Modal */}
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
                width: "min(640px, 96%)",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "30px",
                borderRadius: 18
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, color: "var(--navy)" }}>
                  {editingBatch ? "✏️ Edit Batch Cohort" : "➕ Create New Batch Cohort"}
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

              <form onSubmit={handleSaveBatch}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Batch Name</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Weekend Hybrid AI Cohort 02"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Course</label>
                    <select
                      className="input"
                      value={form.courseId}
                      onChange={e => setForm({ ...form, courseId: e.target.value })}
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Assigned Instructor</label>
                    <select
                      className="input"
                      value={form.instructorId}
                      onChange={e => setForm({ ...form, instructorId: e.target.value })}
                    >
                      <option value="">-- Select Instructor --</option>
                      {instructors.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.title || "Faculty"})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Mode</label>
                    <select
                      className="input"
                      value={form.mode}
                      onChange={e => setForm({ ...form, mode: e.target.value })}
                    >
                      <option value="HYBRID">🌐 Hybrid (Classroom + Online)</option>
                      <option value="OFFLINE">🏛️ Offline (In-Person Classroom)</option>
                      <option value="ONLINE">💻 Online (Live Classes)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Max Seat Capacity</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={500}
                      required
                      value={form.capacity}
                      onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Start Date</label>
                    <input
                      className="input"
                      type="date"
                      required
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>End Date (Optional)</label>
                    <input
                      className="input"
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Schedule & Timings</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Sat & Sun, 10:00 AM – 1:00 PM IST"
                    value={form.schedule}
                    onChange={e => setForm({ ...form, schedule: e.target.value })}
                  />
                </div>

                <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Classroom Location (Offline/Hybrid)</label>
                    <input
                      className="input"
                      placeholder="e.g. Lab 3B, Tech Block"
                      value={form.classroom}
                      onChange={e => setForm({ ...form, classroom: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Live Meeting Link (Online/Hybrid)</label>
                    <input
                      className="input"
                      placeholder="e.g. https://meet.google.com/..."
                      value={form.meetingLink}
                      onChange={e => setForm({ ...form, meetingLink: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="ONGOING">ONGOING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Saving..." : editingBatch ? "Update Batch" : "Create Batch"}
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

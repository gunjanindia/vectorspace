"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface CourseOption {
  id: string;
  title: string;
  pricePaise: number;
}

interface PromoCodeItem {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  maxDiscountPaise: number | null;
  minOrderPaise: number;
  validFrom: string;
  validUntil: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  applicableCourseId: string | null;
  course?: { id: string; title: string; slug: string } | null;
  _count?: { orders: number };
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FLAT",
    discountValue: 20,
    maxDiscountRs: "",
    minOrderRs: "0",
    applicableCourseId: "",
    usageLimit: "",
    validUntil: "",
    active: true
  });

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/promos");
      if (res.ok) {
        const data = await res.json();
        setPromos(data.promoCodes || []);
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error("Failed to load promo codes:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function togglePromoStatus(id: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/promos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive })
      });

      if (res.ok) {
        setPromos(prev =>
          prev.map(p => (p.id === id ? { ...p, active: !currentActive } : p))
        );
      }
    } catch (err) {
      alert("Failed to toggle status");
    }
  }

  async function deletePromo(id: string, code: string) {
    if (!confirm(`Are you sure you want to delete promo code "${code}"?`)) return;

    try {
      const res = await fetch(`/api/admin/promos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPromos(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Failed to delete promo code");
      }
    } catch (err) {
      alert("Error deleting promo code");
    }
  }

  async function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) return alert("Promo code is required");

    try {
      setSubmitting(true);

      const discountValue =
        form.discountType === "PERCENTAGE"
          ? Number(form.discountValue)
          : Number(form.discountValue) * 100; // convert ₹ to paise

      const maxDiscountPaise = form.maxDiscountRs
        ? Number(form.maxDiscountRs) * 100
        : null;

      const minOrderPaise = form.minOrderRs
        ? Number(form.minOrderRs) * 100
        : 0;

      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          description: form.description,
          discountType: form.discountType,
          discountValue,
          maxDiscountPaise,
          minOrderPaise,
          applicableCourseId: form.applicableCourseId || null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          validUntil: form.validUntil ? form.validUntil : null,
          active: form.active
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create promo code");

      alert(`Promo code "${data.promoCode.code}" created successfully!`);
      setShowCreateModal(false);
      setForm({
        code: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: 20,
        maxDiscountRs: "",
        minOrderRs: "0",
        applicableCourseId: "",
        usageLimit: "",
        validUntil: "",
        active: true
      });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating promo code");
    } finally {
      setSubmitting(false);
    }
  }

  const activeCount = promos.filter(p => p.active).length;
  const totalRedemptions = promos.reduce((sum, p) => sum + (p.usedCount || 0), 0);

  return (
    <main className="dashboard">
      <div className="container">
        {/* Header */}
        <div className="admin-page-head">
          <div>
            <Link
              href="/admin"
              style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4, marginBottom: 8 }}
            >
              ← Admin Dashboard
            </Link>
            <h1 style={{ margin: "4px 0 0" }}>🏷️ Promo & Offer Codes</h1>
            <p className="muted">Configure discount vouchers, course-specific offers, and flash sale coupons.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ background: "var(--orange)" }}
          >
            + Create New Promo Code
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 20 }}>
          <div className="stat">Total Promo Codes<strong>{promos.length}</strong></div>
          <div className="stat">Active Offers<strong>{activeCount}</strong></div>
          <div className="stat">Total Redemptions<strong>{totalRedemptions}</strong></div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(11,31,58,0.6)",
              display: "grid",
              placeItems: "center",
              zIndex: 9999,
              padding: 20
            }}
          >
            <div
              className="card"
              style={{
                width: "100%",
                maxWidth: 620,
                maxHeight: "90vh",
                overflowY: "auto",
                padding: 30,
                background: "#fff",
                borderRadius: 16
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, color: "var(--navy)" }}>Create New Promo Code</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--muted)" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePromo}>
                <div className="grid grid-2">
                  <label>
                    Promo Code (Uppercase)
                    <input
                      className="input"
                      placeholder="e.g. AI50, SPECIAL20"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </label>
                  <label>
                    Discount Type
                    <select
                      className="input"
                      value={form.discountType}
                      onChange={e => setForm({ ...form, discountType: e.target.value as any })}
                    >
                      <option value="PERCENTAGE">Percentage (%) Off</option>
                      <option value="FLAT">Flat Amount (₹) Off</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-2">
                  <label>
                    {form.discountType === "PERCENTAGE" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
                    <input
                      type="number"
                      className="input"
                      placeholder={form.discountType === "PERCENTAGE" ? "e.g. 50" : "e.g. 1000"}
                      value={form.discountValue}
                      onChange={e => setForm({ ...form, discountValue: Number(e.target.value) })}
                      min={1}
                      max={form.discountType === "PERCENTAGE" ? 100 : 1000000}
                      required
                    />
                  </label>

                  {form.discountType === "PERCENTAGE" ? (
                    <label>
                      Max Discount Cap (₹) (Optional)
                      <input
                        type="number"
                        className="input"
                        placeholder="e.g. 5000 (leave blank for no cap)"
                        value={form.maxDiscountRs}
                        onChange={e => setForm({ ...form, maxDiscountRs: e.target.value })}
                      />
                    </label>
                  ) : (
                    <label>
                      Min Order Value (₹)
                      <input
                        type="number"
                        className="input"
                        placeholder="e.g. 2000"
                        value={form.minOrderRs}
                        onChange={e => setForm({ ...form, minOrderRs: e.target.value })}
                      />
                    </label>
                  )}
                </div>

                <label>
                  Target Course Scope
                  <select
                    className="input"
                    value={form.applicableCourseId}
                    onChange={e => setForm({ ...form, applicableCourseId: e.target.value })}
                  >
                    <option value="">-- Applicable to All Courses (Global) --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} (₹{(c.pricePaise / 100).toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Description / Badge Label
                  <input
                    className="input"
                    placeholder="e.g. 50% Special Launch Discount on All AI Courses"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </label>

                <div className="grid grid-2">
                  <label>
                    Usage Limit (Max Total Redemptions)
                    <input
                      type="number"
                      className="input"
                      placeholder="e.g. 500 (blank = unlimited)"
                      value={form.usageLimit}
                      onChange={e => setForm({ ...form, usageLimit: e.target.value })}
                    />
                  </label>
                  <label>
                    Expiry Date (Optional)
                    <input
                      type="date"
                      className="input"
                      value={form.validUntil}
                      onChange={e => setForm({ ...form, validUntil: e.target.value })}
                    />
                  </label>
                </div>

                <div style={{ margin: "16px 0" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={e => setForm({ ...form, active: e.target.checked })}
                    />
                    <strong>Enable / Active Immediately</strong>
                  </label>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 25 }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving..." : "Create Promo Code"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Promo Codes Table */}
        <div className="card" style={{ marginTop: 25, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>PROMO CODE</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>DISCOUNT VALUE</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>APPLICABLE COURSE</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>USAGE STATS</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)" }}>STATUS</th>
                <th style={{ padding: "14px 18px", color: "var(--navy)", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => {
                const discountText =
                  p.discountType === "PERCENTAGE"
                    ? `${p.discountValue}% OFF` + (p.maxDiscountPaise ? ` (up to ₹${p.maxDiscountPaise / 100})` : "")
                    : `₹${(p.discountValue / 100).toLocaleString("en-IN")} FLAT`;

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 18px" }}>
                      <strong style={{ fontFamily: "monospace", fontSize: 16, color: "var(--blue)" }}>
                        {p.code}
                      </strong>
                      {p.description && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className="badge" style={{ background: "#eef2ff", color: "var(--navy)", fontWeight: 700 }}>
                        {discountText}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      {p.course ? (
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>{p.course.title}</span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontStyle: "italic" }}>All Academy Courses (Global)</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <strong>{p.usedCount}</strong>
                      <span className="muted"> / {p.usageLimit ?? "∞"} used</span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <button
                        onClick={() => togglePromoStatus(p.id, p.active)}
                        className={`status-pill ${p.active ? "pill-completed" : "pill-active"}`}
                        style={{ border: "none", cursor: "pointer", padding: "4px 12px" }}
                        title="Click to toggle status"
                      >
                        {p.active ? "Active ✓" : "Disabled ✕"}
                      </button>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <button
                        onClick={() => deletePromo(p.id, p.code)}
                        className="btn btn-danger"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!promos.length && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                    No promo codes created yet. Click "+ Create New Promo Code" to add your first offer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

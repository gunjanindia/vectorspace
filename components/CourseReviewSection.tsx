"use client";
import React, { useState } from "react";
import CourseRatingDisplay from "./CourseRatingDisplay";
import { RatingStats } from "@/lib/ratings";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string | Date;
  user: {
    id: string;
    name: string;
  };
}

interface CourseReviewSectionProps {
  courseId: string;
  courseTitle: string;
  initialReviews: ReviewItem[];
  initialStats: RatingStats;
  currentUserId?: string | null;
  isEnrolled?: boolean;
  userExistingReview?: { rating: number; comment: string | null } | null;
}

export default function CourseReviewSection({
  courseId,
  courseTitle,
  initialReviews,
  initialStats,
  currentUserId,
  isEnrolled = false,
  userExistingReview
}: CourseReviewSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [stats, setStats] = useState<RatingStats>(initialStats);
  const [userRating, setUserRating] = useState<number>(userExistingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(userExistingReview?.comment || "");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRating || userRating < 1 || userRating > 5) {
      setFeedbackMsg({ type: "error", text: "Please select a star rating between 1 and 5." });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: userRating, comment })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit rating");
      }

      setFeedbackMsg({ type: "success", text: data.message || "Your rating was submitted successfully!" });
      if (data.stats) setStats(data.stats);

      // Refresh reviews list
      const fetchRes = await fetch(`/api/courses/${courseId}/review`);
      if (fetchRes.ok) {
        const freshData = await fetchRes.json();
        if (freshData.reviews) setReviews(freshData.reviews);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "An error occurred while saving your review." });
    } finally {
      setSubmitting(false);
    }
  };

  const activeStarCount = hoverRating || userRating;

  return (
    <section id="course-reviews" style={{ marginTop: 50, scrollMarginTop: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 15, marginBottom: 25 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="badge" style={{ background: "#fef3c7", color: "#b45309", fontWeight: 700 }}>
              ★ STUDENT REVIEWS & RATINGS
            </span>
          </div>
          <h2 style={{ margin: "4px 0 0", fontSize: 26, color: "var(--navy)" }}>
            What Enrolled Students Are Saying
          </h2>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Ratings and feedback submitted by verified enrolled learners in this course.
          </p>
        </div>

        {isEnrolled && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-secondary"
            style={{ padding: "8px 18px", fontSize: 14 }}
          >
            {userExistingReview ? "✏️ Edit Your Rating" : "⭐ Rate This Course"}
          </button>
        )}
      </div>

      {/* Review Submission Form (For Enrolled Students) */}
      {(showForm || (isEnrolled && !userExistingReview)) && (
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 14,
            background: "linear-gradient(135deg, #fdfbf7 0%, #f8fafc 100%)",
            border: "1.5px solid #fde68a",
            marginBottom: 30
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <strong style={{ fontSize: 17, color: "var(--navy)" }}>
              {userExistingReview ? "Update Your Course Rating" : "Share Your Course Experience"}
            </strong>
            {userExistingReview && (
              <span className="badge" style={{ background: "#ecfdf5", color: "#065f46" }}>
                ✓ Enrolled Student Review
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>
                Your Star Rating:
              </label>
              <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(starVal => (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setUserRating(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 32,
                      lineHeight: 1,
                      padding: 2,
                      color: starVal <= activeStarCount ? "#f59e0b" : "#cbd5e1",
                      transition: "transform 0.15s ease, color 0.15s ease"
                    }}
                    title={`${starVal} star${starVal > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
                <span style={{ marginLeft: 10, fontSize: 15, fontWeight: 700, color: "var(--navy)" }}>
                  {activeStarCount > 0 ? (
                    `${activeStarCount} / 5 Stars ${
                      activeStarCount === 5
                        ? "⭐⭐⭐⭐⭐ (Outstanding!)"
                        : activeStarCount === 4
                        ? "⭐⭐⭐⭐ (Very Good)"
                        : activeStarCount === 3
                        ? "⭐⭐⭐ (Good)"
                        : activeStarCount === 2
                        ? "⭐⭐ (Fair)"
                        : "⭐ (Needs Improvement)"
                    }`
                  ) : (
                    <span style={{ color: "var(--muted)", fontWeight: 400 }}>Click stars to select</span>
                  )}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                Written Review / Feedback (Optional):
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="What did you like about the lessons, projects, or quizzes? How has this course helped your AI development journey?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 14,
                  fontFamily: "inherit"
                }}
              />
            </div>

            {feedbackMsg && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                  background: feedbackMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
                  color: feedbackMsg.type === "success" ? "#166534" : "#991b1b",
                  border: `1px solid ${feedbackMsg.type === "success" ? "#bbf7d0" : "#fecaca"}`
                }}
              >
                {feedbackMsg.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                type="submit"
                disabled={submitting || userRating === 0}
                className="btn btn-primary"
                style={{ padding: "8px 22px", fontSize: 14 }}
              >
                {submitting ? "Submitting..." : userExistingReview ? "Update Review" : "Post Review"}
              </button>
              {showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary"
                  style={{ padding: "8px 16px", fontSize: 14 }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Ratings Overview Grid */}
      <div
        className="card"
        style={{
          padding: "26px 30px",
          borderRadius: 14,
          marginBottom: 30,
          background: "#fff"
        }}
      >
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center" }}>
          {/* Main Average Score Box */}
          <div style={{ textAlign: "center", minWidth: 160, paddingRight: 20, borderRight: "1px solid var(--border)" }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
            </div>
            <div style={{ margin: "8px 0" }}>
              <CourseRatingDisplay stats={stats} showCount={false} size="lg" />
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
              Course Average Rating
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Based on {stats.ratingCount} {stats.ratingCount === 1 ? "student rating" : "student ratings"}
            </div>
          </div>

          {/* Rating Distribution Bars */}
          <div style={{ flex: 1, minWidth: 260 }}>
            {[5, 4, 3, 2, 1].map(starsVal => {
              const count = stats.distribution[starsVal as 1 | 2 | 3 | 4 | 5] || 0;
              const percentage = stats.ratingCount > 0 ? Math.round((count / stats.ratingCount) * 100) : 0;

              return (
                <div
                  key={starsVal}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 13,
                    margin: "4px 0"
                  }}
                >
                  <span style={{ width: 65, color: "var(--navy)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <span>{starsVal}</span>
                    <span style={{ color: "#f59e0b" }}>★</span>
                  </span>

                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: "#f1f5f9",
                      borderRadius: 999,
                      overflow: "hidden",
                      position: "relative"
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${percentage}%`,
                        background: "#f59e0b",
                        borderRadius: 999,
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>

                  <span style={{ width: 45, textAlign: "right", color: "var(--muted)", fontSize: 12 }}>
                    {percentage}%
                  </span>
                  <span style={{ width: 30, textAlign: "right", color: "#94a3b8", fontSize: 11 }}>
                    ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Individual Student Reviews List */}
      <div>
        <h3 style={{ fontSize: 18, color: "var(--navy)", marginBottom: 15 }}>
          Student Feedback ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 30,
              textAlign: "center",
              color: "var(--muted)",
              borderRadius: 12
            }}
          >
            <p style={{ margin: 0, fontSize: 15 }}>No reviews written yet for this course.</p>
            {isEnrolled ? (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--blue)" }}>
                Be the first enrolled student to share your thoughts above!
              </p>
            ) : (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                Enroll in this course to learn and submit your review.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {reviews.map(rev => {
              const revDate = new Date(rev.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });

              return (
                <div
                  key={rev.id}
                  className="card"
                  style={{
                    padding: "18px 22px",
                    borderRadius: 12,
                    background: "#fff"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "#e0f2fe",
                            color: "var(--blue)",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13
                          }}
                        >
                          {rev.user.name ? rev.user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <strong style={{ fontSize: 14, color: "var(--navy)", display: "block" }}>
                            {rev.user.name}
                          </strong>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>
                            Verified Enrolled Student
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 2, color: "#f59e0b", fontSize: 15 }}>
                        {[1, 2, 3, 4, 5].map(st => (
                          <span key={st} style={{ color: st <= rev.rating ? "#f59e0b" : "#cbd5e1" }}>
                            ★
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{revDate}</div>
                    </div>
                  </div>

                  {rev.comment && (
                    <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

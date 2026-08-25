import React from "react";
import { calculateCourseRating, RatingStats } from "@/lib/ratings";

interface CourseRatingDisplayProps {
  reviews?: { rating: number }[] | null;
  stats?: RatingStats;
  showCount?: boolean;
  countLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function CourseRatingDisplay({
  reviews,
  stats: initialStats,
  showCount = true,
  countLabel = "ratings",
  size = "md",
  className = ""
}: CourseRatingDisplayProps) {
  const stats = initialStats || calculateCourseRating(reviews);
  const { averageRating, ratingCount, roundedRating } = stats;

  const starSizes = {
    sm: { star: "13px", text: "12px", count: "11px", gap: "3px" },
    md: { star: "15px", text: "14px", count: "12px", gap: "4px" },
    lg: { star: "18px", text: "16px", count: "13px", gap: "6px" }
  };

  const currentSize = starSizes[size] || starSizes.md;

  if (ratingCount === 0) {
    return (
      <div
        className={`course-rating-display empty ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: currentSize.gap,
          fontSize: currentSize.text,
          color: "var(--muted)",
          lineHeight: 1
        }}
      >
        <span style={{ color: "#f59e0b", fontSize: currentSize.star }}>★</span>
        <span style={{ fontWeight: 600, color: "var(--navy)" }}>New</span>
        {showCount && <span style={{ fontSize: currentSize.count, color: "#94a3b8" }}>(No ratings yet)</span>}
      </div>
    );
  }

  // Generate 5 stars
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(roundedRating)) {
      // Full star
      stars.push(
        <span key={i} style={{ color: "#f59e0b" }}>
          ★
        </span>
      );
    } else if (i === Math.ceil(roundedRating) && roundedRating % 1 !== 0) {
      // Half star representation using styled relative container
      stars.push(
        <span
          key={i}
          style={{
            position: "relative",
            display: "inline-block",
            color: "#cbd5e1"
          }}
        >
          <span
            style={{
              position: "absolute",
              overflow: "hidden",
              width: "50%",
              color: "#f59e0b",
              left: 0,
              top: 0
            }}
          >
            ★
          </span>
          ★
        </span>
      );
    } else {
      // Empty star
      stars.push(
        <span key={i} style={{ color: "#cbd5e1" }}>
          ★
        </span>
      );
    }
  }

  return (
    <div
      className={`course-rating-display ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: currentSize.gap,
        fontSize: currentSize.text,
        lineHeight: 1,
        userSelect: "none"
      }}
      title={`Average rating: ${averageRating.toFixed(1)} out of 5 (${ratingCount} enrolled student ratings)`}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "1px",
          fontSize: currentSize.star
        }}
      >
        {stars}
      </span>
      <span
        style={{
          fontWeight: 700,
          color: "var(--navy)",
          marginLeft: "2px"
        }}
      >
        {averageRating.toFixed(1)}
      </span>
      {showCount && (
        <span
          style={{
            fontSize: currentSize.count,
            color: "var(--muted)",
            marginLeft: "2px"
          }}
        >
          ({ratingCount} {countLabel || (ratingCount === 1 ? "rating" : "ratings")})
        </span>
      )}
    </div>
  );
}

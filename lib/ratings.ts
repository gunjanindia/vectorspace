export interface RatingStats {
  averageRating: number;
  ratingCount: number;
  roundedRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export function calculateCourseRating(reviews?: { rating: number }[] | null): RatingStats {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 0,
      ratingCount: 0,
      roundedRating: 0,
      distribution
    };
  }

  let sum = 0;
  for (const r of reviews) {
    const val = Math.min(5, Math.max(1, Math.round(r.rating || 0)));
    sum += val;
    if (val >= 1 && val <= 5) {
      distribution[val as 1 | 2 | 3 | 4 | 5] = (distribution[val as 1 | 2 | 3 | 4 | 5] || 0) + 1;
    }
  }

  const average = sum / reviews.length;
  // Round to 1 decimal place (e.g. 4.8)
  const averageRating = Math.round(average * 10) / 10;
  // Nearest 0.5 for star display
  const roundedRating = Math.round(average * 2) / 2;

  return {
    averageRating,
    ratingCount: reviews.length,
    roundedRating,
    distribution
  };
}

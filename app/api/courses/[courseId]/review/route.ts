import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateCourseRating } from "@/lib/ratings";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const reviews = await db.courseReview.findMany({
      where: { courseId },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const stats = calculateCourseRating(reviews);

    return NextResponse.json({
      reviews,
      stats,
      ok: true
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Failed to fetch course reviews" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to submit a rating." }, { status: 401 });
  }

  const { courseId } = await params;

  // Verify that the user is enrolled in this course
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId
      }
    }
  });

  if (!enrollment && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only enrolled students can submit a rating for this course." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const ratingNum = parseInt(body.rating, 10);
    const comment = typeof body.comment === "string" ? body.comment.trim() : null;

    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: "Rating must be a whole number between 1 and 5 stars." },
        { status: 400 }
      );
    }

    const review = await db.courseReview.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      },
      create: {
        userId: user.id,
        courseId,
        rating: ratingNum,
        comment
      },
      update: {
        rating: ratingNum,
        comment
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    // Recompute stats
    const allReviews = await db.courseReview.findMany({
      where: { courseId },
      select: { rating: true }
    });

    const stats = calculateCourseRating(allReviews);

    return NextResponse.json({
      ok: true,
      review,
      stats,
      message: "Thank you for your rating!"
    });
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json(
      { error: "Failed to submit rating. Please try again." },
      { status: 500 }
    );
  }
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import CheckoutClient from "./checkout-client";
import { sanitizeRichText } from "@/lib/richText";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Checkout({ searchParams }: { searchParams: Promise<{ course?: string; promo?: string; batch?: string }> }) {
  const { course: courseId, promo: defaultPromo, batch: defaultBatch } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!courseId) redirect("/courses");

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { name: true } },
      modules: { select: { id: true, lessons: { select: { id: true } } } },
      batches: {
        where: { status: { in: ["UPCOMING", "ONGOING"] } },
        orderBy: { startDate: "asc" },
        include: {
          instructor: { select: { name: true, title: true } },
          _count: { select: { enrollments: true } }
        }
      }
    }
  });

  if (!course || !course.published) redirect("/courses");

  // Check if student is already enrolled
  const existingEnrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } }
  });

  if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
    redirect(`/learn/${course.slug}`);
  }

  // Fetch available promo offers for display suggestions
  const suggestedPromos = await db.promoCode.findMany({
    where: {
      active: true,
      OR: [
        { applicableCourseId: null },
        { applicableCourseId: course.id }
      ]
    },
    take: 3,
    orderBy: { discountValue: "desc" }
  });

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <main className="section" style={{ paddingTop: 30, minHeight: "85vh" }}>
      <div className="container" style={{ maxWidth: 960 }}>
        <div style={{ marginBottom: 20 }}>
          <Link
            href={`/courses/${course.slug}`}
            style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", gap: 4 }}
          >
            ← Back to Course Details
          </Link>
        </div>

        <div className="grid grid-2" style={{ gap: 35, alignItems: "flex-start" }}>
          {/* Left Column: Order Summary & Course Card */}
          <div className="card" style={{ padding: 28, borderRadius: 16 }}>
            <span className="badge" style={{ marginBottom: 12 }}>ENROLLMENT SUMMARY</span>
            <h2 style={{ margin: "4px 0 10px", fontSize: 24, color: "var(--navy)" }}>{course.title}</h2>

            <div
              className="muted rich-view short-description"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(course.shortDescription) }}
              style={{ fontSize: 14, marginBottom: 16 }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "var(--muted)", margin: "16px 0", padding: "14px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              <span>Level: <strong>{course.level}</strong></span>
              <span>·</span>
              <span>Duration: <strong>{course.durationHours} hrs</strong></span>
              <span>·</span>
              <span>Curriculum: <strong>{totalLessons} lessons</strong></span>
            </div>

            <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: 12, border: "1px solid #edf2f7" }}>
              <strong style={{ fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 8 }}>
                ✨ Enrollment Includes:
              </strong>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
                <li>Full interactive lesson player with quizzes and code tasks</li>
                <li>Earn +10 Gamification Stars on enrollment + quiz bounties</li>
                <li>Ask for hints and unlimited retries for mastery</li>
                <li>Official Academy Certificate of Completion</li>
              </ul>
            </div>

            {/* Suggested Available Offers */}
            {suggestedPromos.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <strong style={{ fontSize: 12, color: "var(--navy)", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                  Available Offers for this Course:
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {suggestedPromos.map(sp => (
                    <div
                      key={sp.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#fffbeb",
                        border: "1px dashed #f59e0b",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 12
                      }}
                    >
                      <div>
                        <strong style={{ color: "#b45309", fontFamily: "monospace", fontSize: 13 }}>🏷️ {sp.code}</strong>
                        <span style={{ marginLeft: 6, color: "#92400e" }}>
                          ({sp.discountType === "PERCENTAGE" ? `${sp.discountValue}% OFF` : `₹${(sp.discountValue / 100).toLocaleString("en-IN")} FLAT`})
                        </span>
                      </div>
                      <span style={{ color: "#78350f", fontSize: 11 }}>{sp.description || "Limited offer"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Checkout & Razorpay Payment */}
          <div className="card" style={{ padding: 28, borderRadius: 16, border: "2px solid var(--blue)", boxShadow: "0 10px 30px rgba(37,99,235,0.08)" }}>
            <CheckoutClient
              courseId={course.id}
              courseTitle={course.title}
              coursePricePaise={course.pricePaise}
              defaultPromo={defaultPromo || ""}
              defaultBatchId={defaultBatch || ""}
              batches={JSON.parse(JSON.stringify(course.batches))}
              userName={user.name}
              userEmail={user.email}
              userPhone={user.phone || ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

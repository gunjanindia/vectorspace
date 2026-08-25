import Link from "next/link";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";
import CourseRatingDisplay from "@/components/CourseRatingDisplay";

export const dynamic = "force-dynamic";

export default async function Courses() {
  const courses = await db.course.findMany({
    where: { published: true },
    include: {
      instructor: { select: { name: true } },
      reviews: { select: { rating: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="section">
      <div className="container">
        <div style={{ marginBottom: 10 }}>
          <h1>AI Courses</h1>
          <p className="muted">Choose from online, offline, hybrid and self-paced learning with verified student ratings.</p>
        </div>

        <div className="grid grid-3" style={{ marginTop: 30 }}>
          {courses.map(c => (
            <div className="card course-card" key={c.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
                  <span className="badge">{c.mode}</span>
                  <CourseRatingDisplay reviews={c.reviews} size="sm" />
                </div>
                <h3 style={{ marginTop: 4, marginBottom: 10 }}>{c.title}</h3>
                <div className="muted rich-view short-description" dangerouslySetInnerHTML={{ __html: sanitizeRichText(c.shortDescription) }} />
                <p style={{ marginTop: 12, marginBottom: 4 }}>{c.level} · {c.durationHours} hours</p>
                <p className="muted" style={{ margin: "4px 0 12px" }}>Instructor: {c.instructor.name}</p>
              </div>

              <div>
                <p className="price" style={{ margin: "10px 0 14px" }}>₹{(c.pricePaise / 100).toLocaleString("en-IN")}</p>
                <Link className="btn btn-primary" href={`/courses/${c.slug}`} style={{ width: "100%", textAlign: "center" }}>
                  Course Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

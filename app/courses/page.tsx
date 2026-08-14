import Link from "next/link";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";

export default async function Courses() {
  const courses = await db.course.findMany({
    where: { published: true },
    include: { instructor: { select: { name: true } } },
    orderBy: { createdAt: "desc" }
  });
  return (
    <main className="section">
      <div className="container">
        <h1>AI Courses</h1>
        <p className="muted">Choose from online, offline, hybrid and self-paced learning.</p>
        <div className="grid grid-3" style={{marginTop:30}}>
          {courses.map(c=>(
            <div className="card course-card" key={c.id}>
              <span className="badge">{c.mode}</span>
              <h3>{c.title}</h3>
              <div className="muted rich-view short-description" dangerouslySetInnerHTML={{__html:sanitizeRichText(c.shortDescription)}} />
              <p>{c.level} · {c.durationHours} hours</p>
              <p className="muted">Instructor: {c.instructor.name}</p>
              <p className="price">₹{(c.pricePaise/100).toLocaleString("en-IN")}</p>
              <Link className="btn btn-primary" href={`/courses/${c.slug}`}>Course Details</Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

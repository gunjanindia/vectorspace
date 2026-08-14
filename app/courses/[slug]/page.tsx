import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";

export default async function CourseDetails({ params }: { params: Promise<{slug:string}> }) {
  const { slug } = await params;
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      instructor: { select: { name: true } },
      modules: { orderBy: { sortOrder:"asc" }, include: { lessons: { orderBy:{sortOrder:"asc"} } } },
      batches: { orderBy:{startDate:"asc"} }
    }
  });
  if (!course || !course.published) notFound();

  return (
    <main className="section">
      <div className="container">
        <div className="grid grid-2">
          <div>
            <span className="badge">{course.mode}</span>
            <h1>{course.title}</h1>
            <div className="rich-view course-description" dangerouslySetInnerHTML={{__html:sanitizeRichText(course.description)}} />
            <p className="muted">{course.level} · {course.durationHours} hours · Instructor: {course.instructor.name}</p>
            <p className="price">₹{(course.pricePaise/100).toLocaleString("en-IN")}</p>
            <Link className="btn btn-primary" href={`/checkout?course=${course.id}`}>Enroll Now</Link>
          </div>
          <div className="card">
            <h3>What you'll learn</h3>
            <ul>
              <li>Practical Generative AI concepts</li>
              <li>Prompt engineering patterns</li>
              <li>Hands-on exercises</li>
              <li>Projects and assessment</li>
              <li>Certificate on completion</li>
            </ul>
          </div>
        </div>

        <section style={{marginTop:50}}>
          <h2>Course Curriculum</h2>
          {course.modules.map(m=>(
            <div className="card" style={{marginTop:15}} key={m.id}>
              <h3>Module {m.sortOrder}: {m.title}</h3>
              {m.lessons.map(l=><div className="lesson-item" key={l.id}>{l.title}<span className="muted" style={{float:"right"}}>{l.durationMin} min</span></div>)}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

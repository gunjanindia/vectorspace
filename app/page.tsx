import Link from "next/link";
import { db } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";

export default async function Home() {
  const courses = await db.course.findMany({
    where: { published: true, featured: true },
    include: { instructor: { select: { name: true } } },
    take: 6
  });

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge">ONLINE + OFFLINE + HYBRID AI TRAINING</span>
            <h1>Master AI.<br/><span style={{color:"var(--blue)"}}>Build the Future.</span></h1>
            <p>Learn Generative AI, Prompt Engineering, Python, AI Agents and practical AI development through structured courses, live classes and real projects.</p>
            <div style={{display:"flex",gap:12,marginTop:25}}>
              <Link className="btn btn-primary" href="/courses">Explore Courses</Link>
              <Link className="btn btn-dark" href="/register">Join Academy</Link>
            </div>
          </div>
          <div className="hero-card">
            <span className="badge">Featured learning path</span>
            <h2>AI Developer</h2>
            <p className="muted">Python → GenAI → Prompt Engineering → RAG → AI Applications → Projects</p>
            <div style={{marginTop:20}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Career-focused</span><strong>✓</strong></div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}><span>Hybrid classes</span><strong>✓</strong></div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}><span>Certificate</span><strong>✓</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="learning-paths">
        <div className="container">
          <h2>Learn AI the practical way</h2>
          <p className="muted">Structured learning for beginners, students, professionals and businesses.</p>
          <div className="grid grid-3" style={{marginTop:25}}>
            {["AI Foundations","Generative AI","AI Developer"].map((x,i)=>(
              <div className="card" key={x}>
                <span className="badge">PATH {i+1}</span>
                <h3>{x}</h3>
                <p className="muted">Learn step-by-step with lessons, exercises, projects and mentor support.</p>
                <Link className="btn btn-secondary" href="/courses">View Courses</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{background:"#fff"}} id="batches">
        <div className="container">
          <h2>Featured courses</h2>
          <p className="muted">Start with a focused AI skill and build toward advanced applications.</p>
          <div className="grid grid-3" style={{marginTop:25}}>
            {courses.length ? courses.map(c=>(
              <div className="card course-card" key={c.id}>
                <span className="badge">{c.level}</span>
                <h3>{c.title}</h3>
                <div className="muted rich-view short-description" dangerouslySetInnerHTML={{__html:sanitizeRichText(c.shortDescription)}} />
                <p><strong>{c.durationHours} hours</strong> · {c.mode}</p>
                <p className="price">₹{(c.pricePaise/100).toLocaleString("en-IN")}</p>
                <Link className="btn btn-primary" href={`/courses/${c.slug}`}>View Course</Link>
              </div>
            )) : <div className="card">No featured courses yet. Run the seed command.</div>}
          </div>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if(!user) redirect("/login");

  const enrollments = await db.enrollment.findMany({
    where:{userId:user.id},
    include:{course:true},
    orderBy:{enrolledAt:"desc"}
  });

  return <main className="dashboard"><div className="container">
    <h1>Welcome, {user.name}</h1>
    <p className="muted">Your learning dashboard</p>
    <div className="stats">
      <div className="stat">Courses<strong>{enrollments.length}</strong></div>
      <div className="stat">Active<strong>{enrollments.filter(x=>x.status==="ACTIVE").length}</strong></div>
      <div className="stat">Completed<strong>{enrollments.filter(x=>x.status==="COMPLETED").length}</strong></div>
      <div className="stat">Certificates<strong>0</strong></div>
    </div>
    <h2>My Learning</h2>
    <div className="grid grid-2" style={{marginTop:20}}>
      {enrollments.map(e=><div className="card" key={e.id}>
        <span className="badge">{e.course.level}</span>
        <h3>{e.course.title}</h3>
        <p className="muted">{e.status}</p>
        <Link className="btn btn-primary" href={`/learn/${e.course.slug}`}>Continue Learning</Link>
      </div>)}
      {!enrollments.length && <div className="card">You have no courses yet. <Link href="/courses" style={{color:"var(--blue)"}}>Browse courses</Link></div>}
    </div>
  </div></main>;
}

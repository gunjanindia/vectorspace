import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import Link from "next/link";

export default async function Admin() {
  const user=await getCurrentUser();
  if(!user || user.role!=="ADMIN") redirect("/login");

  const [students,courses,enrollments,orders]=await Promise.all([
    db.user.count({where:{role:"STUDENT"}}),
    db.course.count(),
    db.enrollment.count(),
    db.order.count({where:{status:"PAID"}})
  ]);

  return <main className="dashboard"><div className="container">
    <h1>Admin Dashboard</h1>
    <div className="stats">
      <div className="stat">Students<strong>{students}</strong></div>
      <div className="stat">Courses<strong>{courses}</strong></div>
      <div className="stat">Enrollments<strong>{enrollments}</strong></div>
      <div className="stat">Paid Orders<strong>{orders}</strong></div>
    </div>
    <div className="grid grid-2">
      <div className="card"><h2>Course Management</h2><p className="muted">Create courses and build the curriculum with modules, lessons, ordering and publishing.</p><Link className="btn btn-primary" href="/admin/courses">Manage Courses</Link></div>
      <div className="card"><h2>Payment Management</h2><p className="muted">Orders are stored with status and gateway fields. Production gateway verification should be enabled before accepting real payments.</p></div>
    </div>
  </div></main>;
}

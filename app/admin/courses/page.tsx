import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCourses() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const courses = await db.course.findMany({
    include: { instructor: { select: { name: true } }, _count: { select: { modules: true, enrollments: true } } },
    orderBy: { updatedAt: "desc" }
  });
  const instructors = await db.user.findMany({ where: { role: "INSTRUCTOR" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } });

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-head">
          <div><Link href="/admin" className="muted">← Admin Dashboard</Link><h1>Course Management</h1><p className="muted">Create, edit, organize and publish academy courses.</p></div>
          <Link className="btn btn-primary" href="/admin/courses/new">Create Course</Link>
        </div>
        <div className="card" style={{overflowX:"auto"}}>
          <table className="table">
            <thead><tr><th>Course</th><th>Instructor</th><th>Mode</th><th>Status</th><th>Modules</th><th>Students</th><th></th></tr></thead>
            <tbody>
              {courses.map((c: any) => <tr key={c.id}>
                <td><strong>{c.title}</strong><br/><span className="muted">/{c.slug}</span></td>
                <td>{c.instructor?.name}</td><td>{c.mode}</td>
                <td><span className="badge">{c.published ? "Published" : "Draft"}</span></td>
                <td>{c._count?.modules || 0}</td><td>{c._count?.enrollments || 0}</td>
                <td><Link className="btn btn-secondary" href={`/admin/courses/${c.id}`}>Manage</Link></td>
              </tr>)}
              {!courses.length && <tr><td colSpan={7}>No courses yet. Create your first course.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{marginTop:12}}>Available instructors: {instructors.length}</p>
      </div>
    </main>
  );
}

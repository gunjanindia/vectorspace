import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import Link from "next/link";

export default async function Admin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [students, courses, learningPaths, enrollments, orders] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.course.count(),
    db.learningPath.count(),
    db.enrollment.count(),
    db.order.count({ where: { status: "PAID" } })
  ]);

  return (
    <main className="dashboard">
      <div className="container">
        <h1>Admin Dashboard</h1>
        <div className="stats" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          <div className="stat">Students<strong>{students}</strong></div>
          <div className="stat">Courses<strong>{courses}</strong></div>
          <div className="stat">Learning Paths<strong>{learningPaths}</strong></div>
          <div className="stat">Enrollments<strong>{enrollments}</strong></div>
          <div className="stat">Paid Orders<strong>{orders}</strong></div>
        </div>
        <div className="grid grid-3" style={{ marginTop: 25 }}>
          <div className="card">
            <h2>Course Management</h2>
            <p className="muted">Create courses and build the curriculum with modules, lessons, quizzes, ordering and publishing.</p>
            <Link className="btn btn-primary" href="/admin/courses" style={{ marginTop: 15 }}>Manage Courses</Link>
          </div>
          <div className="card">
            <h2>Learning Paths</h2>
            <p className="muted">Create structured learning paths, link courses in progressive roadmap sequences, and manage skills.</p>
            <Link className="btn btn-primary" href="/admin/learning-paths" style={{ marginTop: 15, background: "var(--navy)" }}>Manage Learning Paths</Link>
          </div>
          <div className="card">
            <h2>Payment & Orders</h2>
            <p className="muted">Orders are stored with status and gateway fields. Production gateway verification ready for payments.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

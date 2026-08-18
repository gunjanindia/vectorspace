import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import CourseEditor from "@/components/CourseEditor";

export const dynamic = "force-dynamic";

export default async function NewCourse() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const instructors = await db.user.findMany({
    where: { role: { in: ["INSTRUCTOR", "ADMIN"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });

  const availableInstructors = instructors.length
    ? instructors
    : [{ id: user.id, name: user.name, email: user.email }];

  return (
    <main className="section">
      <div className="container">
        <Link href="/admin/courses" className="muted">
          ← Course Management
        </Link>
        <h1 style={{ margin: "10px 0 20px" }}>Create New Course</h1>
        <CourseEditor instructors={availableInstructors} />
      </div>
    </main>
  );
}


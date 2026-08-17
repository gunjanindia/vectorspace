import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import CourseBuilder from "@/components/CourseBuilder";

export const dynamic = "force-dynamic";

export default async function CourseBuilderPage({params}:{params:Promise<{id:string}>}){const user=await getCurrentUser();if(!user||user.role!=="ADMIN")redirect("/login");const{id}=await params;const course=await db.course.findUnique({where:{id},include:{instructor:{select:{name:true}},modules:{orderBy:{sortOrder:"asc"},include:{lessons:{orderBy:{sortOrder:"asc"}}}}}});if(!course)notFound();return <main className="section"><div className="container"><div className="admin-page-head"><div><Link href="/admin/courses" className="muted">← Course Management</Link><h1>{course.title}</h1><p className="muted">Course Builder · Instructor: {course.instructor.name} · {course.published?"Published":"Draft"}</p></div><Link className="btn btn-secondary" href={`/courses/${course.slug}`} target="_blank">Preview Course</Link></div><CourseBuilder course={JSON.parse(JSON.stringify(course))}/></div></main>}

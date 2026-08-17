import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import CourseEditor from "@/components/CourseEditor";

export const dynamic = "force-dynamic";

export default async function NewCourse(){const user=await getCurrentUser();if(!user||user.role!=="ADMIN")redirect("/login");const instructors=await db.user.findMany({where:{role:"INSTRUCTOR"},select:{id:true,name:true,email:true},orderBy:{name:"asc"}});return <main className="section"><div className="container"><Link href="/admin/courses" className="muted">← Course Management</Link><h1>Create Course</h1><CourseEditor instructors={instructors}/></div></main>}

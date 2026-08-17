import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import AdminBatchesClient from "./batches-client";

export const dynamic = "force-dynamic";

export default async function AdminBatchesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [batches, courses, instructors] = await Promise.all([
    db.batch.findMany({
      orderBy: { startDate: "asc" },
      include: {
        course: { select: { id: true, title: true, slug: true, level: true, pricePaise: true } },
        instructor: { select: { id: true, name: true, email: true, title: true } },
        enrollments: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, stars: true } }
          },
          orderBy: { enrolledAt: "asc" }
        }
      }
    }),
    db.course.findMany({
      where: { published: true },
      select: { id: true, title: true, level: true, mode: true },
      orderBy: { title: "asc" }
    }),
    db.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: { id: true, name: true, email: true, title: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <AdminBatchesClient
      initialBatches={JSON.parse(JSON.stringify(batches))}
      courses={courses}
      instructors={instructors}
    />
  );
}

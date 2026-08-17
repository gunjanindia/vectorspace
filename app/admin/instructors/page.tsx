import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import AdminInstructorsClient from "./instructors-client";

export const dynamic = "force-dynamic";

export default async function AdminInstructorsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR" },
    orderBy: { createdAt: "desc" },
    include: {
      taughtCourses: {
        select: { id: true, title: true, slug: true, level: true, mode: true }
      },
      taughtBatches: {
        select: { id: true, name: true, mode: true, schedule: true, capacity: true, status: true },
        orderBy: { startDate: "desc" }
      }
    }
  });

  return (
    <AdminInstructorsClient
      initialInstructors={JSON.parse(JSON.stringify(instructors))}
    />
  );
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  const { lessonId } = await params;
  try {
    const resources = await db.lessonResource.findMany({
      where: { lessonId },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json({ resources });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const resourceId = searchParams.get("resourceId");

  if (!resourceId) {
    return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
  }

  try {
    const resource = await db.lessonResource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Delete DB record
    await db.lessonResource.delete({
      where: { id: resourceId }
    });

    // Attempt to remove file from disk if it starts with /uploads/
    if (resource.fileUrl.startsWith("/uploads/")) {
      const diskPath = path.join(process.cwd(), "public", resource.fileUrl);
      await fs.unlink(diskPath).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}

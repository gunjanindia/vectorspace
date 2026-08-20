import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["ppt", "pptx"].includes(ext)) return "pptx";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "image";
  if (["zip", "rar", "tar", "gz", "7z"].includes(ext)) return "archive";
  if (["txt", "md", "csv", "json", "py", "js", "ts"].includes(ext)) return "document";
  return ext || "file";
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const courseId = (formData.get("courseId") as string | null) || "general";
    const lessonId = formData.get("lessonId") as string | null;
    const resourceTitle = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize original filename
    const originalName = file.name || "uploaded_resource";
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const timestamp = Date.now();
    const finalFilename = `${timestamp}-${sanitizedName}`;

    // Determine Course-wise / Lesson-wise Directory Path
    let relativeDir = "";
    if (courseId && lessonId) {
      relativeDir = path.join("uploads", "courses", courseId, "lessons", lessonId);
    } else if (courseId && courseId !== "general") {
      relativeDir = path.join("uploads", "courses", courseId);
    } else {
      relativeDir = path.join("uploads", "general");
    }

    const targetDir = path.join(process.cwd(), "public", relativeDir);

    // Ensure directory exists recursively
    await fs.mkdir(targetDir, { recursive: true });

    // Save File to Disk
    const filePath = path.join(targetDir, finalFilename);
    await fs.writeFile(filePath, buffer);

    // Public URL Path (always forward slashes for web with /api/uploads/ prefix)
    const normalizedRelativeDir = relativeDir.replace(/\\/g, "/");
    const publicUrl = `/api/${normalizedRelativeDir}/${finalFilename}`;
    const fileType = getFileType(originalName);

    // If lessonId is provided, save record into LessonResource table
    let resourceRecord = null;
    if (lessonId) {
      resourceRecord = await db.lessonResource.create({
        data: {
          title: resourceTitle?.trim() || originalName,
          fileUrl: publicUrl,
          fileName: originalName,
          fileType,
          fileSize: buffer.length,
          lessonId
        }
      });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: originalName,
      fileSize: buffer.length,
      fileType,
      resource: resourceRecord
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload media file" },
      { status: 500 }
    );
  }
}

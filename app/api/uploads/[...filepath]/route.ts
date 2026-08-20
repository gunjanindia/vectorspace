import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  zip: "application/zip",
  txt: "text/plain; charset=utf-8"
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  try {
    const { filepath } = await params;
    if (!filepath || filepath.length === 0) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const relativePath = filepath.join("/");
    // Normalize path to prevent directory traversal attacks
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    const diskPath = path.join(process.cwd(), "public", "uploads", safePath);

    const stat = await fs.stat(diskPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const buffer = await fs.readFile(diskPath);
    const ext = path.extname(diskPath).toLowerCase().replace(".", "");
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get("download") === "true";
    const filename = path.basename(diskPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": isDownload
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (err) {
    console.error("Error serving uploaded file:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

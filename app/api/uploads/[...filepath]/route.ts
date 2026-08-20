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

    // Join and decode URI components (e.g. spaces %20, special characters)
    let rawPath = filepath.join("/");
    try {
      rawPath = decodeURIComponent(rawPath);
    } catch (e) {
      // ignore decode error if already decoded
    }

    // Normalize path to prevent directory traversal
    const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, "");

    // Clean duplicate leading 'uploads/' prefix if present
    const cleanPath = safePath.replace(/^uploads[\/\\]/i, "");

    // Try potential candidate paths on disk
    const candidatePaths = [
      path.join(process.cwd(), "public", "uploads", cleanPath),
      path.join(process.cwd(), "public", safePath),
      path.join(process.cwd(), "public", "uploads", safePath)
    ];

    let foundPath: string | null = null;
    let stat = null;

    for (const cand of candidatePaths) {
      const s = await fs.stat(cand).catch(() => null);
      if (s && s.isFile()) {
        foundPath = cand;
        stat = s;
        break;
      }
    }

    if (!foundPath || !stat) {
      console.warn(`[FileServe] 404 Not Found for filepath: ${rawPath}`);
      return new NextResponse("File Not Found", { status: 404 });
    }

    const buffer = await fs.readFile(foundPath);
    const ext = path.extname(foundPath).toLowerCase().replace(".", "");
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get("download") === "true";
    const filename = path.basename(foundPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": isDownload
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error("Error serving uploaded file:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

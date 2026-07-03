import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { hasCloudinaryConfig } from "@/lib/integrations/cloudinary";
import { requireStrictProductionConfig } from "@/lib/production/runtime";
import { getUploadLimitsMb } from "@/lib/settings/runtime";
import { created, problem } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export async function POST(request: Request) {
  if (requireStrictProductionConfig() && hasCloudinaryConfig()) {
    return problem(410, "DIRECT_UPLOAD_REQUIRED", "Use the signed media upload intent for production uploads.");
  }

  if (requireStrictProductionConfig()) {
    return problem(503, "MEDIA_STORAGE_NOT_CONFIGURED", "Durable media storage is required for production uploads.");
  }

  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to upload media.");
  }

  const body = await request.json();
  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  const kind = body.kind === "video" ? "video" : body.kind === "document" ? "document" : "image";
  const folder = typeof body.folder === "string" ? body.folder.replace(/[^a-z0-9_-]/gi, "") : "general";

  const imageMatch = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  const videoMatch = kind === "video" ? dataUrl.match(/^data:video\/(\w+);base64,(.+)$/) : null;
  const pdfMatch = kind === "document" ? dataUrl.match(/^data:application\/pdf;base64,(.+)$/) : null;

  let ext: string;
  let base64: string;

  if (videoMatch) {
    ext = videoMatch[1] === "quicktime" ? "mov" : videoMatch[1];
    base64 = videoMatch[2];
  } else if (pdfMatch) {
    ext = "pdf";
    base64 = pdfMatch[1];
  } else if (imageMatch) {
    ext = imageMatch[1] === "jpeg" ? "jpg" : imageMatch[1];
    base64 = imageMatch[2];
  } else {
    return problem(400, "INVALID_MEDIA", "Provide a valid image, video, or PDF data URL.");
  }

  const buffer = Buffer.from(base64, "base64");
  const maxImageBytes = getUploadLimitsMb() * 1024 * 1024;
  const maxBytes = videoMatch ? MAX_VIDEO_BYTES : pdfMatch ? 10 * 1024 * 1024 : maxImageBytes;

  if (buffer.length > maxBytes) {
    return problem(
      400,
      "FILE_TOO_LARGE",
      videoMatch ? "Video must be under 25 MB." : pdfMatch ? "Document must be under 10 MB." : `Image must be under ${getUploadLimitsMb()} MB.`,
    );
  }
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  const filename = `${userId.slice(0, 8)}_${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/${folder}/${filename}`;
  const responseKind = videoMatch ? "video" : pdfMatch ? "document" : "image";
  return created({ url, filename, size: buffer.length, kind: responseKind });
}

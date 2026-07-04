import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { createCloudinaryUploadIntent, hasCloudinaryConfig } from "@/lib/integrations/cloudinary";
import { requireStrictProductionConfig } from "@/lib/production/runtime";
import { getUploadLimitsMb } from "@/lib/settings/runtime";
import { created, problem } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  bytes?: number;
  resource_type?: string;
  format?: string;
  error?: { message?: string };
};

export async function POST(request: Request) {
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

  if (hasCloudinaryConfig()) {
    const resourceType = videoMatch ? "video" : pdfMatch ? "raw" : "image";
    const intent = createCloudinaryUploadIntent({
      folder: `homelink/${folder}`,
      publicIdPrefix: `${folder}/${userId.slice(0, 8)}`,
      resourceType,
    });

    if (!intent) {
      return problem(503, "MEDIA_STORAGE_NOT_CONFIGURED", "Cloudinary credentials are required for durable media uploads.");
    }

    const form = new FormData();
    for (const [key, value] of Object.entries(intent.fields)) {
      form.append(key, String(value));
    }
    form.append("file", new Blob([buffer]), `upload.${ext}`);

    const upload = await fetch(intent.uploadUrl, { method: "POST", body: form });
    const cloudinary = (await upload.json()) as CloudinaryUploadResponse;

    if (!upload.ok || !cloudinary.secure_url) {
      return problem(
        502,
        "UPLOAD_FAILED",
        cloudinary.error?.message ?? "Cloudinary could not store this file.",
      );
    }

    return created({
      url: cloudinary.secure_url,
      filename: cloudinary.public_id ?? `upload.${ext}`,
      size: cloudinary.bytes ?? buffer.length,
      kind: cloudinary.resource_type ?? resourceType,
      format: cloudinary.format,
      provider: "cloudinary",
    });
  }

  if (requireStrictProductionConfig()) {
    return problem(503, "MEDIA_STORAGE_NOT_CONFIGURED", "Durable media storage is required for production uploads.");
  }

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  const filename = `${userId.slice(0, 8)}_${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/${folder}/${filename}`;
  const responseKind = videoMatch ? "video" : pdfMatch ? "document" : "image";
  return created({ url, filename, size: buffer.length, kind: responseKind });
}

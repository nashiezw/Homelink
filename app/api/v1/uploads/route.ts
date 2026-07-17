import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { createCloudinaryUploadIntent, hasCloudinaryConfig } from "@/lib/integrations/cloudinary";
import { requireStrictProductionConfig } from "@/lib/production/runtime";
import { getUploadLimitsMb } from "@/lib/settings/runtime";
import { created, problem } from "@/lib/api/response";
import { scanUpload, sniffUpload, validateUploadDataUrl, type UploadKind } from "@/lib/uploads/security";

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
  const kind: UploadKind = body.kind === "video" ? "video" : body.kind === "document" ? "document" : body.kind === "audio" ? "audio" : "image";
  const folder = typeof body.folder === "string" ? body.folder.replace(/[^a-z0-9_-]/gi, "") : "general";

  const validation = validateUploadDataUrl(dataUrl, kind, folder);
  if ("error" in validation) return problem(400, "INVALID_MEDIA", validation.error);

  const buffer = Buffer.from(validation.base64, "base64");
  const maxImageBytes = getUploadLimitsMb() * 1024 * 1024;
  const maxBytes = validation.kind === "video" ? MAX_VIDEO_BYTES : validation.kind === "document" ? 25 * 1024 * 1024 : validation.kind === "audio" ? 15 * 1024 * 1024 : maxImageBytes;

  if (buffer.length > maxBytes) {
    return problem(
      400,
      "FILE_TOO_LARGE",
      validation.kind === "video" ? "Video must be under 25 MB." : validation.kind === "document" ? "Document must be under 25 MB." : validation.kind === "audio" ? "Audio must be under 15 MB." : `Image must be under ${getUploadLimitsMb()} MB.`,
    );
  }

  const sniffed = sniffUpload(buffer, validation.mime);
  if (!sniffed.ok) return problem(400, "MEDIA_SIGNATURE_MISMATCH", sniffed.reason);

  const scanned = await scanUpload(buffer, validation.mime);
  if (!scanned.ok) return problem(503, "UPLOAD_SCAN_FAILED", scanned.reason);

  if (hasCloudinaryConfig()) {
    const resourceType = validation.kind === "video" ? "video" : validation.kind === "document" || validation.kind === "audio" ? "raw" : "image";
    const intent = createCloudinaryUploadIntent({
      folder: `houselink/${folder}`,
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
    form.append("file", new Blob([buffer]), `upload.${validation.ext}`);

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
      filename: cloudinary.public_id ?? `upload.${validation.ext}`,
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

  const filename = `${userId.slice(0, 8)}_${Date.now()}.${validation.ext}`;
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/${folder}/${filename}`;
  return created({ url, filename, size: buffer.length, kind: validation.kind });
}

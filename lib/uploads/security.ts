import { requireStrictProductionConfig } from "@/lib/production/runtime";

export type UploadKind = "image" | "video" | "document" | "audio";

export type UploadValidation = {
  kind: UploadKind;
  mime: string;
  ext: string;
  base64: string;
};

const DATA_URL = /^data:([\w.+-]+\/[\w.+-]+|application\/vnd\.[\w.+-]+);base64,(.+)$/;

const ALLOWED_BY_KIND: Record<UploadKind, Record<string, string[]>> = {
  image: {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
  },
  video: {
    "video/mp4": ["mp4"],
    "video/quicktime": ["mov"],
    "video/webm": ["webm"],
  },
  audio: {
    "audio/mpeg": ["mp3"],
    "audio/mp4": ["m4a"],
    "audio/wav": ["wav"],
    "audio/webm": ["webm"],
  },
  document: {
    "application/pdf": ["pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  },
};

const DOCUMENT_FOLDERS = new Set(["payments", "academy", "verification", "property-management", "leases"]);

export function validateUploadDataUrl(dataUrl: string, requestedKind: UploadKind, folder: string): UploadValidation | { error: string } {
  const match = dataUrl.match(DATA_URL);
  if (!match) return { error: "Provide a valid base64 data URL." };

  const mime = match[1].toLowerCase();
  const allowed = ALLOWED_BY_KIND[requestedKind][mime];
  if (!allowed) return { error: `${mime} is not allowed for ${requestedKind} uploads.` };
  if (requestedKind === "document" && !DOCUMENT_FOLDERS.has(folder)) {
    return { error: "Document uploads are only allowed for approved payment, academy, verification, lease, or property-management scopes." };
  }

  const ext = allowed[0];
  return { kind: requestedKind, mime, ext, base64: match[2] };
}

export function sniffUpload(buffer: Buffer, mime: string): { ok: true } | { ok: false; reason: string } {
  const hex = buffer.subarray(0, 16).toString("hex");
  const ascii = buffer.subarray(0, 512).toString("ascii");
  if (ascii.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")) {
    return { ok: false, reason: "Malware test signature detected." };
  }
  if (mime === "image/jpeg" && !hex.startsWith("ffd8ff")) return { ok: false, reason: "JPEG signature mismatch." };
  if (mime === "image/png" && !hex.startsWith("89504e470d0a1a0a")) return { ok: false, reason: "PNG signature mismatch." };
  if (mime === "image/webp" && !(ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP")) return { ok: false, reason: "WEBP signature mismatch." };
  if (mime === "application/pdf" && !ascii.startsWith("%PDF-")) return { ok: false, reason: "PDF signature mismatch." };
  if (mime.includes("openxmlformats") && !hex.startsWith("504b0304")) return { ok: false, reason: "Office document signature mismatch." };
  if ((mime === "video/mp4" || mime === "audio/mp4") && !ascii.slice(4, 12).includes("ftyp")) return { ok: false, reason: "MP4 signature mismatch." };
  if (mime === "video/webm" || mime === "audio/webm") {
    if (!hex.startsWith("1a45dfa3")) return { ok: false, reason: "WEBM signature mismatch." };
  }
  if (mime === "audio/mpeg" && !(hex.startsWith("494433") || hex.startsWith("fffb") || hex.startsWith("fff3"))) {
    return { ok: false, reason: "MP3 signature mismatch." };
  }
  if (mime === "audio/wav" && !(ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE")) return { ok: false, reason: "WAV signature mismatch." };
  if (mime === "video/quicktime" && !ascii.slice(4, 12).includes("ftyp")) return { ok: false, reason: "MOV signature mismatch." };
  return { ok: true };
}

export async function scanUpload(buffer: Buffer, mime: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const scannerUrl = process.env.HOUSELINK_UPLOAD_SCAN_URL;
  if (!scannerUrl) {
    return requireStrictProductionConfig()
      ? { ok: false, reason: "Upload antivirus scanner is required in strict production." }
      : { ok: true };
  }

  const response = await fetch(scannerUrl, {
    method: "POST",
    headers: {
      "Content-Type": mime,
      "X-HouseLink-Upload-Scan": "1",
    },
    body: new Uint8Array(buffer),
  }).catch((error: unknown) => ({ ok: false, statusText: error instanceof Error ? error.message : "Scanner unavailable" }));

  if (!response.ok) {
    return { ok: false, reason: `Upload scanner rejected the file: ${response.statusText}` };
  }
  return { ok: true };
}

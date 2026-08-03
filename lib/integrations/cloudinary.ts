import { createHash } from "node:crypto";
import type { PlatformSettings } from "@/lib/settings/types";

type CloudinaryIntentInput = {
  folder: string;
  publicIdPrefix: string;
  resourceType: "image" | "video" | "raw";
};

export function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export function createCloudinaryUploadIntent(input: CloudinaryIntentInput) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${input.publicIdPrefix}_${timestamp}`;
  const params = {
    folder: input.folder,
    public_id: publicId,
    timestamp,
  };
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signature = createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${input.resourceType}/upload`,
    method: "POST",
    fields: {
      ...params,
      api_key: apiKey,
      signature,
    },
  };
}

type CloudinaryTestResult = {
  ok: boolean;
  message: string;
  sample?: string;
};

type CloudinaryUploadResponse = {
  public_id?: string;
  secure_url?: string;
  error?: { message?: string };
};

function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export async function testCloudinaryConfig(
  integrations: PlatformSettings["integrations"],
): Promise<CloudinaryTestResult> {
  const cloudName = integrations.cloudinaryCloud.trim();
  const apiKey = integrations.cloudinaryKey.trim();
  const apiSecret = integrations.cloudinarySecret.trim();

  return testCloudinaryCredentials(
    cloudName,
    apiKey,
    apiSecret,
    "Add Cloudinary cloud name, API key, and API secret in Platform Settings > Integrations.",
  );
}

export async function testCloudinaryEnvConfig(): Promise<CloudinaryTestResult> {
  return testCloudinaryCredentials(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "",
    process.env.CLOUDINARY_API_KEY?.trim() ?? "",
    process.env.CLOUDINARY_API_SECRET?.trim() ?? "",
    "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET before uploading Library PDFs.",
  );
}

async function testCloudinaryCredentials(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  missingMessage: string,
): Promise<CloudinaryTestResult> {
  if (!cloudName || !apiKey || !apiSecret) {
    return {
      ok: false,
      message: missingMessage,
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `houselink_admin_health_${timestamp}`;
  const folder = "houselink/system-tests";
  const uploadParams = { folder, public_id: publicId, timestamp };
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
  const form = new FormData();

  form.set("file", new Blob([minimalPdfBytes()], { type: "application/pdf" }), `${publicId}.pdf`);
  form.set("folder", folder);
  form.set("public_id", publicId);
  form.set("timestamp", String(timestamp));
  form.set("api_key", apiKey);
  form.set("signature", signCloudinaryParams(uploadParams, apiSecret));

  try {
    const upload = await fetch(uploadUrl, {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    const uploadData = (await upload.json()) as CloudinaryUploadResponse;

    if (!upload.ok || !uploadData.secure_url || !uploadData.public_id) {
      return {
        ok: false,
        message: uploadData.error?.message ?? `Cloudinary upload test failed with HTTP ${upload.status}.`,
      };
    }

    const delivery = await verifyCloudinaryDelivery(uploadData.secure_url);
    void deleteCloudinaryTestAsset(cloudName, apiKey, apiSecret, uploadData.public_id);

    if (!delivery.ok) {
      return {
        ok: false,
        message: delivery.message,
        sample: uploadData.secure_url,
      };
    }

    return {
      ok: true,
      message: "Cloudinary accepted a signed PDF upload and allowed delivery. Credentials and Library document storage are working.",
      sample: uploadData.secure_url,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Network error";
    return { ok: false, message: `Cloudinary test failed: ${detail}` };
  }
}

async function verifyCloudinaryDelivery(url: string) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
    });
    if (response.ok) return { ok: true as const };
    const cloudinaryError = response.headers.get("x-cld-error");
    return {
      ok: false as const,
      message: cloudinaryError
        ? `Cloudinary accepted the upload, but blocked PDF delivery: ${cloudinaryError}. Enable PDF and ZIP delivery in Cloudinary Security settings.`
        : `Cloudinary accepted the upload, but delivery returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? `Cloudinary delivery check failed: ${error.message}` : "Cloudinary delivery check failed.",
    };
  }
}

function minimalPdfBytes() {
  return new Uint8Array(Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 120] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
    "utf8",
  ));
}

async function deleteCloudinaryTestAsset(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  publicId: string,
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const destroyParams = { public_id: publicId, resource_type: "raw", timestamp };
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("resource_type", "raw");
  form.set("timestamp", String(timestamp));
  form.set("api_key", apiKey);
  form.set("signature", signCloudinaryParams(destroyParams, apiSecret));

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`, {
    method: "POST",
    body: form,
    cache: "no-store",
  }).catch(() => undefined);
}

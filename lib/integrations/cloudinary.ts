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

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      ok: false,
      message: "Add Cloudinary cloud name, API key, and API secret in Platform Settings > Integrations.",
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `homelink_admin_health_${timestamp}`;
  const folder = "homelink/system-tests";
  const uploadParams = { folder, public_id: publicId, timestamp };
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
  const form = new FormData();

  form.set("file", new Blob([`HomeLink Cloudinary health test ${new Date().toISOString()}`], { type: "text/plain" }), `${publicId}.txt`);
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

    void deleteCloudinaryTestAsset(cloudName, apiKey, apiSecret, uploadData.public_id);

    return {
      ok: true,
      message: "Cloudinary accepted a signed test upload. Credentials and media storage are working.",
      sample: uploadData.secure_url,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Network error";
    return { ok: false, message: `Cloudinary test failed: ${detail}` };
  }
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

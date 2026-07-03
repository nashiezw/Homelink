import { createHash } from "node:crypto";

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

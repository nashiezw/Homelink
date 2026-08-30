type DisplayImageOptions = {
  width?: number;
  height?: number;
  crop?: "limit" | "fill";
};

export function displayImageUrl(pathOrUrl?: string | null, options: DisplayImageOptions = {}) {
  const value = pathOrUrl?.trim();
  if (!value) return "";
  return optimizeCloudinaryImage(value, options);
}

function optimizeCloudinaryImage(rawUrl: string, options: DisplayImageOptions) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== "res.cloudinary.com") return rawUrl;
    const marker = "/image/upload/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return rawUrl;
    const afterUpload = url.pathname.slice(index + marker.length);
    if (/^(?:c_|w_|h_|f_|q_|g_)/.test(afterUpload)) return rawUrl;

    const width = Math.max(1, Math.round(options.width ?? 900));
    const transforms = [
      `c_${options.crop ?? "limit"}`,
      options.height ? "g_auto" : "",
      `w_${width}`,
      options.height ? `h_${Math.max(1, Math.round(options.height))}` : "",
      "q_auto",
      "f_auto",
    ].filter(Boolean);
    url.pathname = `${url.pathname.slice(0, index + marker.length)}${transforms.join(",")}/${afterUpload}`;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

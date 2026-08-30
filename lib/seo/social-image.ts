import { getCanonicalSiteUrl } from "@/lib/seo/site-url";

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;
export const DEFAULT_SOCIAL_IMAGE = "/brand/houselink-full-lockup.png";

type SocialShareImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
  type: string;
};

export function absoluteUrl(pathOrUrl?: string | null) {
  const siteUrl = getCanonicalSiteUrl();
  const value = pathOrUrl?.trim();
  if (!value) return `${siteUrl}${DEFAULT_SOCIAL_IMAGE}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

export function socialShareImageUrl(pathOrUrl?: string | null) {
  return normalizeCloudinaryShareImage(absoluteUrl(pathOrUrl));
}

export function socialShareImage(pathOrUrl: string | null | undefined, alt: string): SocialShareImage {
  const url = socialShareImageUrl(pathOrUrl);
  return {
    url,
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt,
    type: socialImageType(url),
  };
}

export function socialTwitterImages(pathOrUrl?: string | null) {
  return [socialShareImageUrl(pathOrUrl)];
}

function normalizeCloudinaryShareImage(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== "res.cloudinary.com") return rawUrl;
    const marker = "/image/upload/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return rawUrl;
    const afterUpload = url.pathname.slice(index + marker.length);
    if (/^(?:c_|w_|h_|f_|q_|g_)/.test(afterUpload)) return rawUrl;
    url.pathname = `${url.pathname.slice(0, index + marker.length)}c_fill,g_auto,w_${SOCIAL_IMAGE_WIDTH},h_${SOCIAL_IMAGE_HEIGHT},q_auto,f_jpg/${afterUpload}`;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function socialImageType(url: string) {
  const pathname = safePathname(url);
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function safePathname(url: string) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

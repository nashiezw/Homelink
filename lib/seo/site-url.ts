const CANONICAL_SITE_URL = "https://www.houselink.co.zw";
const OLD_HOSTS = new Set([
  "houselink.co.zw",
  "homelinkzim.co.zw",
  "www.homelinkzim.co.zw",
  "homelink-zimbabwe-7lplsgomb-homelink1.vercel.app",
]);

export function getCanonicalSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return CANONICAL_SITE_URL;

  try {
    const url = new URL(configured);
    if (OLD_HOSTS.has(url.hostname.toLowerCase())) return CANONICAL_SITE_URL;
    return url.origin.replace(/\/+$/, "");
  } catch {
    return CANONICAL_SITE_URL;
  }
}

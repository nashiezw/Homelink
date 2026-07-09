import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homelinkzim.co.zw";

const routes = [
  { path: "/", priority: 1 },
  { path: "/search", priority: 0.95 },
  { path: "/roommates", priority: 0.9 },
  { path: "/calculators", priority: 0.85 },
  { path: "/become-agent", priority: 0.8 },
  { path: "/academy", priority: 0.8 },
  { path: "/property-management", priority: 0.75 },
  { path: "/verification", priority: 0.7 },
  { path: "/safety", priority: 0.7 },
  { path: "/about", priority: 0.65 },
  { path: "/contact", priority: 0.6 },
  { path: "/terms", priority: 0.35 },
  { path: "/privacy", priority: 0.35 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.path === "/" || route.path === "/search" ? "daily" : "weekly",
    priority: route.priority,
  }));
}

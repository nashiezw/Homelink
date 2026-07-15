import type { MetadataRoute } from "next";
import { PROPERTY_CITY_LANDING_PAGES, ROOM_SUBURB_LANDING_PAGES } from "@/lib/seo/property-landing-pages";

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

  const staticRoutes = routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.path === "/" || route.path === "/search" ? ("daily" as const) : ("weekly" as const),
    priority: route.priority,
  }));

  const landingRoutes = [
    ...PROPERTY_CITY_LANDING_PAGES.flatMap((city) => [
      { path: `/rent/${city.slug}`, priority: 0.9 },
      { path: `/property-for-sale/${city.slug}`, priority: 0.85 },
    ]),
    ...ROOM_SUBURB_LANDING_PAGES.map((suburb) => ({ path: `/rooms/${suburb.slug}`, priority: 0.85 })),
  ];

  return [
    ...staticRoutes,
    ...landingRoutes.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: route.priority,
    })),
  ];
}

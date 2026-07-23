import type { MetadataRoute } from "next";
import { PROPERTY_CITY_LANDING_PAGES, ROOM_SUBURB_LANDING_PAGES } from "@/lib/seo/property-landing-pages";
import { getCanonicalSiteUrl } from "@/lib/seo/site-url";
import { getBlogSitemapEntries } from "@/lib/blog/blog-repository";

const siteUrl = getCanonicalSiteUrl();

const routes = [
  { path: "/", priority: 1 },
  { path: "/search", priority: 0.95 },
  { path: "/roommates", priority: 0.9 },
  { path: "/calculators", priority: 0.85 },
  { path: "/become-agent", priority: 0.8 },
  { path: "/academy", priority: 0.8 },
  { path: "/blog", priority: 0.8 },
  { path: "/property-management", priority: 0.75 },
  { path: "/verification", priority: 0.7 },
  { path: "/safety", priority: 0.7 },
  { path: "/about", priority: 0.65 },
  { path: "/contact", priority: 0.6 },
  { path: "/terms", priority: 0.35 },
  { path: "/privacy", priority: 0.35 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const blog = await getBlogSitemapEntries();

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
    ...blog.categories.map((category) => ({
      url: `${siteUrl}/blog/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.72,
    })),
    ...blog.authors.map((author) => ({
      url: `${siteUrl}/blog/author/${author.slug}`,
      lastModified: author.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.68,
    })),
    ...blog.posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.74,
    })),
  ];
}

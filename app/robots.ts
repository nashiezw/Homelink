import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/seo/site-url";

const siteUrl = getCanonicalSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/dashboard/", "/auth"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

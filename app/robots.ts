import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/seo/site-url";

const siteUrl = getCanonicalSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/dashboard/",
        "/auth",
        "/library/checkout",
        "/library/checkout/",
        "/library/claim",
        "/library/claim/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

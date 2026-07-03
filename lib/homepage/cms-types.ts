import type { HomeTestimonial } from "@/lib/homepage/types";

export type CmsLink = {
  label: string;
  href: string;
};

export type CmsHero = {
  eyebrow: string;
  title: string;
  titleHighlight: string;
  description: string;
  badges: string[];
  primaryCta: CmsLink;
  secondaryCta: CmsLink;
  imageUrl: string;
};

export type CmsFinalCta = {
  eyebrow: string;
  title: string;
  description: string;
  actions: Array<CmsLink & { primary?: boolean }>;
};

export type CmsAgentPromo = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: CmsLink;
  secondaryCta: CmsLink;
};

export type CmsBanner = {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  enabled: boolean;
  placement: "hero" | "mid" | "footer";
  tone: "emerald" | "slate" | "amber";
};

export type CmsTrustMetric = {
  id: string;
  label: string;
  enabled: boolean;
  mode: "live" | "manual";
  manualValue?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
};

export type CmsPropertyType = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  comingSoon?: boolean;
  mode: "live" | "manual";
  manualCount?: number;
  listingTypes?: string[];
};

export type CmsPage = {
  id: string;
  label: string;
  path: string;
  status: "published" | "draft";
};

export type CmsSeo = {
  title: string;
  description: string;
  ogImage: string;
};

export type HomepageCmsConfig = {
  published: boolean;
  hero: CmsHero;
  finalCta: CmsFinalCta;
  agentPromo: CmsAgentPromo;
  banners: CmsBanner[];
  trustMetrics: CmsTrustMetric[];
  propertyTypes: CmsPropertyType[];
  featuredListingIds: string[];
  featuredAgentProfileIds: string[];
  testimonials: HomeTestimonial[];
  seo: CmsSeo;
  pages: CmsPage[];
};

export type HomepageResolvedContent = {
  hero: CmsHero;
  finalCta: CmsFinalCta;
  agentPromo: CmsAgentPromo;
  banners: CmsBanner[];
};

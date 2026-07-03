import type { Listing } from "@/lib/types";

export type HomeTrustMetric = {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
};

export type HomePropertyType = {
  id: string;
  label: string;
  count: number;
  href: string;
  comingSoon?: boolean;
};

export type HomeFeaturedAgent = {
  id: string;
  name: string;
  slug: string;
  photoUrl?: string;
  level: string;
  averageRating: number;
  ratingCount: number;
  yearsExperience: number;
  province: string;
  responseTime: string;
  listingsManaged: number;
  verified: boolean;
};

export type HomeTestimonial = {
  id: string;
  name: string;
  photoInitial: string;
  photoUrl?: string;
  rating: number;
  quote: string;
  propertyTitle: string;
  location: string;
  transactionType: "Rental" | "Purchase" | "Property management";
  date: string;
  published?: boolean;
};

import type { HomepageResolvedContent } from "@/lib/homepage/cms-types";

export type HomepageData = {
  trustMetrics: HomeTrustMetric[];
  featuredListings: Listing[];
  propertyTypes: HomePropertyType[];
  featuredAgents: HomeFeaturedAgent[];
  testimonials: HomeTestimonial[];
  content: HomepageResolvedContent;
};

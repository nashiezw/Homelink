import { defaultHomepageTestimonials } from "@/lib/homepage/defaults";
import type { HomepageCmsConfig } from "@/lib/homepage/cms-types";

export function createDefaultHomepageCms(): HomepageCmsConfig {
  return {
    published: true,
    hero: {
      eyebrow: "Verified homes, rooms, land, and agents across Zimbabwe",
      title: "Find Your Next Home with",
      titleHighlight: "Confidence.",
      description:
        "A polished, trust-first marketplace for fresh rentals, homes for sale, land, commercial spaces, and compatible roommates across Zimbabwe.",
      badges: ["Verified landlords", "Fresh listings", "Solar and borehole filters"],
      primaryCta: { label: "Search properties", href: "/search" },
      secondaryCta: { label: "List your property", href: "/dashboard/landlord" },
      imageUrl: "/images/houselink-hero.png",
    },
    finalCta: {
      eyebrow: "Get started",
      title: "Ready to find your next home?",
      description:
        "Search verified listings, list your property, request management, or join Zimbabwe's agent network.",
      actions: [
        { label: "Search properties", href: "/search", primary: true },
        { label: "List your property", href: "/dashboard/landlord" },
        { label: "Request property management", href: "/property-management#consultation" },
        { label: "Become an agent", href: "/become-agent/apply" },
      ],
    },
    agentPromo: {
      enabled: true,
      eyebrow: "Become a HouseLink agent",
      title: "Grow your real estate career with Zimbabwe's verified network",
      description:
        "Quality leads, professional tools, training, and transparent commissions — built for agents who want to grow with HouseLink.",
      primaryCta: { label: "Apply to become a HouseLink agent", href: "/become-agent/apply" },
      secondaryCta: { label: "Learn more", href: "/become-agent" },
    },
    banners: [
      {
        id: "banner_holiday",
        title: "Holiday homes now on HouseLink",
        description: "Discover verified short-stay properties across Zimbabwe.",
        href: "/search",
        ctaLabel: "Browse holiday homes",
        enabled: true,
        placement: "mid",
        tone: "emerald",
      },
      {
        id: "banner_pm",
        title: "Landlords: request property management",
        description: "Inspections, tenant placement, rent collection, and reporting.",
        href: "/property-management",
        ctaLabel: "Request management",
        enabled: true,
        placement: "footer",
        tone: "slate",
      },
    ],
    trustMetrics: [
      { id: "verified-properties", label: "Verified properties", enabled: true, mode: "live" },
      { id: "verified-agents", label: "Verified agents", enabled: true, mode: "live" },
      { id: "cities", label: "Cities covered", enabled: true, mode: "live" },
      { id: "buyers", label: "Active buyers", enabled: true, mode: "live" },
      { id: "rentals", label: "Successful rentals", enabled: true, mode: "live" },
      { id: "customers", label: "Happy customers", enabled: true, mode: "live" },
      { id: "rating", label: "Average rating", enabled: true, mode: "live", decimals: 1, suffix: "★" },
    ],
    propertyTypes: [
      { id: "houses", label: "Houses", href: "/rent/harare", enabled: true, mode: "live", listingTypes: ["house"] },
      { id: "apartments", label: "Apartments", href: "/search", enabled: true, mode: "live", listingTypes: ["flat"] },
      { id: "rooms", label: "Rooms", href: "/rooms/avondale", enabled: true, mode: "live", listingTypes: ["room"] },
      { id: "cottages", label: "Cottages", href: "/search", enabled: true, mode: "live", listingTypes: ["cottage"] },
      { id: "land", label: "Land", href: "/search", enabled: true, mode: "live", listingTypes: ["land"] },
      { id: "commercial", label: "Commercial", href: "/search", enabled: true, mode: "live", listingTypes: ["commercial"] },
      { id: "roommates", label: "Roommates", href: "/roommates", enabled: true, mode: "live" },
      { id: "holiday", label: "Holiday Homes", href: "/search", enabled: true, mode: "live", listingTypes: ["holiday_home"] },
    ],
    featuredListingIds: [],
    featuredAgentProfileIds: [],
    testimonials: defaultHomepageTestimonials.map((t) => ({ ...t, published: true })),
    seo: {
      title: "HouseLink Zimbabwe | Find Your Next Home with Confidence",
      description:
        "Verified rooms, houses, flats, cottages, commercial property, land, and roommate matching across Zimbabwe.",
      ogImage: "/images/houselink-hero.png",
    },
    pages: [
      { id: "home", label: "Homepage", path: "/", status: "published" },
      { id: "search", label: "Search", path: "/search", status: "published" },
      { id: "about", label: "About", path: "/about", status: "published" },
      { id: "safety", label: "Safety", path: "/safety", status: "published" },
      { id: "terms", label: "Terms", path: "/terms", status: "published" },
      { id: "contact", label: "Contact", path: "/contact", status: "published" },
      { id: "become-agent", label: "Become an agent", path: "/become-agent", status: "published" },
      { id: "property-management", label: "Property management", path: "/property-management", status: "published" },
      { id: "roommates", label: "Roommates", path: "/roommates", status: "published" },
      { id: "careers", label: "Careers", path: "/careers", status: "draft" },
    ],
  };
}

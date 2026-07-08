import { CalculatorsSection } from "@/components/home/calculators-section";
import { BecomeAgentPromo } from "@/components/home/become-agent-promo";
import { BrowsePropertyTypes } from "@/components/home/browse-property-types";
import { FeaturedAgentsSection } from "@/components/home/featured-agents-section";
import { FeaturedPropertiesSection } from "@/components/home/featured-properties-section";
import { FinalCtaSection } from "@/components/home/final-cta-section";
import { HomeBannerStrip } from "@/components/home/home-banner-strip";
import { HomeHero } from "@/components/home/home-hero";
import { LocalSearchSection } from "@/components/home/local-search-section";
import { MarketplaceSafetySection } from "@/components/home/marketplace-safety-section";
import { PropertyManagementSection } from "@/components/home/property-management-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { TrustMetricsSection } from "@/components/home/trust-metrics-section";
import type { HomepageData } from "@/lib/homepage/types";

type HomePageViewProps = {
  data: HomepageData;
};

export function HomePageView({ data }: HomePageViewProps) {
  return (
    <main className="overflow-hidden bg-white dark:bg-slate-950">
      <HomeHero hero={data.content.hero} />
      <HomeBannerStrip banners={data.content.banners} placement="hero" />
      <TrustMetricsSection metrics={data.trustMetrics} />
      <FeaturedPropertiesSection listings={data.featuredListings} />
      <LocalSearchSection listings={data.mapListings} />
      <BrowsePropertyTypes types={data.propertyTypes} />
      <CalculatorsSection />
      <HomeBannerStrip banners={data.content.banners} placement="mid" />
      <MarketplaceSafetySection />
      <PropertyManagementSection />
      <FeaturedAgentsSection agents={data.featuredAgents} />
      <BecomeAgentPromo content={data.content.agentPromo} />
      <TestimonialsSection testimonials={data.testimonials} />
      <HomeBannerStrip banners={data.content.banners} placement="footer" />
      <FinalCtaSection content={data.content.finalCta} imageUrl="/images/roommates/room-share-solution-photo.jpg" />
    </main>
  );
}

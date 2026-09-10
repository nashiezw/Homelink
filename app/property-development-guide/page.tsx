import type { Metadata } from "next";
import SalesFunnelRoute from "@/app/funnel/[slug]/page";
import { getSalesFunnelBySlug } from "@/lib/library/funnels";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await getSalesFunnelBySlug("property-development-law");
  if (!resolved) return {};
  const title = `${resolved.product.title} | HouseLink Library Special Offer`;
  return {
    title,
    description: resolved.funnel.subheadline,
    alternates: { canonical: "/property-development-guide" },
    openGraph: {
      title,
      description: resolved.funnel.subheadline,
      url: "/property-development-guide",
      images: resolved.funnel.heroImageUrl || resolved.product.seoImageUrl ? [{ url: resolved.funnel.heroImageUrl || resolved.product.seoImageUrl || "", alt: resolved.product.title }] : undefined,
    },
  };
}

export default function PropertyDevelopmentGuideRoute() {
  return <SalesFunnelRoute params={Promise.resolve({ slug: "property-development-law" })} />;
}

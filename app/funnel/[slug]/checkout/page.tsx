import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LibraryCheckoutClient } from "@/components/library/library-checkout-client";
import { getSalesFunnelBySlug } from "@/lib/library/funnels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await getSalesFunnelBySlug(slug);
  if (!resolved) return {};
  return {
    title: `Secure Checkout | ${resolved.product.title} | HouseLink`,
    description: `Complete your HouseLink order for ${resolved.product.title}.`,
    robots: { index: false, follow: false },
  };
}

export default async function FunnelCheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await getSalesFunnelBySlug(slug);
  if (!resolved) notFound();
  return <LibraryCheckoutClient variant="funnel" resolvedFunnel={resolved} />;
}

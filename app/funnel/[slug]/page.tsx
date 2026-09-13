import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SalesFunnelPage } from "@/components/library/sales-funnel-page";
import { getSalesFunnelBySlug } from "@/lib/library/funnels";
import { getLibraryProductSampleFile, resolveLibraryProductSampleFile } from "@/lib/library/repository";
import { getCanonicalSiteUrl } from "@/lib/seo/site-url";

export const dynamic = "force-dynamic";

const getCachedSalesFunnelBySlug = cache(getSalesFunnelBySlug);
const getCachedLibraryProductSampleFile = cache(getLibraryProductSampleFile);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await getCachedSalesFunnelBySlug(slug);
  if (!resolved) return {};
  const { funnel, product } = resolved;
  const title = `${product.title} | ${funnel.offer.title} | HouseLink Library`;
  const description = funnel.subheadline || product.shortDescription || product.description;
  const canonical = `${getCanonicalSiteUrl()}/funnel/${funnel.slug}`;
  const image = funnel.heroImageUrl || product.seoImageUrl || product.gallery.find((item) => item.url)?.url;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SalesFunnelRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await getCachedSalesFunnelBySlug(slug);
  if (!resolved) notFound();
  const sample = await getCachedLibraryProductSampleFile(resolved.product.slug) ?? resolveLibraryProductSampleFile(resolved.product);
  const sampleVersion = sample ? encodeURIComponent([sample.fileId, sample.fileName].filter(Boolean).join("-")) : "";
  const sampleUrl = sample ? `/funnel/${encodeURIComponent(resolved.funnel.slug)}/sample?v=${sampleVersion}` : null;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: resolved.product.title,
    description: resolved.funnel.subheadline || resolved.product.description,
    image: resolved.funnel.heroImageUrl || resolved.product.seoImageUrl || resolved.product.gallery.find((item) => item.url)?.url,
    offers: resolved.formats.map((format) => ({
      "@type": "Offer",
      priceCurrency: resolved.product.currency,
      price: format.activePrice,
      availability: "https://schema.org/InStock",
      url: `${getCanonicalSiteUrl()}/funnel/${resolved.funnel.slug}`,
      name: format.label,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <SalesFunnelPage resolved={resolved} sampleUrl={sampleUrl} />
    </>
  );
}

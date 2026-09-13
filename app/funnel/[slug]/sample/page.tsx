import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FunnelSamplePreviewPage } from "@/components/library/funnel-sample-preview-page";
import { getSalesFunnelBySlug } from "@/lib/library/funnels";
import { getLibraryProductSampleFile, resolveLibraryProductSampleFile } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

const getCachedSalesFunnelBySlug = cache(getSalesFunnelBySlug);
const getCachedLibraryProductSampleFile = cache(getLibraryProductSampleFile);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await getCachedSalesFunnelBySlug(slug);
  if (!resolved) return {};
  return {
    title: `Sample preview | ${resolved.product.title} | HouseLink Library`,
    description: `Preview sample pages from ${resolved.product.title} before buying from HouseLink Library.`,
    robots: { index: false, follow: false },
  };
}

export default async function FunnelSampleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await getCachedSalesFunnelBySlug(slug);
  if (!resolved) notFound();
  const sample = await getCachedLibraryProductSampleFile(resolved.product.slug) ?? resolveLibraryProductSampleFile(resolved.product);
  if (!sample) notFound();

  const sampleVersion = encodeURIComponent([sample.fileId, sample.fileName].filter(Boolean).join("-"));
  const sampleUrl = `/api/v1/library/products/${encodeURIComponent(resolved.product.slug)}/sample?v=${sampleVersion}`;
  const sampleDownloadUrl = `${sampleUrl}&download=1`;
  const funnelUrl = `/funnel/${encodeURIComponent(resolved.funnel.slug)}`;

  return (
    <FunnelSamplePreviewPage
      resolved={resolved}
      sampleUrl={sampleUrl}
      sampleDownloadUrl={sampleDownloadUrl}
      funnelUrl={funnelUrl}
    />
  );
}

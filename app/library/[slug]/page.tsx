import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LibraryProductPage } from "@/components/library/library-product-page";
import {
  getLibraryProductBySlug,
  listApprovedLibraryProductReviews,
  listLibraryBundleCompanions,
  listLibraryProducts,
} from "@/lib/library/repository";
import { buildLibraryProductJsonLd, buildLibraryProductMetadata, safeJsonLd } from "@/lib/library/seo";
import { getLibraryStoreSettings } from "@/lib/library/settings";

export const revalidate = 900;
export const dynamic = "force-static";

const getCachedLibraryProductBySlug = cache(getLibraryProductBySlug);
const listCachedLibraryProducts = cache(listLibraryProducts);
const getCachedLibraryStoreSettings = cache(getLibraryStoreSettings);
const listCachedApprovedLibraryProductReviews = cache(listApprovedLibraryProductReviews);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getCachedLibraryProductBySlug(slug), getCachedLibraryStoreSettings()]);
  if (!product) return {};
  return buildLibraryProductMetadata(product, { robotsIndex: settings.seo.robotsIndex });
}

export default async function LibraryProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCachedLibraryProductBySlug(slug);
  if (!product) notFound();
  const [allProducts, reviews] = await Promise.all([
    listCachedLibraryProducts(),
    listCachedApprovedLibraryProductReviews(product.id),
  ]);
  const bundleCompanions = await listLibraryBundleCompanions(product, allProducts);
  const bundleIds = new Set(bundleCompanions.map((item) => item.id));
  const related = allProducts
    .filter(
      (item) =>
        item.id !== product.id &&
        !bundleIds.has(item.id) &&
        (item.category === product.category || item.collection === product.collection),
    )
    .slice(0, 3);
  const relatedFallback = allProducts
    .filter((item) => item.id !== product.id && !bundleIds.has(item.id))
    .slice(0, 3);
  const schemas = buildLibraryProductJsonLd({ product, reviews });

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={`library-product-jsonld-${index}`}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
        />
      ))}
      <LibraryProductPage
        product={product}
        related={related.length ? related : relatedFallback}
        bundleCompanions={bundleCompanions}
        reviews={reviews}
      />
    </>
  );
}

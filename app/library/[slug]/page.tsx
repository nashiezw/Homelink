import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LibraryProductPage } from "@/components/library/library-product-page";
import { getLibraryProductBySlug, listLibraryProducts, recordLibraryProductView } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getLibraryProductBySlug(slug);
  if (!product) return {};
  const title = product.seoTitle?.trim() || `${product.title} | HouseLink Library`;
  const description = product.metaDescription?.trim() || product.shortDescription;
  const image = product.seoImageUrl || product.gallery[0]?.url;
  return {
    title,
    description,
    keywords: product.seoFocusKeyword ? [product.seoFocusKeyword, ...product.tags] : product.tags,
    alternates: { canonical: `/library/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/library/${product.slug}`,
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

export default async function LibraryProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getLibraryProductBySlug(slug);
  if (!product) notFound();
  await recordLibraryProductView(slug);
  const allProducts = await listLibraryProducts();
  const related = allProducts
    .filter((item) => item.id !== product.id && (item.category === product.category || item.collection === product.collection))
    .slice(0, 3);
  return <LibraryProductPage product={product} related={related.length ? related : allProducts.filter((item) => item.id !== product.id).slice(0, 3)} />;
}

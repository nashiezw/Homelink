import { notFound } from "next/navigation";
import { LibraryProductPage } from "@/components/library/library-product-page";
import { getLibraryProducts } from "@/lib/library/catalog";
import { getLibraryProductBySlug, listLibraryProducts, recordLibraryProductView } from "@/lib/library/repository";

export function generateStaticParams() {
  return getLibraryProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getLibraryProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.title} | HouseLink Library`,
    description: product.shortDescription,
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

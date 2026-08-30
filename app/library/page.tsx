import type { Metadata } from "next";
import { cache } from "react";
import { LibraryStorefront } from "@/components/library/library-storefront";
import { listLibraryProducts } from "@/lib/library/repository";
import { buildLibraryStoreJsonLd, buildLibraryStoreMetadata, safeJsonLd } from "@/lib/library/seo";
import { getLibraryStoreSettings } from "@/lib/library/settings";

export const revalidate = 900;

const listCachedLibraryProducts = cache(listLibraryProducts);
const getCachedLibraryStoreSettings = cache(getLibraryStoreSettings);

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedLibraryStoreSettings();
  return buildLibraryStoreMetadata(settings);
}

export default async function LibraryPage() {
  const [products, settings] = await Promise.all([listCachedLibraryProducts(), getCachedLibraryStoreSettings()]);
  const schemas = buildLibraryStoreJsonLd({ settings, products });

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={`library-store-jsonld-${index}`}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
        />
      ))}
      <LibraryStorefront
        products={products}
        merchandising={settings.merchandising}
        store={settings.store}
        seo={settings.seo}
      />
    </>
  );
}

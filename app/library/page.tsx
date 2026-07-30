import type { Metadata } from "next";
import { LibraryStorefront } from "@/components/library/library-storefront";
import { listLibraryProducts } from "@/lib/library/repository";
import { getLibraryStoreSettings } from "@/lib/library/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getLibraryStoreSettings();
  return {
    title: settings.seo.storeTitle,
    description: settings.seo.storeDescription,
    keywords: settings.seo.focusKeyword || undefined,
    robots: settings.seo.robotsIndex ? undefined : { index: false, follow: false },
    openGraph: {
      title: settings.seo.storeTitle,
      description: settings.seo.storeDescription,
      ...(settings.seo.storeOgImage ? { images: [{ url: settings.seo.storeOgImage }] } : {}),
    },
  };
}

export default async function LibraryPage() {
  return <LibraryStorefront products={await listLibraryProducts()} />;
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/search-page-client";
import { PROPERTY_CITY_LANDING_PAGES, resolveCity } from "@/lib/seo/property-landing-pages";

type PageProps = {
  params: Promise<{ city: string }>;
};

export function generateStaticParams() {
  return PROPERTY_CITY_LANDING_PAGES.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = resolveCity(citySlug);
  return {
    title: `Property for Sale in ${city.name} | HomeLink Zimbabwe`,
    description: `Browse houses, flats, land, and commercial property for sale in ${city.name}, Zimbabwe on HomeLink.`,
    alternates: {
      canonical: `/property-for-sale/${city.slug}`,
    },
    openGraph: {
      title: `Property for Sale in ${city.name}`,
      description: `Verified houses, flats, land, and commercial property for sale in ${city.name}.`,
      url: `/property-for-sale/${city.slug}`,
      type: "website",
    },
  };
}

export default async function PropertyForSaleCityPage({ params }: PageProps) {
  const { city: citySlug } = await params;
  const city = resolveCity(citySlug);

  return (
    <main className="bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<p className="p-8 text-center">Loading properties for sale...</p>}>
        <SearchPageClient initialSearchParams={{ intent: "buy", city: city.name }} />
      </Suspense>
    </main>
  );
}

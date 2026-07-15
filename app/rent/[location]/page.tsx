import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/search-page-client";
import { PROPERTY_CITY_LANDING_PAGES, resolveCity } from "@/lib/seo/property-landing-pages";

type PageProps = {
  params: Promise<{ location: string }>;
};

export function generateStaticParams() {
  return PROPERTY_CITY_LANDING_PAGES.map((city) => ({ location: city.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { location } = await params;
  const city = resolveCity(location);
  return {
    title: `Property to Rent in ${city.name} | HomeLink Zimbabwe`,
    description: `Browse rooms, flats, cottages, houses, and commercial rentals in ${city.name}, Zimbabwe on HomeLink.`,
    alternates: {
      canonical: `/rent/${city.slug}`,
    },
  };
}

export default async function RentLocationPage({ params }: PageProps) {
  const { location } = await params;
  const city = resolveCity(location);

  return (
    <main className="bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<p className="p-8 text-center">Loading rentals...</p>}>
        <SearchPageClient initialSearchParams={{ intent: "rent", city: city.name }} />
      </Suspense>
    </main>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/search-page-client";
import { resolveCity } from "@/lib/seo/property-landing-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ location: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { location } = await params;
  const city = resolveCity(location);
  return {
    title: `Property to Rent in ${city.name} | HouseLink Zimbabwe`,
    description: `Browse rooms, flats, cottages, houses, and commercial rentals in ${city.name}, Zimbabwe on HouseLink.`,
    alternates: {
      canonical: `/rent/${city.slug}`,
    },
    openGraph: {
      title: `Property to Rent in ${city.name}`,
      description: `Verified rental listings in ${city.name}, Zimbabwe on HouseLink.`,
      url: `/rent/${city.slug}`,
      type: "website",
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

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
    title: `Student Accommodation in ${city.name} | HouseLink Zimbabwe`,
    description: `Find boarding houses, student rooms, and shared accommodation near schools, colleges, and campus routes in ${city.name}.`,
    alternates: {
      canonical: `/student-accommodation/${city.slug}`,
    },
  };
}

export default async function StudentAccommodationLocationPage({ params }: PageProps) {
  const { location } = await params;
  const city = resolveCity(location);

  return (
    <main className="bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<p className="p-8 text-center">Loading student accommodation...</p>}>
        <SearchPageClient initialSearchParams={{ intent: "rent", type: "boarding_house", city: city.name }} />
      </Suspense>
    </main>
  );
}

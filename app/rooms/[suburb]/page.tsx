import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/search-page-client";
import { ROOM_SUBURB_LANDING_PAGES, resolveSuburb } from "@/lib/seo/property-landing-pages";

type PageProps = {
  params: Promise<{ suburb: string }>;
};

export function generateStaticParams() {
  return ROOM_SUBURB_LANDING_PAGES.map((suburb) => ({ suburb: suburb.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { suburb: suburbSlug } = await params;
  const suburb = resolveSuburb(suburbSlug);
  return {
    title: `Rooms to Rent in ${suburb.name} | HouseLink Zimbabwe`,
    description: `Find rooms, shared accommodation, cottages, and affordable rentals in ${suburb.name} on HouseLink Zimbabwe.`,
    alternates: {
      canonical: `/rooms/${suburb.slug}`,
    },
    openGraph: {
      title: `Rooms to Rent in ${suburb.name}`,
      description: `Verified rooms, shared accommodation, and affordable rentals in ${suburb.name}.`,
      url: `/rooms/${suburb.slug}`,
      type: "website",
    },
  };
}

export default async function RoomsSuburbPage({ params }: PageProps) {
  const { suburb: suburbSlug } = await params;
  const suburb = resolveSuburb(suburbSlug);

  return (
    <main className="bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<p className="p-8 text-center">Loading rooms...</p>}>
        <SearchPageClient initialSearchParams={{ intent: "rent", type: "room", suburb: suburb.name }} />
      </Suspense>
    </main>
  );
}

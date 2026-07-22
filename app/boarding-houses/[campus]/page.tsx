import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/search-page-client";

const CAMPUSES = [
  { slug: "nust", label: "NUST", location: "NUST" },
  { slug: "uz", label: "UZ", location: "UZ" },
  { slug: "msu", label: "MSU", location: "MSU" },
  { slug: "university-of-zimbabwe", label: "University of Zimbabwe", location: "University of Zimbabwe" },
];

type PageProps = {
  params: Promise<{ campus: string }>;
};

export function generateStaticParams() {
  return CAMPUSES.map((campus) => ({ campus: campus.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campus } = await params;
  const target = resolveCampus(campus);
  return {
    title: `Boarding Houses near ${target.label} | HouseLink Zimbabwe`,
    description: `Search student accommodation, boarding houses, and student rooms near ${target.label} with HouseLink Zimbabwe.`,
    alternates: {
      canonical: `/boarding-houses/${target.slug}`,
    },
  };
}

export default async function BoardingHouseCampusPage({ params }: PageProps) {
  const { campus } = await params;
  const target = resolveCampus(campus);

  return (
    <main className="bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<p className="p-8 text-center">Loading boarding houses...</p>}>
        <SearchPageClient initialSearchParams={{ intent: "rent", type: "boarding_house", location: target.location }} />
      </Suspense>
    </main>
  );
}

function resolveCampus(slug: string) {
  return CAMPUSES.find((campus) => campus.slug === slug) ?? {
    slug,
    label: slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    location: slug.replace(/-/g, " "),
  };
}

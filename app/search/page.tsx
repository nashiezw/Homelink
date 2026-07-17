import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/search-page-client";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const intent = value(params?.intent);
  const type = value(params?.type);
  const city = value(params?.city);
  const verifiedOnly = value(params?.verifiedOnly) === "true";
  const category = [
    verifiedOnly ? "verified" : "",
    type ? type.replace(/_/g, " ") : "property",
    intent === "buy" ? "for sale" : intent === "rent" ? "to rent" : "",
    city ? `in ${city}` : "in Zimbabwe",
  ].filter(Boolean).join(" ");

  return {
    title: `${capitalize(category)} | HouseLink Zimbabwe`,
    description: `Search ${category} on HouseLink Zimbabwe with filters for price, suburb, amenities, verification, and availability.`,
    alternates: {
      canonical: "/search",
    },
    openGraph: {
      title: `${capitalize(category)} | HouseLink Zimbabwe`,
      description: `Find ${category} with HouseLink Zimbabwe.`,
      url: "/search",
      type: "website",
    },
  };
}

export default function SearchPage() {
  return (
    <main className="bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<p className="p-8 text-center">Loading search...</p>}>
        <SearchPageClient />
      </Suspense>
    </main>
  );
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function capitalize(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

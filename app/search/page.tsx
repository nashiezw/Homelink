import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/search-page-client";

export const metadata: Metadata = {
  title: "Search Property in Zimbabwe | HomeLink Zimbabwe",
  description:
    "Search verified rooms, houses, flats, cottages, land, commercial spaces, and holiday homes across Zimbabwe on HomeLink.",
  alternates: {
    canonical: "/search",
  },
};

export default function SearchPage() {
  return (
    <main className="bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<p className="p-8 text-center">Loading search...</p>}>
        <SearchPageClient />
      </Suspense>
    </main>
  );
}

import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/search-page-client";

export default function SearchPage() {
  return (
    <main className="bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<p className="p-8 text-center">Loading search...</p>}>
        <SearchPageClient />
      </Suspense>
    </main>
  );
}

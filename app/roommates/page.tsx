import { Suspense } from "react";
import { RoommatesPageClient } from "@/components/pages/roommates-page-client";

export default function RoommatesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white dark:bg-slate-950" />}>
      <RoommatesPageClient />
    </Suspense>
  );
}

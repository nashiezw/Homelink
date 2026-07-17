import type { Metadata } from "next";
import { Suspense } from "react";
import { RoommatesPageClient } from "@/components/pages/roommates-page-client";

export const metadata: Metadata = {
  title: "Find Rooms and Roommates in Zimbabwe | HouseLink",
  description:
    "Find rooms to rent, compatible roommates, shared homes, and verified room listings across Zimbabwe with HouseLink.",
  alternates: {
    canonical: "/roommates",
  },
};

export default function RoommatesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white dark:bg-slate-950" />}>
      <RoommatesPageClient />
    </Suspense>
  );
}

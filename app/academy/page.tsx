import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicAcademyPage } from "@/components/academy/public-academy-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HouseLink Academy | Real Estate Training in Zimbabwe",
  description:
    "Study HouseLink Academy courses for Zimbabwe property agents, landlords, and operators. Track lessons, quizzes, assignments, certificates, and payment proof.",
  alternates: {
    canonical: "/academy",
  },
  openGraph: {
    title: "HouseLink Academy",
    description: "Zimbabwe-focused real estate training, certificates, and agent resources.",
    url: "/academy",
    type: "website",
  },
};

export default function AcademyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16"><div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></div>}>
      <PublicAcademyPage />
    </Suspense>
  );
}

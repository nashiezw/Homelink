import { Suspense } from "react";
import { PublicAcademyPage } from "@/components/academy/public-academy-page";
import "./academy-page.css";

export const dynamic = "force-dynamic";

export default function AcademyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16"><div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></div>}>
      <PublicAcademyPage />
    </Suspense>
  );
}

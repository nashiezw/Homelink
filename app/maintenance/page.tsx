import Link from "next/link";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
        <Wrench className="size-8" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Scheduled maintenance</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
        HouseLink is temporarily unavailable while we improve the platform. Please check back shortly.
      </p>
      <Link
        href="/dashboard/admin?tab=settings"
        rel="nofollow"
        className="mt-8 inline-flex h-11 items-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        Admin access
      </Link>
    </main>
  );
}

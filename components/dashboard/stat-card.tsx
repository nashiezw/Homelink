import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <div className="gpu-card group relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 via-cyan-500 to-ocean" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-normal text-ink dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{helper}</p>
    </div>
  );
}

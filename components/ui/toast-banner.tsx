"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";

export function ToastBanner() {
  const { toast } = useApp();
  if (!toast) return null;

  const Icon =
    toast.tone === "error" ? AlertCircle : toast.tone === "info" ? Info : CheckCircle2;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-[80] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 motion-safe:animate-fade-up"
    >
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-[0_12px_40px_rgba(15,23,42,0.14)]",
          "dark:bg-slate-900",
          toast.tone === "error"
            ? "border-red-200 dark:border-red-900/60"
            : toast.tone === "info"
              ? "border-sky-200 dark:border-sky-900/60"
              : "border-emerald-200 dark:border-emerald-900/50",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
            toast.tone === "error"
              ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300"
              : toast.tone === "info"
                ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
          )}
        >
          <Icon className="size-4" strokeWidth={2.25} />
        </span>
        <p className="min-w-0 flex-1 pt-1 text-sm font-medium leading-5 text-slate-800 dark:text-slate-100">
          {toast.message}
        </p>
      </div>
    </div>
  );
}

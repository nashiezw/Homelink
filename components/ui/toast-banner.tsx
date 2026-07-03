"use client";

import { useApp } from "@/components/providers/app-provider";

export function ToastBanner() {
  const { toast } = useApp();
  if (!toast) {
    return null;
  }
  const styles =
    toast.tone === "error"
      ? "bg-red-600"
      : toast.tone === "info"
        ? "bg-ocean"
        : "bg-emerald-700";
  return (
    <div className={`fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-soft ${styles}`}>
      {toast.message}
    </div>
  );
}

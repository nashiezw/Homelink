"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AcademyAccordion({
  items,
  accent = "#008b68",
}: {
  accent?: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    meta?: string;
    defaultOpen?: boolean;
    content: React.ReactNode;
  }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.id}
          className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm open:shadow-md dark:border-slate-800 dark:bg-slate-950"
          open={item.defaultOpen}
        >
          <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 marker:content-none sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug text-slate-900 dark:text-white">{item.title}</p>
              {item.subtitle && <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              {item.meta && (
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${accent}18`, color: accent }}>
                  {item.meta}
                </span>
              )}
              <ChevronDown className="size-5 text-slate-400 transition group-open:rotate-180" />
            </div>
          </summary>
          <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

export function ToolkitGrid({
  groups,
  accent = "#008b68",
}: {
  accent?: string;
  groups: Array<{ category: string; description: string; items: Array<{ id: string; title: string; description: string; fileUrl: string }> }>;
}) {
  if (!groups.length) {
    return <p className="text-sm text-slate-500">Toolkit downloads unlock with this programme.</p>;
  }

  return (
    <AcademyAccordion
      accent={accent}
      items={groups.map((group, index) => ({
        id: group.category,
        title: group.category,
        subtitle: group.description,
        meta: `${group.items.length} PDFs`,
        defaultOpen: index === 0,
        content: (
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <a
                key={item.id}
                href={item.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md min-h-[4.5rem]",
                )}
                style={{ borderColor: `${accent}33` }}
              >
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
              </a>
            ))}
          </div>
        ),
      }))}
    />
  );
}

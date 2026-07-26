"use client";

import { formatLessonContent } from "@/lib/academy/format-lesson-content";
import { cn } from "@/lib/utils";

export function AcademyProse({
  richText,
  transcript,
  summary,
  title,
  className,
}: {
  richText?: string | null;
  transcript?: string | null;
  summary?: string | null;
  title?: string;
  className?: string;
}) {
  const html = formatLessonContent({ richText, transcript, summary, title });

  if (!html) {
    return (
      <p className="text-base leading-relaxed text-slate-500 dark:text-slate-400">
        This lesson&apos;s reading material is being prepared. Review the video, downloads, and resources above.
      </p>
    );
  }

  return (
    <article
      className={cn(
        "academy-prose text-[1.0625rem] leading-[1.85] text-slate-700 dark:text-slate-200",
        "[&_p]:mb-6 [&_p:last-child]:mb-0",
        "[&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:tracking-normal [&_h2]:text-slate-950 dark:[&_h2]:text-white",
        "[&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:leading-tight [&_h3]:tracking-normal [&_h3]:text-slate-950 dark:[&_h3]:text-white",
        "[&_h3.lesson-heading]:mt-10 [&_h3.lesson-heading]:mb-4 [&_h3.lesson-heading]:text-xl [&_h3.lesson-heading]:font-bold [&_h3.lesson-heading]:tracking-tight [&_h3.lesson-heading]:text-emerald-800 dark:[&_h3.lesson-heading]:text-emerald-300",
        "[&_ul]:my-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:marker:text-emerald-600",
        "[&_ol]:my-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:marker:font-bold [&_ol]:marker:text-emerald-700",
        "[&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white",
        "[&_a]:font-medium [&_a]:text-emerald-600 [&_a]:underline-offset-4 hover:[&_a]:underline dark:[&_a]:text-emerald-400",
        "[&_blockquote]:my-8 [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-emerald-100 [&_blockquote]:bg-emerald-50/80 [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:font-medium [&_blockquote]:text-emerald-950 dark:[&_blockquote]:border-emerald-900/50 dark:[&_blockquote]:bg-emerald-950/30 dark:[&_blockquote]:text-emerald-100",
        "[&_table]:my-8 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:text-sm",
        "[&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold dark:[&_th]:bg-slate-800",
        "[&_td]:border-t [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-2 dark:[&_td]:border-slate-800",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

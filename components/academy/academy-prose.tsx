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
        "[&_h3.lesson-heading]:mt-10 [&_h3.lesson-heading]:mb-4 [&_h3.lesson-heading]:text-xl [&_h3.lesson-heading]:font-bold [&_h3.lesson-heading]:tracking-tight [&_h3.lesson-heading]:text-emerald-800 dark:[&_h3.lesson-heading]:text-emerald-300",
        "[&_ul]:my-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        "[&_ol]:my-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
        "[&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white",
        "[&_a]:font-medium [&_a]:text-emerald-600 [&_a]:underline-offset-4 hover:[&_a]:underline dark:[&_a]:text-emerald-400",
        "[&_blockquote]:my-8 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-500 [&_blockquote]:bg-emerald-50/80 [&_blockquote]:py-4 [&_blockquote]:pl-5 [&_blockquote]:pr-4 [&_blockquote]:italic dark:[&_blockquote]:bg-emerald-950/30",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

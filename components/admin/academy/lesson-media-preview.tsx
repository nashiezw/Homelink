"use client";

import { AlertCircle, CheckCircle2, FileImage, FileText, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LessonMediaPreviewInput = {
  videoUrl?: string | null;
  embeddedVideoUrl?: string | null;
  coverImageUrl?: string | null;
  audioUrl?: string | null;
  pdfUrl?: string | null;
  transcript?: string | null;
};

export function getLessonMediaDisplay(input: LessonMediaPreviewInput) {
  if (input.embeddedVideoUrl || input.videoUrl) {
    return {
      label: "Video lesson",
      detail: input.coverImageUrl ? "Learners will see the video player with the cover image as poster artwork." : "Learners will see the video player.",
      tone: "success" as const,
      icon: Play,
    };
  }
  if (input.audioUrl && input.coverImageUrl) {
    return {
      label: "Audio lesson with cover image",
      detail: "Learners will see the cover image in the media frame with audio controls.",
      tone: "success" as const,
      icon: Volume2,
    };
  }
  if (input.audioUrl) {
    return {
      label: "Audio lesson",
      detail: "Learners will see an Academy audio panel with playback controls.",
      tone: "info" as const,
      icon: Volume2,
    };
  }
  if (input.coverImageUrl) {
    return {
      label: "Cover image only",
      detail: "Learners will see the image in the media frame while video or audio is prepared.",
      tone: "info" as const,
      icon: FileImage,
    };
  }
  return {
    label: "Video lesson coming soon",
    detail: "Learners will see the default coming-soon video placeholder.",
    tone: "warning" as const,
    icon: Play,
  };
}

export function LessonMediaPreview({ input, compact = false, className }: { input: LessonMediaPreviewInput; compact?: boolean; className?: string }) {
  const display = getLessonMediaDisplay(input);
  const Icon = display.icon;
  const checklist = [
    { label: "Video", complete: Boolean(input.videoUrl || input.embeddedVideoUrl), detail: "Uploaded video or embedded video URL" },
    { label: "Cover", complete: Boolean(input.coverImageUrl), detail: "16:9 image, at least 1280x720" },
    { label: "Audio", complete: Boolean(input.audioUrl), detail: "MP3, M4A, WAV, or WebM under 15MB" },
    { label: "PDF", complete: Boolean(input.pdfUrl), detail: "Optional learner handout or notes" },
    { label: "Transcript", complete: Boolean(input.transcript?.trim()), detail: "Recommended for audio-first lessons" },
  ];

  return (
    <div className={cn(
      "rounded-xl border p-4",
      display.tone === "success"
        ? "border-emerald-400/20 bg-emerald-400/10"
        : display.tone === "info"
          ? "border-cyan-400/20 bg-cyan-400/10"
          : "border-amber-400/20 bg-amber-400/10",
      className,
    )}>
      <div className="flex items-start gap-3">
        <span className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          display.tone === "success" ? "bg-emerald-400/15 text-emerald-200" : display.tone === "info" ? "bg-cyan-400/15 text-cyan-200" : "bg-amber-400/15 text-amber-200",
        )}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-white">Learner display: {display.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{display.detail}</p>
          {!compact && <p className="mt-2 text-xs leading-5 text-slate-500">Cover image recommendation: 16:9 image, at least 1280x720.</p>}
        </div>
      </div>
      {!compact && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-start gap-2 rounded-lg border border-white/10 bg-slate-950/50 p-2">
              {item.complete ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-slate-500" />}
              <div className="min-w-0">
                <p className={cn("text-xs font-bold", item.complete ? "text-slate-100" : "text-slate-500")}>{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {input.audioUrl && !input.transcript?.trim() ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100/90">
          <FileText className="mt-0.5 size-4 shrink-0" />
          Add a transcript for audio-first lessons so learners can read along and accessibility stays strong.
        </div>
      ) : null}
    </div>
  );
}

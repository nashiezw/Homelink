"use client";

import { Film, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type VideoUploaderProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  folder?: string;
};

export function VideoUploader({ value, onChange, max = 2, folder = "listings" }: VideoUploaderProps) {
  const { showToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    if (value.length >= max) {
      showToast(`Maximum ${max} videos allowed.`, "info");
      return;
    }

    setUploading(true);
    const next = [...value];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("video/")) continue;
      if (next.length >= max) break;
      if (file.size > 25 * 1024 * 1024) {
        showToast(`${file.name} is too large (max 25 MB).`, "error");
        continue;
      }

      const dataUrl = await readFile(file);
      const result = await apiFetch<{ url: string }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl, folder, kind: "video" }),
      });

      if (result.data?.url) next.push(result.data.url);
      else showToast(result.error?.message ?? "Video upload failed.", "error");
    }

    onChange(next);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">Video walkthrough</p>
      <p className="mt-0.5 text-xs text-slate-500">MP4 or WebM, up to 25 MB each. Max {max} videos.</p>

      <div className="mt-3 space-y-3">
        {value.map((url) => (
          <div key={url} className="relative overflow-hidden rounded-lg border border-slate-200 bg-black">
            <video src={url} controls className="max-h-48 w-full" preload="metadata" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Remove video"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Film className="size-5" />}
            <span className="text-xs font-medium">{uploading ? "Uploading..." : "Add video"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

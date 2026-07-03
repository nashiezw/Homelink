"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type ImageUploaderProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  folder?: string;
  label?: string;
};

export function ImageUploader({
  value,
  onChange,
  max = 6,
  folder = "general",
  label = "Photos",
}: ImageUploaderProps) {
  const { showToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    if (value.length >= max) {
      showToast(`Maximum ${max} photos allowed.`, "info");
      return;
    }

    setUploading(true);
    const next = [...value];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (next.length >= max) break;
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name} is too large (max 5 MB).`, "error");
        continue;
      }

      const dataUrl = await readFile(file);
      const result = await apiFetch<{ url: string }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl, folder }),
      });

      if (result.data?.url) {
        next.push(result.data.url);
      } else {
        showToast(result.error?.message ?? "Upload failed.", "error");
      }
    }

    onChange(next);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">JPG or PNG, up to 5 MB each. Max {max} photos.</p>

      <div className="mt-3 flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div key={url} className="relative size-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <Image src={url} alt="" fill className="object-cover" sizes="96px" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Remove photo"
            >
              <X className="size-3.5" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                Cover
              </span>
            )}
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <span className="text-[10px] font-medium">{uploading ? "Uploading..." : "Add photo"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
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

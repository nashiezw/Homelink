import sampleManifest from "@/public/uploads/library/samples/sample-manifest.json";
import type { LibraryProduct } from "@/lib/library/catalog";

export type PreparedLibrarySample = {
  slug: string;
  title: string;
  label: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  size: string;
  pages: number;
};

type SampleCandidate = Pick<LibraryProduct["downloads"][number], "label" | "fileName" | "fileType" | "fileUrl" | "previewable">;

const preparedSamples = (sampleManifest.samples as PreparedLibrarySample[]).filter((sample) => sample.fileUrl && sample.fileName);

export function isLibrarySampleCandidate(file: SampleCandidate) {
  if (!file.fileUrl) return false;
  const label = `${file.label || ""} ${file.fileName || ""}`;
  const isClearlySample = /sample|preview/i.test(label);
  const isPdf = file.fileType?.toLowerCase() === "pdf" || file.fileName?.toLowerCase().endsWith(".pdf");
  return isClearlySample && isPdf;
}

export function findPreparedLibrarySample(input: { slug?: string; title?: string }) {
  const keys = new Set([sampleLookupKey(input.slug), sampleLookupKey(input.title)].filter(Boolean));
  return preparedSamples.find((sample) => {
    const sampleKeys = [
      sampleLookupKey(sample.slug),
      sampleLookupKey(sample.title),
      sampleLookupKey(`${sample.slug} ${sample.title}`),
    ].filter(Boolean);
    return sampleKeys.some((key) => keys.has(key));
  }) ?? null;
}

function sampleLookupKey(value?: string | null) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|complete|guide|to|sample|preview)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

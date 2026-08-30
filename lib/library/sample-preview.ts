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
  const slug = input.slug?.trim().toLowerCase();
  const title = input.title?.trim().toLowerCase();
  return preparedSamples.find((sample) => sample.slug.toLowerCase() === slug || sample.title.toLowerCase() === title) ?? null;
}

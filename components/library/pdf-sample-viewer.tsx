"use client";

import { FileText, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

type PdfSampleViewerProps = {
  url: string;
  title: string;
  onViewed?: () => void;
};

type PageShell = {
  pageNumber: number;
  width: number;
  height: number;
};

type PdfModule = typeof import("pdfjs-dist");

let workerConfigured = false;

export function PdfSampleViewer({ url, title, onViewed }: PdfSampleViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasesRef = useRef(new Map<number, HTMLCanvasElement>());
  const viewedRef = useRef(false);
  const [pdfjs, setPdfjs] = useState<PdfModule | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageShell[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPdfJs() {
      const mod = await import("pdfjs-dist");
      if (!workerConfigured) {
        mod.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        workerConfigured = true;
      }
      if (!cancelled) setPdfjs(mod);
    }
    void loadPdfJs().catch(() => {
      if (!cancelled) {
        setError("We couldn't load the preview tools. Open the sample in a new tab or download it instead.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const syncWidth = () => setContainerWidth(Math.floor(node.clientWidth));
    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdfjs) return;
    let cancelled = false;
    const loadingTask = pdfjs.getDocument({
      url,
      withCredentials: true,
      httpHeaders: { Accept: "application/pdf" },
    });
    loadingTask.onProgress = (status: { loaded: number; total: number }) => {
      if (!status.total) return;
      setProgress(Math.min(100, Math.round((status.loaded / status.total) * 100)));
    };
    async function loadDocument() {
      setLoading(true);
      setRendering(false);
      setError(null);
      setPages([]);
      canvasesRef.current.clear();
      const pdf = await loadingTask.promise;
      if (cancelled) return;
      setDocumentProxy(pdf);
      const shells: PageShell[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        shells.push({ pageNumber, width: viewport.width, height: viewport.height });
      }
      if (cancelled) return;
      setPages(shells);
      setLoading(false);
    }
    void loadDocument().catch(() => {
      if (!cancelled) {
        setError("We couldn't load the preview. Open the sample in a new tab or download it instead.");
        setLoading(false);
        setRendering(false);
      }
    });
    return () => {
      cancelled = true;
      void loadingTask.destroy();
    };
  }, [pdfjs, url]);

  useEffect(() => {
    if (!documentProxy || !pages.length || !containerWidth) return;
    let cancelled = false;
    const pdf = documentProxy;
    async function renderPages() {
      setRendering(true);
      const usableWidth = Math.max(240, containerWidth - 24);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      for (const shell of pages) {
        if (cancelled) return;
        const canvas = canvasesRef.current.get(shell.pageNumber);
        if (!canvas) continue;
        const page = await pdf.getPage(shell.pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = usableWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
      }
      if (!cancelled) {
        setRendering(false);
        if (!viewedRef.current) {
          viewedRef.current = true;
          onViewed?.();
        }
      }
    }
    void renderPages().catch(() => {
      if (!cancelled) {
        setError("We couldn't render the preview. Open the sample in a new tab or download it instead.");
        setRendering(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [containerWidth, documentProxy, onViewed, pages]);

  if (error) {
    return (
      <div className="grid min-h-[62dvh] place-items-center p-5">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-xl dark:bg-slate-950">
          <FileText className="mx-auto size-8 text-emerald-700 dark:text-emerald-300" />
          <p className="mt-3 font-semibold text-ink dark:text-white">Preview unavailable</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} data-houselink-pdf-viewer className="relative h-full min-h-[62dvh] overflow-y-auto overflow-x-hidden bg-slate-100 p-3 dark:bg-slate-900" aria-label={`${title} PDF preview`}>
      {(loading || rendering) ? (
        <div className="sticky top-3 z-10 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <Loader2 className="size-3.5 animate-spin text-emerald-600" />
          {loading ? `Loading PDF${progress ? ` ${progress}%` : ""}` : "Rendering pages..."}
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
        {pages.map((page) => {
          const aspectRatio = `${page.width} / ${page.height}`;
          return (
            <div key={page.pageNumber} data-houselink-pdf-page={page.pageNumber} className="w-full max-w-full rounded-md border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <canvas
                ref={(canvas) => {
                  if (canvas) canvasesRef.current.set(page.pageNumber, canvas);
                  else canvasesRef.current.delete(page.pageNumber);
                }}
                className="mx-auto block max-w-full bg-white"
                style={{ aspectRatio }}
              />
              <p className="mt-2 text-center text-[11px] font-semibold uppercase text-slate-400">Page {page.pageNumber}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

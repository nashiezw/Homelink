"use client";

import { FileText, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

type PdfSampleViewerProps = { url: string; title: string; onViewed?: () => void };
type PageShell = { pageNumber: number; width: number; height: number };
type PdfModule = typeof import("pdfjs-dist");

let workerConfigured = false;

export function PdfSampleViewer({ url, title, onViewed }: PdfSampleViewerProps) {
  const viewedRef = useRef(false);
  const onViewedRef = useRef(onViewed);
  const [pdfjs, setPdfjs] = useState<PdfModule | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageShell[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstPageRendering, setFirstPageRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onViewedRef.current = onViewed;
  }, [onViewed]);

  useEffect(() => {
    let cancelled = false;
    void import("pdfjs-dist")
      .then((mod) => {
        if (!workerConfigured) {
          mod.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
          workerConfigured = true;
        }
        if (!cancelled) setPdfjs(mod);
      })
      .catch(() => {
        if (!cancelled) {
          setError("We couldn't load the preview tools. Open the sample in a new tab or download it instead.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!pdfjs) return;
    let cancelled = false;
    const loadingTask = pdfjs.getDocument({
      url,
      withCredentials: true,
      httpHeaders: { Accept: "application/pdf" },
      disableAutoFetch: true,
      rangeChunkSize: 64 * 1024,
    });
    loadingTask.onProgress = (status: { loaded: number; total: number }) => {
      if (status.total) setProgress(Math.min(100, Math.round((status.loaded / status.total) * 100)));
    };
    async function loadDocument() {
      setLoading(true);
      setFirstPageRendering(false);
      setError(null);
      setPages([]);
      const pdf = await loadingTask.promise;
      if (cancelled) return;
      const firstPage = await pdf.getPage(1);
      if (cancelled) return;
      const viewport = firstPage.getViewport({ scale: 1 });
      setDocumentProxy(pdf);
      setPages(Array.from({ length: pdf.numPages }, (_, index) => ({ pageNumber: index + 1, width: viewport.width, height: viewport.height })));
      setLoading(false);
      setFirstPageRendering(true);
    }
    void loadDocument().catch(() => {
      if (!cancelled) {
        setError("We couldn't load the preview. Open the sample in a new tab or download it instead.");
        setLoading(false);
        setFirstPageRendering(false);
      }
    });
    return () => {
      cancelled = true;
      setDocumentProxy(null);
      void loadingTask.destroy();
    };
  }, [pdfjs, url]);

  function handleFirstPageRendered() {
    setFirstPageRendering(false);
    if (viewedRef.current) return;
    viewedRef.current = true;
    onViewedRef.current?.();
  }

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
    <div data-houselink-pdf-viewer className="relative h-full min-h-[62dvh] overflow-y-auto overflow-x-hidden bg-slate-100 p-3 dark:bg-slate-900" aria-label={`${title} PDF preview`}>
      {loading || firstPageRendering ? (
        <div className="sticky top-3 z-10 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <Loader2 className="size-3.5 animate-spin text-emerald-600" />
          {loading ? `Loading PDF${progress ? ` ${progress}%` : ""}` : "Preparing first page..."}
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
        {documentProxy ? pages.map((page) => (
          <PdfPageCanvas key={page.pageNumber} pdf={documentProxy} page={page} eager={page.pageNumber === 1} onRendered={page.pageNumber === 1 ? handleFirstPageRendered : undefined} />
        )) : null}
      </div>
    </div>
  );
}

function PdfPageCanvas({ pdf, page, eager, onRendered }: { pdf: PDFDocumentProxy; page: PageShell; eager: boolean; onRendered?: () => void }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onRenderedRef = useRef(onRendered);
  const [visible, setVisible] = useState(eager);
  const [width, setWidth] = useState(0);
  const [rendered, setRendered] = useState(false);

  useEffect(() => { onRenderedRef.current = onRendered; }, [onRendered]);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;
    const syncWidth = () => setWidth(Math.max(240, Math.floor(node.clientWidth - 16)));
    syncWidth();
    const resizeObserver = new ResizeObserver(syncWidth);
    resizeObserver.observe(node);
    if (eager || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return () => resizeObserver.disconnect();
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    observer.observe(node);
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [eager]);

  useEffect(() => {
    if (!visible || !width || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;
    async function renderPage() {
      const pdfPage = await pdf.getPage(page.pageNumber);
      if (cancelled || !canvasRef.current) return;
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: width / baseViewport.width });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      renderTask = pdfPage.render({ canvas, canvasContext: context, viewport });
      await renderTask.promise;
      if (!cancelled) {
        setRendered(true);
        onRenderedRef.current?.();
      }
    }
    void renderPage().catch((renderError) => {
      if (!cancelled && (renderError as { name?: string })?.name !== "RenderingCancelledException") {
        console.error("[library/pdf-preview] page render failed", { page: page.pageNumber, renderError });
      }
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [page.pageNumber, pdf, visible, width]);

  return (
    <div ref={shellRef} data-houselink-pdf-page={page.pageNumber} className="relative w-full max-w-full rounded-md border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {!rendered && visible ? <div className="absolute inset-0 grid place-items-center"><Loader2 className="size-5 animate-spin text-emerald-600" /></div> : null}
      <canvas ref={canvasRef} className="mx-auto block max-w-full bg-white" style={{ aspectRatio: `${page.width} / ${page.height}` }} />
      <p className="mt-2 text-center text-[11px] font-semibold uppercase text-slate-400">Page {page.pageNumber}</p>
    </div>
  );
}

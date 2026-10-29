import { useEffect, useRef } from 'react';

const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return { pdfjs, workerSrc };
};

/** Starts loading pdf.js and its worker (a pointer resting on View), so the first document draws without waiting. */
export function preloadPdfPage() {
  loadPdfJs().then(
    ({ workerSrc }) => fetch(workerSrc).catch(() => undefined),
    () => undefined,
  );
}

/**
 * Page 1 of a PDF drawn on this page with pdf.js, which loads only when a document is opened. Used for one-page
 * documents (certificates): Chrome's own viewer starts on a dark grey page for a moment and can't say when it has drawn.
 */
export function PdfPage({ blob, title, onDrawn, onFailed }: { blob: Blob; title: string; onDrawn: () => void; onFailed: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const handlers = useRef({ onDrawn, onFailed });
  handlers.current = { onDrawn, onFailed };

  useEffect(() => {
    let cancelled = false;
    let destroy = () => {};
    (async () => {
      const { pdfjs } = await loadPdfJs();
      const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      destroy = () => void task.destroy();
      const page = await (await task.promise).getPage(1);
      const el = canvas.current;
      if (cancelled || !el) return;
      // sharp on dense screens: drawn at the shown width times the screen's pixel ratio (at most 2)
      const shown = el.parentElement?.clientWidth || 800;
      const viewport = page.getViewport({ scale: (shown * Math.min(2, window.devicePixelRatio || 1)) / page.getViewport({ scale: 1 }).width });
      el.width = Math.round(viewport.width);
      el.height = Math.round(viewport.height);
      await page.render({ canvasContext: el.getContext('2d')!, viewport }).promise;
      if (!cancelled) handlers.current.onDrawn();
    })().catch(() => !cancelled && handlers.current.onFailed());
    return () => {
      cancelled = true;
      destroy();
    };
  }, [blob]);

  return <canvas ref={canvas} className="p-doc-canvas" role="img" aria-label={title} />;
}

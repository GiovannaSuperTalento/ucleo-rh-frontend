import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, TextLayer } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function EditablePdfPage({ page, pageNumber, onEdit, onReady, pageRef }) {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const [renderError, setRenderError] = useState("");
  const viewport = page.getViewport({ scale: 1.15 });

  useEffect(() => {
    let cancelled = false;
    let textLayer;
    const render = async () => {
      try {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        await page.render({ canvas, canvasContext: context, viewport, transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null, background: "#ffffff" }).promise;
        if (cancelled) return;
        const textContent = await page.getTextContent();
        const container = textLayerRef.current;
        container.replaceChildren();
        textLayer = new TextLayer({ textContentSource: textContent, container, viewport });
        await textLayer.render();
        if (cancelled) return;
        const inputHandlers = [];
        for (const span of textLayer.textDivs) {
          span.contentEditable = "true";
          span.setAttribute("role", "textbox");
          span.setAttribute("aria-label", `Texto editable, página ${pageNumber}`);
          span.spellcheck = false;
          const markEdited = () => {
            span.dataset.edited = "true";
            onEdit();
          };
          const keepSingleLine = (event) => {
            if (event.key === "Enter") event.preventDefault();
          };
          const pastePlainText = (event) => {
            event.preventDefault();
            const plainText = event.clipboardData?.getData("text/plain")?.replace(/[\r\n]+/g, " ") || "";
            document.execCommand("insertText", false, plainText);
          };
          span.addEventListener("input", markEdited);
          span.addEventListener("keydown", keepSingleLine);
          span.addEventListener("paste", pastePlainText);
          inputHandlers.push([span, markEdited, keepSingleLine, pastePlainText]);
        }
        textLayer._inlineInputHandlers = inputHandlers;
        onReady();
      } catch (error) {
        if (!cancelled) setRenderError(error?.message || "No se pudo mostrar esta página.");
      }
    };
    render();
    return () => {
      cancelled = true;
      textLayer?.cancel();
      for (const [span, inputHandler, keyHandler, pasteHandler] of textLayer?._inlineInputHandlers || []) {
        span.removeEventListener("input", inputHandler);
        span.removeEventListener("keydown", keyHandler);
        span.removeEventListener("paste", pasteHandler);
      }
    };
  }, [page, pageNumber, viewport.height, viewport.width, onEdit, onReady]);

  return (
    <div ref={pageRef} className="inline-pdf-page relative mx-auto overflow-hidden bg-white shadow-lg" style={{ width: viewport.width, height: viewport.height }}>
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div ref={textLayerRef} className="inline-pdf-text-layer absolute inset-0" />
      {renderError && <div className="absolute inset-0 grid place-items-center bg-white/90 p-5 text-center text-sm text-red-700">{renderError}</div>}
      <span className="absolute bottom-2 right-3 rounded bg-white/85 px-2 py-1 text-[10px] text-slate-500">Página {pageNumber}</span>
    </div>
  );
}

const InlinePdfEditor = forwardRef(function InlinePdfEditor({ fileUrl, onEdit, onReadyChange }, ref) {
  const [pages, setPages] = useState([]);
  const [renderedPages, setRenderedPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageElements = useRef([]);
  const handleEdit = React.useCallback(() => onEdit?.(), [onEdit]);
  const handlePageReady = React.useCallback(() => setRenderedPages((count) => count + 1), []);

  useEffect(() => {
    onReadyChange?.(pages.length > 0 && renderedPages === pages.length);
  }, [onReadyChange, pages.length, renderedPages]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;
    setLoading(true);
    setError("");
    setPages([]);
    setRenderedPages(0);
    pageElements.current = [];
    const load = async () => {
      try {
        loadingTask = getDocument({ url: fileUrl });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        const loadedPages = [];
        for (let number = 1; number <= pdf.numPages; number += 1) {
          loadedPages.push(await pdf.getPage(number));
          if (cancelled) return;
        }
        setPages(loadedPages);
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || "No se pudo abrir el archivo PDF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [fileUrl]);

  useImperativeHandle(ref, () => ({
    async exportEditedPdf() {
      if (!pages.length || pageElements.current.length !== pages.length || pageElements.current.some((element) => !element)) {
        throw new Error("Espera a que todas las páginas terminen de cargar.");
      }
      document.activeElement?.blur?.();
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      let output;
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const outputViewport = page.getViewport({ scale: 1 });
        const orientation = outputViewport.width > outputViewport.height ? "landscape" : "portrait";
        const canvas = await html2canvas(pageElements.current[index], { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
        if (!output) output = new jsPDF({ orientation, unit: "pt", format: [outputViewport.width, outputViewport.height], compress: true });
        else output.addPage([outputViewport.width, outputViewport.height], orientation);
        output.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, outputViewport.width, outputViewport.height, undefined, "FAST");
      }
      return output.output("blob");
    },
  }), [pages]);

  if (loading) return <div className="grid min-h-[55vh] place-items-center text-sm text-slate-600">Cargando páginas del documento…</div>;
  if (error) return <div className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">No fue posible abrir la vista editable: {error}</div>;

  return (
    <div className="inline-pdf-editor mx-auto flex max-h-[67vh] flex-col gap-5 overflow-auto rounded-lg bg-slate-700 p-4">
      {pages.map((page, index) => (
        <EditablePdfPage key={index} page={page} pageNumber={index + 1} pageRef={(node) => { pageElements.current[index] = node; }} onEdit={handleEdit} onReady={handlePageReady} />
      ))}
    </div>
  );
});

export default InlinePdfEditor;

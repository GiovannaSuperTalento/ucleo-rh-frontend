import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

const InlineWordEditor = forwardRef(function InlineWordEditor({ fileUrl, onEdit, onReadyChange }, ref) {
  const rootRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    onReadyChange?.(false);
    const render = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("No se pudo cargar el documento Word de vista previa.");
        const blob = await response.blob();
        if (!blob.size) throw new Error("El documento Word está vacío.");
        if (!rootRef.current) return;
        rootRef.current.replaceChildren();
        await renderAsync(blob, rootRef.current, undefined, {
          className: "inline-word-page",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          useBase64URL: true,
        });
        if (!active) return;
        // docx-preview uses the configured className for each rendered page.
        // This renderer is configured with "inline-word-page", not its default "docx".
        const pages = rootRef.current.querySelectorAll("section.inline-word-page");
        if (!pages.length) throw new Error("No se pudieron mostrar las páginas del documento.");
        pages.forEach((page) => {
          page.contentEditable = "true";
          page.setAttribute("role", "textbox");
          page.setAttribute("aria-label", "Texto editable del documento Word");
          page.setAttribute("spellcheck", "true");
        });
        setLoading(false);
        onReadyChange?.(true);
      } catch (renderError) {
        if (active) {
          setError(renderError.message || "No se pudo abrir el documento Word.");
          setLoading(false);
          onReadyChange?.(false);
        }
      }
    };
    render();
    return () => { active = false; };
  }, [fileUrl, onReadyChange]);

  useImperativeHandle(ref, () => ({
    getEditedText() {
      if (!rootRef.current) throw new Error("El documento aún no está listo.");
      return rootRef.current.innerText.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    },
  }), []);

  return (
    <div className="inline-word-editor relative mx-auto min-h-[55vh] max-h-[67vh] overflow-auto rounded-lg bg-slate-300 p-4" onInput={onEdit}>
      <div ref={rootRef} className="inline-word-preview-root mx-auto" />
      {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-slate-200/90 text-sm text-slate-600">Preparando las páginas del documento Word…</div>}
      {error && <div role="alert" className="absolute inset-x-4 top-4 z-20 rounded-lg bg-red-50 p-4 text-sm text-red-700">No fue posible abrir la vista editable: {error}</div>}
      <style>{`
        .inline-word-preview-root .inline-word-page-wrapper { background: transparent; padding: 0; }
        .inline-word-preview-root section.inline-word-page { margin: 0 auto 18px; background: white; box-shadow: 0 2px 12px rgba(15,23,42,.16); outline: none; }
        .inline-word-preview-root section.inline-word-page:focus { box-shadow: 0 0 0 2px #1B4B43, 0 2px 12px rgba(15,23,42,.16); }
        .inline-word-preview-root section.inline-word-page * { cursor: text; }
        @media print { .inline-word-preview-root section.inline-word-page { margin: 0; box-shadow: none; } }
      `}</style>
    </div>
  );
});

export default InlineWordEditor;

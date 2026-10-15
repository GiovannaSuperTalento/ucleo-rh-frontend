import React, { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { Download, Loader2, X } from "lucide-react";
import { API_BASE } from "../api";

export default function GeneratedCompanyDocumentPreview({ blob, filename, title, employeeId, documentType, token, onClose, onSaved }) {
  const previewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!blob || !previewRef.current) return undefined;
    previewRef.current.replaceChildren();
    renderAsync(blob, previewRef.current, undefined, {
      className: "company-docx-preview",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      // Estos saltos reflejan el contenido original de Word y quedan obsoletos
      // al sustituir datos; se conservan los saltos explícitos del documento.
      ignoreLastRenderedPageBreak: true,
      useBase64URL: true,
    }).then(() => {
      if (active) setLoading(false);
    }).catch((err) => {
      if (active) {
        setError(err.message || "No se pudo mostrar el documento.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [blob]);

  const generateWord = async () => {
    if (!blob) return;
    setSaving(true);
    setError("");
    try {
      const safeName = (filename || title || "documento").replace(/\.docx$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "_");
      const wordName = `${safeName}.docx`;
      const wordBlob = blob instanceof Blob
        ? blob
        : new Blob([blob], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const file = new File([wordBlob], wordName, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const form = new FormData();
      form.append("file", file);
      form.append("fileType", documentType);
      const response = await fetch(`${API_BASE}/employees/${encodeURIComponent(employeeId)}/generated-document`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "No se pudo guardar el documento Word.");

      const downloadUrl = URL.createObjectURL(wordBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = wordName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar el documento Word.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Vista previa de ${title}`}>
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-800">Vista previa: {title}</h2>
            <p className="text-xs text-slate-500">El documento se descarga en Word y conserva el formato de la plantilla.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar vista previa"><X size={18} /></button>
        </header>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2">
          <span className="text-xs text-slate-500">Revisa la vista previa antes de descargar.</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Cancelar</button>
            <button type="button" disabled={loading || saving || Boolean(error)} onClick={generateWord} className="inline-flex items-center gap-2 rounded-lg border border-[#1B4B43] bg-white px-3 py-2 text-xs font-semibold text-[#1B4B43] disabled:opacity-50" title="Guarda en el expediente y descarga el Word rellenado con los datos del colaborador.">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar Word
            </button>
          </div>
        </div>
        {error && <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">{error}</div>}
        <div className="relative min-h-0 flex-1 overflow-auto bg-slate-200 p-4 sm:p-8">
          {loading && <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-100/80 text-sm font-medium text-slate-600"><Loader2 className="animate-spin" size={18} /> Preparando la vista previa…</div>}
          <div ref={previewRef} className="company-docx-preview-root mx-auto" />
        </div>
      </div>
      <style>{`
        .company-docx-preview-root .docx-wrapper { background: transparent; padding: 0; }
        .company-docx-preview-root tr { height: auto !important; }
        .company-docx-preview-root td,
        .company-docx-preview-root th { height: auto !important; min-width: 0; overflow-wrap: anywhere; vertical-align: top; }
        .company-docx-preview-root td p,
        .company-docx-preview-root th p { line-height: 1.2 !important; padding-top: 1px; padding-bottom: 1px; }
        .company-docx-preview-root section.company-docx-preview,
        .company-docx-preview-root .docx-wrapper > section.docx,
        .company-docx-preview-root section.docx { margin: 0 auto 18px; box-shadow: 0 2px 12px rgba(15,23,42,.16); }
        @media print {
          .company-docx-preview-root section.company-docx-preview,
          .company-docx-preview-root section.docx { margin: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}

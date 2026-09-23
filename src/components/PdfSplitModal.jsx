// src/components/PdfSplitModal.jsx
import React, { useState, useEffect } from "react";

export function PdfSplitModal({ file, onClose, onConfirm, isProcessing }) {
  const [pdfUrl, setPdfUrl] = useState(null);

  // Lista oficial de categorías del sistema
  const [documentRanges, setDocumentRanges] = useState([
    { name: "Contrato Firmado", range: "1-3" },
    { name: "Convenio de Confidencialidad", range: "4-5" },
    { name: "Aviso de Privacidad", range: "6" },
    { name: "Test de Integridad", range: "7-8" },
    { name: "Políticas de RH", range: "9-10" },
    { name: "Estado de Cuenta Bancaria", range: "11" },
    { name: "Identificación Oficial (INE / Pasaporte)", range: "" },
    { name: "Comprobante de Domicilio", range: "" },
    { name: "Acta de Nacimiento", range: "" },
    { name: "CURP", range: "" },
    { name: "RFC (Constancia de Situación Fiscal)", range: "" },
    { name: "NSS (Número de Seguro Social)", range: "" },
    { name: "Comprobante de Estudios", range: "" },
    { name: "Carta de Recomendación", range: "" },
    { name: "Formatos Varios", range: "" }
  ]);

  // Generar URL Blob segura para la vista previa nativa del navegador
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleRangeChange = (index, value) => {
    const updated = [...documentRanges];
    updated[index].range = value;
    setDocumentRanges(updated);
  };

  const handleProcess = () => {
    const mapping = {};

    documentRanges.forEach((doc) => {
      const rangeStr = doc.range.trim();
      if (!rangeStr) return;

      const pageIndexes = [];
      const parts = rangeStr.split(",");

      parts.forEach((part) => {
        const clean = part.trim();
        if (clean.includes("-")) {
          const [start, end] = clean.split("-").map((n) => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              if (i > 0) pageIndexes.push(i - 1);
            }
          }
        } else {
          const num = parseInt(clean, 10);
          if (!isNaN(num) && num > 0) {
            pageIndexes.push(num - 1);
          }
        }
      });

      if (pageIndexes.length > 0) {
        mapping[doc.name] = Array.from(new Set(pageIndexes));
      }
    });

    onConfirm(mapping);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 bg-[#1B4B43] text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold">División de Expediente Multipágina</h2>
            <p className="text-xs text-emerald-100">
              Visualiza el documento e indica las páginas correspondientes a cada sección
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Cuerpo Principal del Modal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto flex-1">
          {/* Panel Izquierdo: Visor Nativo del PDF con Controles */}
          <div className="lg:col-span-7 flex flex-col bg-slate-100 p-3 rounded-xl border border-slate-200 h-[520px]">
            <div className="w-full flex justify-between items-center mb-2 text-xs font-bold text-slate-700 px-1">
              <span>📄 Vista Previa del Documento Completo</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Usa los controles del visor para hojear las páginas
              </span>
            </div>

            {/* Visor PDF Nativo mediante iFrame Blob */}
            <div className="w-full flex-1 bg-white rounded-lg border border-slate-300 overflow-hidden shadow-inner">
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=1&navpanes=0`}
                  title="Vista previa del PDF"
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  Cargando documento...
                </div>
              )}
            </div>
          </div>

          {/* Panel Derecho: Asignación de Intervalos por Categoría */}
          <div className="lg:col-span-5 flex flex-col h-[520px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
              Asignación de Páginas por Sección
            </h3>
            <p className="text-[11px] text-slate-500 mb-3 leading-tight">
              Ingresa el rango de páginas de cada sección (ej: <code className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200 font-bold">1-3</code> para las páginas 1 a 3, o <code className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200 font-bold">4</code> para una sola hoja).
            </p>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {documentRanges.map((doc, idx) => (
                <div
                  key={doc.name}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors"
                >
                  <label className="text-xs font-semibold text-slate-700 w-3/5 truncate pr-2" title={doc.name}>
                    {doc.name}
                  </label>
                  <input
                    type="text"
                    value={doc.range}
                    placeholder="ej. 1-3 ó 4"
                    onChange={(e) => handleRangeChange(idx, e.target.value)}
                    className="w-2/5 px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4B43] bg-white font-medium text-slate-800"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pie de página con acciones */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
            className="px-5 py-2 text-xs font-bold text-white bg-[#1B4B43] hover:bg-[#153B34] rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? "Procesando..." : "Procesar y Dividir Expediente"}
          </button>
        </div>
      </div>
    </div>
  );
}
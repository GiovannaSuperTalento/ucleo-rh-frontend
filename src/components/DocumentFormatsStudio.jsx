import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileText, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { API_BASE, api as documentApi } from "../api";
import { formatDateInSpanishWords } from "../utils/dateWords";

const EMPTY_TEMPLATE = {
  is_custom: true,
  name: "",
  title: "",
  content: "A QUIEN CORRESPONDA:\n\nPor medio de la presente hacemos constar que {{nombre_completo}} colabora en {{empresa}} desde {{fecha_ingreso}}, desempeñando el puesto de {{puesto}}.\n\nSe extiende el presente documento para los fines que al interesado convengan.",
  footer: "Documento emitido por {{empresa}} · Recursos Humanos",
};

function templateFields(employee) {
  const rawPayrollType = String(employee.payroll_type || "QUI").toUpperCase();
  const payrollType = rawPayrollType.includes("SEM") ? "SEM" : rawPayrollType.includes("DIA") ? "DIA" : rawPayrollType.includes("MEN") ? "MEN" : "QUI";
  const periodsPerMonth = payrollType === "SEM" ? 52 / 12 : payrollType === "DIA" ? 30 : payrollType === "MEN" ? 1 : 2;
  const monthlySalary = Number(employee.base_salary) || (Number(employee.pay_period_salary) * periodsPerMonth) || (Number(employee.base_daily_salary) * 30) || 0;
  const dailySalary = Number(employee.base_daily_salary) || monthlySalary / 30;
  const integratedDailySalary = Number(employee.sdi_salary) || dailySalary;
  const periodSalary = payrollType === "DIA"
    ? integratedDailySalary
    : employee.pay_period_salary !== null && employee.pay_period_salary !== undefined && employee.pay_period_salary !== ""
    ? Number(employee.pay_period_salary)
    : monthlySalary / periodsPerMonth;
  const weeklySalary = monthlySalary * 12 / 52;
  const biweeklySalary = monthlySalary / 2;
  const money = (amount) => `$${Number(amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
  const amountInWords = (amount) => {
    const centsValue = Math.round(Math.abs(Number(amount) || 0) * 100);
    const integer = Math.floor(centsValue / 100);
    const cents = String(centsValue % 100).padStart(2, "0");
    const units = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const tens = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const hundreds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
    const group = (value) => {
      if (!value) return "";
      if (value === 100) return "CIEN";
      let words = "";
      if (value >= 100) { words += `${hundreds[Math.floor(value / 100)]} `; value %= 100; }
      if (value >= 10 && value < 20) return `${words}${["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"][value - 10]} `;
      if (value >= 20 && value < 30) return `${words}${({ 21: "VEINTIÚN", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 26: "VEINTISÉIS" })[value] || (value === 20 ? "VEINTE" : `VEINTI${units[value % 10]}`)} `;
      if (value >= 30) return `${words}${tens[Math.floor(value / 10)]}${value % 10 ? ` Y ${units[value % 10]}` : ""} `;
      return `${words}${units[value]} `;
    };
    if (integer > 999999999) return "—";
    let words = "";
    const millions = Math.floor(integer / 1000000);
    const thousands = Math.floor((integer % 1000000) / 1000);
    const remainder = integer % 1000;
    if (millions) words += millions === 1 ? "UN MILLÓN " : `${group(millions).trim()} MILLONES `;
    if (thousands) words += thousands === 1 ? "MIL " : `${group(thousands).trim()} MIL `;
    if (remainder) words += group(remainder);
    return `${words.trim() || "CERO"} PESOS ${cents}/100 M.N.`;
  };
  const payrollLabel = payrollType === "SEM" ? "Semanal" : payrollType === "DIA" ? "Diario" : payrollType === "MEN" ? "Mensual" : "Quincenal";
  return {
    nombre_completo: [employee.first_name, employee.last_name_paternal || employee.last_name, employee.last_name_maternal].filter(Boolean).join(" ").toLocaleUpperCase("es-MX"),
    nombre: String(employee.first_name || "").toLocaleUpperCase("es-MX"),
    apellido_paterno: String(employee.last_name_paternal || employee.last_name || "").toLocaleUpperCase("es-MX"),
    apellido_materno: String(employee.last_name_maternal || "").toLocaleUpperCase("es-MX"),
    puesto: employee.position || "—",
    departamento: employee.department || "—",
    empresa: employee.company_name || employee.legal_name || "—",
    domicilio_empresa: employee.company_address || employee.address_company || "—",
    direccion_empresa: employee.company_address || employee.address_company || "—",
    rfc: employee.rfc || "—",
    curp: employee.curp || "—",
    nss: employee.nss || "—",
    fecha_ingreso: employee.hire_date ? new Date(employee.hire_date).toLocaleDateString("es-MX") : "—",
    fecha_alta: employee.hire_date ? new Date(employee.hire_date).toLocaleDateString("es-MX") : "—",
    fecha_alta_escrita: formatDateInSpanishWords(employee.hire_date),
    fecha_antiguedad: employee.recognized_seniority_date ? new Date(employee.recognized_seniority_date).toLocaleDateString("es-MX") : "—",
    fecha_ingreso_reconocida: employee.recognized_seniority_date ? new Date(employee.recognized_seniority_date).toLocaleDateString("es-MX") : "—",
    fecha_ingreso_anterior: employee.recognized_seniority_date ? new Date(employee.recognized_seniority_date).toLocaleDateString("es-MX") : "—",
    fecha_inicio_contrato: employee.contract_start_date ? new Date(employee.contract_start_date).toLocaleDateString("es-MX") : (employee.hire_date ? new Date(employee.hire_date).toLocaleDateString("es-MX") : "—"),
    fecha_baja: employee.termination_date || employee.discharge_date ? new Date(employee.termination_date || employee.discharge_date).toLocaleDateString("es-MX") : "—",
    fecha_termino_contrato: employee.contract_end_date ? new Date(employee.contract_end_date).toLocaleDateString("es-MX") : "Indefinido",
    fecha_fin_contrato: employee.contract_end_date ? new Date(employee.contract_end_date).toLocaleDateString("es-MX") : "Indefinido",
    fecha: new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }),
    modalidad_pago: payrollLabel,
    modalidad_pago_codigo: payrollType,
    tipo_nomina: payrollType,
    salario: money(periodSalary),
    sueldo: money(periodSalary),
    salario_periodo: money(periodSalary),
    salario_periodo_num: periodSalary.toFixed(2),
    salario_periodo_letra: amountInWords(periodSalary),
    salario_escrito: amountInWords(periodSalary),
    salario_letra: amountInWords(periodSalary),
    salario_semanal_letra: amountInWords(weeklySalary),
    salario_semanal_escrito: amountInWords(weeklySalary),
    salario_quincenal_letra: amountInWords(biweeklySalary),
    salario_quincenal_escrito: amountInWords(biweeklySalary),
    salario_mensual_letra: amountInWords(monthlySalary),
    salario_mensual_escrito: amountInWords(monthlySalary),
    salario_diario_letra: amountInWords(integratedDailySalary),
    salario_diario_escrito: amountInWords(integratedDailySalary),
    salario_semanal: money(weeklySalary),
    salario_semanal_num: weeklySalary.toFixed(2),
    sueldo_semanal: money(weeklySalary),
    salario_quincenal: money(biweeklySalary),
    salario_quincenal_num: biweeklySalary.toFixed(2),
    sueldo_quincenal: money(biweeklySalary),
    salario_diario: money(integratedDailySalary),
    salario_diario_num: integratedDailySalary.toFixed(2),
    sueldo_diario: money(integratedDailySalary),
    salario_diario_base: money(dailySalary),
    salario_diario_base_num: dailySalary.toFixed(2),
    salario_diario_integrado: money(integratedDailySalary),
    salario_diario_integrado_num: integratedDailySalary.toFixed(2),
    salario_mensual: money(monthlySalary),
    salario_mensual_num: monthlySalary.toFixed(2),
    sueldo_mensual: money(monthlySalary),
    domicilio: [employee.street, employee.exterior_number, employee.neighborhood, employee.municipality, employee.state].filter(Boolean).join(", ") || "—",
    titulo_documento: "",
    pie_pagina: "",
  };
}

function fillFields(text, fields) {
  const normalizedFields = Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key.toLocaleLowerCase("es-MX"), value]));
  return (text || "").replace(/\{\{\s*([\w.]+)\s*\}\}|\{\s*([\w.]+)\s*\}/g, (_match, doubleKey, singleKey) => {
    const value = normalizedFields[String(doubleKey || singleKey).toLocaleLowerCase("es-MX")];
    return value === null || value === undefined || value === "" ? "—" : String(value);
  });
}

function createPreviewLayout(template) {
  const makeBlock = (type, text, x, y, width, height, fontSize, extra = {}) => ({
    id: `${type}-${Math.random().toString(36).slice(2, 9)}`, type, text, x, y, width, height, fontSize, ...extra,
  });
  return [
    makeBlock("logo", "", 8, 4, 13, 8, 12),
    makeBlock("company", "{{empresa}}", 25, 5, 67, 5, 14, { bold: true, color: "#1B4B43" }),
    makeBlock("employee", "Colaborador: {{nombre_completo}} · Puesto: {{puesto}}", 9, 13, 82, 5, 8, { color: "#5B6B6E" }),
    makeBlock("date", "Fecha: {{fecha}}", 9, 19, 82, 4, 9, { align: "right" }),
    makeBlock("title", template.title || template.name || "Título del documento", 9, 27, 82, 8, 15, { bold: true, align: "center", color: "#1B4B43" }),
    makeBlock("body", template.content || "", 9, 38, 82, 45, 10.5, { color: "#1B2A2E" }),
    makeBlock("footer", template.footer || "Documento emitido por {{empresa}} · Recursos Humanos", 9, 90, 82, 6, 8, { align: "center", color: "#5B6B6E" }),
  ];
}

function updatePreviewBlock(preview, blockId, changes) {
  const layout = (preview.layout || []).map((block) => block.id === blockId ? { ...block, ...changes } : block);
  const changed = layout.find((block) => block.id === blockId);
  const next = { ...preview, layout, layout_edited: true };
  if (changed?.type === "title") next.title = changed.text;
  if (changed?.type === "body") next.content = changed.text;
  if (changed?.type === "footer") next.footer = changed.text;
  return next;
}

export default function DocumentFormatsStudio({ token, employee, templates = [], onTemplatesChange, onRefreshDocuments, selectedTemplateId, onSelectTemplate }) {
  const customTemplates = templates.filter((item) => item.is_custom);
  const eligibleCustomTemplates = customTemplates.filter((item) => !item.requires_recognized_seniority_date || employee.recognized_seniority_date);
  const restrictedSeniorityTemplateCount = customTemplates.length - eligibleCustomTemplates.length;
  const builtInTemplates = templates.filter((item) => !item.is_custom);
  const fields = useMemo(() => templateFields(employee), [employee]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [sourceFile, setSourceFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setCompanyLogo(null);
    if (!employee.company_id) {
      return () => { active = false; };
    }
    documentApi.getCompanyDocumentLogo(token, employee.company_id)
      .then((data) => { if (active) setCompanyLogo(data.logo_data || null); })
      .catch(() => { if (active) setCompanyLogo(null); });
    return () => { active = false; };
  }, [token, employee.company_id]);

  const refreshTemplates = async () => {
    const url = `${API_BASE}/documents/templates${employee.company_id ? `?company_id=${encodeURIComponent(employee.company_id)}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("No se pudo actualizar la lista de formatos.");
    const nextTemplates = await response.json();
    onTemplatesChange(nextTemplates);
    const previous = templates.find((item) => item.id === selectedTemplateId);
    const replacement = previous?.template_type_id
      ? nextTemplates.find((item) => item.template_type_id === previous.template_type_id)
      : nextTemplates.find((item) => item.id === selectedTemplateId);
    if (replacement && replacement.id !== selectedTemplateId) onSelectTemplate?.(replacement.id);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_TEMPLATE, company_id: employee.company_id || null, include_logo: true, requires_recognized_seniority_date: false });
    setSourceFile(null);
    setError("");
    setIsEditorOpen(true);
  };

  const openEdit = (template) => {
    setEditingId(template.id);
    setForm({ name: template.name, title: template.title, content: template.content || "", footer: template.footer || "", company_id: employee.company_id || null, base_template_id: template.template_type_id || null, include_logo: template.include_logo !== false, is_custom: Boolean(template.is_custom), source_file_name: template.source_file_name || "", source_format: template.source_format || "", requires_recognized_seniority_date: Boolean(template.requires_recognized_seniority_date) });
    setSourceFile(null);
    setError("");
    setIsEditorOpen(true);
  };

  const saveTemplate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let response;
      if (sourceFile) {
        const payload = new FormData();
        payload.append("file", sourceFile);
        payload.append("name", form.name);
        payload.append("title", form.title);
        payload.append("footer", form.footer || "");
        payload.append("company_id", employee.company_id || "");
        payload.append("include_logo", String(Boolean(form.include_logo)));
        payload.append("requires_recognized_seniority_date", String(Boolean(form.requires_recognized_seniority_date)));
        if (editingId) payload.append("template_id", editingId);
        response = await fetch(`${API_BASE}/documents/templates/upload`, { method: "POST", headers, body: payload });
      } else {
        response = await fetch(`${API_BASE}/documents/templates${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
          method: editingId ? "PUT" : "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, company_id: employee.company_id || null }),
        });
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo guardar el formato.");
      await refreshTemplates();
      setIsEditorOpen(false);
      if (sourceFile) {
        const nextPreview = { ...data, footer: data.footer || "", include_logo: data.include_logo !== false };
        nextPreview.layout = createPreviewLayout(nextPreview);
        setPreview(nextPreview);
        setSelectedBlockId(nextPreview.layout.find((block) => block.type === "body")?.id || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadCompanyLogo = async (file) => {
    if (!file || !employee.company_id) return;
    setLogoLoading(true);
    setError("");
    try {
      const result = await documentApi.uploadCompanyDocumentLogo(token, employee.company_id, file);
      setCompanyLogo(result.logo_data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoLoading(false);
    }
  };

  const removeCompanyLogo = async () => {
    if (!employee.company_id) return;
    setLogoLoading(true);
    setError("");
    try {
      await documentApi.deleteCompanyDocumentLogo(token, employee.company_id);
      setCompanyLogo(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoLoading(false);
    }
  };

  const deleteTemplate = async (template) => {
    if (!window.confirm(`¿Eliminar el formato “${template.name}”?`)) return;
    try {
      const response = await fetch(`${API_BASE}/documents/templates/${encodeURIComponent(template.id)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("No se pudo eliminar el formato.");
      await refreshTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  const startPreview = (template) => {
    const nextPreview = { ...template, content: template.content || "", title: template.title || template.name, footer: template.footer || "" };
    nextPreview.layout = Array.isArray(template.layout) && template.layout.length ? template.layout : createPreviewLayout(nextPreview);
    nextPreview.layout_edited = Boolean(template.layout_edited);
    setPreview(nextPreview);
    setSelectedBlockId(nextPreview.layout.find((block) => block.type === "body")?.id || null);
    setError("");
  };

  const savePreviewAsTemplate = async () => {
    setSaving(true);
    setError("");
    try {
      const { id, name, title, content, footer } = preview;
      const response = await fetch(`${API_BASE}/documents/templates/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, title, content, footer, layout: preview.layout, company_id: employee.company_id || null, include_logo: preview.include_logo, requires_recognized_seniority_date: preview.requires_recognized_seniority_date, base_template_id: preview.template_type_id || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudieron guardar los cambios.");
      await refreshTemplates();
      setPreview({ ...data, layout: Array.isArray(data.layout) && data.layout.length ? data.layout : preview.layout, layout_edited: Boolean(data.layout_edited) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const generateAndDownload = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/documents/generate-custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employee_id: employee.id, template_id: preview.id, title: preview.title, content: preview.content, footer: preview.footer, layout: preview.layout, layout_edited: preview.layout_edited, include_logo: preview.include_logo }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo generar el documento.");
      const baseUrl = API_BASE.replace(/\/api$/, "");
      const fileResponse = await fetch(data.file_url.startsWith("http") ? data.file_url : `${baseUrl}${data.file_url}`);
      if (!fileResponse.ok) throw new Error("El documento se generó, pero no se pudo descargar.");
      const downloadUrl = URL.createObjectURL(await fileResponse.blob());
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = data.filename || `${preview.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      await onRefreshDocuments?.();
      setPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bodyPreview = fillFields(preview?.content || "", { ...fields, titulo_documento: preview?.title || "", pie_pagina: preview?.footer || "" });
  const selectedBlock = preview?.layout?.find((block) => block.id === selectedBlockId) || null;

  const beginBlockDrag = (event, block) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockId(block.id);
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    canvasRef.current.setPointerCapture?.(event.pointerId);
    dragRef.current = { id: block.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: block.x, y: block.y, width: bounds.width, height: bounds.height };
  };

  const movePreviewBlock = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = (event.clientX - drag.startX) / drag.width * 100;
    const dy = (event.clientY - drag.startY) / drag.height * 100;
    setPreview((current) => current ? updatePreviewBlock(current, drag.id, {
      x: Math.max(0, Math.min(100 - (current.layout.find((block) => block.id === drag.id)?.width || 5), drag.x + dx)),
      y: Math.max(0, Math.min(100 - (current.layout.find((block) => block.id === drag.id)?.height || 5), drag.y + dy)),
    }) : current);
  };

  const addTextBlock = () => {
    const block = { id: `text-${Date.now()}`, type: "text", text: "Escribe aquí", x: 16, y: 48, width: 68, height: 8, fontSize: 11, color: "#1B2A2E", align: "left" };
    setPreview((current) => ({ ...current, layout: [...(current.layout || []), block], layout_edited: true }));
    setSelectedBlockId(block.id);
  };

  return (
    <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><FileText size={16} className="text-emerald-800" /> Formatos editables</h3>
          <p className="mt-1 text-xs text-slate-600">Los formatos y sus ediciones se guardan para la empresa asignada a este colaborador. Revisa y ajusta cada documento antes de descargarlo.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4B43] px-3 py-2 text-xs font-semibold text-white hover:bg-[#153b34]"><Plus size={14} /> Nuevo formato</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          {companyLogo ? <img src={companyLogo} alt={`Logo de ${employee.company_name || "la empresa"}`} className="max-h-full max-w-full object-contain" /> : <span className="px-2 text-center text-[10px] text-slate-400">Sin logo</span>}
        </div>
        <div className="min-w-[180px] flex-1"><p className="text-xs font-semibold text-slate-800">Logo de {employee.company_name || "la empresa"}</p><p className="mt-1 text-[11px] text-slate-500">Se usará solo en formatos asociados a esta empresa. Puedes activarlo o desactivarlo en cada formato.</p></div>
        <label className={`cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${(!employee.company_id || logoLoading) ? "pointer-events-none opacity-50" : ""}`}>
          {logoLoading ? "Guardando…" : companyLogo ? "Cambiar logo" : "Subir logo"}
          <input type="file" accept="image/png,image/jpeg" className="hidden" disabled={!employee.company_id || logoLoading} onChange={(event) => { uploadCompanyLogo(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
        {companyLogo && <button disabled={logoLoading} onClick={removeCompanyLogo} className="rounded-lg px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-50">Quitar</button>}
        {!employee.company_id && <span className="text-[11px] text-amber-700">Asigna la empresa al colaborador para cargar su logo.</span>}
      </div>

      {eligibleCustomTemplates.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {eligibleCustomTemplates.map((template) => (
            <article key={template.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{template.name}</p><p className="truncate text-[11px] text-slate-500">{template.title}</p></div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => startPreview(template)} title="Vista previa" className="rounded-md p-1.5 text-emerald-800 hover:bg-emerald-50"><Eye size={14} /></button>
                <button onClick={() => openEdit(template)} title="Editar formato" className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><Pencil size={14} /></button>
                <button onClick={() => deleteTemplate(template)} title="Eliminar formato" className="rounded-md p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : restrictedSeniorityTemplateCount ? (
        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800">El formato de ADDENDUM de antigüedad aparecerá aquí cuando registres la fecha reconocida para este colaborador.</div>
      ) : (
        <div className="rounded-lg border border-dashed border-emerald-200 bg-white/70 px-4 py-3 text-xs text-slate-500">Aún no hay formatos personalizados. Puedes crear el primero aquí.</div>
      )}

      {builtInTemplates.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-slate-700">Editar cartas y formatos predefinidos</summary>
          <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {builtInTemplates.map((template) => (
              <article key={template.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{template.name}</p><p className="truncate text-[11px] text-slate-500">{template.footer ? "Pie personalizado" : "Pie predeterminado"}{template.content ? " · Contenido editado" : ""}</p></div>
                <button onClick={() => openEdit(template)} title="Editar formato" className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><Pencil size={14} /></button>
              </article>
            ))}
          </div>
        </details>
      )}

      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <form onSubmit={saveTemplate} className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><div><h3 className="text-base font-semibold text-slate-900">{editingId ? "Editar formato" : "Crear formato"}</h3><p className="mt-1 text-xs text-slate-500">Usa etiquetas con una o dos llaves, por ejemplo <code>{"{nombre_completo}"}</code> o <code>{"{{nombre_completo}}"}</code>. Se reconocen aunque estén en mayúsculas.</p></div><button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
            <label className="mb-3 block rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 p-3 text-xs font-medium text-slate-700">Plantilla desde archivo Word, PDF o texto<input type="file" accept=".docx,.pdf,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => { const file = e.target.files?.[0] || null; setSourceFile(file); if (file) setForm((current) => ({ ...current, source_format: file.name.toLowerCase().split(".").pop() })); }} className="mt-2 block w-full text-xs" /><span className="mt-1 block text-[11px] font-normal text-slate-500">Word (.docx) conserva su diseño y se rellenan etiquetas como {"{nombre_completo}"} o {"{{empresa}}"}. PDF y TXT se importan como texto editable y se generan con el diseño estándar de Núcleo RH. Máximo 8 MB.{form.source_file_name ? ` Archivo actual: ${form.source_file_name}.` : ""}</span>{sourceFile && <span className="mt-1 block text-[11px] text-emerald-800">Nuevo archivo: {sourceFile.name}</span>}</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-700">Nombre en la lista<input required maxLength={180} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Carta de antigüedad" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-700" /></label>
              <label className="text-xs font-medium text-slate-700">Título del documento<input required maxLength={240} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. CONSTANCIA DE ANTIGÜEDAD" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-700" /></label>
            </div>
              <label className="mt-3 block text-xs font-medium text-slate-700">{form.source_format === "docx" ? "Texto detectado en Word" : "Contenido"}<textarea required={!sourceFile && !form.source_file_name && form.is_custom} readOnly={form.source_format === "docx"} rows={10} maxLength={12000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={editingId && !form.is_custom ? "Deja en blanco para conservar el contenido actual; escribe aquí para reemplazarlo." : "Escribe el contenido del documento."} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-emerald-700 read-only:bg-slate-100" /></label>
              {form.source_format === "docx" && <p className="mt-1 text-[11px] text-slate-500">Para cambiar el contenido o diseño de esta plantilla Word, edita el archivo original y vuelve a cargarlo.</p>}
              {editingId && !form.is_custom && <p className="mt-1 text-[11px] text-slate-500">Al escribir contenido, este reemplazará el texto central de la carta. Si lo dejas vacío, se conserva el contenido original del formato.</p>}
            <label className="mt-3 block text-xs font-medium text-slate-700">Pie de página<textarea rows={2} maxLength={1000} value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} placeholder="Texto que aparecerá al pie de cada página" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-700" /></label>
            {form.is_custom && <label className="mt-3 flex items-start gap-2 text-xs font-medium text-slate-700"><input type="checkbox" checked={Boolean(form.requires_recognized_seniority_date)} onChange={(e) => setForm({ ...form, requires_recognized_seniority_date: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700" /><span>Es un ADDENDUM de reconocimiento de antigüedad. Solo estará disponible para expedientes con fecha reconocida registrada.</span></label>}
            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-700"><input type="checkbox" disabled={form.source_format === "docx"} checked={Boolean(form.include_logo)} onChange={(e) => setForm({ ...form, include_logo: e.target.checked })} className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 disabled:opacity-50" /> Incluir logo de {employee.company_name || "la empresa"} en el documento</label>
            {form.source_format === "docx" && <p className="mt-1 text-[11px] text-slate-500">En Word, el logo debe estar incluido en el archivo de plantilla. En PDF/TXT se agrega el logo de la empresa con esta opción.</p>}
            <div className="mt-3 rounded-lg bg-slate-50 p-3"><p className="mb-2 text-[11px] font-semibold text-slate-700">Campos disponibles</p><div className="flex flex-wrap gap-1.5">{Object.keys(fields).map((key) => <code key={key} className="rounded bg-white px-2 py-1 text-[10px] text-emerald-900">{`{{${key}}}`}</code>)}</div><p className="mb-2 mt-3 text-[11px] font-semibold text-slate-700">Datos de actas y solicitudes</p><div className="flex flex-wrap gap-1.5">{["nombre_hijo", "fecha_hechos", "hora_hechos", "lugar_hechos", "observaciones", "testigo_1", "testigo_2", "opciones_seleccionadas", "fecha_solicitud"].map((key) => <code key={key} className="rounded bg-white px-2 py-1 text-[10px] text-emerald-900">{`{{${key}}}`}</code>)}</div></div>
            {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1B4B43] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"><Save size={14} /> {saving ? "Guardando…" : "Guardar formato"}</button></div>
          </form>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3"><div><h3 className="text-sm font-semibold text-slate-900">Vista previa editable · {preview.name}</h3><p className="text-[11px] text-slate-500">Selecciona un elemento para editarlo; arrástralo para moverlo. La página representa una hoja tamaño carta.{preview.source_format === "docx" && preview.layout_edited ? " Al modificar el diseño, se descargará como PDF para conservar los cambios." : ""}</p></div><button onClick={() => setPreview(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(210px,0.65fr)_minmax(0,1.35fr)]">
              <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex gap-2"><button onClick={addTextBlock} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4B43] px-3 py-2 text-xs font-semibold text-white"><Plus size={14} /> Agregar texto</button><button disabled={!selectedBlock} onClick={() => { setPreview((current) => ({ ...current, layout: current.layout.filter((block) => block.id !== selectedBlockId), include_logo: selectedBlock?.type === "logo" ? false : current.include_logo, layout_edited: true })); setSelectedBlockId(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-40"><Trash2 size={14} /> Borrar</button></div>
                <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={Boolean(preview.include_logo)} onChange={(e) => setPreview((current) => ({ ...current, include_logo: e.target.checked, layout: e.target.checked && !current.layout.some((block) => block.type === "logo") ? [...current.layout, { id: `logo-${Date.now()}`, type: "logo", text: "", x: 8, y: 4, width: 13, height: 8, fontSize: 12 }] : current.layout, layout_edited: true }))} /> Incluir logo de {employee.company_name || "la empresa"}</label>
                {selectedBlock ? <>
                  <p className="border-t border-slate-100 pt-3 text-xs font-semibold text-slate-800">Elemento seleccionado: {selectedBlock.type === "text" ? "Texto agregado" : ({ logo: "Logo", company: "Empresa", employee: "Colaborador", date: "Fecha", title: "Título", body: "Contenido", footer: "Pie de página" }[selectedBlock.type] || selectedBlock.type)}</p>
                  {selectedBlock.type === "logo" ? <p className="text-[11px] text-slate-500">Arrastra el logo sobre la hoja para cambiar su posición. Actívalo o desactívalo con la casilla.</p> : <label className="block text-xs font-medium text-slate-700">Texto<textarea rows={selectedBlock.type === "body" ? 11 : 4} maxLength={selectedBlock.type === "body" ? 12000 : 3000} value={selectedBlock.text || ""} onChange={(e) => setPreview((current) => updatePreviewBlock(current, selectedBlock.id, { text: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-5" /></label>}
                  <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-600">Ancho (%)<input type="number" min="1" max="100" value={selectedBlock.width} onChange={(e) => setPreview((current) => updatePreviewBlock(current, selectedBlock.id, { width: Number(e.target.value) }))} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5" /></label><label className="text-xs text-slate-600">Alto (%)<input type="number" min="1" max="100" value={selectedBlock.height} onChange={(e) => setPreview((current) => updatePreviewBlock(current, selectedBlock.id, { height: Number(e.target.value) }))} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5" /></label></div>
                  {selectedBlock.type !== "logo" && <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-600">Tamaño de letra<input type="number" min="6" max="40" step="0.5" value={selectedBlock.fontSize || 10} onChange={(e) => setPreview((current) => updatePreviewBlock(current, selectedBlock.id, { fontSize: Number(e.target.value) }))} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5" /></label><label className="text-xs text-slate-600">Alinear<select value={selectedBlock.align || "left"} onChange={(e) => setPreview((current) => updatePreviewBlock(current, selectedBlock.id, { align: e.target.value }))} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option><option value="justify">Justificado</option></select></label></div>}
                </> : <p className="text-xs leading-5 text-slate-500">Haz clic en el texto o el logo de la hoja para seleccionarlo. Podrás modificarlo, moverlo o borrarlo desde aquí.</p>}
                <p className="border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">Las etiquetas con una o dos llaves y en mayúsculas o minúsculas, por ejemplo <code>{"{NOMBRE_COMPLETO}"}</code>, se rellenan con los datos del colaborador.</p>
              </aside>
              <div className="min-w-0 overflow-auto rounded-xl bg-slate-200 p-3 sm:p-5">
                <div ref={canvasRef} onPointerMove={movePreviewBlock} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} className="relative mx-auto w-full max-w-[612px] touch-none overflow-hidden bg-white shadow-lg [container-type:inline-size]" style={{ aspectRatio: "612 / 792" }}>
                  {preview.layout.map((block) => {
                    if (block.type === "logo" && (!preview.include_logo || !companyLogo)) return null;
                    const isSelected = selectedBlockId === block.id;
                    const rawText = block.type === "body" ? bodyPreview : fillFields(block.text || "", { ...fields, titulo_documento: preview.title, pie_pagina: preview.footer });
                    return <div key={block.id} onPointerDown={(event) => beginBlockDrag(event, block)} onClick={() => setSelectedBlockId(block.id)} className={`absolute cursor-move select-none overflow-hidden whitespace-pre-wrap break-words ${isSelected ? "z-10 outline outline-2 outline-dashed outline-emerald-600" : "hover:outline hover:outline-1 hover:outline-emerald-300"}`} style={{ left: `${block.x}%`, top: `${block.y}%`, width: `${block.width}%`, height: `${block.height}%`, fontSize: `clamp(7px, ${(block.fontSize || 10) * 100 / 612}cqw, 32px)`, lineHeight: 1.35, textAlign: block.align || "left", color: block.color || "#1B2A2E", fontWeight: block.bold ? 700 : 400 }}>
                      {block.type === "logo" ? <img src={companyLogo} alt="Logo de empresa" draggable="false" className="h-full w-full object-contain" /> : rawText}
                    </div>;
                  })}
                </div>
              </div>
            </div>
            {error && <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3"><button disabled={saving} onClick={savePreviewAsTemplate} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><Save size={14} /> Guardar en formato</button><button disabled={saving} onClick={generateAndDownload} className="inline-flex items-center gap-2 rounded-lg bg-[#1B4B43] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><Download size={14} /> {saving ? "Generando…" : preview.source_format === "docx" && !preview.layout_edited ? "Generar y descargar Word" : "Generar y descargar PDF"}</button></div>
          </div>
        </div>
      )}
    </section>
  );
}

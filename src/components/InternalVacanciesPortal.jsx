import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, Clock3, FileText, MapPin, Search, Send, UploadCloud } from "lucide-react";

const STAGE_LABELS = {
  recibido: "Recibida",
  revision: "En revisión",
  entrevista: "Entrevista",
  evaluacion: "Evaluación",
  oferta: "Oferta",
  contratado: "Contratado",
  descartado: "No seleccionado",
};
const STAGE_COLORS = {
  recibido: "bg-blue-50 text-blue-700",
  revision: "bg-violet-50 text-violet-700",
  entrevista: "bg-amber-50 text-amber-800",
  evaluacion: "bg-cyan-50 text-cyan-800",
  oferta: "bg-emerald-50 text-emerald-800",
  contratado: "bg-green-100 text-green-800",
  descartado: "bg-slate-100 text-slate-600",
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function getInitialApplicant(user) {
  const displayName = String(user?.display_name || user?.name || "").trim();
  const fallbackName = String(user?.email || "").split("@")[0].replace(/[._-]+/g, " ");
  const parts = (displayName || fallbackName).split(/\s+/).filter(Boolean);
  return {
    first_name: parts.shift() || "",
    last_name: parts.join(" "),
    email: user?.email || "",
    phone: "",
    applicant_type: "propia",
    cv: null,
  };
}

export default function InternalVacanciesPortal({ token, user, api }) {
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vacancies");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [applyingTo, setApplyingTo] = useState(null);
  const [form, setForm] = useState(() => getInitialApplicant(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [openVacancies, myApplications] = await Promise.all([
        api.getInternalVacancies(token),
        api.getMyInternalApplications(token),
      ]);
      setVacancies(Array.isArray(openVacancies) ? openVacancies : []);
      setApplications(Array.isArray(myApplications) ? myApplications : []);
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar el portal de vacantes.");
    } finally {
      setLoading(false);
    }
  }, [api, token]);

  useEffect(() => { loadPortal(); }, [loadPortal]);

  const filteredVacancies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    if (!query) return vacancies;
    return vacancies.filter(vacancy => [vacancy.title, vacancy.company_name, vacancy.department, vacancy.location, vacancy.description]
      .some(value => String(value || "").toLocaleLowerCase("es-MX").includes(query)));
  }, [vacancies, search]);

  function openApplication(vacancy, applicantType = "propia") {
    setForm(applicantType === "propia"
      ? getInitialApplicant(user)
      : { first_name: "", last_name: "", email: "", phone: "", applicant_type: "referido", cv: null });
    setApplyingTo(vacancy);
    setError("");
    setNotice("");
  }

  async function submitApplication(event) {
    event.preventDefault();
    if (!applyingTo || !form.cv) {
      setError("Adjunta el CV de la persona que se postula.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const body = new FormData();
    body.append("first_name", form.first_name.trim());
    body.append("last_name", form.last_name.trim());
    body.append("email", form.email.trim());
    body.append("phone", form.phone.trim());
    body.append("applicant_type", form.applicant_type);
    body.append("cv", form.cv);
    try {
      await api.submitInternalApplication(token, applyingTo.id, body);
      setApplyingTo(null);
      setActiveTab("applications");
      setNotice("CV enviado a Recursos Humanos. Puedes consultar aquí el avance de la postulación.");
      await loadPortal();
    } catch (submitError) {
      setError(submitError.message || "No se pudo enviar el CV.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="mx-auto max-w-6xl">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900"><BriefcaseBusiness size={20} /></span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">Vacantes internas</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Consulta las oportunidades abiertas y postúlate o recomienda a alguien de confianza. Recursos Humanos dará seguimiento desde Reclutamiento.</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"><BriefcaseBusiness size={14} /> {vacancies.length} vacante(s) abierta(s)</span>
    </header>

    <div className="mb-5 flex gap-2 rounded-xl border border-slate-200 bg-white px-3 pt-2 shadow-sm">
      <button type="button" onClick={() => { setActiveTab("vacancies"); setNotice(""); }} className={`border-b-2 px-3 py-2.5 text-sm font-medium ${activeTab === "vacancies" ? "border-emerald-800 text-emerald-900" : "border-transparent text-slate-500"}`}>Vacantes abiertas</button>
      <button type="button" onClick={() => { setActiveTab("applications"); setNotice(""); }} className={`border-b-2 px-3 py-2.5 text-sm font-medium ${activeTab === "applications" ? "border-emerald-800 text-emerald-900" : "border-transparent text-slate-500"}`}>Mis postulaciones <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px]">{applications.length}</span></button>
    </div>

    {notice && <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{notice}</div>}
    {error && !applyingTo && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

    {activeTab === "vacancies" && <>
      <label className="mb-4 flex max-w-xl items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-400"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar puesto, empresa o ubicación…" className="w-full bg-transparent text-sm text-slate-700 outline-none" /></label>
      {loading ? <p className="py-12 text-center text-sm text-slate-500">Cargando vacantes…</p> : filteredVacancies.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BriefcaseBusiness className="mx-auto mb-3 text-slate-400" size={28} /><h2 className="font-semibold text-slate-800">{search ? "No encontramos coincidencias" : "Por ahora no hay vacantes abiertas"}</h2><p className="mt-1 text-sm text-slate-500">{search ? "Prueba otra búsqueda." : "Cuando Recursos Humanos publique nuevas oportunidades, aparecerán aquí."}</p></div> : <div className="grid gap-4 lg:grid-cols-2">
        {filteredVacancies.map(vacancy => {
          const expanded = expandedId === vacancy.id;
          return <article key={vacancy.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">{vacancy.title}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">{vacancy.company_name && <span className="inline-flex items-center gap-1"><Building2 size={13} />{vacancy.company_name}</span>}{vacancy.department && <span>{vacancy.department}</span>}{vacancy.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{vacancy.location}</span>}</div></div><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Abierta</span></div>
              {vacancy.employment_type && <p className="mt-3 text-xs font-medium text-slate-600">{vacancy.employment_type}</p>}
              {vacancy.description && <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 ${expanded ? "" : "line-clamp-3"}`}>{vacancy.description}</p>}
              {expanded && <div className="mt-3 space-y-3 text-sm text-slate-600">{vacancy.responsibilities && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Responsabilidades</h3><p className="whitespace-pre-wrap leading-6">{vacancy.responsibilities}</p></div>}{vacancy.requirements && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Requisitos</h3><p className="whitespace-pre-wrap leading-6">{vacancy.requirements}</p></div>}</div>}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setExpandedId(expanded ? "" : vacancy.id)} className="text-xs font-medium text-slate-600">{expanded ? "Ver menos" : "Ver detalles"}</button><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openApplication(vacancy, "referido")} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs font-semibold text-emerald-900">Recomendar a alguien</button><button type="button" onClick={() => openApplication(vacancy, "propia")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4B43] px-3 py-2 text-xs font-semibold text-white"><Send size={13} /> Postularme</button></div></div>
            </div>
          </article>;
        })}
      </div>}
    </>}

    {activeTab === "applications" && <div className="space-y-3">{loading ? <p className="py-12 text-center text-sm text-slate-500">Cargando postulaciones…</p> : applications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><FileText className="mx-auto mb-3 text-slate-400" size={28} /><h2 className="font-semibold text-slate-800">Aún no has enviado postulaciones</h2><p className="mt-1 text-sm text-slate-500">Aquí podrás consultar el avance de tus postulaciones y las referencias que envíes.</p></div> : applications.map(application => <article key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div><h2 className="font-semibold text-slate-900">{application.vacancy_title}</h2><p className="mt-1 text-xs text-slate-500">{application.company_name || "Empresa"} · {application.applicant_type === "referido" ? `Referencia para ${application.first_name} ${application.last_name}` : `Tu postulación · ${application.first_name} ${application.last_name}`}</p><p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400"><CalendarDays size={12} /> Enviada {formatDate(application.applied_at)}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${STAGE_COLORS[application.stage] || "bg-slate-100 text-slate-700"}`}><Clock3 size={13} />{STAGE_LABELS[application.stage] || "En proceso"}</span></article>)}</div>}

    {applyingTo && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setApplyingTo(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="internal-application-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 id="internal-application-title" className="text-lg font-semibold text-slate-900">{form.applicant_type === "referido" ? "Recomendar a una persona" : "Postularme a la vacante"}</h2><p className="mt-1 text-sm text-slate-500">{applyingTo.title} · {applyingTo.company_name || "Núcleo RH"}</p></div><button type="button" onClick={() => !saving && setApplyingTo(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">×</button></div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setForm(getInitialApplicant(user))} className={`rounded-lg px-3 py-2 text-xs font-semibold ${form.applicant_type === "propia" ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600"}`}>Es mi CV</button><button type="button" onClick={() => setForm({ first_name: "", last_name: "", email: "", phone: "", applicant_type: "referido", cv: null })} className={`rounded-lg px-3 py-2 text-xs font-semibold ${form.applicant_type === "referido" ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600"}`}>Es de alguien que recomiendo</button></div>
        <form onSubmit={submitApplication} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-slate-700">Nombre(s) *<input required maxLength={150} value={form.first_name} onChange={event => setForm(current => ({ ...current, first_name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium text-slate-700">Apellidos *<input required maxLength={150} value={form.last_name} onChange={event => setForm(current => ({ ...current, last_name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium text-slate-700">Correo electrónico *<input required type="email" maxLength={255} value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium text-slate-700">Teléfono<input type="tel" maxLength={80} value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label></div>
          <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-700"><span className="mb-2 flex items-center gap-2 font-semibold"><UploadCloud size={16} /> Adjuntar CV * <span className="font-normal text-slate-500">PDF, DOC o DOCX; máximo 10 MB</span></span><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required onChange={event => setForm(current => ({ ...current, cv: event.target.files?.[0] || null }))} className="block w-full text-xs" />{form.cv && <span className="mt-2 block truncate text-emerald-800">{form.cv.name}</span>}</label>
          <p className="text-[11px] leading-5 text-slate-500">El CV y los datos se compartirán con Recursos Humanos para el proceso de selección. Solo podrás consultar el estado de las postulaciones que envíes desde tu cuenta.</p>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => setApplyingTo(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600">Cancelar</button><button type="submit" disabled={saving || !form.cv} className="inline-flex items-center gap-2 rounded-lg bg-[#1B4B43] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={15} />{saving ? "Enviando CV…" : "Enviar postulación"}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}

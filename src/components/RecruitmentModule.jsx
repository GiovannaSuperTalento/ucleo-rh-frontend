import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase, Building2, CalendarDays, Check, Clock3, Download, FileText,
  MapPin, MessageSquare, Pencil, Phone, Plus, RefreshCw, Search, Send,
  UserRound, X,
} from "lucide-react";

const STAGES = [
  { id: "recibido", label: "Recibidos", color: "#2563EB", soft: "#EFF6FF" },
  { id: "revision", label: "En revisión", color: "#7C3AED", soft: "#F5F3FF" },
  { id: "entrevista", label: "Entrevista", color: "#C6793D", soft: "#FBEBDC" },
  { id: "evaluacion", label: "Evaluación", color: "#0891B2", soft: "#ECFEFF" },
  { id: "oferta", label: "Oferta", color: "#15803D", soft: "#F0FDF4" },
  { id: "contratado", label: "Contratados", color: "#047857", soft: "#ECFDF5" },
  { id: "descartado", label: "Descartados", color: "#B14444", soft: "#FEF2F2" },
];

const VACANCY_STATUSES = {
  abierta: { label: "Abierta", color: "#2F7D5A", soft: "#E4F3EB" },
  pausada: { label: "Pausada", color: "#A16207", soft: "#FEF3C7" },
  cerrada: { label: "Cerrada", color: "#64748B", soft: "#F1F5F9" },
};

const EMPTY_VACANCY = {
  title: "", company_id: "", department: "", location: "",
  employment_type: "Tiempo completo", description: "", requirements: "", status: "abierta",
};

const EMPTY_CANDIDATE = {
  first_name: "", last_name: "", email: "", phone: "", source: "Registro manual", cv: null,
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function RecruitmentModule({ token, companies = [], api }) {
  const [vacancies, setVacancies] = useState([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState("");
  const [applications, setApplications] = useState([]);
  const [loadingVacancies, setLoadingVacancies] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [editingVacancyId, setEditingVacancyId] = useState("");
  const [vacancyForm, setVacancyForm] = useState(EMPTY_VACANCY);
  const [savingVacancy, setSavingVacancy] = useState(false);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [candidateForm, setCandidateForm] = useState(EMPTY_CANDIDATE);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [activities, setActivities] = useState([]);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [changingStageId, setChangingStageId] = useState("");

  const selectedVacancy = useMemo(
    () => vacancies.find((vacancy) => vacancy.id === selectedVacancyId) || null,
    [vacancies, selectedVacancyId]
  );

  const loadVacancies = useCallback(async () => {
    setLoadingVacancies(true);
    setError("");
    try {
      const data = await api.getAtsVacancies(token);
      const list = Array.isArray(data) ? data : [];
      setVacancies(list);
      setSelectedVacancyId((current) =>
        list.some((vacancy) => vacancy.id === current)
          ? current
          : (list.find((vacancy) => vacancy.status === "abierta") || list[0])?.id || ""
      );
    } catch (err) {
      setError(err.message || "No se pudieron cargar las vacantes.");
    } finally {
      setLoadingVacancies(false);
    }
  }, [api, token]);

  const loadApplications = useCallback(async (vacancyId = selectedVacancyId, search = searchValue) => {
    setLoadingApplications(true);
    setError("");
    try {
      const data = await api.getAtsApplications(token, vacancyId, search);
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los candidatos.");
    } finally {
      setLoadingApplications(false);
    }
  }, [api, token, selectedVacancyId, searchValue]);

  useEffect(() => { loadVacancies(); }, [loadVacancies]);
  useEffect(() => {
    if (selectedVacancyId) loadApplications(selectedVacancyId, searchValue);
    else setApplications([]);
  }, [loadApplications, selectedVacancyId]);

  useEffect(() => {
    if (!selectedApplication) {
      setActivities([]);
      return;
    }
    api.getAtsActivities(token, selectedApplication.id)
      .then((data) => setActivities(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "No se pudo cargar el seguimiento."));
  }, [api, token, selectedApplication?.id]);

  function startNewVacancy() {
    setEditingVacancyId("");
    setVacancyForm({ ...EMPTY_VACANCY, company_id: companies[0]?.id || "" });
    setShowVacancyForm(true);
  }

  function startEditVacancy(vacancy) {
    setEditingVacancyId(vacancy.id);
    setVacancyForm({ ...EMPTY_VACANCY, ...vacancy, company_id: vacancy.company_id || "" });
    setShowVacancyForm(true);
  }

  async function saveVacancy(event) {
    event.preventDefault();
    setSavingVacancy(true);
    setError("");
    try {
      const payload = { ...vacancyForm, company_id: vacancyForm.company_id || null };
      if (editingVacancyId) await api.updateAtsVacancy(token, editingVacancyId, payload);
      else await api.createAtsVacancy(token, payload);
      setShowVacancyForm(false);
      setNotice(editingVacancyId ? "Vacante actualizada." : "Vacante creada.");
      await loadVacancies();
    } catch (err) {
      setError(err.message || "No se pudo guardar la vacante.");
    } finally {
      setSavingVacancy(false);
    }
  }

  async function toggleVacancyStatus(vacancy) {
    const status = vacancy.status === "abierta" ? "pausada" : "abierta";
    try {
      await api.updateAtsVacancy(token, vacancy.id, { ...vacancy, status });
      await loadVacancies();
      setNotice(status === "abierta" ? "Vacante reabierta." : "Vacante pausada.");
    } catch (err) {
      setError(err.message || "No se pudo actualizar la vacante.");
    }
  }

  async function saveCandidate(event) {
    event.preventDefault();
    if (!selectedVacancyId) return;
    setSavingCandidate(true);
    setError("");
    const body = new FormData();
    body.append("first_name", candidateForm.first_name.trim());
    body.append("last_name", candidateForm.last_name.trim());
    body.append("email", candidateForm.email.trim());
    body.append("phone", candidateForm.phone.trim());
    body.append("source", candidateForm.source.trim() || "Registro manual");
    if (candidateForm.cv) body.append("cv", candidateForm.cv);
    try {
      await api.createAtsApplication(token, selectedVacancyId, body);
      setCandidateForm(EMPTY_CANDIDATE);
      setShowCandidateForm(false);
      setNotice("Candidato agregado a la vacante.");
      await Promise.all([loadApplications(selectedVacancyId, searchValue), loadVacancies()]);
    } catch (err) {
      setError(err.message || "No se pudo registrar al candidato.");
    } finally {
      setSavingCandidate(false);
    }
  }

  async function changeStage(application, stage) {
    if (application.stage === stage) return;
    setChangingStageId(application.id);
    try {
      await api.updateAtsApplicationStage(token, application.id, stage);
      setNotice("Etapa actualizada.");
      await Promise.all([loadApplications(selectedVacancyId, searchValue), loadVacancies()]);
      if (selectedApplication?.id === application.id) {
        setSelectedApplication((current) => current ? { ...current, stage } : current);
      }
    } catch (err) {
      setError(err.message || "No se pudo mover al candidato.");
    } finally {
      setChangingStageId("");
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    if (!selectedApplication || !note.trim()) return;
    setSavingNote(true);
    try {
      await api.addAtsActivity(token, selectedApplication.id, note.trim());
      setNote("");
      const data = await api.getAtsActivities(token, selectedApplication.id);
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudo guardar la nota.");
    } finally {
      setSavingNote(false);
    }
  }

  async function downloadCv(application) {
    try {
      const { blob, filename } = await api.downloadAtsCv(token, application.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "No se pudo descargar el CV.");
    }
  }

  const totalActive = vacancies.reduce((sum, vacancy) => sum + Number(vacancy.active_applications || 0), 0);
  const totalHired = applications.filter((application) => application.stage === "contratado").length;
  const currentStage = (stage) => applications.filter((application) => application.stage === stage);

  return (
    <div className="space-y-6" translate="no" lang="es">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1" style={{ color: "#1B4B43" }}>
            <Briefcase size={21} />
            <h1 className="text-2xl font-semibold">Reclutamiento</h1>
          </div>
          <p className="text-sm" style={{ color: "#5B6B6E" }}>Vacantes, candidatos y seguimiento del proceso de selección.</p>
        </div>
        <button onClick={startNewVacancy} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#1B4B43" }}>
          <Plus size={16} /> Nueva vacante
        </button>
      </div>

      {error && <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => setError("")} aria-label="Cerrar aviso"><X size={16} /></button></div>}
      {notice && <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={16} /></button></div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Vacantes abiertas" value={vacancies.filter((vacancy) => vacancy.status === "abierta").length} icon={<Briefcase size={17} />} />
        <SummaryCard label="Candidatos activos" value={totalActive} icon={<UserRound size={17} />} />
        <SummaryCard label="Contratados en esta vacante" value={totalHired} icon={<Check size={17} />} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <section className="rounded-2xl border bg-white p-4" style={{ borderColor: "#E1E6E4" }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "#1B2A2E" }}>Vacantes ({vacancies.length})</h2>
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Actualizar vacantes" onClick={loadVacancies}><RefreshCw size={15} /></button>
          </div>
          {loadingVacancies ? <p className="py-5 text-sm text-slate-500">Cargando vacantes…</p> : vacancies.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <Briefcase className="mx-auto mb-2 text-slate-400" size={22} />
              <p className="text-sm font-medium text-slate-700">Aún no hay vacantes</p>
              <p className="mt-1 text-xs text-slate-500">Crea la primera para empezar a recibir candidatos.</p>
              <button onClick={startNewVacancy} className="mt-3 text-xs font-semibold text-emerald-800">Crear vacante</button>
            </div>
          ) : (
            <div className="space-y-2">
              {vacancies.map((vacancy) => {
                const status = VACANCY_STATUSES[vacancy.status] || VACANCY_STATUSES.cerrada;
                const selected = vacancy.id === selectedVacancyId;
                return (
                  <div key={vacancy.id} className="rounded-xl border p-3 transition-colors" style={{ borderColor: selected ? "#1B4B43" : "#E1E6E4", background: selected ? "#F4F8F6" : "#fff" }}>
                    <button className="w-full text-left" onClick={() => { setSelectedVacancyId(vacancy.id); setSearchInput(""); setSearchValue(""); }}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-5 text-slate-900">{vacancy.title}</span>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: status.color, background: status.soft }}>{status.label}</span>
                      </div>
                      <span className="mt-1.5 block text-xs text-slate-500">{vacancy.company_name || "Sin empresa"}{vacancy.department ? ` · ${vacancy.department}` : ""}</span>
                      <span className="mt-2 flex items-center gap-1 text-xs text-slate-500"><UserRound size={13} /> {vacancy.total_applications || 0} candidatos</span>
                    </button>
                    <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
                      <button onClick={() => startEditVacancy(vacancy)} className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"><Pencil size={12} /> Editar</button>
                      {vacancy.status !== "cerrada" && <button onClick={() => toggleVacancyStatus(vacancy)} className="text-[11px] font-medium text-slate-600 hover:text-slate-900">{vacancy.status === "abierta" ? "Pausar" : "Reabrir"}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: "#E1E6E4" }}>
          {!selectedVacancy ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <UserRound size={28} className="mb-3 text-slate-300" />
              <h2 className="text-base font-semibold text-slate-800">Selecciona una vacante</h2>
              <p className="mt-1 text-sm text-slate-500">El tablero mostrará aquí las postulaciones y su etapa.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">{selectedVacancy.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {selectedVacancy.company_name && <span className="inline-flex items-center gap-1"><Building2 size={13} />{selectedVacancy.company_name}</span>}
                    {selectedVacancy.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{selectedVacancy.location}</span>}
                    {selectedVacancy.employment_type && <span>{selectedVacancy.employment_type}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form onSubmit={(event) => { event.preventDefault(); const query = searchInput.trim(); if (query === searchValue) loadApplications(selectedVacancyId, query); else setSearchValue(query); }} className="flex items-center gap-1 rounded-lg border px-2" style={{ borderColor: "#E1E6E4" }}>
                    <Search size={15} className="text-slate-400" />
                    <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar candidato" className="w-32 py-2 text-xs outline-none sm:w-40" />
                  </form>
                  {selectedVacancy.status === "abierta" && <button onClick={() => { setCandidateForm(EMPTY_CANDIDATE); setShowCandidateForm(true); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: "#1B4B43" }}><Plus size={14} /> Agregar candidato</button>}
                </div>
              </div>

              {(selectedVacancy.description || selectedVacancy.requirements) && <details className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700">Descripción y requisitos</summary>
                {selectedVacancy.description && <p className="mt-2 whitespace-pre-wrap">{selectedVacancy.description}</p>}
                {selectedVacancy.requirements && <p className="mt-2 whitespace-pre-wrap"><strong>Requisitos:</strong> {selectedVacancy.requirements}</p>}
              </details>}

              {loadingApplications ? <p className="py-8 text-center text-sm text-slate-500">Cargando candidatos…</p> : applications.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
                  <UserRound size={26} className="mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">Todavía no hay candidatos</p>
                  <p className="mt-1 text-xs text-slate-500">Agrega al primero para iniciar el seguimiento.</p>
                </div>
              ) : (
                <div className="-mx-1 overflow-x-auto pb-2">
                  <div className="flex min-w-max gap-3 px-1">
                    {STAGES.map((stage) => {
                      const stageApplications = currentStage(stage.id);
                      return (
                        <div key={stage.id} className="w-64 rounded-xl bg-slate-50 p-2.5">
                          <div className="mb-2 flex items-center justify-between px-1">
                            <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.label}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: stage.color, background: stage.soft }}>{stageApplications.length}</span>
                          </div>
                          <div className="space-y-2">
                            {stageApplications.map((application) => <CandidateCard key={application.id} application={application} changing={changingStageId === application.id} onOpen={() => setSelectedApplication(application)} onStageChange={(nextStage) => changeStage(application, nextStage)} />)}
                            {stageApplications.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-[11px] text-slate-400">Sin candidatos</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showVacancyForm && <Modal title={editingVacancyId ? "Editar vacante" : "Nueva vacante"} onClose={() => setShowVacancyForm(false)}>
        <form onSubmit={saveVacancy} className="space-y-3">
          <Field label="Puesto o título de la vacante *"><input required maxLength={255} value={vacancyForm.title} onChange={(e) => setVacancyForm({ ...vacancyForm, title: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700" placeholder="Ej. Analista de nómina" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Empresa"><select value={vacancyForm.company_id} onChange={(e) => setVacancyForm({ ...vacancyForm, company_id: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700"><option value="">Sin empresa asignada</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.legal_name || company.name}</option>)}</select></Field>
            <Field label="Departamento"><input maxLength={255} value={vacancyForm.department || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, department: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700" placeholder="Recursos Humanos" /></Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ubicación"><input maxLength={255} value={vacancyForm.location || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, location: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700" placeholder="Ciudad o remoto" /></Field>
            <Field label="Tipo de empleo"><select value={vacancyForm.employment_type || "Tiempo completo"} onChange={(e) => setVacancyForm({ ...vacancyForm, employment_type: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700"><option>Tiempo completo</option><option>Medio tiempo</option><option>Temporal</option><option>Prácticas</option></select></Field>
          </div>
          <Field label="Descripción"><textarea rows={3} value={vacancyForm.description || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, description: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700 resize-y" placeholder="Responsabilidades y objetivo del puesto" /></Field>
          <Field label="Requisitos"><textarea rows={3} value={vacancyForm.requirements || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, requirements: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700 resize-y" placeholder="Experiencia, habilidades y conocimientos requeridos" /></Field>
          {editingVacancyId && <Field label="Estado"><select value={vacancyForm.status} onChange={(e) => setVacancyForm({ ...vacancyForm, status: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700"><option value="abierta">Abierta</option><option value="pausada">Pausada</option><option value="cerrada">Cerrada</option></select></Field>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowVacancyForm(false)} className="rounded-lg border px-4 py-2 text-sm text-slate-600">Cancelar</button>
            <button disabled={savingVacancy} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#1B4B43" }}>{savingVacancy ? "Guardando…" : "Guardar vacante"}</button>
          </div>
        </form>
      </Modal>}

      {showCandidateForm && <Modal title={`Agregar candidato · ${selectedVacancy?.title || ""}`} onClose={() => setShowCandidateForm(false)}>
        <form onSubmit={saveCandidate} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre *"><input required maxLength={150} autoFocus value={candidateForm.first_name} onChange={(e) => setCandidateForm({ ...candidateForm, first_name: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700" /></Field>
            <Field label="Apellidos *"><input required maxLength={150} value={candidateForm.last_name} onChange={(e) => setCandidateForm({ ...candidateForm, last_name: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700" /></Field>
          </div>
          <Field label="Correo electrónico *"><input required type="email" maxLength={255} value={candidateForm.email} onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Teléfono"><input maxLength={80} value={candidateForm.phone} onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700" /></Field>
            <Field label="Fuente"><select value={candidateForm.source} onChange={(e) => setCandidateForm({ ...candidateForm, source: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700"><option>Registro manual</option><option>Publicación social</option><option>Recomendación</option><option>Portal de empleo</option><option>Otro</option></select></Field>
          </div>
          <Field label="CV (PDF, DOC o DOCX; máximo 10 MB)"><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setCandidateForm({ ...candidateForm, cv: e.target.files?.[0] || null })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs" /></Field>
          <p className="text-[11px] leading-4 text-slate-500">El CV se guarda en el expediente privado del ATS y solo lo pueden descargar usuarios autorizados.</p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowCandidateForm(false)} className="rounded-lg border px-4 py-2 text-sm text-slate-600">Cancelar</button>
            <button disabled={savingCandidate} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#1B4B43" }}><Plus size={15} />{savingCandidate ? "Guardando…" : "Registrar candidato"}</button>
          </div>
        </form>
      </Modal>}

      {selectedApplication && <Modal title="Seguimiento del candidato" onClose={() => setSelectedApplication(null)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{selectedApplication.first_name} {selectedApplication.last_name}</h3>
            <p className="mt-1 text-xs text-slate-500">Postulación a {selectedApplication.vacancy_title}</p>
          </div>
          <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <a href={`mailto:${selectedApplication.email}`} className="flex items-center gap-2"><span className="text-emerald-800"><MessageSquare size={15} /></span>{selectedApplication.email}</a>
            {selectedApplication.phone && <a href={`tel:${selectedApplication.phone}`} className="flex items-center gap-2"><Phone size={15} className="text-emerald-800" />{selectedApplication.phone}</a>}
            <p className="flex items-center gap-2"><Clock3 size={15} className="text-emerald-800" />Recibido {formatDate(selectedApplication.applied_at)}</p>
            {selectedApplication.source && <p className="text-xs text-slate-500">Fuente: {selectedApplication.source}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedApplication.cv_storage_name && <button onClick={() => downloadCv(selectedApplication)} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-700"><Download size={14} /> Descargar CV</button>}
            <select value={selectedApplication.stage} onChange={(e) => changeStage(selectedApplication, e.target.value)} className="rounded-lg border px-3 py-2 text-xs" disabled={changingStageId === selectedApplication.id}>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <h4 className="mb-2 text-sm font-semibold text-slate-800">Seguimiento y notas</h4>
            <form onSubmit={saveNote} className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar una nota interna…" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs outline-none focus:border-emerald-700" />
              <button disabled={savingNote || !note.trim()} className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "#1B4B43" }}><Send size={13} /> Guardar</button>
            </form>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {activities.map((activity) => <div key={activity.id} className="rounded-lg border border-slate-100 p-2.5">
                <p className="whitespace-pre-wrap text-xs text-slate-700">{activity.content}</p>
                <p className="mt-1 text-[10px] text-slate-400">{activity.created_by || "Sistema"} · {formatDate(activity.created_at)}</p>
              </div>)}
              {activities.length === 0 && <p className="py-2 text-xs text-slate-400">Aún no hay notas.</p>}
            </div>
          </div>
        </div>
      </Modal>}
    </div>
  );
}

function CandidateCard({ application, changing, onOpen, onStageChange }) {
  return (
    <article className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: "#E1E6E4" }}>
      <button className="w-full text-left" onClick={onOpen}>
        <h3 className="text-sm font-semibold text-slate-900">{application.first_name} {application.last_name}</h3>
        <p className="mt-1 truncate text-xs text-slate-500">{application.email}</p>
      </button>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><CalendarDays size={12} />{formatDate(application.applied_at)}</span>
        {application.cv_storage_name && <span title="CV adjunto"><FileText size={14} className="text-emerald-700" /></span>}
      </div>
      <select value={application.stage} disabled={changing} onChange={(event) => onStageChange(event.target.value)} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-600 disabled:opacity-50" aria-label={`Cambiar etapa de ${application.first_name}`}>
        {STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
      </select>
    </article>
  );
}

function SummaryCard({ label, value, icon }) {
  return <div className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3" style={{ borderColor: "#E1E6E4" }}>
    <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>
    <span className="rounded-xl p-2.5" style={{ background: "#E7EFEC", color: "#1B4B43" }}>{icon}</span>
  </div>;
}

function Field({ label, children }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-700">{label}</span>{children}</label>;
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

export default RecruitmentModule;

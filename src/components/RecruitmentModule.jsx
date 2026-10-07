import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase, Building2, CalendarDays, Check, Clock3, Download, FileText,
  MapPin, MessageSquare, Pencil, Phone, Plus, RefreshCw, Search, Send,
  Trash2, UserRound, X,
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
  employment_type: "Tiempo completo", description: "", responsibilities: "", requirements: "",
  assessment_focus: "", excel_level: "", english_level: "",
  soft_skills_focus: "Comunicación, trabajo en equipo, resolución de problemas", status: "abierta",
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
  const [analyzingCv, setAnalyzingCv] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [cvAnalysisError, setCvAnalysisError] = useState("");
  const lastAutoFilledRef = useRef({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [candidateAssessments, setCandidateAssessments] = useState([]);
  const [assessmentType, setAssessmentType] = useState("puesto");
  const [draftAssessment, setDraftAssessment] = useState(null);
  const [generatingAssessment, setGeneratingAssessment] = useState(false);
  const [loadingCandidateAssessment, setLoadingCandidateAssessment] = useState(false);
  const [savingAssessmentDraft, setSavingAssessmentDraft] = useState(false);
  const [sendingAssessmentDraft, setSendingAssessmentDraft] = useState(false);
  const [savingAssessmentReview, setSavingAssessmentReview] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [changingStageId, setChangingStageId] = useState("");
  const [deletingCvId, setDeletingCvId] = useState("");
  const [deletingApplicationId, setDeletingApplicationId] = useState("");

  const selectedVacancy = useMemo(
    () => vacancies.find((vacancy) => vacancy.id === selectedVacancyId) || null,
    [vacancies, selectedVacancyId]
  );
  const effectiveAssessmentType = (assessmentType === "excel" && !selectedVacancy?.excel_level)
    || (assessmentType === "ingles" && !selectedVacancy?.english_level)
    ? "puesto"
    : assessmentType;
  const refreshCandidateAssessments = useCallback(async (applicationId = selectedApplication?.id) => {
    if (!applicationId) return [];
    const data = await api.getAtsAssessments(token, applicationId);
    const list = Array.isArray(data) ? data : [];
    setCandidateAssessments(list);
    setDraftAssessment((current) => {
      if (!current) return null;
      const updated = list.find((assessment) => assessment.id === current.id && assessment.status === "draft");
      return updated || null;
    });
    return list;
  }, [api, token, selectedApplication?.id]);

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
      setLoadingActivities(false);
      return;
    }
    let isCurrent = true;
    setLoadingActivities(true);
    api.getAtsActivities(token, selectedApplication.id)
      .then((data) => { if (isCurrent) setActivities(Array.isArray(data) ? data : []); })
      .catch((err) => { if (isCurrent) setError(err.message || "No se pudo cargar el seguimiento."); })
      .finally(() => { if (isCurrent) setLoadingActivities(false); });
    return () => { isCurrent = false; };
  }, [api, token, selectedApplication?.id]);

  useEffect(() => {
    if (!selectedApplication) {
      setCandidateAssessments([]);
      setDraftAssessment(null);
      return;
    }
    let isCurrent = true;
    setLoadingCandidateAssessment(true);
    api.getAtsAssessments(token, selectedApplication.id)
      .then((data) => {
        if (!isCurrent) return;
        const list = Array.isArray(data) ? data : [];
        setCandidateAssessments(list);
        setDraftAssessment((current) => current && list.some((assessment) => assessment.id === current.id && assessment.status === "draft")
          ? list.find((assessment) => assessment.id === current.id)
          : null);
      })
      .catch((err) => { if (isCurrent) setError(err.message || "No se pudo cargar la evaluación."); })
      .finally(() => { if (isCurrent) setLoadingCandidateAssessment(false); });
    return () => { isCurrent = false; };
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
      setCvAnalysis(null);
      setCvAnalysisError("");
      lastAutoFilledRef.current = {};
      setShowCandidateForm(false);
      setNotice("Candidato agregado a la vacante.");
      await Promise.all([loadApplications(selectedVacancyId, searchValue), loadVacancies()]);
    } catch (err) {
      setError(err.message || "No se pudo registrar al candidato.");
    } finally {
      setSavingCandidate(false);
    }
  }

  function startNewCandidate() {
    setCandidateForm(EMPTY_CANDIDATE);
    setCvAnalysis(null);
    setCvAnalysisError("");
    lastAutoFilledRef.current = {};
    setShowCandidateForm(true);
  }

  async function analyzeCandidateCv(file) {
    setCandidateForm((current) => ({ ...current, cv: file }));
    setCvAnalysis(null);
    setCvAnalysisError("");
    if (!file) return;

    setAnalyzingCv(true);
    try {
      const result = await api.previewAtsCv(token, selectedVacancyId, file);
      const extracted = result.candidate || {};
      const fields = ["first_name", "last_name", "email", "phone"];
      setCandidateForm((current) => {
        const next = { ...current, cv: file };
        for (const field of fields) {
          const previousAutoValue = lastAutoFilledRef.current[field];
          if (!current[field] || (previousAutoValue && current[field] === previousAutoValue)) {
            next[field] = extracted[field] || "";
            if (extracted[field]) lastAutoFilledRef.current[field] = extracted[field];
            else delete lastAutoFilledRef.current[field];
          }
        }
        return next;
      });
      setCvAnalysis(result.assessment || null);
    } catch (err) {
      setCvAnalysisError(err.message || "No se pudo leer el CV automáticamente. Puedes completar los datos manualmente.");
    } finally {
      setAnalyzingCv(false);
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

  async function createCandidateAssessmentDraft() {
    if (!selectedApplication) return;
    setGeneratingAssessment(true);
    setError("");
    try {
      const draft = await api.createAtsAssessmentDraft(token, selectedApplication.id, effectiveAssessmentType);
      setDraftAssessment(draft);
      await Promise.all([refreshCandidateAssessments(selectedApplication.id),
        api.getAtsActivities(token, selectedApplication.id).then((rows) => setActivities(Array.isArray(rows) ? rows : []))]);
      setDraftAssessment(draft);
      setNotice(draft.generationProvider === "local"
        ? "La IA no respondió; se creó un borrador con el generador local a partir de la vacante. Revísalo y edítalo antes de enviarlo."
        : draft.generationProvider
          ? `Borrador generado con IA ${draft.generationProvider}. Revísalo y edítalo antes de enviarlo.`
          : "Borrador generado. Revísalo y edítalo antes de enviarlo.");
    } catch (err) {
      setError(err.message || "No se pudo generar el borrador de la prueba.");
    } finally {
      setGeneratingAssessment(false);
    }
  }

  async function saveCandidateAssessmentDraft() {
    if (!draftAssessment?.id) return;
    setSavingAssessmentDraft(true);
    setError("");
    try {
      const saved = await api.updateAtsAssessmentDraft(token, draftAssessment.id, {
        title: draftAssessment.title,
        questions: draftAssessment.questions,
      });
      setDraftAssessment({ ...saved, generationProvider: draftAssessment.generationProvider, generationNote: draftAssessment.generationNote });
      await refreshCandidateAssessments(selectedApplication.id);
      setDraftAssessment({ ...saved, generationProvider: draftAssessment.generationProvider, generationNote: draftAssessment.generationNote });
      setNotice("Borrador guardado. Todavía no se ha enviado al candidato.");
    } catch (err) {
      setError(err.message || "No se pudo guardar el borrador.");
    } finally {
      setSavingAssessmentDraft(false);
    }
  }

  async function sendCandidateAssessmentDraft() {
    if (!draftAssessment?.id || !selectedApplication) return;
    const confirmed = window.confirm(
      `Se enviará “${draftAssessment.title}” a ${selectedApplication.email}. Si hay otro enlace pendiente del mismo tipo de prueba, este dejará de funcionar; las demás pruebas seguirán disponibles. ¿Enviar ahora?`
    );
    if (!confirmed) return;
    setSendingAssessmentDraft(true);
    setError("");
    try {
      const saved = await api.updateAtsAssessmentDraft(token, draftAssessment.id, {
        title: draftAssessment.title,
        questions: draftAssessment.questions,
      });
      await api.sendAtsAssessmentById(token, saved.id);
      setDraftAssessment(null);
      await Promise.all([
        api.getAtsActivities(token, selectedApplication.id).then((rows) => setActivities(Array.isArray(rows) ? rows : [])),
        refreshCandidateAssessments(selectedApplication.id),
      ]);
      setNotice(`“${saved.title}” se envió a ${selectedApplication.email}.`);
    } catch (err) {
      setError(err.message || "No se pudo enviar el borrador. Comprueba los registros del servidor antes de reintentar.");
    } finally {
      setSendingAssessmentDraft(false);
    }
  }

  async function saveCandidateAssessmentReview(assessmentId, reviews) {
    setSavingAssessmentReview(true);
    setError("");
    try {
      await api.saveAtsAssessmentReview(token, assessmentId, reviews);
      const [, activityRows] = await Promise.all([
        refreshCandidateAssessments(selectedApplication.id),
        api.getAtsActivities(token, selectedApplication.id),
      ]);
      setActivities(Array.isArray(activityRows) ? activityRows : []);
      setNotice("Revisión manual guardada en el expediente.");
    } catch (err) {
      setError(err.message || "No se pudo guardar la revisión manual.");
    } finally {
      setSavingAssessmentReview(false);
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

  async function deleteCv(application) {
    if (!window.confirm("¿Eliminar el archivo CV y su evaluación? Se conservarán los datos y el seguimiento del candidato.")) return;
    setDeletingCvId(application.id);
    setError("");
    try {
      await api.deleteAtsCv(token, application.id);
      setApplications((current) => current.map((item) => item.id === application.id
        ? { ...item, cv_storage_name: null, cv_original_name: null, cv_analysis: null }
        : item));
      setSelectedApplication((current) => current?.id === application.id
        ? { ...current, cv_storage_name: null, cv_original_name: null, cv_analysis: null }
        : current);
      setNotice("CV y evaluación eliminados. Se conservó el seguimiento.");
      const [, activityRows] = await Promise.all([
        loadApplications(selectedVacancyId, searchValue),
        api.getAtsActivities(token, application.id),
      ]);
      setActivities(Array.isArray(activityRows) ? activityRows : []);
    } catch (err) {
      setError(err.message || "No se pudo eliminar el CV.");
    } finally {
      setDeletingCvId("");
    }
  }

  async function deleteApplication(application) {
    const confirmed = window.confirm(
      "¿Eliminar esta postulación de la vacante? También se eliminarán su CV y su seguimiento. Si el candidato tiene otras postulaciones, esas se conservarán."
    );
    if (!confirmed) return;
    setDeletingApplicationId(application.id);
    setError("");
    try {
      await api.deleteAtsApplication(token, application.id);
      setSelectedApplication(null);
      setNote("");
      setNotice("Se eliminó la postulación de esta vacante.");
      await Promise.all([loadApplications(selectedVacancyId, searchValue), loadVacancies()]);
    } catch (err) {
      setError(err.message || "No se pudo eliminar la postulación.");
    } finally {
      setDeletingApplicationId("");
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
                    <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nombre, correo o teléfono" className="w-40 py-2 text-xs outline-none sm:w-52" />
                  </form>
                  {selectedVacancy.status === "abierta" && <button onClick={startNewCandidate} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: "#1B4B43" }}><Plus size={14} /> Agregar candidato</button>}
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
                            {stageApplications.map((application) => <CandidateCard key={application.id} application={application} changing={changingStageId === application.id} onOpen={() => { setNote(""); setSelectedApplication(application); }} onStageChange={(nextStage) => changeStage(application, nextStage)} />)}
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
          <Field label="Actividades y responsabilidades principales"><textarea rows={4} value={vacancyForm.responsibilities || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, responsibilities: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700 resize-y" placeholder="Una actividad por línea. Ej.: conciliación mensual de cuentas; atención a clientes; mantenimiento preventivo de equipos…" /></Field>
          <Field label="Requisitos"><textarea rows={3} value={vacancyForm.requirements || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, requirements: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700 resize-y" placeholder="Experiencia, habilidades y conocimientos requeridos" /></Field>
          <Field label="Conocimientos o procesos específicos a evaluar"><textarea rows={3} value={vacancyForm.assessment_focus || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, assessment_focus: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700 resize-y" placeholder="Opcional. Temas técnicos que requieren una prueba más profunda, uno por línea." /></Field>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-800">Pruebas adicionales para esta vacante</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nivel de Excel"><select value={vacancyForm.excel_level || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, excel_level: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"><option value="">No agregar prueba de Excel</option><option value="basico">Básico</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></select></Field>
              <Field label="Nivel de inglés"><select value={vacancyForm.english_level || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, english_level: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"><option value="">No agregar prueba de inglés</option>{["A1", "A2", "B1", "B2", "C1"].map((level) => <option key={level} value={level}>{level}</option>)}</select></Field>
            </div>
            <div className="mt-3"><Field label="Habilidades blandas a explorar"><textarea rows={2} value={vacancyForm.soft_skills_focus || ""} onChange={(e) => setVacancyForm({ ...vacancyForm, soft_skills_focus: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 resize-y" placeholder="Comunicación, trabajo en equipo, resolución de problemas" /></Field></div>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">La prueba principal se crea con las actividades, la descripción y los requisitos del puesto. Las preguntas prácticas abiertas se revisan manualmente; las respuestas de Excel e inglés se califican automáticamente.</p>
          </div>
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
          <Field label="CV (PDF, DOC o DOCX; máximo 10 MB)"><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => analyzeCandidateCv(e.target.files?.[0] || null)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs" /></Field>
          <p className="text-[11px] leading-4 text-slate-500">Si hay un proveedor de IA configurado, el texto del CV (que puede contener datos personales) se enviará a ese proveedor para extraer datos y evidencia de requisitos. Si no está disponible o no se configuró, se usará el análisis local.</p>
          {analyzingCv && <p className="text-xs text-slate-500">Leyendo el CV y completando los datos detectados…</p>}
          {cvAnalysisError && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{cvAnalysisError} Puedes corregir o completar los campos manualmente.</p>}
          {cvAnalysis && <CvAssessment assessment={cvAnalysis} />}
          <p className="text-[11px] leading-4 text-slate-500">Verifica el nombre y los datos detectados antes de guardar; puedes corregirlos aquí.</p>
          <p className="text-[11px] leading-4 text-slate-500">El CV se guarda en el expediente privado del ATS y solo lo pueden descargar usuarios autorizados.</p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowCandidateForm(false)} className="rounded-lg border px-4 py-2 text-sm text-slate-600">Cancelar</button>
            <button disabled={savingCandidate || analyzingCv} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#1B4B43" }}><Plus size={15} />{savingCandidate ? "Guardando…" : analyzingCv ? "Analizando…" : "Registrar candidato"}</button>
          </div>
        </form>
      </Modal>}

      {selectedApplication && <Modal title="Expediente y seguimiento del candidato" onClose={() => setSelectedApplication(null)}>
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
          {selectedApplication.cv_analysis
            ? <CvAssessment assessment={selectedApplication.cv_analysis} />
            : <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{selectedApplication.cv_storage_name ? "Este CV no tiene una evaluación guardada." : "No hay un CV adjunto para consultar."}</p>}
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Pruebas o test</h4>
              <p className="mt-1 text-[11px] leading-4 text-slate-600">La IA redacta las pruebas del puesto, habilidades blandas e integral con base en descripción, responsabilidades y experiencia solicitada. Excel e inglés usan preguntas por nivel. Todo queda como borrador para que revises y edites las preguntas y claves antes de enviarlas a {selectedApplication.email}.</p>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Field label="Tipo de prueba">
                <select value={effectiveAssessmentType} onChange={(event) => setAssessmentType(event.target.value)} className="min-w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <option value="puesto">Conocimientos y actividades del puesto</option>
                  <option value="excel" disabled={!selectedVacancy?.excel_level}>Excel{selectedVacancy?.excel_level ? ` · ${selectedVacancy.excel_level}` : " · configura el nivel en la vacante"}</option>
                  <option value="ingles" disabled={!selectedVacancy?.english_level}>Inglés{selectedVacancy?.english_level ? ` · ${selectedVacancy.english_level}` : " · configura el nivel en la vacante"}</option>
                  <option value="habilidades_blandas">Habilidades blandas</option>
                  <option value="completa">Evaluación integral</option>
                </select>
              </Field>
              <button onClick={createCandidateAssessmentDraft} disabled={generatingAssessment || loadingCandidateAssessment} className="flex items-center gap-1.5 rounded-lg bg-[#1B4B43] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                <Plus size={14} />{generatingAssessment ? "Generando borrador…" : "Generar borrador"}
              </button>
            </div>
            {draftAssessment && <AssessmentDraftEditor
              draft={draftAssessment}
              onChange={setDraftAssessment}
              onSave={saveCandidateAssessmentDraft}
              onSend={sendCandidateAssessmentDraft}
              saving={savingAssessmentDraft}
              sending={sendingAssessmentDraft}
            />}
            <div className="mt-4 border-t border-indigo-100 pt-3">
              <h5 className="mb-2 text-xs font-semibold text-slate-700">Historial de pruebas</h5>
              {loadingCandidateAssessment ? <p className="text-xs text-slate-500">Cargando pruebas…</p>
                : candidateAssessments.length ? <div className="space-y-3">
                  {candidateAssessments.map((assessment) => <div key={assessment.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><p className="text-xs font-semibold text-slate-800">{assessment.title}</p><p className="mt-1 text-[10px] text-slate-500">{formatDate(assessment.created_at)}</p></div>
                      {assessment.status === "draft" && <button onClick={() => setDraftAssessment(assessment)} className="rounded-md border border-emerald-800 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800">Editar borrador</button>}
                    </div>
                    {assessment.status !== "draft" && <AssessmentRecord assessment={assessment} onSaveReview={(reviews) => saveCandidateAssessmentReview(assessment.id, reviews)} savingReview={savingAssessmentReview} />}
                  </div>)}
                </div> : <p className="text-xs text-slate-500">Aún no hay pruebas generadas para este candidato.</p>}
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-2">
            {selectedApplication.cv_storage_name && <button onClick={() => downloadCv(selectedApplication)} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-700"><Download size={14} /> Descargar CV</button>}
            {selectedApplication.cv_storage_name && <button onClick={() => deleteCv(selectedApplication)} disabled={deletingCvId === selectedApplication.id || deletingApplicationId === selectedApplication.id} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50"><Trash2 size={14} />{deletingCvId === selectedApplication.id ? "Eliminando CV…" : "Eliminar CV"}</button>}
            <select value={selectedApplication.stage} onChange={(e) => changeStage(selectedApplication, e.target.value)} className="rounded-lg border px-3 py-2 text-xs" disabled={changingStageId === selectedApplication.id || deletingApplicationId === selectedApplication.id}>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select>
            <button onClick={() => deleteApplication(selectedApplication)} disabled={deletingApplicationId === selectedApplication.id || deletingCvId === selectedApplication.id} className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50"><Trash2 size={14} />{deletingApplicationId === selectedApplication.id ? "Eliminando…" : "Eliminar de esta vacante"}</button>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <h4 className="mb-2 text-sm font-semibold text-slate-800">Seguimiento y notas</h4>
            <form onSubmit={saveNote} className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar una nota interna…" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs outline-none focus:border-emerald-700" />
              <button disabled={savingNote || !note.trim()} className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "#1B4B43" }}><Send size={13} /> Guardar</button>
            </form>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {loadingActivities && <p className="py-2 text-xs text-slate-500">Cargando historial…</p>}
              {activities.map((activity) => <div key={activity.id} className="rounded-lg border border-slate-100 p-2.5">
                <p className="whitespace-pre-wrap text-xs text-slate-700">{activity.content}</p>
                <p className="mt-1 text-[10px] text-slate-400">{activity.created_by || "Sistema"} · {formatDate(activity.created_at)}</p>
              </div>)}
              {!loadingActivities && activities.length === 0 && <p className="py-2 text-xs text-slate-400">Aún no hay actividad registrada.</p>}
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
        <span className="mt-1 inline-block text-[10px] font-medium text-emerald-800">Abrir expediente y seguimiento</span>
      </button>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><CalendarDays size={12} />{formatDate(application.applied_at)}</span>
        {application.cv_analysis?.available && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Cobertura {application.cv_analysis.coveragePercent ?? 0}%</span>}
        {application.cv_storage_name && <span title="CV adjunto"><FileText size={14} className="text-emerald-700" /></span>}
      </div>
      <select value={application.stage} disabled={changing} onChange={(event) => onStageChange(event.target.value)} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-600 disabled:opacity-50" aria-label={`Cambiar etapa de ${application.first_name}`}>
        {STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
      </select>
    </article>
  );
}

function CvAssessment({ assessment }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-slate-800">Análisis del CV frente a la vacante</h4>
      {assessment.provider && <p className="mt-1 text-[10px] text-slate-500">Método: {assessment.provider}</p>}
      {assessment.aiDiagnostic && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{assessment.aiDiagnostic}</p>}
      {assessment.evaluated_at && <p className="mt-1 text-[10px] text-slate-400">Evaluación guardada {formatDate(assessment.evaluated_at)}</p>}
      {!assessment.available ? (
        <p className="mt-2 text-xs text-slate-600">{assessment.reason || "No hay texto suficiente para comparar."}</p>
      ) : (
        <>
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-700">Criterios con evidencia en el CV</span>
              <strong className="text-xl text-slate-900">{assessment.coveragePercent ?? 0}%</strong>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${assessment.coveragePercent ?? 0}% de cobertura de criterios`}>
              <div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.max(0, Math.min(100, assessment.coveragePercent ?? 0))}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-700">{assessment.summary || `Evidencia localizada para ${assessment.matched?.length || 0} de ${(assessment.matched?.length || 0) + (assessment.notFound?.length || 0)} requisitos.`}</p>
          </div>
          {Array.isArray(assessment.criteriaDetails) ? <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-slate-700">Detalle por requisito</p>
            <ul className="space-y-2">
              {assessment.criteriaDetails.map((item, index) => {
                const style = item.status === "evidence"
                  ? "bg-emerald-50 text-emerald-900"
                  : item.status === "partial"
                    ? "bg-amber-50 text-amber-900"
                    : item.status === "not_found"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-violet-50 text-violet-900";
                const label = item.status === "evidence" ? "Evidencia" : item.status === "partial" ? "Parcial" : item.status === "not_found" ? "No localizado" : "Revisar";
                return <li key={`${item.requirement}-${index}`} className={`rounded-lg px-2.5 py-2 text-xs ${style}`}>
                  <div className="flex items-start justify-between gap-2"><span className="font-medium">{item.requirement}</span><span className="shrink-0 text-[10px] font-semibold">{label}</span></div>
                  {item.evidence && <span className="mt-1 block text-[11px] text-slate-600">Fragmento: “{item.evidence}”</span>}
                  {item.reason && <span className="mt-1 block text-[11px] text-slate-600">Análisis: {item.reason}</span>}
                </li>;
              })}
            </ul>
          </div> : assessment.matched?.length > 0 && <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-emerald-800">Requisitos con evidencia localizada</p>
            <ul className="space-y-2">
              {assessment.matched.map((item, index) => <li key={`${item.requirement}-${index}`} className="rounded-lg bg-emerald-50 px-2.5 py-2 text-xs text-slate-700">
                <span className="font-medium">{item.requirement}</span>
                {item.evidence && <span className="mt-1 block text-[11px] text-slate-500">{item.matchType === "términos" ? "Coincidencia parcial. " : "Coincidencia de frase. "}Fragmento: “{item.evidence}”</span>}
              </li>)}
            </ul>
          </div>}
          {!Array.isArray(assessment.criteriaDetails) && assessment.notFound?.length > 0 && <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-amber-800">Requisitos no localizados en el texto</p>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
              {assessment.notFound.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
            </ul>
          </div>}
          {!assessment.criteriaDetails && !assessment.matched?.length && !assessment.notFound?.length && <p className="mt-2 text-xs text-slate-600">No se definieron criterios comparables.</p>}
        </>
      )}
      <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-4 text-slate-500">
        {assessment.note || "La comparación solo refleja términos localizados en el documento; revisa el CV completo antes de decidir."}
      </p>
    </section>
  );
}

function AssessmentDraftEditor({ draft, onChange, onSave, onSend, saving, sending }) {
  function updateQuestion(index, changes) {
    onChange((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...changes } : question),
    }));
  }

  function addQuestion(type = "written") {
    const id = crypto.randomUUID();
    const question = type === "single_choice"
      ? { id, category: "Conocimientos del puesto", type, prompt: "", options: [{ id: "a", text: "" }, { id: "b", text: "" }], correctOptionId: "a", points: 1 }
      : { id, category: "Conocimientos del puesto", type, prompt: "", rubric: "", points: 0 };
    onChange((current) => ({ ...current, questions: [...current.questions, question] }));
  }

  return <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h5 className="text-sm font-semibold text-slate-800">Revisar borrador antes del envío</h5><p className="mt-1 text-[11px] text-slate-600">{draft.generationProvider === "local" ? "Preguntas creadas por el generador local de respaldo con base en responsabilidades y requisitos de la vacante; no se requiere conexión a una IA externa. " : draft.generationProvider ? `Preguntas creadas con IA ${draft.generationProvider} a partir de la información de la vacante. ` : ""}Edita el título, las preguntas, las opciones y las respuestas correctas. El candidato no verá la clave de respuestas.</p>{draft.generationNote && <p className="mt-1 text-[10px] text-amber-900">La IA externa no estuvo disponible: {draft.generationNote}</p>}<p className="mt-1 text-[10px] text-amber-900">Revisa que cada pregunta corresponda al puesto y que la respuesta marcada sea correcta antes de enviar.</p></div>
      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-900">{draft.questions?.length || 0} preguntas</span>
    </div>
    <label className="mt-3 block text-[11px] font-semibold text-slate-700">Título de la prueba
      <input value={draft.title || ""} maxLength={255} onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal" />
    </label>
    <div className="mt-3 space-y-3">
      {(draft.questions || []).map((question, index) => <article key={question.id} className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-800">Pregunta {index + 1}</span><button type="button" onClick={() => onChange((current) => ({ ...current, questions: current.questions.filter((_, questionIndex) => questionIndex !== index) }))} disabled={draft.questions.length <= 1} className="text-[11px] font-medium text-rose-700 disabled:opacity-40">Eliminar</button></div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-[10px] font-semibold text-slate-600">Categoría<input value={question.category || ""} maxLength={120} onChange={(event) => updateQuestion(index, { category: event.target.value })} className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2 text-xs font-normal" /></label>
          <label className="text-[10px] font-semibold text-slate-600">Tipo de respuesta<select value={question.type} onChange={(event) => updateQuestion(index, event.target.value === "single_choice"
            ? { type: "single_choice", options: question.options?.length >= 2 ? question.options : [{ id: "a", text: "" }, { id: "b", text: "" }], correctOptionId: question.correctOptionId || "a", points: 1 }
            : { type: "written", rubric: question.rubric || "", points: 0 })} className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2 text-xs font-normal"><option value="written">Respuesta abierta</option><option value="single_choice">Opción múltiple</option></select></label>
        </div>
        <label className="mt-2 block text-[10px] font-semibold text-slate-600">Pregunta<textarea value={question.prompt || ""} maxLength={3000} rows={3} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} className="mt-1 w-full resize-y rounded border border-slate-200 px-2.5 py-2 text-xs font-normal" /></label>
        {question.type === "single_choice" ? <div className="mt-2 space-y-2">
          {(question.options || []).map((option, optionIndex) => <div key={option.id} className="flex items-center gap-2">
            <input type="radio" name={`correct-${draft.id}-${question.id}`} checked={question.correctOptionId === option.id} onChange={() => updateQuestion(index, { correctOptionId: option.id })} aria-label={`Marcar opción ${optionIndex + 1} como correcta`} />
            <input value={option.text} maxLength={500} onChange={(event) => updateQuestion(index, { options: question.options.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item) })} className="min-w-0 flex-1 rounded border border-slate-200 px-2.5 py-2 text-xs" placeholder={`Opción ${optionIndex + 1}`} />
            {question.options.length > 2 && <button type="button" onClick={() => {
              const options = question.options.filter((item) => item.id !== option.id);
              updateQuestion(index, { options, correctOptionId: question.correctOptionId === option.id ? options[0]?.id : question.correctOptionId });
            }} className="text-xs text-rose-700" aria-label={`Eliminar opción ${optionIndex + 1}`}>×</button>}
          </div>)}
          {(question.options || []).length < 8 && <button type="button" onClick={() => updateQuestion(index, { options: [...question.options, { id: crypto.randomUUID(), text: "" }] })} className="text-[11px] font-medium text-emerald-800">+ Agregar opción</button>}
        </div> : <label className="mt-2 block text-[10px] font-semibold text-slate-600">Rúbrica de evaluación<textarea value={question.rubric || ""} maxLength={2000} rows={2} onChange={(event) => updateQuestion(index, { rubric: event.target.value })} className="mt-1 w-full resize-y rounded border border-slate-200 px-2.5 py-2 text-xs font-normal" /></label>}
      </article>)}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2"><button type="button" onClick={() => addQuestion("written")} disabled={draft.questions.length >= 60} className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-700 disabled:opacity-50">+ Pregunta abierta</button><button type="button" onClick={() => addQuestion("single_choice")} disabled={draft.questions.length >= 60} className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-700 disabled:opacity-50">+ Opción múltiple</button></div>
      <div className="flex gap-2"><button type="button" onClick={onSave} disabled={saving || sending} className="rounded-lg border border-emerald-800 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-50">{saving ? "Guardando…" : "Guardar borrador"}</button><button type="button" onClick={onSend} disabled={saving || sending || !draft.questions?.length} className="flex items-center gap-1.5 rounded-lg bg-[#1B4B43] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Send size={13} />{sending ? "Enviando…" : "Guardar y enviar por correo"}</button></div>
    </div>
  </div>;
}

function AssessmentRecord({ assessment, onSaveReview, savingReview }) {
  const [reviews, setReviews] = useState(() => new Map((assessment.manual_review || []).map((review) => [review.questionId, review])));
  useEffect(() => {
    setReviews(new Map((assessment.manual_review || []).map((review) => [review.questionId, review])));
  }, [assessment.id, assessment.manual_review]);
  const statusLabel = {
    sent: "Enviada · pendiente",
    sending: "Enviando por correo…",
    completed: "Completada",
    expired: "Enlace vencido",
    delivery_failed: "No se pudo entregar",
    draft: "Borrador",
  }[assessment.status] || assessment.status;
  const answers = new Map((Array.isArray(assessment.answers) ? assessment.answers : [])
    .map((answer) => [answer.questionId, answer]));
  return <div className="mt-3 space-y-2">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
      <span className="rounded-full bg-white px-2 py-1 font-semibold">{statusLabel}</span>
      <span>{assessment.questions?.length || 0} preguntas</span>
      {assessment.expires_at && assessment.status === "sent" && <span>Vence {formatDate(assessment.expires_at)}</span>}
      {assessment.status === "completed" && assessment.max_auto_score > 0 && <span>Resultado objetivo: <strong>{assessment.auto_score}/{assessment.max_auto_score}</strong></span>}
    </div>
    {assessment.status === "completed" && <p className="text-[11px] leading-4 text-slate-600">La puntuación excluye las preguntas abiertas. Revisa las respuestas y aplica la rúbrica manual; no es una decisión automática de selección.</p>}
    {assessment.status === "completed" && <div className="space-y-2">
      {(assessment.questions || []).map((question, index) => {
        const answer = answers.get(question.id);
        const chosenOption = question.options?.find((option) => option.id === answer?.selectedOptionId);
        const correctOption = question.options?.find((option) => option.id === question.correctOptionId);
        return <article key={question.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
          <p className="font-semibold text-slate-800">{index + 1}. {question.category} · {question.prompt}</p>
          {question.type === "single_choice" ? <div className="mt-1 space-y-1 text-slate-600">
            <p>Respuesta: {chosenOption?.text || "Sin respuesta"} · {answer?.selectedOptionId === question.correctOptionId ? <span className="font-semibold text-emerald-700">Correcta</span> : <span className="font-semibold text-rose-700">Incorrecta</span>}</p>
            {answer?.selectedOptionId !== question.correctOptionId && <p>Respuesta esperada: {correctOption?.text}</p>}
          </div> : <>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">Respuesta del candidato: {answer?.text || "Sin respuesta"}</p>
            <p className="mt-2 rounded-md bg-amber-50 p-2 text-[11px] leading-4 text-amber-900"><strong>Rúbrica para revisión manual:</strong> {question.rubric}</p>
            <label className="mt-2 block text-[11px] font-semibold text-slate-700">Puntuación total de rúbrica (0–8)
              <input type="number" min="0" max="8" step="1" value={reviews.get(question.id)?.score ?? ""}
                onChange={(event) => setReviews((current) => new Map(current).set(question.id, { questionId: question.id, score: event.target.value, notes: current.get(question.id)?.notes || "" }))}
                className="ml-2 w-20 rounded border border-slate-300 px-2 py-1 font-normal" />
            </label>
            <textarea maxLength={1000} rows={2} value={reviews.get(question.id)?.notes || ""}
              onChange={(event) => setReviews((current) => new Map(current).set(question.id, { questionId: question.id, score: current.get(question.id)?.score ?? "", notes: event.target.value }))}
              className="mt-2 w-full rounded border border-slate-200 p-2 text-[11px]" placeholder="Evidencia observada / notas de evaluación" />
          </>}
        </article>;
      })}
      {(assessment.questions || []).some((question) => question.type === "written") && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs">
        <span className="text-slate-600">Puntúa cada respuesta abierta según su rúbrica (cuatro criterios, 0–2 puntos cada uno) y guarda la evidencia.</span>
        <button disabled={savingReview || (assessment.questions || []).filter((question) => question.type === "written").some((question) => {
          const score = reviews.get(question.id)?.score;
          return score === undefined || score === "" || !Number.isInteger(Number(score)) || Number(score) < 0 || Number(score) > 8;
        })}
          onClick={() => onSaveReview((assessment.questions || []).filter((question) => question.type === "written").map((question) => ({ ...reviews.get(question.id), questionId: question.id, score: Number(reviews.get(question.id).score) })))}
          className="rounded-lg bg-[#1B4B43] px-3 py-2 font-semibold text-white disabled:opacity-50">{savingReview ? "Guardando revisión…" : "Guardar revisión manual"}</button>
      </div>}
      {assessment.max_manual_score > 0 && <p className="text-right text-xs font-semibold text-slate-700">Puntuación manual: {assessment.manual_score ?? 0}/{assessment.max_manual_score}</p>}
    </div>}
  </div>;
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

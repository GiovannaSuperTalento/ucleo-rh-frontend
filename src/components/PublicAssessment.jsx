import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api";

export default function PublicAssessment({ candidateToken }) {
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingTest, setDownloadingTest] = useState(false);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    let current = true;
    fetch(`${API_BASE}/ats/public/assessment`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${candidateToken}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "No se pudo abrir la evaluación.");
        return data;
      })
      .then((data) => { if (current) { setAssessment(data); if (data.completed) setResult(data); } })
      .catch((err) => { if (current) setError(err.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [candidateToken]);

  const questions = useMemo(() => assessment?.questions || [], [assessment]);
  const answeredCount = questions.filter((question) => question.type === "single_choice"
    ? Boolean(answers[question.id]?.selectedOptionId)
    : Boolean(answers[question.id]?.text?.trim())).length;

  async function submit(event) {
    event.preventDefault();
    if (answeredCount !== questions.length) {
      setError("Responde todas las preguntas antes de enviar.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/ats/public/assessment/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${candidateToken}` },
        body: JSON.stringify({ answers: questions.map((question) => ({ questionId: question.id, ...answers[question.id] })) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudieron enviar las respuestas.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadTestFile() {
    setDownloadingTest(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/ats/public/assessment/file`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${candidateToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo descargar la prueba.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = assessment?.assessmentFileName || "prueba";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingTest(false);
    }
  }

  async function submitFile(event) {
    event.preventDefault();
    if (!submissionFile) {
      setError("Adjunta el archivo de la prueba contestada.");
      return;
    }
    if (submissionFile.size > 15 * 1024 * 1024) {
      setError("El archivo contestado no puede superar 15 MB.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = new FormData();
      body.append("submissionFile", submissionFile);
      const response = await fetch(`${API_BASE}/ats/public/assessment/file-submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${candidateToken}` },
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo entregar el archivo.");
      setResult({ ...data, fileAssessment: true, submissionFileName: submissionFile.name, title: assessment?.title, vacancyTitle: assessment?.vacancyTitle });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800" translate="no" lang="es">
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 rounded-2xl bg-[#1B4B43] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Núcleo RH · Evaluación de selección</p>
        <h1 className="mt-2 text-2xl font-bold">{assessment?.title || "Evaluación"}</h1>
        {assessment?.vacancyTitle && <p className="mt-1 text-sm text-emerald-50">Vacante: {assessment.vacancyTitle}</p>}
        {assessment?.candidateName && <p className="mt-1 text-sm text-emerald-50">Hola, {assessment.candidateName}</p>}
        {assessment?.expiresAt && <p className="mt-2 text-xs text-emerald-100">Disponible hasta {new Date(assessment.expiresAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p>}
      </header>

      {loading ? <Card>Preparando la evaluación…</Card>
        : result ? <Card>
          {result.fileAssessment ? <>
            <h2 className="text-lg font-bold text-emerald-900">Archivo recibido</h2>
            <p className="mt-2 text-sm">Gracias. Recibimos tu prueba contestada y el equipo de reclutamiento podrá revisarla.</p>
            {result.assessmentFileName && <p className="mt-3 text-sm">Prueba: <strong className="break-all">{result.assessmentFileName}</strong></p>}
            {result.submissionFileName && <p className="mt-1 text-sm">Tu entrega: <strong className="break-all">{result.submissionFileName}</strong></p>}
          </> : <>
          <h2 className="text-lg font-bold text-emerald-900">Respuestas recibidas</h2>
          <p className="mt-2 text-sm">Gracias. Aquí puedes revisar el cuestionario que enviaste y el resultado de las preguntas objetivas.</p>
          {result.maxScore > 0 && <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm">Puntuación automática de preguntas objetivas: <strong>{result.score}/{result.maxScore}</strong>. Las respuestas abiertas se revisan manualmente por el equipo de reclutamiento.</p>}
          {result.maxManualScore > 0 && <p className="mt-2 text-xs text-slate-600">Revisión manual: {result.manualScore == null ? "pendiente" : `${result.manualScore}/${result.maxManualScore}`}. Puedes volver a abrir este mismo enlace para ver si se registró la revisión.</p>}
          <div className="mt-4 space-y-3">
            {(result.questions || []).map((question, index) => {
              const chosen = question.options?.find((option) => option.id === question.answer?.selectedOptionId);
              return <article key={question.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">{question.category}</p>
                <h3 className="mt-1 text-sm font-semibold">{index + 1}. {question.prompt}</h3>
                {question.type === "single_choice" ? <div className="mt-2 space-y-1 text-sm">
                  <p>Tu respuesta: <strong>{chosen?.text || "Sin respuesta"}</strong> · <strong className={question.isCorrect ? "text-emerald-700" : "text-rose-700"}>{question.isCorrect ? "Correcta" : "Incorrecta"}</strong></p>
                  {!question.isCorrect && question.correctAnswer && <p className="text-slate-600">Respuesta correcta: {question.correctAnswer}</p>}
                </div> : <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap">{question.answer?.text || "Sin respuesta"}</p>
                  {question.manualReview
                    ? <p className="mt-2 border-t border-slate-200 pt-2 text-xs">Revisión del equipo: {question.manualReview.score}/8</p>
                    : <p className="mt-2 text-xs text-slate-500">Pendiente de revisión manual.</p>}
                </div>}
              </article>;
            })}
          </div>
          </>}
        </Card>
          : error && !assessment ? <Card><p className="text-sm text-rose-700">{error}</p></Card>
            : assessment?.fileAssessment ? <form onSubmit={submitFile} className="space-y-4">
              <Card>
                <h2 className="text-base font-semibold">Prueba para descargar y contestar</h2>
                <p className="mt-2 text-sm">Descarga el archivo, complétalo y adjunta aquí la versión contestada para entregarla al equipo de reclutamiento.</p>
                {assessment.assessmentFileName && <p className="mt-2 break-all text-xs text-slate-600">Archivo: {assessment.assessmentFileName}{assessment.assessmentFileSize ? ` · ${(assessment.assessmentFileSize / (1024 * 1024)).toFixed(1)} MB` : ""}</p>}
                <button type="button" onClick={downloadTestFile} disabled={downloadingTest} className="mt-3 rounded-lg border border-emerald-800 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-50">{downloadingTest ? "Descargando…" : "Descargar prueba"}</button>
              </Card>
              <Card>
                <label className="block text-sm font-semibold">Adjunta tu prueba contestada
                  <input type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv" onChange={(event) => setSubmissionFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm font-normal" />
                </label>
                <p className="mt-2 text-xs text-slate-500">Formatos: PDF, Word, Excel, PowerPoint o CSV. Máximo 15 MB.</p>
              </Card>
              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Al entregar el archivo, la prueba quedará marcada como completada.</p>
                <button disabled={submitting || !submissionFile} className="rounded-lg bg-[#1B4B43] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Entregando…" : "Enviar prueba contestada"}</button>
              </div>
            </form>
            : <form onSubmit={submit} className="space-y-4">
              <Card>
                <p className="text-sm">Contesta de acuerdo con tu experiencia. Las preguntas abiertas se revisan manualmente; la puntuación automática solo se aplica a preguntas objetivas.</p>
                <p className="mt-2 text-xs text-slate-500">Progreso: {answeredCount} de {questions.length} respondidas · Aproximadamente {assessment?.durationMinutes || 30} minutos</p>
              </Card>
              {questions.map((question, index) => <Card key={question.id}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">{question.category}</p>
                <h2 className="mt-1 text-sm font-semibold leading-6">{index + 1}. {question.prompt}</h2>
                {question.type === "single_choice" ? <div className="mt-3 space-y-2">
                  {(question.options || []).map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
                    <input type="radio" name={question.id} value={option.id} checked={answers[question.id]?.selectedOptionId === option.id}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: { selectedOptionId: option.id } }))} className="mt-0.5 accent-emerald-800" />
                    <span>{option.text}</span>
                  </label>)}
                </div> : <textarea required minLength={5} maxLength={3000} rows={5} value={answers[question.id]?.text || ""}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: { text: event.target.value } }))}
                  className="mt-3 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-emerald-700" placeholder="Escribe tu respuesta…" />}
              </Card>)}
              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Al enviar, ya no podrás modificar tus respuestas.</p>
                <button disabled={submitting || !questions.length} className="rounded-lg bg-[#1B4B43] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Enviando…" : "Enviar evaluación"}</button>
              </div>
            </form>}
    </div>
  </main>;
}

function Card({ children }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</section>;
}

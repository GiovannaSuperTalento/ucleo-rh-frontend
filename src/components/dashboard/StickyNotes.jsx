import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, CheckCircle, Circle } from "lucide-react";

const COLORS = [
  { id: "urgent", bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", label: "Urgente" },
  { id: "important", bg: "#FFEDD5", border: "#FDBA74", text: "#9A3412", label: "Importante" },
  { id: "pending", bg: "#FEF9C3", border: "#FDE047", text: "#854D0E", label: "Pendiente" },
  { id: "followup", bg: "#E0F2FE", border: "#7DD3FC", text: "#075985", label: "Seguimiento" },
  { id: "done", bg: "#DCFCE7", border: "#86EFAC", text: "#166534", label: "Completado" },
];

export default function StickyNotes({ token, api }) {
  const [notes, setNotes] = useState([]);
  const [newText, setNewText] = useState("");
  const [selectedColor, setSelectedColor] = useState("pending");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Cargando tus pendientes...");
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    setReady(false);
    setNotes([]);
    setStatus("Cargando tus pendientes...");
    setError("");
    api.getPersonalDashboard(token)
      .then(data => {
        if (!active) return;
        setNotes(Array.isArray(data?.sticky_notes) ? data.sticky_notes : []);
        setReady(true);
        setStatus("Tus pendientes son privados y se guardan en tu cuenta");
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || "No se pudieron cargar tus pendientes.");
        setStatus("No se pudieron cargar tus pendientes");
      });
    return () => { active = false; };
  }, [token, api, retryCount]);

  const persist = updated => {
    setNotes(updated);
    setStatus("Guardando...");
    setError("");
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => api.savePersonalDashboard(token, { sticky_notes: updated }))
      .then(() => setStatus("Guardado en tu cuenta"))
      .catch(err => {
        setStatus("No se pudo guardar");
        setError(err.message || "Revisa tu conexión e intenta nuevamente.");
      });
  };

  function addNote(event) {
    event.preventDefault();
    const text = newText.trim();
    if (!ready || !text) return;
    const updated = [{ id: String(Date.now()), text, color: selectedColor, completed: false }, ...notes];
    setNewText("");
    persist(updated);
  }

  function toggleComplete(id) {
    persist(notes.map(note => String(note.id) === String(id) ? { ...note, completed: !note.completed } : note));
  }

  function deleteNote(id) {
    persist(notes.filter(note => String(note.id) !== String(id)));
  }

  const totalNotes = notes.length;
  const completedNotes = notes.filter(note => note.completed).length;
  const progressPercentage = totalNotes > 0 ? Math.round((completedNotes / totalNotes) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          📌 Mi Escritorio / Pendientes
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">{notes.length} pendiente(s)</span>
      </div>
      <p className="text-[10px] text-slate-500">{status}</p>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-2.5 py-2 text-[10px] text-rose-700">{error}</p>}
      {error && <button type="button" onClick={() => setRetryCount(count => count + 1)} className="self-start text-[10px] font-semibold text-[#1B4B43] underline">Reintentar</button>}

      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Avance de actividades</p>
          <p className="text-xs text-slate-500 mt-0.5">{completedNotes} de {totalNotes} completadas</p>
        </div>
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path strokeWidth="3.5" stroke="#e2e8f0" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path strokeDasharray={`${progressPercentage}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="#1B4B43" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span className="absolute text-[10px] font-extrabold text-[#1B4B43]">{progressPercentage}%</span>
        </div>
      </div>

      <form onSubmit={addNote} className="space-y-2">
        <input
          type="text"
          placeholder={ready ? "Añadir pendiente personal..." : "Cargando..."}
          value={newText}
          onChange={event => setNewText(event.target.value)}
          maxLength={5000}
          disabled={!ready}
          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 outline-none focus:border-emerald-800 disabled:opacity-60"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {COLORS.map(color => (
              <button
                key={color.id}
                type="button"
                disabled={!ready}
                onClick={() => setSelectedColor(color.id)}
                className={`w-5 h-5 rounded-full border-2 transition-transform disabled:opacity-50 ${selectedColor === color.id ? "scale-110 border-slate-600" : "border-transparent"}`}
                style={{ background: color.bg }}
                title={color.label}
              />
            ))}
          </div>
          <button type="submit" disabled={!ready || !newText.trim()} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1 bg-[#1B4B43] hover:opacity-90 disabled:opacity-50">
            <Plus size={13} /> Añadir
          </button>
        </div>
      </form>

      <div className="space-y-2 flex-1 overflow-y-auto max-h-64 pr-1">
        {notes.map(note => {
          const color = COLORS.find(item => item.id === note.color) || COLORS[2];
          return (
            <div key={note.id} className={`p-3 rounded-xl border flex items-start justify-between gap-2 transition-all ${note.completed ? "opacity-75" : ""}`} style={{ background: color.bg, borderColor: color.border }}>
              <button type="button" disabled={!ready} onClick={() => toggleComplete(note.id)} className="mt-0.5 shrink-0 disabled:opacity-50" style={{ color: color.text }} title={note.completed ? "Marcar como pendiente" : "Marcar como realizada"}>
                {note.completed ? <CheckCircle size={16} className="fill-current text-emerald-700" /> : <Circle size={16} />}
              </button>
              <p className={`text-xs flex-1 font-medium break-words ${note.completed ? "line-through opacity-60" : ""}`} style={{ color: color.text }}>{note.text}</p>
              <button type="button" disabled={!ready} onClick={() => deleteNote(note.id)} className="opacity-50 hover:opacity-100 disabled:opacity-30" style={{ color: color.text }} title="Eliminar pendiente">
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        {ready && notes.length === 0 && <p className="text-xs text-center py-6 text-slate-400">Sin pendientes. Agrega el primero arriba.</p>}
      </div>
    </div>
  );
}

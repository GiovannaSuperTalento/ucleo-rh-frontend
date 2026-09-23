import React, { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, Circle, Check } from "lucide-react";

const COLORS = [
  { id: "urgent", bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", label: "Urgente" },
  { id: "important", bg: "#FFEDD5", border: "#FDBA74", text: "#9A3412", label: "Importante" },
  { id: "pending", bg: "#FEF9C3", border: "#FDE047", text: "#854D0E", label: "Pendiente" },
  { id: "followup", bg: "#E0F2FE", border: "#7DD3FC", text: "#075985", label: "Seguimiento" },
  { id: "done", bg: "#DCFCE7", border: "#86EFAC", text: "#166534", label: "Completado" },
];

export default function StickyNotes() {
  const [notes, setNotes] = useState([]);
  const [newText, setNewText] = useState("");
  const [selectedColor, setSelectedColor] = useState("pending");

  // 1. Cargar notas guardadas en PostgreSQL
  const fetchNotes = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/notes");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((t) => ({
            id: t.id,
            text: t.title || t.description || "Nota sin título",
            color: t.priority === "alta" ? "urgent" : t.priority === "media" ? "important" : "pending",
            completed: t.is_completed || t.completed || false,
          }));
          setNotes(mapped);
          localStorage.setItem("nucleo_rh_sticky_notes", JSON.stringify(mapped));
          return;
        }
      }
    } catch (err) {
      console.warn("⚠️ No se pudo conectar con http://localhost:4000/api/notes:", err.message);
    }

    // Cargar respaldo local si el backend no responde
    const saved = localStorage.getItem("nucleo_rh_sticky_notes");
    if (saved) setNotes(JSON.parse(saved));
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // 2. Guardar nueva nota directamente en PostgreSQL
  async function addNote(e) {
    e.preventDefault();
    if (!newText.trim()) return;

    const colorObj = COLORS.find((c) => c.id === selectedColor) || COLORS[2];
    const priorityValue = selectedColor === "urgent" ? "alta" : selectedColor === "important" ? "media" : "baja";
    const noteText = newText.trim();

    setNewText("");

    try {
      console.log("🚀 Guardando nota en PostgreSQL (puerto 4000)...");
      const res = await fetch("http://localhost:4000/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteText,
          description: `Nota (${colorObj.label})`,
          priority: priorityValue,
          color: colorObj.bg,
        }),
      });

      if (res.ok) {
        const savedTask = await res.json();
        console.log("✅ Guardado exitoso en el backend:", savedTask);
        fetchNotes();
      } else {
        console.error("❌ El servidor respondió con error:", res.status);
      }
    } catch (err) {
      console.error("❌ Error de red conectando al servidor en puerto 4000:", err);
      const tempNote = { id: Date.now(), text: noteText, color: selectedColor, completed: false };
      const updated = [tempNote, ...notes];
      setNotes(updated);
      localStorage.setItem("nucleo_rh_sticky_notes", JSON.stringify(updated));
    }
  }

  // 🟢 MARCAR / DESMARCAR CUMPLIMIENTO
  function toggleComplete(id) {
    const updated = notes.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n));
    setNotes(updated);
    localStorage.setItem("nucleo_rh_sticky_notes", JSON.stringify(updated));
  }

  // 3. Eliminar nota en la interfaz y en PostgreSQL
  async function deleteNote(id) {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    localStorage.setItem("nucleo_rh_sticky_notes", JSON.stringify(updated));

    if (typeof id === "string" && id.includes("-")) {
      try {
        await fetch(`http://localhost:4000/api/notes/${id}`, {
          method: "DELETE",
        });
        console.log(`🗑️ Nota ${id} eliminada en PostgreSQL`);
      } catch (err) {
        console.error("❌ Error al eliminar nota en el servidor:", err);
      }
    }
  }

  // 📊 CÁLCULO DE AVANCE DE CUMPLIMIENTO
  const totalNotes = notes.length;
  const completedNotes = notes.filter((n) => n.completed).length;
  const progressPercentage = totalNotes > 0 ? Math.round((completedNotes / totalNotes) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col h-full space-y-4">
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          📌 Mi Escritorio / Post-its
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">{notes.length} nota(s)</span>
      </div>

      {/* 📊 WIDGET DE AVANCE DE CUMPLIMIENTO CON GRÁFICA CIRCULAR */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Avance de Actividades
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {completedNotes} de {totalNotes} completadas
          </p>
        </div>

        {/* Gráfica Circular SVG */}
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-200"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-[#1B4B43] transition-all duration-500"
              strokeDasharray={`${progressPercentage}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-[10px] font-extrabold text-[#1B4B43]">
            {progressPercentage}%
          </span>
        </div>
      </div>

      {/* FORMULARIO DE AGREGAR NOTA */}
      <form onSubmit={addNote} className="space-y-2">
        <input
          type="text"
          placeholder="Añadir nota rápida..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 outline-none focus:border-emerald-800 transition-colors"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedColor(c.id)}
                className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                  selectedColor === c.id ? "scale-110 border-slate-600" : "border-transparent"
                }`}
                style={{ background: c.bg }}
                title={c.label}
              />
            ))}
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1 bg-[#1B4B43] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={13} /> Añadir
          </button>
        </div>
      </form>

      {/* LISTADO DE NOTAS CON PALOMITA */}
      <div className="space-y-2 flex-1 overflow-y-auto max-h-64 pr-1">
        {notes.map((n) => {
          const colorObj = COLORS.find((c) => c.id === n.color) || COLORS[2];
          return (
            <div
              key={n.id}
              className={`p-3 rounded-xl border flex items-start justify-between gap-2 transition-all duration-200 ${
                n.completed ? "opacity-75" : ""
              }`}
              style={{ background: colorObj.bg, borderColor: colorObj.border }}
            >
              {/* BOTÓN CON PALOMITA DE CUMPLIMIENTO */}
              <button
                type="button"
                onClick={() => toggleComplete(n.id)}
                className="mt-0.5 shrink-0 cursor-pointer"
                style={{ color: colorObj.text }}
                title={n.completed ? "Marcar como pendiente" : "Marcar como realizada"}
              >
                {n.completed ? (
                  <CheckCircle size={16} className="fill-current text-emerald-700" />
                ) : (
                  <Circle size={16} />
                )}
              </button>

              <p
                className={`text-xs flex-1 font-medium ${n.completed ? "line-through opacity-60" : ""}`}
                style={{ color: colorObj.text }}
              >
                {n.text}
              </p>

              <button
                type="button"
                onClick={() => deleteNote(n.id)}
                className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ color: colorObj.text }}
                title="Eliminar nota"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        {notes.length === 0 && (
          <p className="text-xs text-center py-6 text-slate-400">Sin notas pendientes.</p>
        )}
      </div>
    </div>
  );
}
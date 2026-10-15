import React, { useState, useEffect, useRef } from "react";
import { 
  CheckCircle2, Clock, CalendarDays, Megaphone, Plus, Trash2, 
  Pin, Sparkles, AlertCircle, Edit3, Palette, Bold, Italic, Cake,
  ChevronLeft, ChevronRight, Video, FileText, Link as LinkIcon, Paperclip, Image as ImageIcon, Save, X, ExternalLink, SlidersHorizontal
} from "lucide-react";
import StickyNotes from "./dashboard/StickyNotes";
import AppearanceSettings from "./AppearanceSettings";
import { API_BASE, formatPhotoUrl } from "../api";
import { formatDate } from "../utils/formatDate";

// Paleta de colores vivos y variados para los Post-its
const POSTIT_COLORS = [
  { id: "yellow", bg: "#FEF08A", text: "#854D0E", border: "#FACC15", name: "Amarillo" },
  { id: "green", bg: "#A7F3D0", text: "#065F46", border: "#34D399", name: "Menta" },
  { id: "pink", bg: "#FBCFE8", text: "#9D174D", border: "#F472B6", name: "Rosa" },
  { id: "blue", bg: "#BAE6FD", text: "#075985", border: "#38BDF8", name: "Azul" },
  { id: "orange", bg: "#FFEDD5", text: "#9A3412", border: "#FB923C", name: "Naranja" },
  { id: "purple", bg: "#DDD6FE", text: "#5B21B6", border: "#A78BFA", name: "Violeta" }
];

function getBirthdayParts(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { month: value.getMonth() + 1, day: value.getDate() };
  }
  if (typeof value === "string") {
    const raw = value.trim();
    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T)/);
    const dmy = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    const month = iso ? Number(iso[2]) : dmy ? Number(dmy[2]) : NaN;
    const day = iso ? Number(iso[3]) : dmy ? Number(dmy[1]) : NaN;
    if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(day) && day >= 1 && day <= 31) {
      const check = new Date(Date.UTC(2000, month - 1, day));
      if (check.getUTCMonth() === month - 1 && check.getUTCDate() === day) return { month, day };
    }
    return null;
  }
  if (value && typeof value === "object") {
    if (value.year !== undefined && value.month !== undefined && value.day !== undefined) {
      const month = Number(value.month);
      const day = Number(value.day);
      const normalizedMonth = month === 0 ? 1 : month;
      return getBirthdayParts(`${Number(value.year)}-${String(normalizedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
    for (const key of ["birth_date", "value", "date", "$date"]) {
      if (value[key] !== undefined && value[key] !== value) return getBirthdayParts(value[key]);
    }
    if (typeof value.toDate === "function") {
      try { return getBirthdayParts(value.toDate()); } catch { return null; }
    }
  }
  return null;
}

function employeeDisplayName(employee) {
  return [employee.first_name, employee.last_name_paternal, employee.last_name_maternal]
    .map(value => String(value || "").trim())
    .filter(Boolean)
    .join(" ") || String(employee.last_name || "Colaborador").trim();
}

function birthdayLabel(month, day) {
  return new Date(Date.UTC(2000, month - 1, day)).toLocaleDateString("es-MX", {
    timeZone: "UTC", day: "numeric", month: "long",
  });
}

export default function WorkspaceDashboard({ token, user, api, onNavigate, appearance, onSaveAppearance, appearanceSaving, appearanceSaved, appearanceError }) {
  // 1. ESTADOS PARA POST-ITS
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [personalDashboardReady, setPersonalDashboardReady] = useState(false);
  const [personalDashboardOwner, setPersonalDashboardOwner] = useState("");
  const [personalDashboardStatus, setPersonalDashboardStatus] = useState("loading");
  const [personalDashboardError, setPersonalDashboardError] = useState("");
  const [personalDashboardRetry, setPersonalDashboardRetry] = useState(0);
  const personalDashboardSaveQueue = useRef(Promise.resolve());
  const dashboardOwnerKey = String(user?.id || user?.email || "");

  // 2. ESTADOS PARA CALENDARIO DIDÁCTICO Y EVENTOS/PENDIENTES
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventType, setNewEventType] = useState("pendiente");

  // 3. ESTADOS PARA CUMPLEAÑOS Y DATOS GENERALES
  const [employees, setEmployees] = useState([]);
  const [birthdayTab, setBirthdayTab] = useState("current"); // 'current' | 'prev'
  const [announcements, setAnnouncements] = useState([]);
  const [canPublishAnnouncements, setCanPublishAnnouncements] = useState(false);
  const [announcementEditor, setAnnouncementEditor] = useState(null);
  const [announcementFiles, setAnnouncementFiles] = useState([]);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");
  const [announcementNotice, setAnnouncementNotice] = useState("");
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [showAppearanceSettings, setShowAppearanceSettings] = useState(false);

  async function saveAppearanceAndClose(nextAppearance) {
    const saved = await onSaveAppearance(nextAppearance);
    if (saved) setShowAppearanceSettings(false);
  }

  // Las notas y pendientes se cargan y guardan en el espacio privado del usuario.
  useEffect(() => {
    let active = true;
    setPersonalDashboardReady(false);
    setPersonalDashboardOwner("");
    setPersonalDashboardStatus("loading");
    setPersonalDashboardError("");
    setNotes([]);
    setCalendarEvents([]);

    if (!dashboardOwnerKey || !api?.getPersonalDashboard) {
      setPersonalDashboardStatus("error");
      setPersonalDashboardError("No se pudo identificar tu cuenta para cargar el Panel personal.");
      return () => { active = false; };
    }

    api.getPersonalDashboard(token)
      .then(data => {
        if (!active) return;
        setNotes(Array.isArray(data?.notes) ? data.notes : []);
        setCalendarEvents(Array.isArray(data?.calendar_events) ? data.calendar_events : []);
        setPersonalDashboardOwner(dashboardOwnerKey);
        setPersonalDashboardReady(true);
        setPersonalDashboardStatus("saved");
      })
      .catch(error => {
        if (!active) return;
        setPersonalDashboardStatus("error");
        setPersonalDashboardError(error.message || "No se pudieron cargar tus notas y pendientes.");
      });

    return () => { active = false; };
  }, [token, dashboardOwnerKey, api, personalDashboardRetry]);

  useEffect(() => {
    if (!personalDashboardReady || personalDashboardOwner !== dashboardOwnerKey || !api?.savePersonalDashboard) return;
    let active = true;
    setPersonalDashboardStatus("saving");
    const timeout = setTimeout(() => {
      const payload = { notes, calendar_events: calendarEvents };
      personalDashboardSaveQueue.current = personalDashboardSaveQueue.current
        .catch(() => {})
        .then(() => api.savePersonalDashboard(token, payload))
        .then(() => {
          if (!active) return;
          setPersonalDashboardError("");
          setPersonalDashboardStatus("saved");
        })
        .catch(error => {
          if (!active) return;
          setPersonalDashboardError(error.message || "No se pudieron guardar tus notas y pendientes.");
          setPersonalDashboardStatus("error");
        });
    }, 450);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [notes, calendarEvents, personalDashboardReady, personalDashboardOwner, dashboardOwnerKey, token, api]);

  // Carga de empleados, avisos y saldo de vacaciones desde el backend
  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (api && api.getEmployees) {
          const emps = await api.getEmployees(token, "");
          setEmployees(Array.isArray(emps) ? emps : []);
        }

        if (api && api.getMyLeaveBalance) {
          const balance = await api.getMyLeaveBalance(token);
          setLeaveBalance(Array.isArray(balance) ? balance[0] : balance);
        }

        if (api && api.getAnnouncements) {
          const data = await api.getAnnouncements(token);
          setAnnouncements(Array.isArray(data) ? data : []);
        } else {
          const resAnnouncements = await fetch(`${API_BASE}/announcements`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resAnnouncements.ok) {
            const data = await resAnnouncements.json();
            setAnnouncements(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error("Error al cargar datos del Dashboard:", err);
      }
    }
    loadDashboardData();
  }, [token, api]);

  useEffect(() => {
    const currentRole = String(user?.role || "").trim().toLowerCase();
    const roleAllowsPublishing = ["admin", "administrator", "reclutamiento", "reclutador", "recruiter", "recursos humanos", "rh"].includes(currentRole);
    if (!api?.getAnnouncementPermissions) {
      setCanPublishAnnouncements(roleAllowsPublishing);
      return;
    }
    api.getAnnouncementPermissions(token)
      .then(result => setCanPublishAnnouncements(Boolean(result?.can_publish) || roleAllowsPublishing))
      .catch(() => setCanPublishAnnouncements(roleAllowsPublishing));
  }, [token, api, user?.role]);

  // --- MANEJO DE POST-ITS ---
  const addNote = () => {
    if (!personalDashboardReady || !newNoteText.trim()) return;
    const newNote = {
      id: Date.now(),
      content: newNoteText.trim(),
      color: selectedColor,
      pinned: false,
      isBold: false,
      isItalic: false
    };
    setNotes([newNote, ...notes]);
    setNewNoteText("");
  };

  const deleteNote = (id) => setNotes(notes.filter(n => n.id !== id));
  const togglePin = (id) => setNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const changeNoteColor = (id, colorId) => setNotes(notes.map(n => n.id === id ? { ...n, color: colorId } : n));
  const toggleFormat = (id, formatType) => setNotes(notes.map(n => n.id === id ? { ...n, [formatType]: !n[formatType] } : n));
  const updateNoteContent = (id, text) => setNotes(notes.map(n => n.id === id ? { ...n, content: text } : n));

  const sortedNotes = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // --- LÓGICA DEL CALENDARIO DIDÁCTICO ---
  const calYear = currentCalendarDate.getFullYear();
  const calMonth = currentCalendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const prevMonth = () => setCurrentCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCurrentCalendarDate(new Date(calYear, calMonth + 1, 1));

  const addCalendarEvent = () => {
    if (!personalDashboardReady || !newEventTitle.trim()) return;
    const formattedDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const newEv = {
      id: Date.now(),
      date: formattedDate,
      title: newEventTitle.trim(),
      type: newEventType
    };
    setCalendarEvents([...calendarEvents, newEv]);
    setNewEventTitle("");
  };

  const deleteCalendarEvent = (id) => {
    setCalendarEvents(calendarEvents.filter(e => e.id !== id));
  };

  const selectedFormattedDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const eventsForSelectedDay = calendarEvents.filter(e => e.date === selectedFormattedDate);

  // --- LÓGICA DE CUMPLEAÑOS ---
  const currentMonthNum = new Date().getMonth() + 1;
  const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  const targetMonth = birthdayTab === "current" ? currentMonthNum : prevMonthNum;

  const filteredBirthdays = employees
    .map(employee => ({ employee, birthday: getBirthdayParts(employee.birth_date) }))
    .filter(({ employee, birthday }) => birthday && birthday.month === targetMonth &&
      (!employee.employment_status || String(employee.employment_status).trim().toLowerCase() === "activo"))
    .sort((a, b) => a.birthday.day - b.birthday.day);

  const loadAnnouncements = async () => {
    const rows = await api.getAnnouncements(token);
    setAnnouncements(Array.isArray(rows) ? rows : []);
  };

  const startNewAnnouncement = () => {
    setAnnouncementEditor({ id: null, title: "", content: "", category: "General", linksText: "", removeAttachmentUrls: [], existingAttachments: [] });
    setAnnouncementFiles([]);
    setAnnouncementError("");
    setAnnouncementNotice("");
  };

  const startEditAnnouncement = item => {
    const attachments = Array.isArray(item.attachments) ? item.attachments : [];
    setAnnouncementEditor({
      id: item.id,
      title: item.title || "",
      content: item.content || "",
      category: item.category || "General",
      linksText: attachments.filter(attachment => attachment.kind === "link").map(attachment => attachment.url).join("\n"),
      removeAttachmentUrls: [],
      existingAttachments: attachments.filter(attachment => attachment.kind !== "link"),
    });
    setAnnouncementFiles([]);
    setAnnouncementError("");
    setAnnouncementNotice("");
  };

  const submitAnnouncement = async event => {
    event.preventDefault();
    if (!announcementEditor || announcementSaving) return;
    setAnnouncementSaving(true);
    setAnnouncementError("");
    setAnnouncementNotice("");
    try {
      const payload = {
        title: announcementEditor.title.trim(),
        content: announcementEditor.content.trim(),
        category: announcementEditor.category,
        links: announcementEditor.linksText.split(/\r?\n/).map(link => link.trim()).filter(Boolean),
        files: announcementFiles,
        removeAttachmentUrls: announcementEditor.removeAttachmentUrls,
      };
      if (announcementEditor.id) {
        await api.updateAnnouncement(token, announcementEditor.id, payload);
      } else {
        await api.createAnnouncement(token, payload);
      }
      await loadAnnouncements();
      setAnnouncementEditor(null);
      setAnnouncementFiles([]);
      setAnnouncementNotice(announcementEditor.id ? "Aviso actualizado correctamente." : "Aviso publicado correctamente.");
    } catch (error) {
      setAnnouncementError(error.message || "No se pudo guardar el aviso.");
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const deleteAnnouncement = async item => {
    if (!window.confirm(`¿Eliminar el aviso “${item.title}” y sus archivos adjuntos?`)) return;
    setAnnouncementError("");
    setAnnouncementNotice("");
    try {
      await api.deleteAnnouncement(token, item.id);
      await loadAnnouncements();
      if (announcementEditor?.id === item.id) setAnnouncementEditor(null);
      setAnnouncementNotice("Aviso eliminado correctamente.");
    } catch (error) {
      setAnnouncementError(error.message || "No se pudo eliminar el aviso.");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">

      {/* 🟢 BLOQUE SUPERIOR 1: MURO DE POST-ITS MULTICOLOR CON EDICIÓN */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" /> Muro de Notas y Pendientes Personales
            </h2>
            <p className="text-xs text-slate-500">
              Crea recordatorios en tarjetas de colores vibrantes con controles de formato.
            </p>
            <p className={`mt-1 text-[10px] ${personalDashboardStatus === "error" ? "text-rose-600" : "text-slate-400"}`}>
              {personalDashboardStatus === "loading" ? "Cargando tu Panel privado..." :
                personalDashboardStatus === "saving" ? "Guardando tus cambios..." :
                  personalDashboardStatus === "error" ? personalDashboardError :
                    "Tus notas, pendientes y actividades se guardan de forma privada en tu cuenta."}
            </p>
            {personalDashboardStatus === "error" && (
              <button type="button" onClick={() => setPersonalDashboardRetry(value => value + 1)} className="mt-1 text-[10px] font-semibold text-[#1B4B43] underline">Reintentar cargar mis recordatorios</button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowAppearanceSettings(value => !value)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              <SlidersHorizontal size={15} /> {showAppearanceSettings ? "Cerrar personalización" : "Personalizar panel"}
            </button>
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              {POSTIT_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    selectedColor === c.id ? "scale-125 ring-2 ring-slate-800" : "hover:scale-110"
                  }`}
                  style={{ background: c.bg, borderColor: c.border }}
                  title={c.name}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe una nota rápida..."
                value={newNoteText}
                disabled={!personalDashboardReady}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                className="px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 outline-none w-64 focus:border-[#1B4B43] transition-all disabled:opacity-60"
              />
              <button
                onClick={addNote}
                disabled={!personalDashboardReady || !newNoteText.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1B4B43] hover:bg-[#153B34] flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
              >
                <Plus size={15} /> Agregar Nota
              </button>
            </div>
          </div>
        </div>

        {/* Tarjetas Post-It */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
          {sortedNotes.map((note) => {
            const colorScheme = POSTIT_COLORS.find(c => c.id === note.color) || POSTIT_COLORS[0];

            return (
              <div
                key={note.id}
                className="p-4 rounded-2xl border shadow-md flex flex-col justify-between transition-all hover:-translate-y-1 relative group"
                style={{ 
                  background: colorScheme.bg, 
                  borderColor: colorScheme.border,
                  color: colorScheme.text,
                  minHeight: "150px"
                }}
              >
                <button
                  onClick={() => togglePin(note.id)}
                  className={`absolute top-3 right-3 p-1 rounded-full transition-all ${
                    note.pinned ? "bg-amber-400/80 text-amber-950 scale-110" : "opacity-0 group-hover:opacity-100 hover:bg-black/10"
                  }`}
                  title={note.pinned ? "Desfijar nota" : "Fijar arriba"}
                >
                  <Pin size={13} className={note.pinned ? "fill-amber-950" : ""} />
                </button>

                <textarea
                  value={note.content}
                  onChange={(e) => updateNoteContent(note.id, e.target.value)}
                  className="bg-transparent border-none outline-none resize-none text-xs w-full pr-6 font-medium leading-relaxed"
                  style={{ 
                    color: colorScheme.text,
                    fontWeight: note.isBold ? "bold" : "normal",
                    fontStyle: note.isItalic ? "italic" : "normal"
                  }}
                  rows={4}
                />

                <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFormat(note.id, "isBold")}
                      className={`p-1 rounded hover:bg-black/10 text-[10px] ${note.isBold ? "bg-black/20" : ""}`}
                      title="Negrita"
                    >
                      <Bold size={12} />
                    </button>
                    <button
                      onClick={() => toggleFormat(note.id, "isItalic")}
                      className={`p-1 rounded hover:bg-black/10 text-[10px] ${note.isItalic ? "bg-black/20" : ""}`}
                      title="Cursiva"
                    >
                      <Italic size={12} />
                    </button>

                    <div className="flex items-center gap-1 ml-1">
                      {POSTIT_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => changeNoteColor(note.id, c.id)}
                          className="w-3 h-3 rounded-full hover:scale-125 transition-transform"
                          style={{ background: c.bg, border: `1px solid ${c.border}` }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1 rounded hover:bg-rose-500/20 text-rose-800 transition-colors"
                    title="Eliminar Nota"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {notes.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              No hay notas activas. ¡Crea una nueva arriba!
            </div>
          )}
        </div>
      </section>

      {showAppearanceSettings && (
        <AppearanceSettings appearance={appearance} onSave={saveAppearanceAndClose} saving={appearanceSaving} saved={appearanceSaved} error={appearanceError} token={token} api={api} />
      )}

      {/* 🟢 BLOQUE SUPERIOR 2: CALENDARIO Y TAREAS CON GRÁFICA DE AVANCE (StickyNotes) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cuadrícula interactiva de días (2 Columnas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E1E6E4" }}>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays size={18} className="text-[#1B4B43]" /> Calendario de Actividades y Pendientes
            </h2>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1B4B43] mr-2">
                {monthNames[calMonth]} {calYear}
              </span>
              <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                <ChevronLeft size={15} />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 pb-1">
            <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12 bg-slate-50/40 rounded-xl border border-dashed border-slate-100"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const hasEvents = calendarEvents.some(e => e.date === dateKey);
              const isSelected = selectedDay === dayNum;
              const isToday = dayNum === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`h-12 p-1 rounded-xl border flex flex-col items-center justify-between transition-all ${
                    isSelected ? "ring-2 ring-[#1B4B43] border-[#1B4B43] bg-emerald-50/50" : 
                    isToday ? "border-amber-400 bg-amber-50/30" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`text-xs ${isToday ? "font-bold text-amber-700" : isSelected ? "font-bold text-[#1B4B43]" : "text-slate-700"}`}>
                    {dayNum}
                  </span>
                  {hasEvents && (
                    <span className="w-2 h-2 rounded-full bg-[#1B4B43] animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 🟢 INTEGRACIÓN DE STICKYNOTES CON CUMPLIMIENTO Y GRÁFICA DE AVANCE (%) EN LA COLUMNA DERECHA */}
        <div className="flex flex-col space-y-4">
          <StickyNotes token={token} api={api} />

          {/* Panel lateral del día seleccionado */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Eventos para el {selectedDay} de {monthNames[calMonth]}
              </h3>

              <div className="space-y-2 my-3 max-h-48 overflow-y-auto">
                {eventsForSelectedDay.map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-xl border bg-white border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {ev.type === "reunion" ? <Video size={14} className="text-blue-600" /> : <FileText size={14} className="text-amber-600" />}
                      <span className="font-semibold text-slate-800 truncate max-w-[140px]">{ev.title}</span>
                    </div>
                    <button onClick={() => deleteCalendarEvent(ev.id)} className="text-slate-400 hover:text-rose-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {eventsForSelectedDay.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">No hay pendientes registrados para este día.</p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-200">
              <input
                type="text"
                placeholder="Añadir actividad o reunión..."
                value={newEventTitle}
                disabled={!personalDashboardReady}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 outline-none disabled:opacity-60"
              />
              <div className="flex gap-2">
                <select
                  value={newEventType}
                  disabled={!personalDashboardReady}
                  onChange={(e) => setNewEventType(e.target.value)}
                  className="px-2 py-1.5 rounded-xl text-xs bg-white border border-slate-200 outline-none flex-1"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="reunion">Reunión</option>
                  <option value="actividad">Actividad</option>
                </select>
                <button
                  onClick={addCalendarEvent}
                  disabled={!personalDashboardReady || !newEventTitle.trim()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1B4B43] hover:bg-[#153B34] disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 BLOQUE INFERIOR 1: CUMPLEAÑOS Y AVISOS OFICIALES */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tablón de Cumpleaños */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7EFEC] text-[#1B4B43]"><Cake size={18} /></span>
              <span><span className="block">Cumpleaños</span><span className="mt-0.5 block text-[10px] font-medium text-slate-400">Colaboradores del mes</span></span>
            </h2>

            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setBirthdayTab("current")}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                  birthdayTab === "current" ? "bg-[#1B4B43] text-white shadow-sm" : "text-slate-500 hover:text-[#1B4B43]"
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => setBirthdayTab("prev")}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                  birthdayTab === "prev" ? "bg-[#1B4B43] text-white shadow-sm" : "text-slate-500 hover:text-[#1B4B43]"
                }`}
              >
                Mes Pasado
              </button>
            </div>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto p-4">
            {filteredBirthdays.map(({ employee, birthday }) => {
              const photoUrl = formatPhotoUrl(employee.photo_url);
              return (
                <div key={employee.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs transition-colors hover:border-[#B7CBC5] hover:bg-[#FAFCFB]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D7E4DF] bg-[#E7EFEC] text-xs font-bold text-[#1B4B43]">
                      <span>{employeeDisplayName(employee).split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "🎂"}</span>
                      {photoUrl && <img src={photoUrl} alt={`Foto de ${employeeDisplayName(employee)}`} className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.style.display = "none"; }} />}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-semibold text-slate-900">{employeeDisplayName(employee)}</p>
                      <p className="truncate text-[10px] text-slate-600">{employee.position || "Puesto no registrado"}</p>
                      <p className="truncate text-[10px] text-slate-400">{employee.department || "Departamento no registrado"}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg border border-[#D7E4DF] bg-[#F3F7F5] px-2.5 py-1.5 text-center text-[10px] font-semibold capitalize text-[#1B4B43]">
                    <span className="block text-[9px] font-medium uppercase tracking-wide text-slate-400">Cumple</span>
                    {birthdayLabel(birthday.month, birthday.day)}
                  </span>
                </div>
              );
            })}

            {filteredBirthdays.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <Cake size={22} className="mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">No hay cumpleaños registrados en este mes</p>
                <p className="mt-1 text-[10px] text-slate-400">Se mostrarán cuando exista una fecha de nacimiento en el expediente.</p>
              </div>
            )}
          </div>
        </div>

        {/* Avisos Oficiales */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E1E6E4" }}>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone size={18} className="text-[#1B4B43]" /> Avisos Oficiales
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {announcements.length} Publicado(s)
              </span>
              {canPublishAnnouncements && (
                <button type="button" onClick={startNewAnnouncement} className="inline-flex items-center gap-1 rounded-lg bg-[#1B4B43] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#153b34]">
                  <Plus size={14} /> Publicar aviso
                </button>
              )}
            </div>
          </div>

          {announcementNotice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{announcementNotice}</p>}
          {announcementError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{announcementError}</p>}

          {canPublishAnnouncements && announcementEditor && (
            <form onSubmit={submitAnnouncement} className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">{announcementEditor.id ? "Editar aviso" : "Nuevo aviso"}</h3>
                <button type="button" onClick={() => { setAnnouncementEditor(null); setAnnouncementFiles([]); setAnnouncementError(""); }} aria-label="Cerrar formulario" className="rounded p-1 text-slate-400 hover:bg-white"><X size={16} /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <input required maxLength={255} value={announcementEditor.title} onChange={event => setAnnouncementEditor(current => ({ ...current, title: event.target.value }))} placeholder="Título del aviso" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#1B4B43]" />
                <select value={announcementEditor.category} onChange={event => setAnnouncementEditor(current => ({ ...current, category: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#1B4B43]">
                  {["General", "Importante", "Recursos Humanos", "Capacitación", "Eventos"].map(category => <option key={category}>{category}</option>)}
                </select>
              </div>
              <textarea required rows={4} value={announcementEditor.content} onChange={event => setAnnouncementEditor(current => ({ ...current, content: event.target.value }))} placeholder="Escribe el aviso para el equipo..." className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-[#1B4B43]" />
              <label className="block text-[11px] font-semibold text-slate-600">Enlaces (uno por línea)
                <textarea rows={2} value={announcementEditor.linksText} onChange={event => setAnnouncementEditor(current => ({ ...current, linksText: event.target.value }))} placeholder="https://ejemplo.com" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal outline-none focus:border-[#1B4B43]" />
              </label>
              {announcementEditor.existingAttachments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-600">Archivos actuales</p>
                  {announcementEditor.existingAttachments.map((attachment, index) => {
                    const removed = announcementEditor.removeAttachmentUrls.includes(attachment.url);
                    return (
                      <div key={`${attachment.url}-${index}`} className={`flex items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-[11px] ${removed ? "border-rose-200 opacity-50" : "border-slate-200"}`}>
                        {attachment.kind === "image" ? <ImageIcon size={14} className="text-slate-500" /> : <Paperclip size={14} className="text-slate-500" />}
                        <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                        <button type="button" onClick={() => setAnnouncementEditor(current => ({ ...current, removeAttachmentUrls: removed ? current.removeAttachmentUrls.filter(url => url !== attachment.url) : [...current.removeAttachmentUrls, attachment.url] }))} className="font-semibold text-[#1B4B43]">
                          {removed ? "Restaurar" : "Quitar"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <label className="flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-600 hover:border-[#1B4B43]">
                <Paperclip size={14} /> Adjuntar imágenes o archivos (máximo 8 archivos, 10 MB c/u)
                <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip" className="sr-only" onChange={event => {
                  const selected = Array.from(event.target.files || []);
                  setAnnouncementFiles(current => {
                    if (current.length + selected.length > 8) {
                      setAnnouncementError("Puedes adjuntar hasta 8 archivos por aviso.");
                      return current;
                    }
                    setAnnouncementError("");
                    return [...current, ...selected];
                  });
                  event.target.value = "";
                }} />
              </label>
              {announcementFiles.length > 0 && (
                <div className="space-y-1">
                  {announcementFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-[11px] text-slate-600">
                      {file.type.startsWith("image/") ? <ImageIcon size={14} /> : <Paperclip size={14} />}
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <button type="button" onClick={() => setAnnouncementFiles(current => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Quitar ${file.name}`} className="text-rose-600"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setAnnouncementEditor(null); setAnnouncementFiles([]); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600">Cancelar</button>
                <button type="submit" disabled={announcementSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4B43] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                  <Save size={13} /> {announcementSaving ? "Guardando..." : announcementEditor.id ? "Guardar cambios" : "Publicar aviso"}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {announcements.map((item) => {
              const attachments = Array.isArray(item.attachments) ? item.attachments : [];
              return (
                <div key={item.id} className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatDate(item.created_at)}</span>
                        {item.category && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">{item.category}</span>}
                        {item.author_email && <span>Publicado por {item.author_email}</span>}
                      </div>
                    </div>
                    {canPublishAnnouncements && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => startEditAnnouncement(item)} title="Editar aviso" className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-[#1B4B43]"><Edit3 size={14} /></button>
                        <button type="button" onClick={() => deleteAnnouncement(item)} title="Eliminar aviso" className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-rose-600"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{item.content}</p>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {attachments.map((attachment, index) => {
                        const href = /^https?:\/\//i.test(attachment.url) ? attachment.url : `${API_BASE.replace(/\/api\/?$/, "")}${attachment.url}`;
                        return attachment.kind === "image" ? (
                          <a key={`${attachment.url}-${index}`} href={href} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <img src={href} alt={attachment.name || "Imagen del aviso"} className="max-h-36 max-w-full object-contain" loading="lazy" />
                          </a>
                        ) : (
                          <a key={`${attachment.url}-${index}`} href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#1B4B43] hover:bg-emerald-50">
                            {attachment.kind === "link" ? <LinkIcon size={12} /> : <Paperclip size={12} />}
                            <span className="truncate">{attachment.name || attachment.url}</span>
                            <ExternalLink size={11} className="shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {announcements.length === 0 && (
              <p className="text-xs text-center py-6 text-slate-400">No hay comunicados o avisos publicados.</p>
            )}
          </div>
        </div>
      </section>

      {/* 🟢 BLOQUE INFERIOR 2: TARJETA DE SALDO DE VACACIONES */}
      <section className="bg-gradient-to-br from-[#1B4B43] to-[#12332D] text-white rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Vacaciones y Ley Federal del Trabajo</span>
          <h3 className="text-xl font-bold">Saldo Restante de Vacaciones</h3>
          <p className="text-xs text-emerald-100/80">
            Tus días disponibles se actualizan automáticamente en función de tu antigüedad en la empresa.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 text-center">
            <p className="text-3xl font-extrabold text-emerald-300">
              {leaveBalance?.remainingDays ?? (leaveBalance?.totalDays ? leaveBalance.totalDays - (leaveBalance.usedDays || 0) : "12")}
            </p>
            <p className="text-[11px] text-emerald-100">Días disponibles de {leaveBalance?.totalDays || 12} totales</p>
          </div>

          <button
            onClick={() => onNavigate && onNavigate("leave")}
            className="px-5 py-3 rounded-xl text-xs font-bold bg-white text-[#1B4B43] hover:bg-emerald-50 transition-all shadow-md"
          >
            Solicitar Vacaciones
          </button>
        </div>
      </section>

    </div>
  );
}

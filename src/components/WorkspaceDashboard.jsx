import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, Clock, CalendarDays, Megaphone, Plus, Trash2, 
  Pin, Sparkles, AlertCircle, Edit3, Palette, Bold, Italic, Cake,
  ChevronLeft, ChevronRight, Video, FileText
} from "lucide-react";
import StickyNotes from "./dashboard/StickyNotes";

// Paleta de colores vivos y variados para los Post-its
const POSTIT_COLORS = [
  { id: "yellow", bg: "#FEF08A", text: "#854D0E", border: "#FACC15", name: "Amarillo" },
  { id: "green", bg: "#A7F3D0", text: "#065F46", border: "#34D399", name: "Menta" },
  { id: "pink", bg: "#FBCFE8", text: "#9D174D", border: "#F472B6", name: "Rosa" },
  { id: "blue", bg: "#BAE6FD", text: "#075985", border: "#38BDF8", name: "Azul" },
  { id: "orange", bg: "#FFEDD5", text: "#9A3412", border: "#FB923C", name: "Naranja" },
  { id: "purple", bg: "#DDD6FE", text: "#5B21B6", border: "#A78BFA", name: "Violeta" }
];

export default function WorkspaceDashboard({ token, user, api, onNavigate }) {
  // 1. ESTADOS PARA POST-ITS
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("nucleo_rh_postits");
    return saved ? JSON.parse(saved) : [
      { id: 1, content: "📌 Revisar solicitudes de vacaciones pendientes", color: "yellow", pinned: true, isBold: false, isItalic: false },
      { id: 2, content: "💡 Preparar layout para nuevas contrataciones de Sistemas", color: "green", pinned: false, isBold: false, isItalic: false }
    ];
  });
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");

  // 2. ESTADOS PARA CALENDARIO DIDÁCTICO Y EVENTOS/PENDIENTES
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [calendarEvents, setCalendarEvents] = useState(() => {
    const saved = localStorage.getItem("nucleo_rh_calendar_events");
    return saved ? JSON.parse(saved) : [
      { id: 101, date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`, title: "Reunión de avance RH", type: "reunion" }
    ];
  });
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventType, setNewEventType] = useState("pendiente");

  // 3. ESTADOS PARA CUMPLEAÑOS Y DATOS GENERALES
  const [employees, setEmployees] = useState([]);
  const [birthdayTab, setBirthdayTab] = useState("current"); // 'current' | 'prev'
  const [announcements, setAnnouncements] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);

  // Persistencia de notas y eventos en localStorage
  useEffect(() => {
    localStorage.setItem("nucleo_rh_postits", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("nucleo_rh_calendar_events", JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  // Carga de empleados, avisos y saldo de vacaciones desde el backend
  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (api.getEmployees) {
          const emps = await api.getEmployees(token, "");
          setEmployees(Array.isArray(emps) ? emps : []);
        }

        if (api.getMyLeaveBalance) {
          const balance = await api.getMyLeaveBalance(token);
          setLeaveBalance(Array.isArray(balance) ? balance[0] : balance);
        }

        const resAnnouncements = await fetch(`${API_BASE}/announcements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resAnnouncements.ok) {
          const data = await resAnnouncements.json();
          setAnnouncements(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error al cargar datos del Dashboard:", err);
      }
    }
    loadDashboardData();
  }, [token, api]);

  // --- MANEJO DE POST-ITS ---
  const addNote = () => {
    if (!newNoteText.trim()) return;
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
    if (!newEventTitle.trim()) return;
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

  const filteredBirthdays = employees.filter(e => {
    if (!e.birth_date || e.employment_status !== "activo") return false;
    const bMonth = parseInt(String(e.birth_date).slice(5, 7), 10);
    return bMonth === targetMonth;
  }).sort((a, b) => {
    const dayA = parseInt(String(a.birth_date).slice(8, 10), 10);
    const dayB = parseInt(String(b.birth_date).slice(8, 10), 10);
    return dayA - dayB;
  });

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
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                className="px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 outline-none w-64 focus:border-[#1B4B43] transition-all"
              />
              <button
                onClick={addNote}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1B4B43] hover:bg-[#153B34] flex items-center gap-1 shadow-sm transition-all"
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
          <StickyNotes />

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
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  className="px-2 py-1.5 rounded-xl text-xs bg-white border border-slate-200 outline-none flex-1"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="reunion">Reunión</option>
                  <option value="actividad">Actividad</option>
                </select>
                <button
                  onClick={addCalendarEvent}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1B4B43] hover:bg-[#153B34]"
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E1E6E4" }}>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cake size={18} className="text-pink-500" /> Cumpleaños
            </h2>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setBirthdayTab("current")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  birthdayTab === "current" ? "bg-white shadow text-slate-900" : "text-slate-500"
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => setBirthdayTab("prev")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  birthdayTab === "prev" ? "bg-white shadow text-slate-900" : "text-slate-500"
                }`}
              >
                Mes Pasado
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {filteredBirthdays.map((b) => (
              <div key={b.id} className="p-3 rounded-xl border bg-slate-50 border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs">
                    🎂
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{b.first_name} {b.last_name}</p>
                    <p className="text-[10px] text-slate-500">{b.department || "General"}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800">
                  Día {String(b.birth_date).slice(8, 10)}
                </span>
              </div>
            ))}

            {filteredBirthdays.length === 0 && (
              <p className="text-xs text-center py-6 text-slate-400">No hay cumpleaños registrados en este mes.</p>
            )}
          </div>
        </div>

        {/* Avisos Oficiales */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E1E6E4" }}>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone size={18} className="text-[#1B4B43]" /> Avisos Oficiales
            </h2>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              {announcements.length} Publicado(s)
            </span>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {announcements.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                  <span className="text-[10px] text-slate-400">{item.created_at?.slice(0, 10)}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
              </div>
            ))}

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
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, Users, CalendarDays, LogOut, Plus, Check, X,
  Search, ChevronRight, Building2, Clock, ArrowLeft, RefreshCw,
  User, Briefcase, DollarSign, Siren, History, Loader2, KeyRound, Copy, Trash2, Camera, MessageSquare, Download, FolderDown, FileSpreadsheet, Send, Info, Calendar, Key, Shield, CheckCircle
} from "lucide-react";
import Workbook from "exceljs";
import { api, API_BASE } from "./api";
import WorkspaceDashboard from "./components/WorkspaceDashboard";
import ChatModule from "./ChatModule";
import StickyNotes from "./components/dashboard/StickyNotes";
import { PdfSplitModal } from "./components/PdfSplitModal";
import { SocialPublicationsModule } from "./components/SocialPublicationsModule";
import { Share2 } from "lucide-react";

const C = {
  bg: "#F3F5F4", surface: "#FFFFFF", ink: "#1B2A2E", inkSoft: "#5B6B6E", line: "#E1E6E4",
  primary: "#1B4B43", primarySoft: "#E7EFEC", accent: "#C6793D", accentSoft: "#FBEBDC",
  ok: "#2F7D5A", okSoft: "#E4F3EB", danger: "#B14444", dangerSoft: "#F7E7E5",
};

function getCleanPhotoUrl(url) {
  if (!url || typeof url !== "string" || url.trim() === "" || url === "null" || url === "undefined") {
    return null;
  }
  let clean = url.trim();
  if (clean.startsWith("data:image")) return clean;
  if (clean.includes("/uploads/")) {
    const filename = clean.split("/uploads/").pop();
    const baseUrl = API_BASE.replace(/\/api$/, "");
    return `${baseUrl}/uploads/${filename}`;
  }
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  const baseUrl = API_BASE.replace(/\/api$/, "");
  return `${baseUrl}${clean.startsWith("/") ? clean : `/${clean}`}`;
}

function isSameCompany(employeeOrId, filterCompanyId) {
  if (!filterCompanyId || filterCompanyId === "all" || filterCompanyId === "none") return true;

  let empCompId = null;
  if (typeof employeeOrId === "object" && employeeOrId !== null) {
    empCompId = employeeOrId.company_id ?? employeeOrId.companyId ?? employeeOrId.company?.id;
  } else {
    empCompId = employeeOrId;
  }

  if (empCompId === null || empCompId === undefined) return false;
  return String(empCompId).trim().toLowerCase() === String(filterCompanyId).trim().toLowerCase();
}

const DEPARTMENTS = ["Recursos Humanos", "Sistemas", "Ventas", "Finanzas", "Operaciones"];

function initials(name) {
  return (name || "").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function Badge({ tone = "default", children }) {
  const tones = {
    default: { bg: C.primarySoft, fg: C.primary }, ok: { bg: C.okSoft, fg: C.ok },
    pending: { bg: C.accentSoft, fg: C.accent }, danger: { bg: C.dangerSoft, fg: C.danger },
  };
  const t = tones[tone] || tones.default;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: t.bg, color: t.fg }}>{children}</span>;
}

function Spinner({ label }) {
  return (
    <div className="flex items-center gap-2 py-10 justify-center" style={{ color: C.inkSoft }}>
      <Loader2 size={16} className="animate-spin" /> <span className="text-sm">{label || "Cargando…"}</span>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("Error capturado por el ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
          <div className="max-w-sm text-center rounded-2xl p-7" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <h1 className="text-lg font-semibold mb-2" style={{ color: C.ink }}>Algo salió mal</h1>
            <p className="text-sm mb-5" style={{ color: C.inkSoft }}>Ocurrió un error inesperado en la página. Recárgala para continuar.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: C.primary, color: "#fff" }}>Recargar página</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const [token, setToken] = useState(() => localStorage.getItem("nucleo_rh_token") || "");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("nucleo_rh_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [view, setView] = useState("dashboard");
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [employeeStatusTab, setEmployeeStatusTab] = useState("activo");

  // 🟢 Evaluación de Admin Flexible (Evita bloquear si el rol viene en mayúsculas o con variaciones)
  const isAdmin = useMemo(() => {
    if (!user) return true; // Si no hay user definido, permitir vista para evitar pantalla blanca
    const role = String(user.role || "").toLowerCase();
    return role.includes("admin") || role.includes("gerente") || role === "";
  }, [user]);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    if (employeeStatusTab === "todos") return employees;
    return employees.filter(e => String(e.employment_status || "activo").toLowerCase() === employeeStatusTab);
  }, [employees, employeeStatusTab]);

  async function loadEmployees(search = "") {
    setEmployeesLoading(true);
    setEmployeesError("");
    try {
      const data = await api.getEmployees(token, search);
      const list = Array.isArray(data) ? data : (data?.employees || data?.data || []);
      setEmployees(list);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      setEmployeesError(err.message || "Error al obtener colaboradores.");
    } finally {
      setEmployeesLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadEmployees();
    }
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0F172A] text-white">
        <div className="text-center space-y-4">
          <Building2 size={40} className="mx-auto text-emerald-400 animate-bounce" />
          <p className="text-sm font-bold">Sesión expirada o no iniciada.</p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="px-4 py-2 bg-[#1B4B43] rounded-xl text-xs font-bold hover:bg-[#153B34]"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[#F3F5F4] font-sans">
      <aside className="w-60 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B4B43] flex items-center justify-center text-white">
              <Building2 size={16} />
            </div>
            <span className="font-bold text-slate-800">Núcleo RH</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setView("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === "dashboard" ? "bg-[#E7EFEC] text-[#1B4B43]" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard size={16} /> Panel
            </button>
            <button
              onClick={() => setView("employees")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === "employees" ? "bg-[#E7EFEC] text-[#1B4B43]" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Users size={16} /> Empleados
            </button>
          </nav>
        </div>

        <button
          onClick={() => { localStorage.clear(); window.location.reload(); }}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {view === "dashboard" && (
          <WorkspaceDashboard token={token} user={user} api={api} onNavigate={setView} />
        )}

        {view === "employees" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Directorio de Empleados</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Consulta el listado completo de colaboradores registrados.
                </p>
              </div>

              <button
                onClick={() => loadEmployees(searchInput)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#1B4B43] bg-[#E7EFEC] hover:bg-[#d8e7e3] transition-all cursor-pointer"
              >
                <RefreshCw size={14} /> Actualizar Lista
              </button>
            </div>

            <div className="flex border-b border-slate-200 gap-6">
              <button
                onClick={() => setEmployeeStatusTab("activo")}
                className={`pb-2 text-xs font-bold transition-all cursor-pointer ${
                  employeeStatusTab === "activo" ? "border-b-2 border-[#1B4B43] text-[#1B4B43]" : "text-slate-400"
                }`}
              >
                Activos ({employees.filter(e => String(e.employment_status || "activo").toLowerCase() === "activo").length})
              </button>
              <button
                onClick={() => setEmployeeStatusTab("baja")}
                className={`pb-2 text-xs font-bold transition-all cursor-pointer ${
                  employeeStatusTab === "baja" ? "border-b-2 border-[#1B4B43] text-[#1B4B43]" : "text-slate-400"
                }`}
              >
                Bajas ({employees.filter(e => String(e.employment_status).toLowerCase() === "baja").length})
              </button>
              <button
                onClick={() => setEmployeeStatusTab("todos")}
                className={`pb-2 text-xs font-bold transition-all cursor-pointer ${
                  employeeStatusTab === "todos" ? "border-b-2 border-[#1B4B43] text-[#1B4B43]" : "text-slate-400"
                }`}
              >
                Todos ({employees.length})
              </button>
            </div>

            {employeesLoading ? (
              <Spinner label="Cargando colaboradores..." />
            ) : employeesError ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs">
                {employeesError}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
                <p className="text-sm font-bold text-slate-700">No se encontraron empleados.</p>
                <p className="text-xs text-slate-400">Prueba cambiando la pestaña de estatus o agregando nuevos registros.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                {filteredEmployees.map((e) => (
                  <div key={e.id || Math.random()} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E7EFEC] text-[#1B4B43] font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                        {getCleanPhotoUrl(e.photo_url) ? (
                          <img src={getCleanPhotoUrl(e.photo_url)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          initials(`${e.first_name || ''} ${e.last_name || ''}`)
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {e.first_name || 'Sin Nombre'} {e.last_name || e.last_name_paternal || ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {e.position || "Puesto sin definir"} · {e.department || "General"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge tone={String(e.employment_status || "activo").toLowerCase() === "activo" ? "ok" : "danger"}>
                        {e.employment_status || "activo"}
                      </Badge>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
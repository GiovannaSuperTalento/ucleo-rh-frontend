import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, Users, CalendarDays, LogOut, Plus, Check, X,
  Search, ChevronRight, Building2, Clock, ArrowLeft, RefreshCw,
  User, Briefcase, DollarSign, Siren, History, Loader2, KeyRound, Copy, Trash2, Camera, MessageSquare, Download, FolderDown, FileSpreadsheet, Send, Info, Calendar, Key, Shield, CheckCircle
} from "lucide-react";
import Workbook from "exceljs";
import { api } from "./api";
import WorkspaceDashboard from "./components/WorkspaceDashboard";
import ChatModule from "./ChatModule";
import StickyNotes from "./components/dashboard/StickyNotes";
import { PdfSplitModal } from "./components/PdfSplitModal";
import { SocialPublicationsModule } from "./components/SocialPublicationsModule";
import { Share2 } from "lucide-react"; // Agregar icono Share2
const C = {
  bg: "#F3F5F4", surface: "#FFFFFF", ink: "#1B2A2E", inkSoft: "#5B6B6E", line: "#E1E6E4",
  primary: "#1B4B43", primarySoft: "#E7EFEC", accent: "#C6793D", accentSoft: "#FBEBDC",
  ok: "#2F7D5A", okSoft: "#E4F3EB", danger: "#B14444", dangerSoft: "#F7E7E5",
};

// HELPER PARA URL DE FOTO SANA
function getCleanPhotoUrl(url) {
  if (!url || typeof url !== "string" || url.trim() === "" || url === "null" || url === "undefined") {
    return null;
  }
  let clean = url.trim();
  if (clean.startsWith("data:image")) return clean;
  if (clean.includes("/uploads/")) {
    const filename = clean.split("/uploads/").pop();
    return `http://localhost:4000/uploads/${filename}`;
  }
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  return `http://localhost:4000${clean.startsWith("/") ? clean : `/${clean}`}`;
}

// 🟢 HELPER COMPARADOR SEGURO DE UUIDS DE EMPRESAS Y COLABORADORES
function isSameCompany(employeeOrId, filterCompanyId) {
  if (!filterCompanyId) return false;

  let empCompId = null;
  if (typeof employeeOrId === "object" && employeeOrId !== null) {
    empCompId = employeeOrId.company_id ?? employeeOrId.companyId ?? employeeOrId.company?.id;
  } else {
    empCompId = employeeOrId;
  }

  const cleanFilterId = String(filterCompanyId).trim().toLowerCase();

  if (cleanFilterId === "none") {
    return (
      empCompId === null ||
      empCompId === undefined ||
      String(empCompId).trim() === "" ||
      String(empCompId).trim().toLowerCase() === "null" ||
      String(empCompId).trim().toLowerCase() === "undefined"
    );
  }

  if (empCompId === null || empCompId === undefined) return false;

  const cleanEmpCompId = String(empCompId).trim().toLowerCase();

  return cleanEmpCompId === cleanFilterId;
}

const DEPARTMENTS = ["Recursos Humanos", "Sistemas", "Ventas", "Finanzas", "Operaciones"];
const STATUS_OPTIONS = ["activo", "baja", "incapacidad", "permiso"];
const CONTRACT_TYPES = ["Indeterminado", "Determinado", "Periodo de prueba 90 días", "Periodo de prueba 180 días"];

const LOGIN_SLIDES = [
  { url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1200&auto=format&fit=crop" },
  { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1200&auto=format&fit=crop" },
  { url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1200&auto=format&fit=crop" },
  { url: "https://images.unsplash.com/photo-1556740758-90de374c12ad?q=80&w=1200&auto=format&fit=crop" },
  { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop" }
];

const emptyEmployee = () => ({
  employee_number: "", first_name: "", last_name_paternal: "", last_name_maternal: "", last_name: "",
  curp: "", rfc: "", nss: "", birth_date: "", birth_place_municipality: "", birth_place_state: "",
  gender: "", marital_status: "", education_level: "", last_grade: "", personal_email: "", phone: "", mobile_phone: "",
  street: "", exterior_number: "", interior_number: "", neighborhood: "", postal_code: "", municipality: "", state: "", address: "",
  fiscal_street: "", fiscal_exterior_number: "", fiscal_interior_number: "", fiscal_neighborhood: "", fiscal_postal_code: "", fiscal_municipality: "", fiscal_state: "", same_as_personal_address: false,
  department: DEPARTMENTS[0], position: "", job_activities: "", manager_id: "", company_id: "", hire_date: "", employment_status: "activo",
  termination_date: "", contract_start_date: "", contract_end_date: "", contract_type: CONTRACT_TYPES[0], probation_end_date: "",
  work_schedule: "Lunes a Viernes de 09:00 a 18:00 hrs",
  base_daily_salary: "", sdi_salary: "", base_salary: "", payroll_type: "QUI",
  has_infonavit_credit: "NO", infonavit_credit_number: "", infonavit_discount_value: "",
  bank_name: "", bank_account: "", bank_clabe: "",
  emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "",
  beneficiary_name: "", beneficiary_relationship: "", beneficiary_phone: "",
});

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

function TextField({ label, value, onChange, type = "text", required, placeholder, options }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
      {options ? (
        <select value={value || ""} onChange={onChange} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-white" style={{ border: `1px solid ${C.line}` }}>
          <option value="">Selecciona…</option>
          {options.map(o => <option key={o.id || o} value={o.id || o}>{o.name || o.legal_name || o.full_name || o}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ""} onChange={onChange} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-white" style={{ border: `1px solid ${C.line}` }} />
      )}
    </div>
  );
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
  const [childName, setChildName] = useState("");
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [incidentTime, setIncidentTime] = useState("10:00");
  const [incidentLocation, setIncidentLocation] = useState("Instalaciones de la Empresa");
  const [witness1, setWitness1] = useState("");
  const [witness2, setWitness2] = useState("");
  const [canAccessSocial, setCanAccessSocial] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("nucleo_rh_token") || "");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("nucleo_rh_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [view, setView] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [employeeStatusTab, setEmployeeStatusTab] = useState("activo");

  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [formTab, setFormTab] = useState("personal");
  const [newEmployee, setNewEmployee] = useState(emptyEmployee());
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [employeeFiles, setEmployeeFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);

  // 🟢 ESTADOS PARA EL MODAL DE DIVISIÓN DE PDF
  const [pendingPdfFile, setPendingPdfFile] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSplittingPdf, setIsPdfSplitting] = useState(false);

  const [showExportAltasModal, setShowAddExportAltasModal] = useState(false);
  const [exportFilterType, setExportFilterType] = useState("all");
  const [exportSelectedCompanyId, setExportSelectedCompanyId] = useState("");
  const [exportSelectedEmployeeId, setExportSelectedEmployeeId] = useState("");

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDocType, setBatchDocType] = useState("Contratos");
  const [batchSubType, setBatchSubType] = useState("Indeterminado");
  const [batchDepartment, setBatchDepartment] = useState("all");
  const [batchGenerating, setBatchGenerating] = useState(false);
  
  const [templates, setTemplates] = useState([]);
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [multiFormOptions, setMultiFormOptions] = useState([]);
  const [checkedOptions, setCheckedOptions] = useState([]);
  const [observaciones, setObservaciones] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(() => new Date().toISOString().slice(0, 10));

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [myBalance, setMyBalance] = useState(null);
  const [leaveForm, setLeaveForm] = useState({ leave_type_id: "", start_date: "", end_date: "", request_type: "vacaciones", comments: "" });
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ legal_name: "", rfc: "", address: "", imss_registry: "" });
  const [editingCompany, setEditingCompany] = useState(null);
  const [deptInputs, setDeptInputs] = useState({});
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaveError, setCompanySaveError] = useState("");

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "empleado" });
  const [userSaveError, setUserSaveError] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [lastCreatedPassword, setLastCreatedPassword] = useState("");

  const [currentSlide, setCurrentSlide] = useState(0);

  const isAdmin = user?.role === "admin";
  const resetToken = useMemo(() => new URLSearchParams(window.location.search).get("resetToken"), []);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    if (employeeStatusTab === "todos") return employees;
    return employees.filter(e => e.employment_status === employeeStatusTab);
  }, [employees, employeeStatusTab]);

  const managerOptions = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees
      .filter(e => e.employment_status === "activo" && e.id !== editingEmployeeId)
      .map(e => ({ id: e.id, full_name: `${e.position || 'Sin Puesto'} — ${e.first_name} ${e.last_name}` }));
  }, [employees, editingEmployeeId]);

  const availableDepartments = useMemo(() => {
    if (!newEmployee.company_id) return DEPARTMENTS;
    const selectedComp = companies.find(c => String(c.id) === String(newEmployee.company_id));
    if (!selectedComp || !selectedComp.departments || selectedComp.departments.length === 0) {
      return DEPARTMENTS;
    }
    const companyDeptNames = selectedComp.departments.map(d => d.name || d);
    return Array.from(new Set([...companyDeptNames, ...DEPARTMENTS]));
  }, [companies, newEmployee.company_id]);

  async function loadEmployees(search = "") {
    setEmployeesLoading(true);
    setEmployeesError("");
    try {
      const data = await api.getEmployees(token, search);
      window.listaEmpleados = data;
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setEmployeesError(err.message);
    } finally {
      setEmployeesLoading(false);
    }
  }

  async function handleDeleteEmployee(e, employeeId, employeeName) {
    e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente a "${employeeName}"?`)) return;

    try {
      setEmployeesLoading(true);
      await api.deleteEmployee(token, employeeId);
      alert("✅ Colaborador eliminado correctamente.");
      await loadEmployees(searchInput);
    } catch (err) {
      alert("❌ Error al eliminar colaborador: " + err.message);
    } finally {
      setEmployeesLoading(false);
    }
  }

  async function loadCompanies() {
    setCompaniesLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/companies", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const companiesWithTemplates = await Promise.all(data.map(async (c) => {
          const cleanCompany = { ...c, id: String(c.id).trim() };
          try {
            const tmplRes = await fetch(`http://localhost:4000/api/companies/${cleanCompany.id}/templates`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (tmplRes.ok) {
              const templatesData = await tmplRes.json();
              return { ...cleanCompany, templates: Array.isArray(templatesData) ? templatesData : [] };
            }
          } catch (e) {}
          return { ...cleanCompany, templates: [] };
        }));

        setCompanies(companiesWithTemplates);
      }
    } catch (err) {
      console.error("Error al cargar empresas:", err);
    } finally {
      setCompaniesLoading(false);
    }
  }

  async function handleDeleteCompanyTemplate(templateId) {
    if (!window.confirm("¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/companies/templates/${templateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert("✅ Plantilla eliminada correctamente.");
        loadCompanies();
      } else {
        const err = await res.json();
        alert("❌ Error al eliminar la plantilla: " + err.message);
      }
    } catch (err) {
      alert("❌ Error de red al eliminar la plantilla: " + err.message);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const data = await api.getUsers(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadLeaveData() {
    setLeaveLoading(true);
    try {
      const [requests, types] = await Promise.all([
        api.getLeaveRequests ? api.getLeaveRequests(token) : fetch("http://localhost:4000/api/leaves/requests", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        api.getLeaveTypes ? api.getLeaveTypes(token) : fetch("http://localhost:4000/api/leave-types", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      ]);
      setLeaveRequests(Array.isArray(requests) ? requests : []);
      setLeaveTypes(Array.isArray(types) ? types : []);
      
      const balance = api.getMyLeaveBalance 
        ? await api.getMyLeaveBalance(token)
        : await fetch("http://localhost:4000/api/leaves/my-balance", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      setMyBalance(Array.isArray(balance) ? balance[0] : balance || null);
    } catch (err) {
      console.error("Error al cargar datos de vacaciones:", err);
    } finally {
      setLeaveLoading(false);
    }
  }

  async function requestLeave(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date) {
      alert("Por favor selecciona las fechas de inicio y fin.");
      return;
    }
    setLeaveLoading(true);
    try {
      if (api.requestLeave) {
        await api.requestLeave(token, leaveForm);
      } else {
        const response = await fetch("http://localhost:4000/api/leaves/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(leaveForm)
        });
        if (!response.ok) throw new Error("Error al procesar la solicitud de vacaciones.");
      }
      setLeaveForm({ leave_type_id: "", start_date: "", end_date: "", request_type: "vacaciones", comments: "" });
      await loadLeaveData();
    } catch (err) {
      alert(err.message || "No se pudo registrar la solicitud");
    } finally {
      setLeaveLoading(false);
    }
  }

  async function loadEmployeeFiles(employeeId) {
    if (!employeeId) return;
    try {
      const files = await api.getEmployeeFiles(token, employeeId);
      setEmployeeFiles(Array.isArray(files) ? files : []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadEmployeeDocuments(employeeId) {
    if (!employeeId) return;
    try {
      const docs = await api.getEmployeeDocuments(token, employeeId);
      setEmployeeDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error(err);
    }
  }

  const [editingUserForPass, setEditingUserForPass] = useState(null);
  const [newUserPassword, setNewUserPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  async function handleSaveUserPassword(e) {
    e.preventDefault();
    if (!editingUserForPass || !newUserPassword.trim()) return;

    setSavingPass(true);
    try {
      await api.updateUser(token, editingUserForPass.id, { password: newUserPassword.trim() });
      alert(`✅ Contraseña actualizada correctamente para ${editingUserForPass.email}`);
      setEditingUserForPass(null);
      setNewUserPassword("");
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      setSavingPass(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    function checkUnread() {
      if (api.getUnreadCount) {
        api.getUnreadCount(token)
          .then((data) => setUnreadCount(data?.count || 0))
          .catch(() => setUnreadCount(0));
      }
    }
    checkUnread();
    const interval = setInterval(checkUnread, 5000);
    return () => clearInterval(interval);
  }, [token]);
// 🟢 VERIFICACIÓN DE PERMISOS DE PUBLICACIONES SOCIALES
  useEffect(() => {
    if (token && user) {
      const userPos = (user.position || "").toLowerCase();
      const isRecruiter = userPos.includes("reclutad") || userPos.includes("rh");
      if (isAdmin || isRecruiter) {
        setCanAccessSocial(true);
      } else if (api && api.checkSocialPermission) {
        api.checkSocialPermission(token)
          .then(() => setCanAccessSocial(true))
          .catch(() => setCanAccessSocial(false));
      }
    }
  }, [token, user, isAdmin]);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeDocuments(selectedEmployee.id);
      loadEmployeeFiles(selectedEmployee.id);
      
      const defaultTemplates = [
        { id: "constancia_laboral", name: "Constancia Laboral" },
        { id: "carta_recomendacion", name: "Carta de Recomendación" },
        { id: "carta_guarderia", name: "Carta para Guardería (IMSS)" },
        { id: "carta_probatoria_domicilio", name: "Carta Probatoria de Domicilio (IMSS)" },
        { id: "acta_administrativa", name: "Acta Administrativa (Mala Actuación)" },
        { id: "formato_multiple", name: "Formato Múltiple de Solicitudes" }
      ];

      if (api.getTemplates) {
        api.getTemplates(token)
          .then(data => setTemplates(Array.isArray(data) && data.length > 0 ? data : defaultTemplates))
          .catch(() => setTemplates(defaultTemplates));
      } else {
        setTemplates(defaultTemplates);
      }

      if (api.getMultiFormOptions) {
        api.getMultiFormOptions(token)
          .then(setMultiFormOptions)
          .catch(() => setMultiFormOptions([
            "Vacaciones", "Permiso con Goce", "Permiso sin Goce", "Cambio de Cuenta Bancaria", "Constancia de Trabajo"
          ]));
      }
    }
  }, [selectedEmployee?.id]);

  useEffect(() => {
    if (showAddEmployee && editingEmployeeId && formTab === "movimientos") {
      api.getEmployeeHistory(token, editingEmployeeId).then(setEmployeeHistory).catch(() => setEmployeeHistory([]));
    }
  }, [showAddEmployee, editingEmployeeId, formTab]);

  useEffect(() => {
    if (token && (view === "companies" || showAddEmployee || showExportAltasModal || view === "employees")) loadCompanies();
  }, [token, view, showAddEmployee, showExportAltasModal]);

  useEffect(() => {
    if (token && view === "users" && isAdmin) loadUsers();
  }, [token, view]);

  useEffect(() => {
    if (token && (view === "employees" || view === "orgchart" || view === "profile" || view === "messages" || view === "dashboard")) {
      loadEmployees();
    }
  }, [token, view]);

  useEffect(() => {
    if (!selectedEmployeeId) { setSelectedEmployee(null); return; }
    api.getEmployee(token, selectedEmployeeId).then(setSelectedEmployee).catch(err => setEmployeesError(err.message));
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (token && view === "leave") loadLeaveData();
  }, [token, view]);

  useEffect(() => {
    if (!token || !user) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % LOGIN_SLIDES.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [token, user]);

  async function submitForgotPassword(e) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage("");
    try {
      const data = await api.forgotPassword(forgotEmail);
      setForgotMessage(data.message);
    } catch (err) {
      setForgotMessage(err.message);
    } finally {
      setForgotLoading(false);
    }
  }

  async function submitResetPassword(e) {
    e.preventDefault();
    setResetError("");
    if (newPassword.length < 6) { setResetError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { setResetError("Las contraseñas no coinciden."); return; }
    setResetLoading(true);
    try {
      await api.resetPassword(resetToken, newPassword);
      setResetDone(true);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  }

  async function handlePhotoChange(file) {
    if (!file || !selectedEmployee) return;
    setPhotoUploading(true);
    try {
      await api.uploadEmployeePhoto(token, selectedEmployee.id, file);
      const refreshed = await api.getEmployee(token, selectedEmployee.id);
      setSelectedEmployee(refreshed);
      loadEmployees();
    } catch (err) {
      alert(err.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleUploadFile(file, fileType) {
    if (!file || !selectedEmployee) return;
    setFileUploading(true);
    try {
      await api.uploadEmployeeFile(token, selectedEmployee.id, file, fileType);
      await loadEmployeeFiles(selectedEmployee.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setFileUploading(false);
    }
  }

  async function handleDeleteFile(fileId) {
    if (!selectedEmployee) return;
    if (!window.confirm("¿Eliminar este archivo del expediente?")) return;
    try {
      await api.deleteEmployeeFile(token, selectedEmployee.id, fileId);
      await loadEmployeeFiles(selectedEmployee.id);
    } catch (err) {
      alert(err.message);
    }
  }

  function toggleOption(opt) {
    setCheckedOptions(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
  }

  async function generateDocument() {
    if (!selectedTemplateId || !selectedEmployee) {
      alert("Por favor selecciona una plantilla de la lista antes de generar.");
      return;
    }
    setGeneratingDoc(true);
    try {
      let res;
      const isMulti = templates.find(t => t.id === selectedTemplateId)?.name === "Formato Múltiple de Solicitudes" || selectedTemplateId === "formato_multiple";
      if (isMulti) {
        res = await api.generateMultiForm(token, {
          employee_id: selectedEmployee.id,
          checked_options: checkedOptions,
          observaciones,
          fecha_solicitud: fechaSolicitud,
        });
        setCheckedOptions([]);
        setObservaciones("");
      } else {
        res = await api.generateDocument(token, selectedEmployee.id, selectedTemplateId, { 
          child_name: childName,
          incident_date: incidentDate,
          incident_time: incidentTime,
          incident_location: incidentLocation,
          observaciones,
          witness1,
          witness2
        });
      }

      await loadEmployeeDocuments(selectedEmployee.id);
      setSelectedTemplateId("");
      setChildName("");
      setObservaciones("");

      if (res && res.file_url) {
        const fullUrl = res.file_url.startsWith("http") 
          ? res.file_url 
          : `http://localhost:4000${res.file_url.startsWith('/') ? '' : '/'}${res.file_url}`;
        
        const link = document.createElement("a");
        link.href = fullUrl;
        link.target = "_blank";
        link.download = res.filename || "documento.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert("Error al generar el documento PDF: " + (err.message || "Error de servidor"));
    } finally {
      setGeneratingDoc(false);
    }
  }

  async function submitNewCompany(e) {
    e.preventDefault();
    if (!newCompany.legal_name) { setCompanySaveError("El nombre legal es obligatorio."); return; }
    setCompanySaving(true);
    setCompanySaveError("");

    const url = editingCompany
      ? `http://localhost:4000/api/companies/${editingCompany.id}`
      : "http://localhost:4000/api/companies";
    const method = editingCompany ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newCompany)
      });

      if (!res.ok) throw new Error("No se pudo procesar la solicitud de la empresa.");

      setNewCompany({ legal_name: "", rfc: "", address: "", imss_registry: "" });
      setEditingCompany(null);
      setShowAddCompany(false);
      await loadCompanies();
    } catch (err) {
      setCompanySaveError(err.message);
    } finally {
      setCompanySaving(false);
    }
  }

  async function deleteCompany(companyId) {
    if (!window.confirm("¿Estás seguro de eliminar esta empresa?")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/companies/${companyId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        loadCompanies();
      } else if (api.deleteCompany) {
        await api.deleteCompany(token, companyId);
        loadCompanies();
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddDept(companyId) {
    const deptName = deptInputs[companyId];
    if (!deptName || !deptName.trim()) return;

    try {
      const res = await fetch(`http://localhost:4000/api/companies/${companyId}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: deptName.trim() })
      });

      if (res.ok) {
        setDeptInputs({ ...deptInputs, [companyId]: "" });
        loadCompanies();
      }
    } catch (err) {
      console.error("Error al agregar departamento:", err);
    }
  }

  async function handleDeleteDept(deptId) {
    if (!window.confirm("¿Eliminar este departamento?")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/companies/departments/${deptId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) loadCompanies();
    } catch (err) {
      console.error("Error al eliminar departamento:", err);
    }
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    setNewUser(prev => ({ ...prev, password: pass }));
  }

  async function submitNewUser(e) {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      setUserSaveError("Correo y contraseña son obligatorios.");
      return;
    }
    setUserSaving(true);
    setUserSaveError("");
    try {
      await api.registerUser(token, newUser);
      setLastCreatedPassword(newUser.password);
      setNewUser({ email: "", password: "", role: "empleado" });
      loadUsers();
    } catch (err) {
      setUserSaveError(err.message);
    } finally {
      setUserSaving(false);
    }
  }

  async function changeUserRole(id, role) {
    try {
      await api.updateUser(token, id, { role });
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleUserActive(u) {
    try {
      await api.updateUser(token, u.id, { is_active: !u.is_active });
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteUser(u) {
    if (!window.confirm(`¿Eliminar la cuenta de ${u.email}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteUser(token, u.id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const data = await api.login(loginForm.email, loginForm.password);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("nucleo_rh_token", data.token);
      localStorage.setItem("nucleo_rh_user", JSON.stringify(data.user));
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setToken(""); setUser(null);
    localStorage.removeItem("nucleo_rh_token");
    localStorage.removeItem("nucleo_rh_user");
    setView("dashboard");
  }

  function openNewEmployeeForm(employeeToEdit = null) {
    if (employeeToEdit) {
      setEditingEmployeeId(employeeToEdit.id);
      setNewEmployee({
        ...emptyEmployee(),
        ...employeeToEdit,
        birth_date: employeeToEdit.birth_date ? String(employeeToEdit.birth_date).slice(0, 10) : "",
        hire_date: employeeToEdit.hire_date ? String(employeeToEdit.hire_date).slice(0, 10) : "",
        termination_date: employeeToEdit.termination_date ? String(employeeToEdit.termination_date).slice(0, 10) : "",
        contract_start_date: employeeToEdit.contract_start_date ? String(employeeToEdit.contract_start_date).slice(0, 10) : "",
        contract_end_date: employeeToEdit.contract_end_date ? String(employeeToEdit.contract_end_date).slice(0, 10) : "",
        rehire_date: employeeToEdit.rehire_date ? String(employeeToEdit.rehire_date).slice(0, 10) : "",
        probation_end_date: employeeToEdit.probation_end_date ? String(employeeToEdit.probation_end_date).slice(0, 10) : "",
        is_rehire: !!employeeToEdit.rehire_date,
      });
    } else {
      setEditingEmployeeId(null);
      setNewEmployee(emptyEmployee());
    }
    setFormTab("personal");
    setSaveError("");
    setShowAddEmployee(true);
  }

  function updateField(key, value) {
    setNewEmployee(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "same_as_personal_address" && value) {
        updated.fiscal_street = updated.street;
        updated.fiscal_exterior_number = updated.exterior_number;
        updated.fiscal_interior_number = updated.interior_number;
        updated.fiscal_neighborhood = updated.neighborhood;
        updated.fiscal_postal_code = updated.postal_code;
        updated.fiscal_municipality = updated.municipality;
        updated.fiscal_state = updated.state;
      }
      return updated;
    });
  }

  async function addEmployee(e) {
    e.preventDefault();
    if (!newEmployee.first_name || (!newEmployee.last_name && !newEmployee.last_name_paternal) || !newEmployee.hire_date) {
      setFormTab("personal");
      setSaveError("Nombre, apellido y fecha de alta son obligatorios.");
      return;
    }
    setSavingEmployee(true);
    setSaveError("");
    try {
      const payload = { ...newEmployee };
      delete payload.is_rehire;
      delete payload.id;
      if (!payload.rehire_date) delete payload.rehire_date;

      if (payload.employment_status === "baja" && !payload.termination_date) {
        payload.termination_date = new Date().toISOString().slice(0, 10);
      } else if (payload.employment_status !== "baja") {
        delete payload.termination_date;
      }

      if (editingEmployeeId) {
        await api.updateEmployee(token, editingEmployeeId, payload);
        const refreshed = await api.getEmployee(token, editingEmployeeId);
        setSelectedEmployee(refreshed);
      } else {
        await api.createEmployee(token, payload);
      }
      setShowAddEmployee(false);
      setEditingEmployeeId(null);
      await loadEmployees();
    } catch (err) {
      setSaveError(err.message || "Error al guardar los cambios");
    } finally {
      setSavingEmployee(false);
    }
  }

  
async function exportBajasToExcel() {
    const bajasList = employees.filter(e => e.employment_status === "baja");
    if (bajasList.length === 0) {
      alert("No hay registros de bajas para exportar.");
      return;
    }

    const workbook = new Workbook.Workbook();
    const worksheet = workbook.addWorksheet("Historial Bajas");

    // 1. Encabezados requeridos
    const headers = [
      "Empresa", 
      "Nombre Completo (Apellidos Nombre)", 
      "Número de Seguro Social (NSS)", 
      "Fecha de Baja"
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B4B43' } }; // Verde Núcleo RH
      cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // 2. Iterar empleados armando el nombre por apellidos
    bajasList.forEach((e) => {
      // Concatenar Apellido Paterno + Apellido Materno + Nombre
      const lastName = e.last_name || e.paternal_surname || "";
      const motherLastName = e.mother_last_name || e.maternal_surname || "";
      const firstName = e.first_name || e.names || "";

      const fullNameByLastNames = `${lastName} ${motherLastName} ${firstName}`.trim().toUpperCase() || "SIN NOMBRE";

      // Formato de fecha
      const dischargeDate = e.termination_date || e.discharge_date ? String(e.termination_date || e.discharge_date).slice(0, 10) : "N/A";

      const row = worksheet.addRow([
        e.company_name || e.company_legal_name || e.company || "Sin Empresa",
        fullNameByLastNames,
        e.nss || e.social_security_number || "N/A",
        dischargeDate
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'E1E6E4' } },
          left: { style: 'thin', color: { argb: 'E1E6E4' } },
          bottom: { style: 'thin', color: { argb: 'E1E6E4' } },
          right: { style: 'thin', color: { argb: 'E1E6E4' } }
        };
      });
    });

    // Ajustar ancho de columnas automáticamente
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? String(cell.value) : "";
        if (val.length > maxLen) maxLen = val.length;
      });
      column.width = Math.max(maxLen + 4, 15);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Reporte_Bajas_RH_${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function processExportAltasExcel() {
    let activeList = employees.filter(e => e.employment_status === "activo");

    if (exportFilterType === "company") {
      if (!exportSelectedCompanyId) { alert("Selecciona una empresa para exportar."); return; }
      activeList = activeList.filter(e => isSameCompany(e, exportSelectedCompanyId));
    } else if (exportFilterType === "employee") {
      if (!exportSelectedEmployeeId) { alert("Selecciona un empleado para exportar."); return; }
      activeList = activeList.filter(e => String(e.id) === String(exportSelectedEmployeeId));
    }

    if (activeList.length === 0) {
      alert("No se encontraron colaboradores que coincidan con la selección.");
      return;
    }

    const workbook = new Workbook.Workbook();
    const worksheet = workbook.addWorksheet("Layout Altas");

    const headers = [
      "EMPRESA", "NUMERO DE IMSS", "NOMBRE (S)", "A. PATERNO", "A. MATERNO", "CURP",
      "S.D ALTA", "S.D. I. ALTA", "F. DE ALTA", "DEPTO", "PUESTO", "RFC SIN GUIONES",
      "FECHA NAC DD/MM/AAAA", "LUGAR NAC (MUNICIPIO)", "ESTADO NAC (EJEMPLO: JAL)",
      "SEXO (M O F)", "EDO CIVIL (SOL,CAS,VIU,DIV,ULI)", "ESCOLARIDAD", "ULTIMO GRADO",
      "CALLE", "NUMERO SIN #", "INTERIOR SIN #", "COLONIA", "CP", "MUNICIPIO",
      "ESTADO (EJEMPLO: JAL)", "TEL1", "CELULAR", "CONTACTO EMERG.",
      "RELACION (EJEMPLO: PADRE)", "TEL EMERG.", "TIPO NOM QUI O SEM",
      "TIENE CREDITO INFONAVIT (SI O NO)", "NUM CRED INFO", "VALOR DESCUENTO",
      "BANCO", "CUENTA", "CLABE", "CORREO ELECTRONICO DEL TRABAJADOR",
      "TIPO DE CONTRATO", "FECHA INICIO DE CONTRATO", "FECHA TERMINO DE CONTRATO"
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 28;

    headerRow.eachCell((cell, colNumber) => {
      const isEmpresaCol = colNumber === 1;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEmpresaCol ? 'FFC000' : '808080' }
      };
      cell.font = { color: { argb: isEmpresaCol ? '000000' : 'FFFFFF' }, bold: true, size: 9, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: '555555' } },
        left: { style: 'thin', color: { argb: '555555' } },
        bottom: { style: 'medium', color: { argb: '333333' } },
        right: { style: 'thin', color: { argb: '555555' } }
      };
    });

    const formatDate = (dStr) => {
      if (!dStr) return "";
      const clean = String(dStr).slice(0, 10);
      const parts = clean.split("-");
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : clean;
    };

    activeList.forEach((e, idx) => {
      const comp = companies.find(c => isSameCompany(e, c.id));
      const companyName = comp ? comp.legal_name : (e.company_name || "");
      const cleanRfc = (e.rfc || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      const streetUse = e.fiscal_street || e.street || "";
      const extNumUse = e.fiscal_exterior_number || e.exterior_number || "";
      const intNumUse = e.fiscal_interior_number || e.interior_number || "";
      const neighUse = e.fiscal_neighborhood || e.neighborhood || "";
      const cpUse = e.fiscal_postal_code || e.postal_code || "";
      const muniUse = e.fiscal_municipality || e.municipality || "";
      const stateUse = e.fiscal_state || e.state || "";

      const rowData = [
        companyName,
        e.nss || "",
        e.first_name || "",
        e.last_name_paternal || e.last_name || "",
        e.last_name_maternal || "",
        e.curp || "",
        e.base_daily_salary ? Number(e.base_daily_salary) : "",
        e.sdi_salary ? Number(e.sdi_salary) : "",
        formatDate(e.hire_date),
        e.department || "",
        e.position || "",
        cleanRfc,
        formatDate(e.birth_date),
        e.birth_place_municipality || "",
        e.birth_place_state || "",
        e.gender ? e.gender.toUpperCase().slice(0, 1) : "",
        e.marital_status || "",
        e.education_level || "",
        e.last_grade || "",
        streetUse,
        extNumUse,
        intNumUse,
        neighUse,
        cpUse,
        muniUse,
        stateUse,
        e.phone || "",
        e.mobile_phone || "",
        e.emergency_contact_name || "",
        e.emergency_contact_relationship || "",
        e.emergency_contact_phone || "",
        e.payroll_type || "QUI",
        e.has_infonavit_credit || "NO",
        e.infonavit_credit_number || "",
        e.infonavit_discount_value ? Number(e.infonavit_discount_value) : "",
        e.bank_name || "",
        e.bank_account || "",
        e.bank_clabe || "",
        e.personal_email || "",
        e.contract_type || "",
        formatDate(e.contract_start_date || e.hire_date),
        formatDate(e.contract_end_date)
      ];

      const addedRow = worksheet.addRow(rowData);
      addedRow.height = 20;

      const isEven = idx % 2 === 0;
      addedRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFF' : 'F9FBF9' }
        };
        cell.font = { size: 9, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E1E6E4' } },
          left: { style: 'thin', color: { argb: 'E1E6E4' } },
          bottom: { style: 'thin', color: { argb: 'E1E6E4' } },
          right: { style: 'thin', color: { argb: 'E1E6E4' } }
        };
      });
    });

    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? String(cell.value) : "";
        if (val.length > maxLen) maxLen = val.length;
      });
      column.width = Math.max(maxLen + 4, 14);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Formatos_Altas_RH_${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setShowAddExportAltasModal(false);
  }

  async function reviewLeave(id, status) {
    try {
      await api.reviewLeave(token, id, status);
      loadLeaveData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (resetToken) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.primary }}><Building2 size={18} color="#fff" /></div>
            <span className="text-lg font-semibold" style={{ color: C.ink }}>Núcleo RH</span>
          </div>
          <div className="rounded-2xl p-7" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            {resetDone ? (
              <>
                <h1 className="text-xl font-semibold mb-2" style={{ color: C.ink }}>¡Listo!</h1>
                <p className="text-sm mb-5" style={{ color: C.inkSoft }}>Tu contraseña fue actualizada. Ya puedes iniciar sesión con la nueva.</p>
                <button onClick={() => { window.location.href = "/"; }} className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer" style={{ background: C.primary, color: "#fff" }}>Ir al login</button>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold mb-1" style={{ color: C.ink }}>Crea una nueva contraseña</h1>
                <p className="text-sm mb-6" style={{ color: C.inkSoft }}>Escribe tu nueva contraseña dos veces para confirmar.</p>
                <form onSubmit={submitResetPassword} className="space-y-4">
                  <TextField label="Nueva contraseña" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  <TextField label="Confirmar contraseña" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  {resetError && <p className="text-xs" style={{ color: C.danger }}>{resetError}</p>}
                  <button type="submit" disabled={resetLoading} className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-pointer" style={{ background: C.primary, color: "#fff" }}>
                    <Loader2 size={14} className={resetLoading ? "animate-spin opacity-100" : "opacity-0 w-0"} /> Guardar nueva contraseña
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen w-full flex bg-[#0F172A] font-sans overflow-hidden">
        <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-slate-950 justify-between flex-col p-12">
          {LOGIN_SLIDES.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={index}
                className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
                style={{
                  opacity: isActive ? 1 : 0,
                  zIndex: isActive ? 1 : 0,
                }}
              >
                <img
                  src={slide.url}
                  alt=""
                  className={`w-full h-full object-cover filter brightness-[0.55] transition-transform duration-[7000ms] ease-out ${
                    isActive ? "scale-110" : "scale-100"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent" />
              </div>
            );
          })}

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1B4B43] text-white shadow-xl border border-emerald-500/30">
              <Building2 size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white drop-shadow">
              Núcleo RH
            </span>
          </div>

          <div className="relative z-10 flex gap-2 pt-4">
            {LOGIN_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === currentSlide ? "w-8 bg-emerald-400" : "w-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <div className="relative z-10 text-xs text-slate-400">
            © {new Date().getFullYear()} Núcleo RH. Todos los derechos reservados.
          </div>
        </div>

        <div className="w-full lg:w-2/5 flex items-center justify-center p-8 bg-[#0F172A] border-l border-slate-800">
          <div className="w-full max-w-md space-y-8">
            <div className="lg:hidden flex items-center gap-3 justify-center mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1B4B43] text-white shadow-lg">
                <Building2 size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Núcleo RH</span>
            </div>

            {showForgotPassword ? (
              <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
                <button
                  onClick={() => { setShowForgotPassword(false); setForgotMessage(""); }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Volver al inicio de sesión
                </button>
                <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                  Recuperar contraseña
                </h1>
                <p className="text-xs text-slate-400 mb-6">
                  Escribe tu correo registrado y te enviaremos un enlace de restauración.
                </p>

                {forgotMessage ? (
                  <p className="text-xs p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                    {forgotMessage}
                  </p>
                ) : (
                  <form onSubmit={submitForgotPassword} className="space-y-5">
                    <div>
                      <label className="text-xs font-medium block mb-2 text-slate-300">Correo Electrónico</label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="tu@empresa.com"
                        className="w-full px-4 py-3 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 rounded-xl text-xs font-bold text-white bg-[#1B4B43] hover:bg-[#153B34] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {forgotLoading && <Loader2 size={14} className="animate-spin" />}
                      <span>Enviar enlace de recuperación</span>
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    Iniciar Sesión
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Ingresa tus credenciales para acceder al sistema.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold block mb-2 text-slate-300">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="tu@empresa.com"
                      className="w-full px-4 py-3 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-300">Contraseña</label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[11px] font-medium text-emerald-400 hover:underline cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  {loginError && (
                    <p className="text-xs p-3 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300">
                      {loginError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-[#1B4B43] hover:bg-[#153B34] transition-all shadow-lg hover:shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loginLoading && <Loader2 size={15} className="animate-spin" />}
                    <span>Acceder al Sistema</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const NAV = [
    { key: "dashboard", label: "Panel", icon: LayoutDashboard },
    { key: "messages", label: "Mensajería", icon: MessageSquare },
    ...((isAdmin || canAccessSocial) ? [{ key: "social", label: "Publicaciones", icon: Share2 }] : []),
    { key: "profile", label: "Mi Perfil", icon: User },
    ...(isAdmin ? [{ key: "employees", label: "Empleados", icon: Users }] : []),
    { key: "orgchart", label: "Organigrama", icon: Building2 },
    { key: "leave", label: "Vacaciones y permisos", icon: CalendarDays },
    ...(isAdmin ? [{ key: "users", label: "Usuarios", icon: KeyRound }] : []),
    ...(isAdmin ? [{ key: "companies", label: "Empresas", icon: Building2 }] : []),
  ];

  const pendingCount = leaveRequests.filter(r => r.status === "pendiente").length;
  const userEmployeeProfile = employees.find(e => e.personal_email === user?.email);
  const userDept = userEmployeeProfile?.department || user?.department || "Recursos Humanos";

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      <aside className="w-60 shrink-0 flex flex-col p-4" style={{ borderRight: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.primary }}><Building2 size={16} color="#fff" /></div>
          <span className="font-semibold" style={{ color: C.ink }}>Núcleo RH</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(item => {
            const Icon = item.icon; const active = view === item.key;
            return (
              <button key={item.key} onClick={() => { setView(item.key); setSelectedEmployeeId(null); setShowAddEmployee(false); setSelectedCompanyFilter(null); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left relative cursor-pointer"
                style={{ background: active ? C.primarySoft : "transparent", color: active ? C.primary : C.inkSoft, fontWeight: active ? 600 : 500 }}>
                <Icon size={17} />{item.label}
                {item.key === "messages" && unreadCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-red-500 animate-pulse">
                    {unreadCount}
                  </span>
                )}
                {item.key === "leave" && isAdmin && pendingCount > 0 && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: C.accent, color: "#fff" }}>{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: C.primary, color: "#fff" }}>{initials(user.email)}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: C.ink }}>{user.email}</p>
              <p className="text-xs truncate" style={{ color: C.inkSoft }}>{isAdmin ? "Administrador" : "Empleado"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ color: C.inkSoft }}><LogOut size={15} /> Cerrar sesión</button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {view === "dashboard" && (
          <WorkspaceDashboard 
            token={token} 
            user={user} 
            api={api} 
            onNavigate={(targetView) => setView(targetView)} 
          />
        )}

        {view === "social" && (
          <SocialPublicationsModule token={token} user={user} api={api} />
        )}


        {view === "messages" && (
          <ChatModule token={token} user={user} api={api} />
        )}

        {view === "profile" && (
          <UserProfileView token={token} user={user} api={api} employees={employees} />
        )}

        {view === "companies" && isAdmin && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>Empresas</h1>
                <p className="text-sm" style={{ color: C.inkSoft }}>Gestión de razón social, entidades y departamentos ({companies.length})</p>
              </div>
              <button 
                onClick={() => { 
                  setEditingCompany(null);
                  setNewCompany({ legal_name: "", rfc: "", address: "", imss_registry: "" });
                  setShowAddCompany(v => !v); 
                  setCompanySaveError(""); 
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors" 
                style={{ background: C.primary, color: "#fff" }}
              >
                <Plus size={16} /> {showAddCompany ? "Cancelar" : "Nueva Empresa"}
              </button>
            </div>

            {showAddCompany && (
              <form onSubmit={submitNewCompany} className="rounded-2xl p-5 mb-6 bg-white border shadow-sm" style={{ borderColor: C.line }}>
                <h2 className="text-sm font-bold mb-4" style={{ color: C.ink }}>
                  {editingCompany ? "Editar Razón Social" : "Registrar Nueva Razón Social"}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <TextField 
                    label="Nombre Legal / Razón Social" 
                    required 
                    value={newCompany.legal_name} 
                    onChange={e => setNewCompany(f => ({ ...f, legal_name: e.target.value }))} 
                    placeholder="Mi Empresa S.A. de C.V." 
                  />
                  <TextField 
                    label="RFC" 
                    value={newCompany.rfc} 
                    onChange={e => setNewCompany(f => ({ ...f, rfc: e.target.value }))} 
                    placeholder="ABC123456XYZ" 
                  />
                  <TextField 
                    label="Registro Patronal IMSS" 
                    value={newCompany.imss_registry} 
                    onChange={e => setNewCompany(f => ({ ...f, imss_registry: e.target.value }))} 
                    placeholder="Ej. E123456710" 
                  />
                  <TextField 
                    label="Dirección Fiscal" 
                    value={newCompany.address} 
                    onChange={e => setNewCompany(f => ({ ...f, address: e.target.value }))} 
                    placeholder="Calle, Número, Ciudad" 
                  />
                </div>
                {companySaveError && <p className="text-xs mt-3 font-medium" style={{ color: C.danger }}>{companySaveError}</p>}
                <div className="flex justify-end gap-3 mt-4">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddCompany(false); setEditingCompany(null); }} 
                    className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer" 
                    style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={companySaving} 
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-2 cursor-pointer shadow-sm" 
                    style={{ background: C.primary }}
                  >
                    {companySaving && <Loader2 size={13} className="animate-spin" />} 
                    {editingCompany ? "Actualizar Empresa" : "Guardar Empresa"}
                  </button>
                </div>
              </form>
            )}

            {companiesLoading ? <Spinner label="Cargando empresas y departamentos…" /> : (
              <div className="space-y-4">
                {companies.map((c, i) => (
                  <div key={c.id || i} className="rounded-2xl p-5 bg-white border shadow-sm space-y-4" style={{ borderColor: C.line }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: C.primarySoft, color: C.primary }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <p className="text-base font-bold" style={{ color: C.ink }}>{c.legal_name || c.name}</p>
                          <p className="text-xs" style={{ color: C.inkSoft }}>RFC: {c.rfc || "—"} · Reg. Patronal: {c.imss_registry || c.registro_patronal || "—"} · {c.address || "Sin dirección física registrada"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCompany(c);
                            setNewCompany({
                              legal_name: c.legal_name || c.name || "",
                              rfc: c.rfc || "",
                              address: c.address || "",
                              imss_registry: c.imss_registry || c.registro_patronal || ""
                            });
                            setShowAddCompany(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1 transition-colors cursor-pointer"
                          style={{ background: C.primarySoft, color: C.primary, borderColor: C.line }}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          type="button"
                          onClick={() => deleteCompany(c.id)} 
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer" 
                          style={{ color: C.danger }}
                          title="Eliminar Empresa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t pt-3" style={{ borderColor: C.line }}>
                      <span className="text-xs font-bold block mb-2" style={{ color: C.inkSoft }}>
                        Departamentos asignados a esta empresa:
                      </span>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {c.departments && c.departments.length > 0 ? (
                          c.departments.map((dept) => (
                            <span 
                              key={dept.id} 
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200"
                            >
                              {dept.name}
                              <button
                                type="button"
                                onClick={() => handleDeleteDept(dept.id)}
                                className="text-slate-400 hover:text-red-500 font-bold ml-1 text-xs cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin departamentos agregados.</span>
                        )}
                      </div>

                      <div className="flex gap-2 max-w-xs mt-2">
                        <input
                          type="text"
                          placeholder="Nuevo departamento..."
                          value={deptInputs[c.id] || ""}
                          onChange={(e) => setDeptInputs({ ...deptInputs, [c.id]: e.target.value })}
                          className="px-3 py-1.5 border rounded-lg text-xs w-full outline-none focus:ring-1 focus:ring-[#1B4B43]"
                          style={{ borderColor: C.line }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddDept(c.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shrink-0"
                          style={{ background: C.primary }}
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-3" style={{ borderColor: C.line }}>
                      <span className="text-xs font-bold block mb-2" style={{ color: C.primary }}>
                        📄 Plantillas de Formatos para Generación de Expedientes:
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {[
                          "Contratos",
                          "Convenio de Confidencialidad",
                          "Aviso de Privacidad",
                          "Formatos Varios"
                        ].map((docType) => {
                          const categoryTemplates = c.templates?.filter(t => t.document_type === docType || (docType === "Contratos" && (t.document_type === "Contratos" || t.document_type === "Contrato Firmado"))) || [];

                          return (
                            <div key={docType} className="p-3 rounded-xl border bg-slate-50 flex flex-col gap-2 text-xs" style={{ borderColor: C.line }}>
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-800">{docType}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200">
                                  {categoryTemplates.length} plantilla(s)
                                </span>
                              </div>

                              {categoryTemplates.length > 0 && (
                                <div className="space-y-1 my-1">
                                  {categoryTemplates.map(tmpl => (
                                    <div key={tmpl.id} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded border border-slate-200">
                                      <span className="font-semibold text-emerald-800 truncate mr-1">{tmpl.sub_type || "General"}:</span>
                                      <span className="text-slate-500 truncate max-w-[120px] mr-1">{tmpl.file_name}</span>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCompanyTemplate(tmpl.id)}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 cursor-pointer shrink-0 transition-colors"
                                        title="Eliminar plantilla"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex gap-1.5 items-center pt-1 border-t border-slate-200/60">
                                {docType === "Contratos" ? (
                                  <select 
                                    id={`subtype-${c.id}-${docType}`}
                                    className="text-[11px] py-1 px-2 border rounded bg-white outline-none flex-1"
                                  >
                                    <option value="Indeterminado">Contrato Indeterminado</option>
                                    <option value="Determinado">Contrato Determinado</option>
                                    <option value="Periodo de Prueba 90 días">Periodo de Prueba (90 días)</option>
                                    <option value="Periodo de Prueba 180 días">Periodo de Prueba (180 días)</option>
                                    <option value="Capacitación Inicial">Capacitación Inicial</option>
                                  </select>
                                ) : (
                                  <input 
                                    type="text"
                                    id={`subtype-${c.id}-${docType}`}
                                    placeholder="Nombre variante (Ej: General)..."
                                    defaultValue="General"
                                    className="text-[11px] py-1 px-2 border rounded bg-white outline-none flex-1"
                                  />
                                )}

                                <label className="px-2.5 py-1 rounded bg-[#1B4B43] text-white text-[11px] font-bold hover:opacity-90 cursor-pointer shrink-0">
                                  <span>Subir .docx</span>
                                  <input
                                    type="file"
                                    accept=".docx"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;

                                      const subTypeInput = document.getElementById(`subtype-${c.id}-${docType}`);
                                      const subTypeVal = subTypeInput ? subTypeInput.value : "General";

                                      const formData = new FormData();
                                      formData.append("template", file);
                                      formData.append("document_type", docType);
                                      formData.append("sub_type", subTypeVal);

                                      try {
                                        const res = await fetch(`http://localhost:4000/api/companies/${c.id}/upload-template`, {
                                          method: "POST",
                                          headers: { Authorization: `Bearer ${token}` },
                                          body: formData
                                        });

                                        if (res.ok) {
                                          alert(`✅ Plantilla para '${docType} (${subTypeVal})' guardada con éxito.`);
                                          loadCompanies();
                                        } else {
                                          const err = await res.json();
                                          alert("❌ Error: " + err.message);
                                        }
                                      } catch (err) {
                                        alert("❌ Error al subir la plantilla: " + err.message);
                                      } finally {
                                        e.target.value = "";
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {companies.length === 0 && (
                  <p className="text-sm py-8 text-center bg-white rounded-2xl border" style={{ borderColor: C.line, color: C.inkSoft }}>
                    No hay empresas registradas.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {view === "orgchart" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>
                  {isAdmin 
                    ? "Organigrama por Empresa" 
                    : `Organigrama de Departamento: ${userDept}`}
                </h1>
                <p className="text-sm" style={{ color: C.inkSoft }}>
                  {isAdmin 
                    ? "Estructura jerárquica organizada individualmente por Razón Social." 
                    : "Estructura interna y puestos activos asignados a tu departamento."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isAdmin && companies.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Empresa:</span>
                    <select
                      value={selectedCompanyFilter?.id || "all"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "all") {
                          setSelectedCompanyFilter(null);
                        } else {
                          const comp = companies.find(c => String(c.id) === String(val));
                          setSelectedCompanyFilter(comp || null);
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 outline-none focus:border-[#1B4B43] shadow-xs cursor-pointer"
                    >
                      <option value="all">Todas las Empresas (Vista Global)</option>
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.legal_name || comp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    const element = document.getElementById("printable-orgchart");
                    if (!element) {
                      alert("❌ No se encontró la vista del organigrama.");
                      return;
                    }

                    try {
                      if (!window.html2canvas) {
                        await new Promise((res, rej) => {
                          const s = document.createElement("script");
                          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                          s.onload = res; s.onerror = rej;
                          document.head.appendChild(s);
                        });
                      }

                      if (!window.jspdf) {
                        await new Promise((res, rej) => {
                          const s = document.createElement("script");
                          s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                          s.onload = res; s.onerror = rej;
                          document.head.appendChild(s);
                        });
                      }

                      alert("⏳ Generando documento completo del organigrama...");

                      const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1200);
                      const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

                      const canvas = await window.html2canvas(element, {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: "#ffffff",
                        logging: false,
                        width: fullWidth,
                        height: fullHeight,
                        windowWidth: fullWidth + 100,
                        windowHeight: fullHeight + 100,
                        onclone: (clonedDoc) => {
                          const clonedElement = clonedDoc.getElementById("printable-orgchart");
                          if (!clonedElement) return;

                          clonedElement.style.width = `${fullWidth}px`;
                          clonedElement.style.height = `${fullHeight}px`;
                          clonedElement.style.overflow = "visible";

                          const allElements = Array.from(clonedElement.querySelectorAll("*"));
                          allElements.push(clonedElement);

                          allElements.forEach((el) => {
                            const computed = window.getComputedStyle(el);

                            el.style.backgroundColor = computed.backgroundColor.includes("oklch") 
                              ? "#ffffff" 
                              : computed.backgroundColor;

                            el.style.color = computed.color.includes("oklch") 
                              ? "#1e293b" 
                              : computed.color;

                            el.style.borderColor = computed.borderColor.includes("oklch") 
                              ? "#cbd5e1" 
                              : computed.borderColor;

                            if (computed.boxShadow.includes("oklch")) {
                              el.style.boxShadow = "none";
                            }
                            if (computed.outlineColor.includes("oklch")) {
                              el.style.outlineColor = "transparent";
                            }
                          });
                        }
                      });

                      const imgData = canvas.toDataURL("image/jpeg", 0.95);
                      const { jsPDF } = window.jspdf;

                      const pdfWidth = Math.max(420, (fullWidth * 297) / fullHeight);
                      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                      const pdf = new jsPDF({
                        orientation: "landscape",
                        unit: "mm",
                        format: [pdfWidth, pdfHeight]
                      });

                      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

                      const companyLabel = selectedCompanyFilter 
                        ? (selectedCompanyFilter.legal_name || selectedCompanyFilter.name) 
                        : "General_Global";

                      pdf.save(`Organigrama_Completo_${companyLabel.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
                    } catch (err) {
                      console.error(err);
                      alert("❌ Error al generar el PDF: " + err.message);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:opacity-90"
                  style={{ background: C.primary }}
                >
                  <Download size={14} /> Exportar Organigrama PDF
                </button>
              </div>
            </div>

            {employeesLoading ? (
              <Spinner label="Cargando organigrama…" />
            ) : (
              <OrgChart 
                employees={
                  employees
                    .filter(e => e.employment_status === "activo")
                    .filter(e => isAdmin || (userDept && e.department === userDept))
                    .filter(e => {
                      if (!selectedCompanyFilter) return true;
                      return isSameCompany(e, selectedCompanyFilter.id);
                    })
                } 
                companyName={selectedCompanyFilter ? (selectedCompanyFilter.legal_name || selectedCompanyFilter.name) : "Estructura Global - Todas las Empresas"}
              />
            )}
          </div>
        )}

        {view === "employees" && !isAdmin && (
          <div className="rounded-2xl p-6 text-sm" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.inkSoft }}>
            Solo los administradores pueden ver el listado de empleados.
          </div>
        )}

        {view === "employees" && isAdmin && (
          <div>
            {showAddEmployee ? (
              <div className="space-y-6 max-w-4xl">
                <button onClick={() => setShowAddEmployee(false)} className="flex items-center gap-1 text-xs font-medium mb-2 cursor-pointer" style={{ color: C.inkSoft }}>
                  <ArrowLeft size={14} /> Volver
                </button>
                <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  <h1 className="text-xl font-bold mb-4" style={{ color: C.ink }}>
                    {editingEmployeeId ? "Editar Expediente del Empleado" : "Nuevo Empleado"}
                  </h1>

                  <div className="flex border-b mb-6 gap-6" style={{ borderColor: C.line }}>
                    <button
                      type="button"
                      onClick={() => setFormTab("personal")}
                      className="pb-2 text-xs font-semibold cursor-pointer"
                      style={{ borderBottom: formTab === "personal" ? `2px solid ${C.primary}` : "none", color: formTab === "personal" ? C.primary : C.inkSoft }}
                    >
                      Datos Personales y Domicilios
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTab("laboral")}
                      className="pb-2 text-xs font-semibold cursor-pointer"
                      style={{ borderBottom: formTab === "laboral" ? `2px solid ${C.primary}` : "none", color: formTab === "laboral" ? C.primary : C.inkSoft }}
                    >
                      Datos Laborales
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTab("nomina")}
                      className="pb-2 text-xs font-semibold cursor-pointer"
                      style={{ borderBottom: formTab === "nomina" ? `2px solid ${C.primary}` : "none", color: formTab === "nomina" ? C.primary : C.inkSoft }}
                    >
                      Nómina y Fiscal
                    </button>
                    {editingEmployeeId && (
                      <button
                        type="button"
                        onClick={() => setFormTab("movimientos")}
                        className="pb-2 text-xs font-semibold cursor-pointer"
                        style={{ borderBottom: formTab === "movimientos" ? `2px solid ${C.primary}` : "none", color: formTab === "movimientos" ? C.primary : C.inkSoft }}
                      >
                        Historial de Movimientos
                      </button>
                    )}
                  </div>

                  {formTab === "personal" && (
                    <form onSubmit={addEmployee} className="space-y-6">
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.primary }}>Información Personal</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <TextField label="Nombre(s)" required value={newEmployee.first_name} onChange={e => updateField("first_name", e.target.value)} />
                          <TextField label="Apellido Paterno" required value={newEmployee.last_name_paternal || newEmployee.last_name} onChange={e => { updateField("last_name_paternal", e.target.value); updateField("last_name", e.target.value); }} />
                          <TextField label="Apellido Materno" value={newEmployee.last_name_maternal} onChange={e => updateField("last_name_maternal", e.target.value)} />
                          <TextField label="CURP" value={newEmployee.curp} onChange={e => updateField("curp", e.target.value)} />
                          <TextField label="RFC" value={newEmployee.rfc} onChange={e => updateField("rfc", e.target.value)} />
                          <TextField label="NSS" value={newEmployee.nss} onChange={e => updateField("nss", e.target.value)} />
                          <TextField label="Fecha de Nacimiento" type="date" value={newEmployee.birth_date} onChange={e => updateField("birth_date", e.target.value)} />
                          <TextField label="Municipio de Nacimiento" value={newEmployee.birth_place_municipality} onChange={e => updateField("birth_place_municipality", e.target.value)} />
                          <TextField label="Estado de Nacimiento (Ej. JAL)" value={newEmployee.birth_place_state} onChange={e => updateField("birth_place_state", e.target.value)} />
                          <TextField label="Sexo" value={newEmployee.gender} onChange={e => updateField("gender", e.target.value)} options={["Masculino", "Femenino"]} />
                          <TextField label="Estado Civil" value={newEmployee.marital_status} onChange={e => updateField("marital_status", e.target.value)} options={["SOL", "CAS", "VIU", "DIV", "ULI"]} />
                          <TextField label="Escolaridad" value={newEmployee.education_level} onChange={e => updateField("education_level", e.target.value)} />
                          <TextField label="Último Grado" value={newEmployee.last_grade} onChange={e => updateField("last_grade", e.target.value)} />
                          <TextField label="Correo Personal" type="email" value={newEmployee.personal_email} onChange={e => updateField("personal_email", e.target.value)} />
                          <TextField label="Teléfono Fijo" value={newEmployee.phone} onChange={e => updateField("phone", e.target.value)} />
                          <TextField label="Celular" value={newEmployee.mobile_phone} onChange={e => updateField("mobile_phone", e.target.value)} />
                        </div>
                      </div>

                      <div className="pt-4 border-t" style={{ borderColor: C.line }}>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.primary }}>Domicilio Personal (Habitual / Real)</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <TextField label="Calle" value={newEmployee.street} onChange={e => updateField("street", e.target.value)} />
                          <TextField label="Número Exterior" value={newEmployee.exterior_number} onChange={e => updateField("exterior_number", e.target.value)} />
                          <TextField label="Número Interior" value={newEmployee.interior_number} onChange={e => updateField("interior_number", e.target.value)} />
                          <TextField label="Colonia" value={newEmployee.neighborhood} onChange={e => updateField("neighborhood", e.target.value)} />
                          <TextField label="Código Postal" value={newEmployee.postal_code} onChange={e => updateField("postal_code", e.target.value)} />
                          <TextField label="Municipio / Alcaldía" value={newEmployee.municipality} onChange={e => updateField("municipality", e.target.value)} />
                          <TextField label="Estado (Ej. JAL)" value={newEmployee.state} onChange={e => updateField("state", e.target.value)} />
                        </div>
                      </div>

                      <div className="pt-4 border-t" style={{ borderColor: C.line }}>
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.accent }}>Domicilio Fiscal (Constancia de Situación Fiscal SAT)</h2>
                          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer" style={{ color: C.ink }}>
                            <input
                              type="checkbox"
                              checked={!!newEmployee.same_as_personal_address}
                              onChange={e => updateField("same_as_personal_address", e.target.checked)}
                              className="rounded"
                            />
                            Copiar mismo domicilio personal
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <TextField label="Calle (Fiscal)" value={newEmployee.fiscal_street} onChange={e => updateField("fiscal_street", e.target.value)} />
                          <TextField label="Número Exterior (Fiscal)" value={newEmployee.fiscal_exterior_number} onChange={e => updateField("fiscal_exterior_number", e.target.value)} />
                          <TextField label="Número Interior (Fiscal)" value={newEmployee.fiscal_interior_number} onChange={e => updateField("fiscal_interior_number", e.target.value)} />
                          <TextField label="Colonia (Fiscal)" value={newEmployee.fiscal_neighborhood} onChange={e => updateField("fiscal_neighborhood", e.target.value)} />
                          <TextField label="Código Postal (Fiscal)" value={newEmployee.fiscal_postal_code} onChange={e => updateField("fiscal_postal_code", e.target.value)} />
                          <TextField label="Municipio / Alcaldía (Fiscal)" value={newEmployee.fiscal_municipality} onChange={e => updateField("fiscal_municipality", e.target.value)} />
                          <TextField label="Estado (Fiscal - Ej. JAL)" value={newEmployee.fiscal_state} onChange={e => updateField("fiscal_state", e.target.value)} />
                        </div>
                      </div>

                      <div className="pt-4 border-t" style={{ borderColor: C.line }}>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.primary }}>Emergencia y Beneficiario</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <TextField label="Contacto de Emergencia" value={newEmployee.emergency_contact_name} onChange={e => updateField("emergency_contact_name", e.target.value)} />
                          <TextField label="Relación Contacto Emerg." value={newEmployee.emergency_contact_relationship} onChange={e => updateField("emergency_contact_relationship", e.target.value)} placeholder="Ej. Padre, Esposa..." />
                          <TextField label="Teléfono Emergencia" value={newEmployee.emergency_contact_phone} onChange={e => updateField("emergency_contact_phone", e.target.value)} />
                          
                          <TextField label="Beneficiario" value={newEmployee.beneficiary_name} onChange={e => updateField("beneficiary_name", e.target.value)} />
                          <TextField label="Parentesco Beneficiario" value={newEmployee.beneficiary_relationship} onChange={e => updateField("beneficiary_relationship", e.target.value)} placeholder="Ej. Esposa, Hijo(a), Madre..." />
                          <TextField label="Teléfono Beneficiario" value={newEmployee.beneficiary_phone} onChange={e => updateField("beneficiary_phone", e.target.value)} />
                        </div>
                      </div>

                      {saveError && <p className="text-xs" style={{ color: C.danger }}>{saveError}</p>}
                      <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: C.line }}>
                        <button type="button" onClick={() => setShowAddEmployee(false)} className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}>Cancelar</button>
                        <button type="submit" disabled={savingEmployee} className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-2 cursor-pointer shadow-sm" style={{ background: C.primary }}>
                          {savingEmployee && <Loader2 size={13} className="animate-spin" />} Guardar Expediente
                        </button>
                      </div>
                    </form>
                  )}

                  {formTab === "laboral" && (
                    <form onSubmit={addEmployee} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <TextField label="Empresa / Razón Social" value={newEmployee.company_id} onChange={e => updateField("company_id", e.target.value)} options={companies} />
                        <TextField label="Departamento" value={newEmployee.department} onChange={e => updateField("department", e.target.value)} options={availableDepartments} />
                        <TextField label="Puesto" value={newEmployee.position} onChange={e => updateField("position", e.target.value)} placeholder="Ej. Reclutador, Gerente de RH..." />
                        <TextField 
                          label="Actividades del Puesto" 
                          value={newEmployee.job_activities || ""} 
                          onChange={e => updateField("job_activities", e.target.value)} 
                          placeholder="Ej. Reclutamiento de personal, entrevistas, administración de expedientes..." 
                        />
                        <TextField 
                          label="Jefe Directo (Reporta a)" 
                          value={newEmployee.manager_id} 
                          onChange={e => updateField("manager_id", e.target.value)} 
                          options={managerOptions} 
                        />
                        <TextField 
                          label="Horario Laboral" 
                          value={newEmployee.work_schedule} 
                          onChange={e => updateField("work_schedule", e.target.value)} 
                          placeholder="Ej. Lunes a Viernes de 09:00 a 18:00 hrs" 
                        />
                        <TextField label="Fecha de Alta" type="date" required value={newEmployee.hire_date} onChange={e => updateField("hire_date", e.target.value)} />
                        <TextField label="Estatus" value={newEmployee.employment_status} onChange={e => updateField("employment_status", e.target.value)} options={STATUS_OPTIONS} />
                        <TextField label="Tipo de Contrato" value={newEmployee.contract_type} onChange={e => updateField("contract_type", e.target.value)} options={CONTRACT_TYPES} />
                        <TextField label="Fecha Inicio de Contrato" type="date" value={newEmployee.contract_start_date} onChange={e => updateField("contract_start_date", e.target.value)} />
                        <TextField label="Fecha Término de Contrato" type="date" value={newEmployee.contract_end_date} onChange={e => updateField("contract_end_date", e.target.value)} />
                      </div>
                      {saveError && <p className="text-xs" style={{ color: C.danger }}>{saveError}</p>}
                      <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: C.line }}>
                        <button type="button" onClick={() => setShowAddEmployee(false)} className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}>Cancelar</button>
                        <button type="submit" disabled={savingEmployee} className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-2 cursor-pointer shadow-sm" style={{ background: C.primary }}>
                          {savingEmployee && <Loader2 size={13} className="animate-spin" />} Guardar Expediente
                        </button>
                      </div>
                    </form>
                  )}

                  {formTab === "nomina" && (
                    <form onSubmit={addEmployee} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <TextField label="S.D Alta (Salario Diario)" type="number" value={newEmployee.base_daily_salary} onChange={e => updateField("base_daily_salary", e.target.value)} />
                        <TextField label="S.D.I. Alta (Salario Diario Integrado)" type="number" value={newEmployee.sdi_salary} onChange={e => updateField("sdi_salary", e.target.value)} />
                        <TextField label="Salario Mensual MXN" type="number" value={newEmployee.base_salary} onChange={e => updateField("base_salary", e.target.value)} />
                        <TextField label="Tipo de Nómina" value={newEmployee.payroll_type} onChange={e => updateField("payroll_type", e.target.value)} options={[{ id: "QUI", name: "Quincenal (QUI)" }, { id: "SEM", name: "Semanal (SEM)" }]} />
                        <TextField label="Crédito Infonavit" value={newEmployee.has_infonavit_credit} onChange={e => updateField("has_infonavit_credit", e.target.value)} options={["SI", "NO"]} />
                        <TextField label="Número Crédito Infonavit" value={newEmployee.infonavit_credit_number} onChange={e => updateField("infonavit_credit_number", e.target.value)} />
                        <TextField label="Valor Descuento Infonavit" type="number" value={newEmployee.infonavit_discount_value} onChange={e => updateField("infonavit_discount_value", e.target.value)} />
                        <TextField label="Banco" value={newEmployee.bank_name} onChange={e => updateField("bank_name", e.target.value)} />
                        <TextField label="Número de Cuenta" value={newEmployee.bank_account} onChange={e => updateField("bank_account", e.target.value)} />
                        <TextField label="CLABE Interbancaria" value={newEmployee.bank_clabe} onChange={e => updateField("bank_clabe", e.target.value)} />
                      </div>
                      {saveError && <p className="text-xs" style={{ color: C.danger }}>{saveError}</p>}
                      <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: C.line }}>
                        <button type="button" onClick={() => setShowAddEmployee(false)} className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}>Cancelar</button>
                        <button type="submit" disabled={savingEmployee} className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-2 cursor-pointer shadow-sm" style={{ background: C.primary }}>
                          {savingEmployee && <Loader2 size={13} className="animate-spin" />} Guardar Expediente
                        </button>
                      </div>
                    </form>
                  )}

                  {formTab === "movimientos" && (
                    <div className="space-y-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.inkSoft }}>Historial Registrado</h2>
                      {employeeHistory.length === 0 ? (
                        <p className="text-xs text-slate-400">No hay movimientos o cambios de estatus registrados.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {employeeHistory.map((h, idx) => (
                            <div key={idx} className="p-3 rounded-lg border text-xs bg-slate-50" style={{ borderColor: C.line }}>
                              <p className="font-semibold">{h.action || "Movimiento"}</p>
                              <p className="text-[10px] text-slate-400">{h.created_at?.slice(0, 10)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedEmployee ? (
              <EmployeeDetail
                employee={selectedEmployee}
                onBack={() => setSelectedEmployeeId(null)}
                onEdit={() => openNewEmployeeForm(selectedEmployee)}
                templates={templates}
                documents={employeeDocuments}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={setSelectedTemplateId}
                onGenerate={generateDocument}
                generating={generatingDoc}
                isMultiForm={
                  templates.find((t) => t.id === selectedTemplateId)?.name ===
                    "Formato Múltiple de Solicitudes" ||
                  selectedTemplateId === "formato_multiple"
                }
                multiFormOptions={multiFormOptions}
                checkedOptions={checkedOptions}
                onToggleOption={toggleOption}
                observaciones={observaciones}
                onObservacionesChange={setObservaciones}
                fechaSolicitud={fechaSolicitud}
                onFechaSolicitudChange={setFechaSolicitud}
                childName={childName}
                onChildNameChange={setChildName}
                incidentDate={incidentDate}
                onIncidentDateChange={setIncidentDate}
                incidentTime={incidentTime}
                onIncidentTimeChange={setIncidentTime}
                incidentLocation={incidentLocation}
                onIncidentLocationChange={setIncidentLocation}
                witness1={witness1}
                onWitness1Change={setWitness1}
                witness2={witness2}
                onWitness2Change={setWitness2}
                photoUploading={photoUploading}
                onPhotoChange={handlePhotoChange}
                employeeFiles={employeeFiles}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                fileUploading={fileUploading}
                token={token}
                api={api}
                loadEmployeeDocuments={loadEmployeeDocuments}
                loadEmployeeFiles={loadEmployeeFiles}
                onSelectBatchPdf={(file) => {
                  setPendingPdfFile(file);
                  setIsPdfModalOpen(true);
                }}
              />
            ) : !selectedCompanyFilter ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>Directorio por Empresa</h1>
                    <p className="text-sm" style={{ color: C.inkSoft }}>Selecciona una Razón Social para consultar sus colaboradores registrados.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openNewEmployeeForm()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-white" style={{ background: C.primary }}>
                      <Plus size={16} /> Nuevo empleado
                    </button>
                    <label className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold border bg-white cursor-pointer shadow-sm" style={{ borderColor: C.line, color: C.ink }}>
                      <FileSpreadsheet size={16} className="text-emerald-700" />
                      <span>Importar Excel</span>
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setEmployeesLoading(true);
                          const res = await api.uploadEmployeesExcel(token, file);
                          alert(res.message);
                          await loadEmployees();
                        } catch (err) {
                          alert("❌ Error en la importación: " + err.message);
                        } finally {
                          setEmployeesLoading(false);
                          e.target.value = "";
                        }
                      }} />
                    </label>
                  </div>
                </div>

                {companiesLoading || employeesLoading ? <Spinner label="Cargando directorio por empresas…" /> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {companies.map((comp) => {
                      const compEmployees = employees.filter(e => isSameCompany(e, comp.id));
                      return (
                        <div
                          key={comp.id}
                          onClick={() => setSelectedCompanyFilter(comp)}
                          className="bg-white rounded-2xl p-6 border cursor-pointer hover:shadow-md transition-all group"
                          style={{ borderColor: C.line }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: C.primary }}>
                              <Building2 size={24} />
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: C.primarySoft, color: C.primary }}>
                              {compEmployees.length} colaboradores
                            </span>
                          </div>

                          <h3 className="text-base font-bold group-hover:text-emerald-700 transition-colors" style={{ color: C.ink }}>
                            {comp.legal_name || comp.name}
                          </h3>
                          <p className="text-xs mt-1" style={{ color: C.inkSoft }}>
                            RFC: {comp.rfc || "—"}
                          </p>
                          <p className="text-xs truncate mt-0.5" style={{ color: C.inkSoft }}>
                            Reg. Patronal: {comp.imss_registry || comp.registro_patronal || "—"}
                          </p>

                          <div className="mt-5 pt-4 border-t flex items-center justify-between text-xs font-semibold" style={{ borderColor: C.line, color: C.primary }}>
                            <span>Ver colaboradores</span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      );
                    })}

                    {employees.some(e => isSameCompany(e, "none")) && (
                      <div
                        onClick={() => setSelectedCompanyFilter({ id: "none", legal_name: "Sin Empresa Asignada" })}
                        className="bg-white rounded-2xl p-6 border cursor-pointer hover:shadow-md transition-all group"
                        style={{ borderColor: C.line }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-600 bg-slate-100 border">
                            <Building2 size={24} />
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            {employees.filter(e => isSameCompany(e, "none")).length} colaboradores
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          Sin Empresa Asignada
                        </h3>
                        <p className="text-xs mt-1 text-slate-500">
                          Colaboradores pendientes de vincular a una Razón Social
                        </p>

                        <div className="mt-5 pt-4 border-t flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>Ver colaboradores</span>
                          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setSelectedCompanyFilter(null)}
                  className="flex items-center gap-1.5 text-xs font-bold mb-4 cursor-pointer hover:underline"
                  style={{ color: C.primary }}
                >
                  <ArrowLeft size={16} /> Volver al directorio de empresas
                </button>

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>
                      {selectedCompanyFilter.legal_name || selectedCompanyFilter.name}
                    </h1>
                    <p className="text-sm" style={{ color: C.inkSoft }}>
                      Listado de colaboradores registrados en esta Razón Social.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openNewEmployeeForm()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-white" style={{ background: C.primary }}>
                      <Plus size={16} /> Nuevo empleado
                    </button>
                    <label 
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold border bg-white cursor-pointer hover:bg-slate-50 transition-colors shadow-sm" 
                      style={{ borderColor: C.line, color: C.ink }}
                    >
                      <FileSpreadsheet size={16} className="text-emerald-700" />
                      <span>Importar Excel</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          try {
                            setEmployeesLoading(true);
                            const res = await api.uploadEmployeesExcel(token, file);
                            alert(res.message);
                            await loadEmployees();
                          } catch (err) {
                            alert("❌ Error en la importación: " + err.message);
                          } finally {
                            setEmployeesLoading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex border-b mb-5 gap-6" style={{ borderColor: C.line }}>
                  <button
                    onClick={() => setEmployeeStatusTab("activo")}
                    className="pb-2 text-xs font-semibold cursor-pointer"
                    style={{ borderBottom: employeeStatusTab === "activo" ? `2px solid ${C.primary}` : "none", color: employeeStatusTab === "activo" ? C.primary : C.inkSoft }}
                  >
                    Activos ({employees.filter(e => isSameCompany(e, selectedCompanyFilter.id) && e.employment_status === "activo").length})
                  </button>
                  <button
                    onClick={() => setEmployeeStatusTab("baja")}
                    className="pb-2 text-xs font-semibold cursor-pointer"
                    style={{ borderBottom: employeeStatusTab === "baja" ? `2px solid ${C.primary}` : "none", color: employeeStatusTab === "baja" ? C.primary : C.inkSoft }}
                  >
                    Bajas ({employees.filter(e => isSameCompany(e, selectedCompanyFilter.id) && e.employment_status === "baja").length})
                  </button>
                  <button
                    onClick={() => setEmployeeStatusTab("todos")}
                    className="pb-2 text-xs font-semibold cursor-pointer"
                    style={{ borderBottom: employeeStatusTab === "todos" ? `2px solid ${C.primary}` : "none", color: employeeStatusTab === "todos" ? C.primary : C.inkSoft }}
                  >
                    Todos ({employees.filter(e => isSameCompany(e, selectedCompanyFilter.id)).length})
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.inkSoft }} />
                    <input
                      placeholder="Buscar por nombre o correo…"
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && loadEmployees(searchInput)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none bg-white border"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                  <button onClick={() => loadEmployees(searchInput)} className="px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer" style={{ background: C.primarySoft, color: C.primary }}>Buscar</button>
                  <button onClick={() => { setSearchInput(""); loadEmployees(); }} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm bg-white border cursor-pointer" style={{ borderColor: C.line, color: C.inkSoft }}><RefreshCw size={15} /> Actualizar</button>

                  {employeeStatusTab === "activo" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddExportAltasModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap cursor-pointer"
                        style={{ background: C.primary }}
                      >
                        <FileSpreadsheet size={16} /> Exportar Formato Altas (Excel)
                      </button>

                      <button
                        onClick={() => setShowBatchModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap cursor-pointer transition-all hover:opacity-90"
                        style={{ background: C.ok }}
                      >
                        <FolderDown size={16} /> Generación Masiva de Formatos (ZIP)
                      </button>
                    </div>
                  )}

                  {employeeStatusTab === "baja" && (
                    <button
                      onClick={exportBajasToExcel}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap cursor-pointer"
                      style={{ background: C.ok }}
                    >
                      <FileSpreadsheet size={16} /> Exportar Bajas (Excel)
                    </button>
                  )}
                </div>

                {employeesLoading && <Spinner label="Cargando empleados…" />}
                {employeesError && <p className="text-sm py-4" style={{ color: C.danger }}>{employeesError}</p>}

                {!employeesLoading && !employeesError && (() => {
                  const companyEmployees = filteredEmployees.filter(e => isSameCompany(e, selectedCompanyFilter.id));

                  if (companyEmployees.length === 0) {
                    return (
                      <div className="rounded-2xl p-8 text-center bg-white border" style={{ borderColor: C.line }}>
                        <p className="text-sm" style={{ color: C.inkSoft }}>
                          No hay colaboradores registrados en esta Razón Social para el filtro seleccionado.
                        </p>
                      </div>
                    );
                  }

                  const groupedByDepartment = companyEmployees.reduce((acc, emp) => {
                    const dept = emp.department?.trim() || "Sin Departamento Asignado";
                    if (!acc[dept]) acc[dept] = [];
                    acc[dept].push(emp);
                    return acc;
                  }, {});

                  return (
                    <div className="space-y-6">
                      {Object.entries(groupedByDepartment).map(([deptName, deptEmployees]) => (
                        <div 
                          key={deptName} 
                          className="rounded-2xl overflow-hidden bg-white border shadow-2xs space-y-0" 
                          style={{ borderColor: C.line }}
                        >
                          <div 
                            className="px-5 py-3 border-b flex items-center justify-between"
                            style={{ backgroundColor: C.primarySoft, borderColor: C.line }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.primary }}></span>
                              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.primary }}>
                                {deptName}
                              </h2>
                            </div>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                              {deptEmployees.length} {deptEmployees.length === 1 ? "colaborador" : "colaboradores"}
                            </span>
                          </div>

                          <div className="divide-y" style={{ borderColor: C.line }}>
                            {deptEmployees.map((e) => (
                              <div
                                key={e.id}
                                onClick={() => setSelectedEmployeeId(e.id)}
                                className="w-full flex items-center justify-between px-5 py-3.5 text-left cursor-pointer hover:bg-slate-50/80 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0" 
                                    style={{ background: C.primarySoft, color: C.primary }}
                                  >
                                    {getCleanPhotoUrl(e.photo_url) ? (
                                      <img src={getCleanPhotoUrl(e.photo_url)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      initials(`${e.first_name} ${e.last_name}`)
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold" style={{ color: C.ink }}>
                                      {e.first_name} {e.last_name}
                                    </p>
                                    <p className="text-xs" style={{ color: C.inkSoft }}>
                                      {e.position || "Puesto no asignado"} {e.personal_email ? `· ${e.personal_email}` : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <Badge tone={e.employment_status === "activo" ? "ok" : e.employment_status === "baja" ? "danger" : "pending"}>
                                    {e.employment_status}
                                  </Badge>

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(evt) => handleDeleteEmployee(evt, e.id, `${e.first_name} ${e.last_name || ''}`)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                      style={{ color: C.danger }}
                                      title="Eliminar Colaborador"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}

                                  <ChevronRight size={16} style={{ color: C.inkSoft }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {showExportAltasModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <h2 className="text-lg font-bold" style={{ color: C.ink }}>Exportar Formato de Altas (Excel)</h2>
              <p className="text-xs text-slate-500">Selecciona el criterio de filtrado para generar el documento de altas con formato corporativo.</p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
                  <input type="radio" name="exportFilter" value="all" checked={exportFilterType === "all"} onChange={() => setExportFilterType("all")} />
                  Todos los colaboradores activos
                </label>

                <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
                  <input type="radio" name="exportFilter" value="company" checked={exportFilterType === "company"} onChange={() => setExportFilterType("company")} />
                  Filtrar por Empresa / Razón Social
                </label>

                {exportFilterType === "company" && (
                  <div className="pl-6">
                    <select value={exportSelectedCompanyId} onChange={e => setExportSelectedCompanyId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs border outline-none bg-white">
                      <option value="">Selecciona Empresa…</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.legal_name || c.name}</option>)}
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
                  <input type="radio" name="exportFilter" value="employee" checked={exportFilterType === "employee"} onChange={() => setExportFilterType("employee")} />
                  Exportar un Empleado Específico
                </label>

                {exportFilterType === "employee" && (
                  <div className="pl-6">
                    <select value={exportSelectedEmployeeId} onChange={e => setExportSelectedEmployeeId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs border outline-none bg-white">
                      <option value="">Selecciona Colaborador…</option>
                      {employees.filter(e => e.employment_status === "activo").map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: C.line }}>
                <button onClick={() => setShowAddExportAltasModal(false)} className="px-4 py-2 rounded-lg text-xs font-medium border cursor-pointer" style={{ borderColor: C.line, color: C.inkSoft }}>
                  Cancelar
                </button>
                <button onClick={processExportAltasExcel} className="px-4 py-2 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer" style={{ background: C.primary }}>
                  <Download size={14} /> Descargar Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {showBatchModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: C.ink }}>
                  <FolderDown size={18} className="text-emerald-700" />
                  Generación Masiva de Documentos (ZIP)
                </h2>
                <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Genera en lote todos los documentos de los colaboradores de la empresa seleccionada utilizando sus respectivas plantillas registradas.
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold block mb-1 text-slate-700">1. Empresa / Razón Social *</label>
                  <select
                    value={exportSelectedCompanyId || (selectedCompanyFilter ? selectedCompanyFilter.id : "")}
                    onChange={(e) => setExportSelectedCompanyId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                    style={{ borderColor: C.line }}
                  >
                    <option value="">Selecciona una Empresa...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.legal_name || c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">2. Tipo de Documento *</label>
                    <select
                      value={batchDocType}
                      onChange={(e) => {
                        setBatchDocType(e.target.value);
                        if (e.target.value === "Contratos") setBatchSubType("Indeterminado");
                        else setBatchSubType("General");
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                      style={{ borderColor: C.line }}
                    >
                      <option value="Contratos">Contratos</option>
                      <option value="Convenio de Confidencialidad">Convenio de Confidencialidad</option>
                      <option value="Aviso de Privacidad">Aviso de Privacidad</option>
                      <option value="Formatos Varios">Formatos Varios</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-slate-700">3. Variante / Subtipo *</label>
                    {batchDocType === "Contratos" ? (
                      <select
                        value={batchSubType}
                        onChange={(e) => setBatchSubType(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                        style={{ borderColor: C.line }}
                      >
                        <option value="Indeterminado">Contrato Indeterminado</option>
                        <option value="Determinado">Contrato Determinado</option>
                        <option value="Periodo de Prueba 90 días">Periodo de Prueba (90 días)</option>
                        <option value="Periodo de Prueba 180 días">Periodo de Prueba (180 días)</option>
                        <option value="Capacitación Inicial">Capacitación Inicial</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={batchSubType}
                        onChange={(e) => setBatchSubType(e.target.value)}
                        placeholder="Ej. General"
                        className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                        style={{ borderColor: C.line }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700">4. Departamento (Opcional)</label>
                  <select
                    value={batchDepartment}
                    onChange={(e) => setBatchDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                    style={{ borderColor: C.line }}
                  >
                    <option value="all">Todos los Departamentos de la Empresa</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: C.line }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-slate-50 cursor-pointer"
                  style={{ borderColor: C.line, color: C.inkSoft }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={batchGenerating || (!exportSelectedCompanyId && !selectedCompanyFilter)}
                  onClick={async () => {
                    const compId = exportSelectedCompanyId || (selectedCompanyFilter ? selectedCompanyFilter.id : null);
                    if (!compId) {
                      alert("Selecciona una empresa para realizar la generación masiva.");
                      return;
                    }

                    setBatchGenerating(true);
                    try {
                      alert("⏳ Procesando y empaquetando todos los documentos en formato ZIP...");

                      const response = await fetch(`http://localhost:4000/api/companies/${compId}/fill-template-batch`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          document_type: batchDocType,
                          sub_type: batchSubType,
                          department: batchDepartment
                        })
                      });

                      if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.message || "Error al procesar la generación masiva.");
                      }

                      const blob = await response.blob();
                      const downloadUrl = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = downloadUrl;
                      link.download = `Masivo_${batchDocType}_${batchSubType}_${Date.now()}.zip`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(downloadUrl);

                      setShowBatchModal(false);
                    } catch (err) {
                      alert("❌ Error: " + err.message);
                    } finally {
                      setBatchGenerating(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: C.ok }}
                >
                  {batchGenerating ? <Loader2 size={14} className="animate-spin" /> : <FolderDown size={14} />}
                  <span>{batchGenerating ? "Generando ZIP..." : "Descargar ZIP Masivo"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "leave" && (
          <LeaveModule 
            token={token} 
            isAdmin={isAdmin} 
            myBalance={myBalance} 
            leaveRequests={leaveRequests} 
            leaveTypes={leaveTypes}
            leaveForm={leaveForm}
            setLeaveForm={setLeaveForm}
            leaveLoading={leaveLoading} 
            requestLeave={requestLeave} 
            reviewLeave={reviewLeave} 
          />
        )}

        {view === "users" && isAdmin && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>Usuarios</h1>
                <p className="text-sm" style={{ color: C.inkSoft }}>Cuentas de acceso al sistema ({users.length})</p>
              </div>
              <button onClick={() => { setShowAddUser(v => !v); setLastCreatedPassword(""); setUserSaveError(""); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer" style={{ background: C.primary, color: "#fff" }}>
                <Plus size={16} /> Nueva cuenta
              </button>
            </div>

            {showAddUser && (
              <form onSubmit={submitNewUser} className="rounded-2xl p-5 mb-6 bg-white border" style={{ borderColor: C.line }}>
                <p className="text-xs mb-4" style={{ color: C.inkSoft }}>
                  Usa el mismo correo que el empleado tiene en su expediente (campo "Correo personal") para que su
                  cuenta quede vinculada automáticamente a su perfil.
                </p>
                <div className="grid grid-cols-3 gap-4 items-end">
                  <TextField label="Correo" type="email" required value={newUser.email} onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))} placeholder="empleado@empresa.com" />
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft }}>Contraseña temporal *</label>
                    <div className="flex gap-2">
                      <input value={newUser.password} onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: C.line }} />
                      <button type="button" onClick={generatePassword} className="px-3 rounded-lg text-xs shrink-0 cursor-pointer" style={{ background: C.primarySoft, color: C.primary }}>Generar</button>
                    </div>
                  </div>
                  <TextField label="Rol" value={newUser.role} onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))} options={["admin", "empleado"]} />
                </div>
                {userSaveError && <p className="text-xs mt-3" style={{ color: C.danger }}>{userSaveError}</p>}
                <div className="flex justify-end mt-4">
                  <button type="submit" disabled={userSaving} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer" style={{ background: C.primary, color: "#fff" }}>
                    <Loader2 size={14} className={userSaving ? "animate-spin opacity-100" : "opacity-0 w-0"} /> Crear cuenta
                  </button>
                </div>
              </form>
            )}

            {lastCreatedPassword && (
              <div className="rounded-2xl p-5 mb-6 flex items-center justify-between" style={{ background: C.okSoft }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: C.ok }}>Cuenta creada. Comparte esta contraseña temporal con el empleado:</p>
                  <p className="text-lg font-mono font-semibold" style={{ color: C.ok }}>{lastCreatedPassword}</p>
                </div>
                <button onClick={() => navigator.clipboard.writeText(lastCreatedPassword)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ background: "#fff", color: C.ok }}>
                  <Copy size={13} /> Copiar
                </button>
              </div>
            )}

            {usersLoading && <Spinner label="Cargando usuarios…" />}

            {!usersLoading && (
              <div className="rounded-2xl overflow-hidden bg-white border" style={{ borderColor: C.line }}>
                {users.map((u, i) => {
                  const isSelf = u.id === user.id;
                  return (
                    <div key={u.id} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.line}` : "none" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: C.primarySoft, color: C.primary }}>{initials(u.email)}</div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: C.ink }}>{u.email}{isSelf && <span className="font-normal" style={{ color: C.inkSoft }}> (tú)</span>}</p>
                          <p className="text-xs" style={{ color: C.inkSoft }}>Creada el {u.created_at?.slice(0, 10)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={e => changeUserRole(u.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg text-xs outline-none border bg-white cursor-pointer"
                          style={{ borderColor: C.line, color: C.ink, opacity: isSelf ? 0.6 : 1 }}
                        >
                          <option value="empleado">empleado</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          disabled={isSelf}
                          onClick={() => toggleUserActive(u)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            background: u.is_active ? C.okSoft : C.dangerSoft,
                            color: u.is_active ? C.ok : C.danger,
                            opacity: isSelf ? 0.6 : 1,
                          }}
                        >
                          {u.is_active ? "Activo" : "Inactivo"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingUserForPass(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                          style={{ color: C.primary }}
                          title="Cambiar Contraseña"
                        >
                          <Key size={15} />
                        </button>

                        {!isSelf && (
                          <button onClick={() => deleteUser(u)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer" style={{ color: C.danger }}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <AIFloatingAssistant token={token} api={api} />

      {/* 🟢 MODAL DE DIVISIÓN E INSPECCIÓN VISUAL DE PDF CON RANGOS */}
      {isPdfModalOpen && pendingPdfFile && selectedEmployee && (
        <PdfSplitModal
          file={pendingPdfFile}
          isProcessing={isSplittingPdf}
          onClose={() => {
            setIsPdfModalOpen(false);
            setPendingPdfFile(null);
          }}
          onConfirm={async (mapping) => {
            try {
              setIsPdfSplitting(true);
              const res = await api.uploadBatchEmployeeFiles(
                token,
                selectedEmployee.id,
                pendingPdfFile,
                mapping
              );
              alert(`✅ ${res.message}`);
              if (loadEmployeeFiles) loadEmployeeFiles(selectedEmployee.id);
              setIsPdfModalOpen(false);
              setPendingPdfFile(null);
            } catch (err) {
              alert("❌ Error: " + err.message);
            } finally {
              setIsPdfSplitting(false);
            }
          }}
        />
      )}

      {editingUserForPass && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border shadow-xl space-y-4" style={{ borderColor: C.line }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: C.ink }}>
              <Key size={18} style={{ color: C.primary }} />
              Cambiar Contraseña
            </h3>
            <p className="text-xs" style={{ color: C.inkSoft }}>
              Asigna una nueva clave para <strong style={{ color: C.ink }}>{editingUserForPass.email}</strong>.
            </p>

            <form onSubmit={handleSaveUserPassword} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: C.inkSoft }}>Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Escribe la nueva contraseña..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border outline-none"
                  style={{ borderColor: C.line, color: C.ink }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUserForPass(null);
                    setNewUserPassword("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  style={{ color: C.inkSoft }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPass || !newUserPassword.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-50 cursor-pointer"
                  style={{ background: C.primary }}
                >
                  {savingPass ? "Guardando..." : "Actualizar Clave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div> 
  );
}

function LeaveModule({ token, isAdmin, myBalance, leaveRequests, leaveTypes, leaveForm, setLeaveForm, leaveLoading, requestLeave, reviewLeave }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [deptCalendar, setDeptCalendar] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    setLoadingCalendar(true);
    fetch("http://localhost:4000/api/leaves/department-calendar", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDeptCalendar(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error al obtener calendario:", err))
      .finally(() => setLoadingCalendar(false));
  }, [token]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getAbsencesForDay = (dayNumber) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    return deptCalendar.filter(item => {
      const start = item.start_date?.slice(0, 10);
      const end = item.end_date?.slice(0, 10);
      return formattedDate >= start && formattedDate <= end;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.ink }}>Vacaciones y Permisos</h1>
          <p className="text-xs mt-0.5" style={{ color: C.inkSoft }}>
            {isAdmin ? "Administra las solicitudes y supervisa la disponibilidad del equipo." : "Consulta tu saldo de ley, gestiona permisos y revisa las ausencias de tu equipo."}
          </p>
        </div>

        <div className="flex gap-2 bg-slate-200/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "dashboard" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mis Solicitudes
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "calendar" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Calendario y Reglas
          </button>
        </div>
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {!isAdmin && myBalance && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border bg-emerald-50/50 border-emerald-200">
                <p className="text-xs font-semibold text-emerald-800">Días Disponibles</p>
                <p className="text-3xl font-bold text-emerald-900 mt-1">
                  {myBalance.remainingDays !== undefined ? myBalance.remainingDays : ((myBalance.totalDays || myBalance.days_total) - (myBalance.usedDays || myBalance.days_used))}
                </p>
                <p className="text-[10px] text-emerald-700 mt-1">Acumulados para solicitar</p>
              </div>

              <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200">
                <p className="text-xs font-semibold text-slate-700">Días Disfrutados</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{myBalance.usedDays || myBalance.days_used || 0}</p>
                <p className="text-[10px] text-slate-500 mt-1">Aprobados este periodo</p>
              </div>

              <div className="p-5 rounded-2xl border bg-amber-50/50 border-amber-200">
                <p className="text-xs font-semibold text-amber-800">Total Ley (LFT)</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">
                  {myBalance.totalDays || myBalance.totalEntitledDays || myBalance.days_total || 12} <span className="text-xs font-normal">días/año</span>
                </p>
                <p className="text-[10px] text-amber-700 mt-1">{myBalance.yearsOfService || 0} año(s) cumplido(s)</p>
              </div>
            </div>
          )}

          {!isAdmin && (
            <form onSubmit={requestLeave} className="rounded-2xl p-5 grid grid-cols-4 gap-3 items-end bg-white border" style={{ borderColor: C.line }}>
              <TextField 
                label="Tipo de Ausencia" 
                value={leaveForm.leave_type_id} 
                onChange={e => setLeaveForm(f => ({ ...f, leave_type_id: e.target.value }))} 
                options={leaveTypes.length > 0 ? leaveTypes : ["Vacaciones", "Permiso con Goce", "Permiso sin Goce"]} 
              />
              <TextField label="Fecha Inicio" type="date" required value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} />
              <TextField label="Fecha Fin" type="date" required value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} />
              <button type="submit" className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#1B4B43] hover:bg-[#153B34] transition-all cursor-pointer">
                Enviar Solicitud
              </button>
            </form>
          )}

          {leaveLoading ? (
            <Spinner label="Cargando solicitudes..." />
          ) : (
            <div className="rounded-2xl overflow-hidden bg-white border" style={{ borderColor: C.line }}>
              {leaveRequests.map((r, i) => (
                <div key={r.id || i} className="flex items-center justify-between px-5 py-4 border-b last:border-0" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#1B4B43] bg-[#E7EFEC]">
                      {initials(`${r.first_name || ''} ${r.last_name || ''}`)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: C.ink }}>
                        {isAdmin ? `${r.first_name || 'Empleado'} ${r.last_name || ''}` : (r.leave_type || r.request_type || "Vacaciones")}
                        {isAdmin && <span className="font-normal text-xs text-slate-500"> — {r.leave_type || r.request_type || "Vacaciones"}</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.start_date?.slice(0, 10)} → {r.end_date?.slice(0, 10)} · {r.days_requested || 1} día(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && r.status === "pendiente" ? (
                      <>
                        <button onClick={() => reviewLeave(r.id, "aprobado")} className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer">
                          <Check size={16} />
                        </button>
                        <button onClick={() => reviewLeave(r.id, "rechazado")} className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <Badge tone={r.status === "aprobado" ? "ok" : r.status === "rechazado" ? "danger" : "pending"}>
                        {r.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {leaveRequests.length === 0 && <p className="text-xs py-8 text-center text-slate-400">No hay solicitudes registradas.</p>}
            </div>
          )}
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border space-y-5" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold" style={{ color: C.ink }}>
                  Calendario de Ausencias · {monthNames[month]} {year}
                </h2>
                <p className="text-xs text-slate-500">Visualiza el calendario departamental y coordinen sus vacaciones colectivas.</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-50 cursor-pointer" style={{ borderColor: C.line }}>
                  ← Mes Anterior
                </button>
                <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-50 cursor-pointer" style={{ borderColor: C.line }}>
                  Mes Siguiente →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 pb-1 border-b" style={{ borderColor: C.line }}>
              <div>Dom</div>
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 opacity-40"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const absences = getAbsencesForDay(dayNum);
                const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`h-20 p-2 rounded-xl border flex flex-col justify-between transition-all ${
                      isToday ? "border-[#1B4B43] bg-emerald-50/30 font-bold" : "border-slate-200 bg-white"
                    }`}
                  >
                    <span className={`text-xs ${isToday ? "text-[#1B4B43]" : "text-slate-700"}`}>
                      {dayNum}
                    </span>

                    <div className="space-y-1 overflow-y-auto">
                      {absences.map(a => (
                        <div
                          key={a.id}
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-600 text-white truncate"
                          title={`${a.first_name} ${a.last_name} (${a.request_type || 'Vacaciones'})`}
                        >
                          🌴 {a.first_name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border space-y-4" style={{ borderColor: C.line }}>
            <h2 className="text-sm font-bold text-slate-900">Conceptos y Políticas de Vacaciones</h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-bold text-slate-900">🌴 Vacaciones Dignas (LFT Art. 76)</p>
                <p className="text-slate-600 leading-relaxed">
                  12 días con goce de sueldo tras el 1er año laboral, incrementando 2 días continuos por cada año subsecuente.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-bold text-slate-900">💼 Permiso con Goce de Sueldo</p>
                <p className="text-slate-600 leading-relaxed">
                  Días autorizados por contrato/ley (matrimonio, paternidad, luto) sin afectación ni deducción sobre tu salario.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-bold text-slate-900">⏱️ Permiso sin Goce de Sueldo</p>
                <p className="text-slate-600 leading-relaxed">
                  Ausencias justificadas para asuntos personales en las cuales no se emite el pago salarial de los días no laborados.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-bold text-slate-900">💰 Prima Vacacional</p>
                <p className="text-slate-600 leading-relaxed">
                  Percepción adicional equivalente al 25% extra sobre el salario diario correspondiente a los días disfrutados.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserProfileView({ token, user, api, employees = [] }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const matched = employees.find(e => e.personal_email === user?.email);
    if (matched) {
      setProfile(matched);
      setLoading(false);
    } else {
      api.getMyProfile(token)
        .then((resData) => {
          if (Array.isArray(resData)) {
            const found = resData.find(e => e.personal_email === user?.email);
            setProfile(found || null);
          } else {
            setProfile(resData);
          }
        })
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    }
  }, [user?.email, employees]);

  if (loading) return <Spinner label="Cargando tu perfil..." />;

  if (!profile) {
    return (
      <div className="rounded-2xl p-6 text-sm bg-white border" style={{ borderColor: C.line, color: C.inkSoft }}>
        No se encontró un expediente asociado al correo <strong>{user?.email}</strong>.
      </div>
    );
  }

  const personalAddress = `${profile.street || ""} ${profile.exterior_number || ""} ${profile.neighborhood || ""} ${profile.postal_code || ""}`.trim() || profile.address || "—";
  const fiscalAddress = `${profile.fiscal_street || ""} ${profile.fiscal_exterior_number || ""} ${profile.fiscal_neighborhood || ""} ${profile.fiscal_postal_code || ""}`.trim() || "—";
  const cleanPhoto = getCleanPhotoUrl(profile.photo_url);

  return (
    <div className="max-w-3xl rounded-2xl p-6 bg-white border" style={{ borderColor: C.line }}>
      <div className="flex items-center gap-5 pb-6 mb-6 border-b" style={{ borderColor: C.line }}>
        <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 border" style={{ borderColor: C.line }}>
          {cleanPhoto ? (
            <img src={cleanPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold" style={{ background: C.primarySoft, color: C.primary }}>
              {initials(`${profile.first_name} ${profile.last_name}`)}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.ink }}>{profile.first_name} {profile.last_name}</h1>
          <p className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{profile.position || "Sin Puesto"} · {profile.department}</p>
          <div className="mt-2">
            <Badge tone={profile.employment_status === "activo" ? "ok" : "danger"}>
              {profile.employment_status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs" style={{ color: C.inkSoft }}>CURP</p><p className="font-medium" style={{ color: C.ink }}>{profile.curp || "—"}</p></div>
        <div><p className="text-xs" style={{ color: C.inkSoft }}>RFC</p><p className="font-medium" style={{ color: C.ink }}>{profile.rfc || "—"}</p></div>
        <div><p className="text-xs" style={{ color: C.inkSoft }}>NSS</p><p className="font-medium" style={{ color: C.ink }}>{profile.nss || "—"}</p></div>
        <div><p className="text-xs" style={{ color: C.inkSoft }}>Fecha de Alta</p><p className="font-medium" style={{ color: C.ink }}>{profile.hire_date?.slice(0, 10)}</p></div>
        <div><p className="text-xs" style={{ color: C.inkSoft }}>Correo Personal</p><p className="font-medium" style={{ color: C.ink }}>{profile.personal_email}</p></div>
        <div><p className="text-xs" style={{ color: C.inkSoft }}>Salario Base</p><p className="font-medium" style={{ color: C.ink }}>${Number(profile.base_salary || 0).toLocaleString()} MXN</p></div>
        <div><p className="text-xs" style={{ color: C.inkSoft }}>Domicilio Personal</p><p className="font-medium" style={{ color: C.ink }}>{personalAddress}</p></div>
        <div><p className="text-xs" style={{ color: C.inkSoft }}>Domicilio Fiscal (CSF)</p><p className="font-medium" style={{ color: C.ink }}>{fiscalAddress}</p></div>
        <div><p className="text-xs" style={{ color: C.inkSoft }}>Beneficiario</p><p className="font-medium" style={{ color: C.ink }}>{profile.beneficiary_name ? `${profile.beneficiary_name} (${profile.beneficiary_phone || "Sin tel."})` : "—"}</p></div>
      </div>
    </div>
  );
}

function OrgChart({ employees, companyName }) {
  const rootEmployees = employees.filter(e => !e.manager_id || !employees.some(m => m.id === e.manager_id));
  const roots = rootEmployees.length > 0 ? rootEmployees : (employees.length > 0 ? [employees[0]] : []);

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
        No hay colaboradores activos registrados para {companyName || "esta selección"}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {companyName && (
        <div className="flex items-center justify-between px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-700">
            🏢 Estructura de: <span className="text-[#1B4B43]">{companyName}</span>
          </span>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
            {employees.length} colaboradores activos
          </span>
        </div>
      )}

      <div 
        id="printable-orgchart" 
        className="w-full overflow-x-auto p-8 bg-white rounded-2xl border border-slate-200 min-h-[500px]"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="relative flex items-start justify-between border-b pb-5 mb-8" style={{ borderColor: "#E1E6E4" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ background: "#1B4B43" }}>
            <Building2 size={24} color="#ffffff" />
          </div>

          <div className="text-center flex-1 px-4">
            <h1 className="text-2xl font-black text-[#1B4B43] uppercase tracking-wide leading-tight mb-1">
              {companyName || "ESTRUCTURA ORGANIZACIONAL"}
            </h1>
            <p className="text-xs font-extrabold text-slate-600 tracking-wider uppercase">
              ORGANIGRAMA INSTITUCIONAL DE PERSONAL
            </p>
          </div>

          <div className="text-right text-[11px] font-semibold text-slate-500 shrink-0">
            <span>Emisión: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="flex justify-center gap-12 min-w-max pt-2 pb-8">
          {roots.map(root => (
            <OrgNode key={root.id} employee={root} employees={employees} isRoot={true} />
          ))}
        </div>

        <div className="mt-8 pt-4 border-t flex justify-between items-center text-[10px] text-slate-400" style={{ borderColor: "#E1E6E4" }}>
          <span>Documento interno de uso confidencial. Generado automáticamente por Núcleo RH.</span>
          <span className="font-bold">Total Colaboradores: {employees.length}</span>
        </div>
      </div>
    </div>
  );
}

function OrgNode({ employee, employees, isRoot = false }) {
  const subordinates = employees.filter(e => e.manager_id === employee.id);
  const cleanPhoto = getCleanPhotoUrl(employee.photo_url);

  return (
    <div className="flex flex-col items-center relative">
      <div 
        className="relative z-10 w-80 bg-white rounded-2xl border shadow-xs p-4 flex items-center gap-3.5 transition-all"
        style={{ borderColor: "#CBD5E1", minHeight: "96px", height: "auto" }}
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-emerald-50 border flex items-center justify-center text-emerald-800 font-bold text-sm" style={{ borderColor: "#E2E8F0" }}>
          {cleanPhoto ? (
            <img src={cleanPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            initials(`${employee.first_name} ${employee.last_name}`)
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
          <p className="text-[11px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug break-words whitespace-normal">
            {employee.position || "PUESTO NO ASIGNADO"}
          </p>

          <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug break-words whitespace-normal">
            {employee.first_name} {employee.last_name}
          </p>

          {employee.department && (
            <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight break-words whitespace-normal">
              {employee.department}
            </p>
          )}
        </div>
      </div>

      {subordinates.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-0.5 h-6" style={{ backgroundColor: "#94A3B8" }}></div>

          <div className="flex justify-center relative w-full">
            {subordinates.length > 1 && (
              <div 
                className="absolute top-0 h-0.5" 
                style={{ 
                  backgroundColor: "#94A3B8",
                  left: `${100 / (subordinates.length * 2)}%`,
                  right: `${100 / (subordinates.length * 2)}%`
                }}
              ></div>
            )}

            <div className="flex justify-around w-full gap-8">
              {subordinates.map((sub) => (
                <div key={sub.id} className="flex flex-col items-center relative flex-1">
                  <div className="w-0.5 h-6" style={{ backgroundColor: "#94A3B8" }}></div>
                  <OrgNode employee={sub} employees={employees} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeDetail({
  employee, onBack, onEdit, templates = [], documents = [], selectedTemplateId, onSelectTemplate, onGenerate, generating,
  isMultiForm, multiFormOptions = [], checkedOptions = [], onToggleOption, observaciones, onObservacionesChange, fechaSolicitud,
  onFechaSolicitudChange, childName, onChildNameChange, incidentDate, onIncidentDateChange, incidentTime, onIncidentTimeChange,
  incidentLocation, onIncidentLocationChange, witness1, onWitness1Change, witness2, onWitness2Change, photoUploading, onPhotoChange,
  employeeFiles = [], onUploadFile, onDeleteFile, fileUploading, token, api, loadEmployeeDocuments, loadEmployeeFiles, onSelectBatchPdf
}) {
  const REQUIRED_DOCUMENTS = [
    "Identificación Oficial (INE / Pasaporte)",
    "Comprobante de Domicilio",
    "Acta de Nacimiento",
    "CURP",
    "RFC (Constancia de Situación Fiscal)",
    "NSS (Número de Seguro Social)",
    "Comprobante de Estudios",
    "Estado de Cuenta Bancaria",
    "Carta de Recomendación",
    "Contratos",
    "Convenio de Confidencialidad",
    "Aviso de Privacidad",
    "Formatos Varios",
    "Políticas de RH",
    "Descriptivo de Puesto",
    "Requisición",
    "Test de Integridad"
  ];

  const GENERATABLE_DOCUMENTS = [
    "Contratos",
    "Convenio de Confidencialidad",
    "Aviso de Privacidad",
    "Formatos Varios"
  ];

  const [customTemplateFile, setCustomTemplateFile] = useState(null);
  const [customTemplateName, setCustomTemplateName] = useState("");
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  async function handleUploadAndFillTemplate(e) {
    e.preventDefault();
    if (!customTemplateFile || !customTemplateName.trim()) {
      alert("Por favor selecciona un archivo de plantilla y asigna un nombre.");
      return;
    }

    setUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append("template", customTemplateFile);
      formData.append("name", customTemplateName.trim());
      formData.append("employee_id", employee.id);

      const employeeData = {
        nombre_completo: `${employee.first_name || ""} ${employee.last_name_paternal || employee.last_name || ""} ${employee.last_name_maternal || ""}`.trim(),
        nombre: employee.first_name || "",
        apellido_paterno: employee.last_name_paternal || employee.last_name || "",
        apellido_materno: employee.last_name_maternal || "",
        curp: employee.curp || "",
        rfc: employee.rfc || "",
        nss: employee.nss || "",
        fecha_nacimiento: employee.birth_date ? String(employee.birth_date).slice(0, 10) : "",
        lugar_nacimiento: `${employee.birth_place_municipality || ""}, ${employee.birth_place_state || ""}`.trim(),
        sexo: employee.gender || "",
        estado_civil: employee.marital_status || "",
        escolaridad: employee.education_level || "",
        correo_personal: employee.personal_email || "",
        telefono: employee.phone || "",
        celular: employee.mobile_phone || "",

        domicilio_personal: `${employee.street || ""} #${employee.exterior_number || ""} ${employee.interior_number ? `Int. ${employee.interior_number}` : ""}, Col. ${employee.neighborhood || ""}, CP ${employee.postal_code || ""}, ${employee.municipality || ""}, ${employee.state || ""}`.trim(),
        calle: employee.street || "",
        num_exterior: employee.exterior_number || "",
        num_interior: employee.interior_number || "",
        colonia: employee.neighborhood || "",
        cp: employee.postal_code || "",
        municipio: employee.municipality || "",
        estado: employee.state || "",

        domicilio_fiscal: `${employee.fiscal_street || employee.street || ""} #${employee.fiscal_exterior_number || employee.exterior_number || ""} ${employee.fiscal_interior_number ? `Int. ${employee.fiscal_interior_number}` : ""}, Col. ${employee.fiscal_neighborhood || employee.neighborhood || ""}, CP ${employee.fiscal_postal_code || employee.postal_code || ""}, ${employee.fiscal_municipality || employee.municipality || ""}, ${employee.fiscal_state || employee.state || ""}`.trim(),

        empresa: employee.company_name || "",
        departamento: employee.department || "",
        puesto: employee.position || "",
        actividades_puesto: employee.job_activities || "Las funciones indicadas por la dirección y correspondientes al puesto.",
        jefe_directo: employee.manager_name || "",
        horario_laboral: employee.work_schedule || "Lunes a Viernes de 09:00 a 18:00 hrs",
        fecha_alta: employee.hire_date ? String(employee.hire_date).slice(0, 10) : "",
        fecha_ingreso: employee.hire_date ? String(employee.hire_date).slice(0, 10) : "",

        tipo_contrato: employee.contract_type || "Indeterminado",
        fecha_inicio_contrato: employee.contract_start_date ? String(employee.contract_start_date).slice(0, 10) : (employee.hire_date ? String(employee.hire_date).slice(0, 10) : ""),
        fecha_termino_contrato: employee.contract_end_date ? String(employee.contract_end_date).slice(0, 10) : "Indefinido",
        fin_periodo_prueba: employee.probation_end_date ? String(employee.probation_end_date).slice(0, 10) : "N/A",

        salario_mensual: employee.base_salary ? `$${Number(employee.base_salary).toLocaleString()} MXN` : "$0.00 MXN",
        salario_diario: employee.base_daily_salary ? `$${Number(employee.base_daily_salary).toLocaleString()} MXN` : "$0.00 MXN",
        salario_diario_integrado: employee.sdi_salary ? `$${Number(employee.sdi_salary).toLocaleString()} MXN` : "$0.00 MXN",
        tipo_nomina: employee.payroll_type || "Quincenal",
        banco: employee.bank_name || "",
        cuenta_bancaria: employee.bank_account || "",
        clabe_interbancaria: employee.bank_clabe || "",
        credito_infonavit: employee.has_infonavit_credit || "NO",
        num_credito_infonavit: employee.infonavit_credit_number || "N/A",
        descuento_infonavit: employee.infonavit_discount_value || "0",

        contacto_emergencia: employee.emergency_contact_name || "",
        relacion_emergencia: employee.emergency_contact_relationship || "",
        telefono_emergencia: employee.emergency_contact_phone || "",

        beneficiario: employee.beneficiary_name || "",
        nombre_beneficiario: employee.beneficiary_name || "",
        beneficiary_name: employee.beneficiary_name || "",
        
        parentesco_beneficiario: employee.beneficiary_relationship || employee.emergency_contact_relationship || "",
        parentesco: employee.beneficiary_relationship || employee.emergency_contact_relationship || "",
        beneficiary_relationship: employee.beneficiary_relationship || employee.emergency_contact_relationship || "",
        relacion_beneficiario: employee.beneficiary_relationship || employee.emergency_contact_relationship || "",
        
        telefono_beneficiario: employee.beneficiary_phone || ""
      };

      formData.append("employee_data", JSON.stringify(employeeData));

      const response = await fetch(`http://localhost:4000/api/employees/${employee.id}/fill-custom-template`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Error al procesar la plantilla personalizada.");
      }

      const res = await response.json();
      alert("✅ Documento personalizado generado y guardado en el expediente.");

      setCustomTemplateFile(null);
      setCustomTemplateName("");

      if (loadEmployeeDocuments) await loadEmployeeDocuments(employee.id);
      if (loadEmployeeFiles) await loadEmployeeFiles(employee.id);

      if (res.file_url) {
        const fullUrl = res.file_url.startsWith("http")
          ? res.file_url
          : `http://localhost:4000${res.file_url.startsWith("/") ? "" : "/"}${res.file_url}`;
        
        const link = document.createElement("a");
        link.href = fullUrl;
        link.target = "_blank";
        link.download = res.filename || `${customTemplateName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      setUploadingTemplate(false);
    }
  }

  async function handleMoveFile(fileId, newCategory) {
    if (!newCategory || !employee) return;
    try {
      const res = await fetch(`http://localhost:4000/api/employees/${employee.id}/files/${fileId}/move`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ targetType: newCategory })
      });

      if (res.ok) {
        if (loadEmployeeFiles) loadEmployeeFiles(employee.id);
      } else {
        const errData = await res.json();
        alert("❌ Error al mover el archivo: " + (errData.message || "Error al procesar la solicitud"));
      }
    } catch (err) {
      console.error("Error al mover el archivo:", err);
    }
  }

  async function handleDeleteGeneratedDoc(doc) {
    if (!window.confirm("¿Estás seguro de eliminar este documento generado?")) return;
    
    try {
      if (api && api.deleteEmployeeDocument) {
        await api.deleteEmployeeDocument(token, doc.id, doc.file_url || doc.url);
      }
      if (loadEmployeeDocuments) {
        await loadEmployeeDocuments(employee.id);
      }
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  }

  if (!employee) return <Spinner label="Cargando información del colaborador..." />;

  const personalAddress = `${employee.street || ""} ${employee.exterior_number || ""} ${employee.neighborhood || ""} ${employee.postal_code || ""}`.trim() || employee.address || "—";
  const fiscalAddress = `${employee.fiscal_street || ""} ${employee.fiscal_exterior_number || ""} ${employee.fiscal_neighborhood || ""} ${employee.fiscal_postal_code || ""}`.trim() || "—";
  const cleanPhoto = getCleanPhotoUrl(employee.photo_url);
  const safeFiles = Array.isArray(employeeFiles) ? employeeFiles : [];
  const safeDocs = Array.isArray(documents) ? documents : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-medium mb-2 cursor-pointer" style={{ color: C.inkSoft }}>
        <ArrowLeft size={14} /> Volver a empleados
      </button>

      <div className="rounded-2xl p-6 flex items-center justify-between bg-[#0F172A] text-white border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-slate-700 bg-slate-800">
            {cleanPhoto ? (
              <img src={cleanPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-emerald-400">{initials(`${employee.first_name} ${employee.last_name}`)}</span>
            )}
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <Camera size={16} color="#fff" />
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onPhotoChange && onPhotoChange(e.target.files[0])} />
            </label>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{employee.first_name} {employee.last_name}</h1>
            <p className="text-xs text-slate-400">{employee.position || "Sin puesto"} · {employee.department}</p>
          </div>
        </div>
        <button onClick={onEdit} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1B4B43] hover:bg-[#153B34] transition-all shadow-md cursor-pointer">
          Editar expediente
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl p-5 space-y-3 bg-white border" style={{ borderColor: C.line }}>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.inkSoft }}>Información General</h2>
          <p className="text-xs"><strong>Correo:</strong> {employee.personal_email}</p>
          <p className="text-xs"><strong>Horario Laboral:</strong> {employee.work_schedule || "Lunes a Viernes de 09:00 a 18:00 hrs"}</p>
          <p className="text-xs"><strong>Actividades del Puesto:</strong> {employee.job_activities || "Sin definir"}</p>
          <p className="text-xs"><strong>CURP:</strong> {employee.curp || "—"}</p>
          <p className="text-xs"><strong>RFC:</strong> {employee.rfc || "—"}</p>
          <p className="text-xs"><strong>NSS:</strong> {employee.nss || "—"}</p>
          <p className="text-xs"><strong>Domicilio Personal:</strong> {personalAddress}</p>
          <p className="text-xs"><strong>Domicilio Fiscal (CSF):</strong> {fiscalAddress}</p>
          <p className="text-xs"><strong>Salario Base:</strong> ${Number(employee.base_salary || 0).toLocaleString()} MXN</p>
          <p className="text-xs"><strong>Contacto Emergencia:</strong> {employee.emergency_contact_name ? `${employee.emergency_contact_name} (${employee.emergency_contact_phone || "Sin tel."})` : "—"}</p>
          <p className="text-xs"><strong>Beneficiario:</strong> {employee.beneficiary_name ? `${employee.beneficiary_name} ${employee.beneficiary_relationship ? `(${employee.beneficiary_relationship})` : ''} ${employee.beneficiary_phone ? `· ${employee.beneficiary_phone}` : ''}` : "—"}</p>
          <p className="text-xs"><strong>Alta:</strong> {employee.hire_date?.slice(0, 10)}</p>
        </div>

        <div className="rounded-2xl p-5 space-y-4 bg-white border" style={{ borderColor: C.line }}>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.inkSoft }}>Expediente Digital</h2>
            
            {safeFiles.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch(`http://localhost:4000/api/employees/${employee.id}/download-all`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });

                    if (!response.ok) {
                      const errText = await response.text();
                      alert("❌ Error al descargar expediente: " + errText);
                      return;
                    }

                    const blob = await response.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = `Expediente_${employee.first_name}_${employee.last_name}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(downloadUrl);
                  } catch (err) {
                    alert("❌ Error de red al descargar el expediente: " + err.message);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                style={{ background: C.primary, color: "#fff" }}
              >
                <FolderDown size={14} /> Descargar Todo (ZIP)
              </button>
            )}
          </div>

          <div className="flex justify-between items-center mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Carga Masiva e Inteligente de Expediente</p>
              <p className="text-[10px] text-slate-500">Sube un PDF unificado con todos los documentos y el sistema los organizará automáticamente.</p>
            </div>

            <label className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm">
              <FolderDown size={14} />
              <span>Auto-Clasificar PDF</span>
              <input
                type="file"
                accept=".pdf, .png, .jpg, .jpeg"
                className="hidden"
                onChange={(evt) => {
                  const file = evt.target.files?.[0];
                  if (!file) return;
                  if (onSelectBatchPdf) onSelectBatchPdf(file);
                  evt.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {REQUIRED_DOCUMENTS.map((docType) => {
              const matchingFiles = safeFiles.filter(f => f.file_type === docType || (docType === "Contratos" && (f.file_type === "Contratos" || f.file_type === "Contrato Firmado")));
              const isGeneratable = GENERATABLE_DOCUMENTS.includes(docType);

              return (
                <div 
                  key={docType} 
                  className="p-4 rounded-xl border bg-white shadow-xs flex flex-col gap-3"
                  style={{ borderColor: C.line }}
                >
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: C.line }}>
                    <div>
                      <p className="font-bold text-slate-800 text-xs tracking-tight">{docType}</p>
                      <p className="text-[10px] text-slate-400">
                        {matchingFiles.length > 0 
                          ? `${matchingFiles.length} documento(s) en esta sección` 
                          : "Sin documentos subidos"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isGeneratable && employee.company_id && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const tmplRes = await fetch(`http://localhost:4000/api/companies/${employee.company_id}/templates`, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              const compTemplates = tmplRes.ok ? await tmplRes.json() : [];

                              const targetCategory = docType.includes("Contrato") ? "Contratos" : docType;
                              const available = compTemplates.filter(t => t.document_type === targetCategory || (targetCategory === "Contratos" && (t.document_type === "Contratos" || t.document_type === "Contrato Firmado")));

                              if (available.length === 0) {
                                alert(`❌ No hay plantillas de '${docType}' configuradas para la empresa ${employee.company_name || ''}. Cárgalas desde el módulo de Empresas.`);
                                return;
                              }

                              let selectedSubType = available[0].sub_type;

                              if (available.length > 1) {
                                const optionsList = available.map((t, idx) => `${idx + 1}. ${t.sub_type || 'General'} (${t.file_name})`).join("\n");
                                const choice = prompt(`Selecciona el tipo de ${docType} a generar:\n\n${optionsList}\n\nIngresa el número de tu opción:`, "1");

                                if (!choice) return;
                                const selectedIndex = parseInt(choice, 10) - 1;

                                if (isNaN(selectedIndex) || !available[selectedIndex]) {
                                  alert("Opción inválida.");
                                  return;
                                }
                                selectedSubType = available[selectedIndex].sub_type;
                              }

                              alert(`⏳ Generando ${docType} (${selectedSubType || 'General'}) para ${employee.first_name}...`);

                              const response = await fetch(`http://localhost:4000/api/companies/${employee.company_id}/fill-template`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  document_type: targetCategory,
                                  sub_type: selectedSubType,
                                  employee_id: employee.id
                                })
                              });

                              if (!response.ok) {
                                const errData = await response.json();
                                throw new Error(errData.message || "Error al generar el documento.");
                              }

                              const res = await response.json();

                              if (loadEmployeeFiles) await loadEmployeeFiles(employee.id);

                              if (res.file_url) {
                                const fullUrl = res.file_url.startsWith("http")
                                  ? res.file_url
                                  : `http://localhost:4000${res.file_url.startsWith("/") ? "" : "/"}${res.file_url}`;

                                const link = document.createElement("a");
                                link.href = fullUrl;
                                link.target = "_blank";
                                link.download = res.filename || `${docType}.docx`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            } catch (err) {
                              alert("❌ Error: " + err.message);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all hover:opacity-90"
                          style={{ background: C.primarySoft, color: C.primary, border: `1px solid ${C.line}` }}
                          title={`Generar ${docType} desde la plantilla de la empresa`}
                        >
                          <Send size={12} />
                          <span>Generar</span>
                        </button>
                      )}

                      {matchingFiles.length === 0 && (
                        <label 
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:opacity-90 flex items-center gap-1 shrink-0"
                          style={{ background: C.primary, color: "#fff" }}
                        >
                          <span>Subir</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && onUploadFile && onUploadFile(e.target.files[0], docType)}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {matchingFiles.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {matchingFiles.map((fileUploaded) => {
                        const fileTargetUrl = fileUploaded?.file_url || fileUploaded?.url || "";
                        const fullFileUrl = fileTargetUrl.startsWith("http")
                          ? fileTargetUrl
                          : `http://localhost:4000${fileTargetUrl.startsWith("/") ? "" : "/"}${fileTargetUrl}`;

                        return (
                          <div 
                            key={fileUploaded.id} 
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="text-xs font-semibold text-slate-700 truncate">
                                  {fileUploaded.file_name || fileUploaded.filename || "Documento.pdf"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <a
                                  href={fullFileUrl}
                                  download={fileUploaded.file_name || "documento.pdf"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all"
                                  style={{ background: C.primarySoft, color: C.primary }}
                                >
                                  <Download size={12} /> Ver / Descargar
                                </a>

                                <button 
                                  type="button"
                                  onClick={() => onDeleteFile && onDeleteFile(fileUploaded.id)} 
                                  className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                  title="Eliminar este archivo"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Mover a:</span>
                              <select
                                className="text-xs py-1 px-2.5 border border-slate-200 rounded-md bg-white text-slate-700 cursor-pointer outline-none hover:border-[#1B4B43] flex-1 max-w-xs transition-colors"
                                value={fileUploaded.file_type || docType}
                                onChange={(e) => handleMoveFile(fileUploaded.id, e.target.value)}
                              >
                                <option value="" disabled>Seleccionar sección destino...</option>
                                {REQUIRED_DOCUMENTS.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-1 flex justify-end">
                        <label className="text-[11px] font-semibold text-[#1B4B43] hover:underline cursor-pointer flex items-center gap-1">
                          <span>+ Agregar otro archivo a esta sección</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && onUploadFile && onUploadFile(e.target.files[0], docType)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-4 bg-white border" style={{ borderColor: C.line }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.inkSoft }}>Generación de Documentos y Formatos</h2>
        
        <div className="p-4 rounded-xl border bg-slate-50 space-y-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[#1B4B43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Subir y Autorrellenar Formato Personalizado (Contrato / Convenio)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Sube una plantilla en formato Word (`.docx`) o HTML con etiquetas como <code>{"{nombre}"}</code>, <code>{"{puesto}"}</code>, <code>{"{actividades_puesto}"}</code>, <code>{"{curp}"}</code>, <code>{"{rfc}"}</code>, <code>{"{salario_mensual}"}</code>, <code>{"{domicilio_personal}"}</code>, etc., y el sistema rellenará los datos de <strong>{employee.first_name} {employee.last_name}</strong> automáticamente.
          </p>

          <form onSubmit={handleUploadAndFillTemplate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2">
            <div>
              <label className="text-[11px] font-bold block mb-1 text-slate-600">
                Nombre del Documento
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Contrato Indeterminado 2026"
                value={customTemplateName}
                onChange={(e) => setCustomTemplateName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none focus:border-[#1B4B43]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1 text-slate-600">
                Seleccionar Plantilla (.docx / .html)
              </label>
              <input
                type="file"
                required
                accept=".docx,.doc,.html,.txt"
                onChange={(e) => setCustomTemplateFile(e.target.files?.[0] || null)}
                className="w-full px-2 py-1.5 rounded-lg text-xs bg-white border outline-none cursor-pointer"
                style={{ borderColor: C.line }}
              />
            </div>

            <button
              type="submit"
              disabled={uploadingTemplate || !customTemplateFile || !customTemplateName.trim()}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              style={{ background: C.primary }}
            >
              {uploadingTemplate ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Rellenar y Generar PDF</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="flex gap-3 items-end pt-2">
          <div className="flex-1">
            <TextField
              label="Seleccionar plantilla predefinida"
              value={selectedTemplateId}
              onChange={e => onSelectTemplate && onSelectTemplate(e.target.value)}
              options={templates}
            />
          </div>
          <button
            disabled={!selectedTemplateId || generating}
            onClick={onGenerate}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white flex items-center gap-2 transition-opacity cursor-pointer"
            style={{ background: C.primary, opacity: (!selectedTemplateId || generating) ? 0.5 : 1 }}
          >
            {generating && <Loader2 size={13} className="animate-spin" />}
            Generar documento
          </button>
        </div>

        {selectedTemplateId === "carta_guarderia" && (
          <div className="mt-3 p-3.5 rounded-xl border bg-[#F3F5F4]" style={{ borderColor: C.line }}>
            <label className="text-xs font-bold block mb-1.5" style={{ color: C.ink }}>
              Nombre del Hijo(a) para Acreditación IMSS:
            </label>
            <input
              type="text"
              placeholder="Escribe el nombre completo del menor..."
              value={childName}
              onChange={e => onChildNameChange && onChildNameChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none"
              style={{ borderColor: C.line }}
            />
          </div>
        )}

        {selectedTemplateId === "acta_administrativa" && (
          <div className="mt-3 p-4 rounded-xl border bg-[#F3F5F4] space-y-3" style={{ borderColor: C.line }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.accent }}>
              Detalles de los Hechos para Acta Administrativa
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.inkSoft }}>Fecha de los Hechos</label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={e => onIncidentDateChange && onIncidentDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none"
                  style={{ borderColor: C.line }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.inkSoft }}>Hora de la Incidencia</label>
                <input
                  type="time"
                  value={incidentTime}
                  onChange={e => onIncidentTimeChange && onIncidentTimeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none"
                  style={{ borderColor: C.line }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.inkSoft }}>Lugar de los Hechos</label>
                <input
                  type="text"
                  placeholder="Ej. Área de Operaciones"
                  value={incidentLocation}
                  onChange={e => onIncidentLocationChange && onIncidentLocationChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none"
                  style={{ borderColor: C.line }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: C.inkSoft }}>
                Descripción Redactada de la Mala Actuación / Situación Ocurrida
              </label>
              <textarea
                rows={3}
                placeholder="Escribe el reporte circumstantial de los hechos acontecidos..."
                value={observaciones}
                onChange={e => onObservacionesChange && onObservacionesChange(e.target.value)}
                className="w-full p-3 rounded-lg text-xs bg-white border outline-none"
                style={{ borderColor: C.line }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: C.line }}>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.inkSoft }}>Nombre del Testigo 1</label>
                <input
                  type="text"
                  placeholder="Nombre completo Testigo 1..."
                  value={witness1}
                  onChange={e => onWitness1Change && onWitness1Change(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none"
                  style={{ borderColor: C.line }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.inkSoft }}>Nombre del Testigo 2</label>
                <input
                  type="text"
                  placeholder="Nombre completo Testigo 2..."
                  value={witness2}
                  onChange={e => onWitness2Change && onWitness2Change(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none"
                  style={{ borderColor: C.line }}
                />
              </div>
            </div>
          </div>
        )}

        {isMultiForm && (
          <div className="mt-4 p-4 rounded-xl space-y-4 border" style={{ background: C.bg, borderColor: C.line }}>
            <div>
              <label className="text-xs font-bold block mb-2" style={{ color: C.ink }}>Opciones a solicitar en el formato:</label>
              <div className="grid grid-cols-2 gap-2">
                {multiFormOptions.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: C.ink }}>
                    <input
                      type="checkbox"
                      checked={checkedOptions.includes(opt)}
                      onChange={() => onToggleOption && onToggleOption(opt)}
                      className="rounded"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.inkSoft }}>Fecha de solicitud</label>
                <input
                  type="date"
                  value={fechaSolicitud}
                  onChange={e => onFechaSolicitudChange && onFechaSolicitudChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none"
                  style={{ borderColor: C.line }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.inkSoft }}>Observaciones</label>
                <input
                  type="text"
                  placeholder="Detalles adicionales..."
                  value={observaciones}
                  onChange={e => onObservacionesChange && onObservacionesChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white border outline-none"
                  style={{ borderColor: C.line }}
                />
              </div>
            </div>
          </div>
        )}

        {safeDocs.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: C.line }}>
            <p className="text-xs font-semibold" style={{ color: C.inkSoft }}>Documentos emitidos:</p>
            <div className="space-y-1.5">
              {safeDocs.map(doc => {
                const docTargetUrl = doc.file_url || doc.url || "";
                const fullDocUrl = docTargetUrl.startsWith("http")
                  ? docTargetUrl
                  : `http://localhost:4000${docTargetUrl.startsWith("/") ? "" : "/"}${docTargetUrl}`;

                return (
                  <div key={doc.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg border bg-white" style={{ borderColor: C.line }}>
                    <div>
                      <p className="font-medium" style={{ color: C.ink }}>{doc.template_name || "Documento generado"}</p>
                      <p className="text-[10px]" style={{ color: C.inkSoft }}>Emitido el {doc.created_at?.slice(0, 10)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={fullDocUrl}
                        download={`${doc.template_name || "Documento"}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1"
                        style={{ background: C.primarySoft, color: C.primary }}
                      >
                        <Download size={13} /> Ver / Descargar PDF
                      </a>
                      {api && api.deleteEmployeeDocument && (
                        <button
                          onClick={() => handleDeleteGeneratedDoc(doc)}
                          className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"
                          style={{ color: C.danger }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AIFloatingAssistant({ token, api }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [mood, setPayloadMood] = useState("idle");

  const [juggles, setJuggles] = useState(0);

  const [position, setPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth - 100 : 300,
    y: typeof window !== "undefined" ? window.innerHeight - 100 : 300
  });
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  const [bikeX, setBikeX] = useState(0);

  const [messages, setMessages] = useState([
    { sender: "ai", text: "¡Hola! 👋 Soy NúcleoBot, tu asistente virtual de Recursos Humanos. ¿En qué puedo ayudarte hoy?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const faceRef = useRef(null);

  const handleMouseDownPosition = (e) => {
    if (e.target.closest('[draggable]') || mood === "biking") return;

    setIsDraggingPosition(true);
    hasDragged.current = false;
    dragStartOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMovePosition = (e) => {
      if (!isDraggingPosition) return;
      hasDragged.current = true;

      const newX = Math.max(50, Math.min(window.innerWidth - 50, e.clientX - dragStartOffset.current.x));
      const newY = Math.max(50, Math.min(window.innerHeight - 50, e.clientY - dragStartOffset.current.y));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUpPosition = () => {
      setIsDraggingPosition(false);
    };

    if (isDraggingPosition) {
      window.addEventListener("mousemove", handleMouseMovePosition);
      window.addEventListener("mouseup", handleMouseUpPosition);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMovePosition);
      window.removeEventListener("mouseup", handleMouseUpPosition);
    };
  }, [isDraggingPosition]);

  useEffect(() => {
    let interval;
    if (mood === "playing") {
      setJuggles(1);
      interval = setInterval(() => {
        setJuggles((prev) => prev + 1);
      }, 400);
    } else {
      setJuggles(0);
    }
    return () => clearInterval(interval);
  }, [mood]);

  useEffect(() => {
    let interval;
    if (mood === "biking") {
      setBikeX(-200);
      let step = -200;
      interval = setInterval(() => {
        step += 14;
        setBikeX(step);
        if (step > window.innerWidth + 200) {
          clearInterval(interval);
          setPayloadMood("happy");
          setTimeout(() => setPayloadMood("idle"), 2000);
        }
      }, 30);
    }
    return () => clearInterval(interval);
  }, [mood]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!faceRef.current || mood === "sleeping" || mood === "working" || isDraggingPosition) return;
      
      if (mood === "playing") {
        setEyeOffset({ x: 0, y: -3 });
        return;
      }

      const rect = faceRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const angle = Math.atan2(deltaY, deltaX);

      const maxDistance = 3.5;
      const distance = Math.min(Math.hypot(deltaX, deltaY) / 15, maxDistance);

      setEyeOffset({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mood, isDraggingPosition]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleInteract = (e, action) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setPayloadMood(action);
    
    if (action !== "biking") {
      setTimeout(() => {
        setPayloadMood("happy");
        setTimeout(() => setPayloadMood("idle"), 2000);
      }, action === "playing" ? 5000 : 4000);
    }
  };

  const handleDragStart = (e, action) => {
    e.dataTransfer.setData("text/plain", action);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const action = e.dataTransfer.getData("text/plain");
    if (action) {
      handleInteract(null, action);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setLoading(true);
    setPayloadMood("working");

    try {
      if (api.askAI) {
        const res = await api.askAI(token, userMsg);
        setMessages((prev) => [...prev, { sender: "ai", text: res.reply }]);
        setPayloadMood("happy");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "⚠️ No pude conectar con el servicio de IA. Verifica tu conexión." }
      ]);
      setPayloadMood("idle");
    } finally {
      setLoading(false);
      setTimeout(() => setPayloadMood("idle"), 2500);
    }
  };

  const handleFaceClick = (e) => {
    e.stopPropagation();
    if (!hasDragged.current && mood !== "biking") {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      {mood === "biking" && (
        <div 
          className="fixed z-50 pointer-events-none flex flex-col items-center gap-1 transition-all"
          style={{
            left: `${bikeX}px`,
            top: `${position.y}px`,
            transform: "translate(-50%, -50%)"
          }}
        >
          <span className="text-[9px] font-bold bg-slate-900/90 text-emerald-400 px-2 py-0.5 rounded-full border border-slate-700 shadow-md whitespace-nowrap -mb-1">
            ¡De paseo! 🚲💨
          </span>

          <div className="w-16 h-16 rounded-full bg-amber-400 border-2 border-slate-900 flex items-center justify-center shadow-lg animate-bounce relative">
            <span className="text-2xl">🚲</span>
          </div>
        </div>
      )}

      <div 
        className="fixed z-50 font-sans flex flex-col items-center select-none pt-14 pb-2 px-4"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translate(-50%, -50%)",
          display: mood === "biking" ? "none" : "flex"
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isOpen && (
          <div
            className={`absolute top-0 z-50 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700 shadow-2xl transition-all duration-200 ${
              isHovered || isDraggingOver ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-90 translate-y-2 pointer-events-none"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap mr-0.5">Acciones ➔</span>
            
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, "eating")}
              onClick={(e) => handleInteract(e, "eating")}
              className="hover:scale-130 cursor-grab active:cursor-grabbing transition-transform p-1 text-lg outline-none"
              title="Dar Galleta 🍪"
            >
              🍪
            </button>

            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, "icecream")}
              onClick={(e) => handleInteract(e, "icecream")}
              className="hover:scale-130 cursor-grab active:cursor-grabbing transition-transform p-1 text-lg outline-none"
              title="Dar Helado 🍦"
            >
              🍦
            </button>

            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, "working")}
              onClick={(e) => handleInteract(e, "working")}
              className="hover:scale-130 cursor-grab active:cursor-grabbing transition-transform p-1 text-lg outline-none"
              title="Laptop / Modo Trabajo 💻"
            >
              💻
            </button>

            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, "biking")}
              onClick={(e) => handleInteract(e, "biking")}
              className="hover:scale-130 cursor-grab active:cursor-grabbing transition-transform p-1 text-lg outline-none"
              title="Pasear en Bici 🚲"
            >
              🚲
            </button>

            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, "playing")}
              onClick={(e) => handleInteract(e, "playing")}
              className="hover:scale-130 cursor-grab active:cursor-grabbing transition-transform p-1 text-lg outline-none"
              title="Dominadas con Balón ⚽"
            >
              ⚽
            </button>

            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, "sleeping")}
              onClick={(e) => handleInteract(e, "sleeping")}
              className="hover:scale-130 cursor-grab active:cursor-grabbing transition-transform p-1 text-lg outline-none"
              title="Poner a Dormir 💤"
            >
              💤
            </button>
          </div>
        )}

        {isOpen && (
          <div 
            className="absolute bottom-20 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[480px] animate-in fade-in duration-200 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-gradient-to-r from-[#1B4B43] to-[#12332D] text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-lg">
                  😊
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight">NúcleoBot IA</h3>
                  <p className="text-[9px] text-emerald-200/90">Asistente Virtual 24/7</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-emerald-100 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50 text-xs">
              {messages.map((m, idx) => {
                const isAI = m.sender === "ai";
                return (
                  <div key={idx} className={`flex ${isAI ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[82%] p-3 rounded-2xl leading-relaxed shadow-sm ${
                        isAI
                          ? "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                          : "bg-[#1B4B43] text-white rounded-br-none"
                      }`}
                    >
                      {isAI && (
                        <p className="text-[9px] font-extrabold text-emerald-700 uppercase mb-1">
                          🤖 NúcleoBot
                        </p>
                      )}
                      <p className="whitespace-pre-line">{m.text}</p>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-500 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-[#1B4B43]" />
                    <span className="text-[11px]">Pensando respuesta...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-slate-100 flex gap-2 items-center">
              <input
                type="text"
                placeholder="Pregúntale algo a la IA..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 outline-none focus:border-[#1B4B43] transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-[#1B4B43] text-white rounded-xl hover:bg-[#12332D] transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        <div className="relative flex items-center">
          {isHovered && !isOpen && !isDraggingOver && !isDraggingPosition && mood !== "playing" && (
            <div className="absolute -left-9 top-1 text-2xl animate-bounce pointer-events-none">
              <span className="inline-block origin-bottom-right animate-pulse">👋</span>
            </div>
          )}

          {mood === "playing" && (
            <div className="absolute -top-12 z-20 flex flex-col items-center pointer-events-none">
              <span className="text-[10px] font-black bg-emerald-500 text-slate-900 px-2 py-0.5 rounded-full border border-emerald-300 shadow-md animate-pulse">
                ¡Dominadas: {juggles}! ⚽
              </span>
              <div className="text-2xl animate-bounce mt-1">
                ⚽
              </div>
            </div>
          )}

          {mood === "eating" && (
            <div className="absolute -top-7 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 animate-bounce pointer-events-none">
              ¡Nom Nom! 🍪
            </div>
          )}
          {mood === "icecream" && (
            <div className="absolute -top-7 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300 animate-pulse pointer-events-none">
              ¡Slurp! 🍦
            </div>
          )}
          {mood === "working" && (
            <div className="absolute -top-7 text-[10px] font-mono text-emerald-400 bg-slate-900 px-2 py-0.5 rounded-full border border-emerald-500 animate-pulse pointer-events-none">
              010101 Working... 💻
            </div>
          )}
          {mood === "sleeping" && (
            <div className="absolute -top-7 font-bold text-xs text-blue-400 animate-pulse pointer-events-none">
              Zzz... 💤
            </div>
          )}

          <button
            ref={faceRef}
            onMouseDown={handleMouseDownPosition}
            onClick={handleFaceClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-16 h-16 rounded-full bg-gradient-to-tr from-[#12332D] via-[#1B4B43] to-[#2E6B5E] text-white flex items-center justify-center shadow-2xl transition-all duration-150 border-2 relative group cursor-grab active:cursor-grabbing ${
              isDraggingPosition ? "scale-110 ring-4 ring-emerald-400/40 shadow-2xl" :
              isDraggingOver ? "scale-125 border-yellow-400 ring-4 ring-yellow-400/30" :
              mood === "playing" ? "animate-pulse ring-2 ring-emerald-400 border-emerald-300" :
              mood === "eating" ? "animate-pulse border-amber-400" :
              mood === "working" ? "ring-2 ring-emerald-400 border-emerald-300" :
              isHovered ? "scale-110 border-emerald-300" : "scale-100 border-emerald-400/50"
            }`}
            title="Acerca el cursor para ver acciones o mantén presionado para mover"
          >
            <svg className="w-11 h-11 pointer-events-none" viewBox="0 0 36 36" fill="none">
              <circle 
                cx="18" 
                cy="18" 
                r="16" 
                fill={
                  mood === "playing" ? "#34D399" :
                  mood === "working" ? "#10B981" :
                  mood === "icecream" ? "#60A5FA" :
                  mood === "eating" ? "#F59E0B" :
                  isDraggingOver ? "#FDE047" : "#FACC15"
                } 
              />

              {mood === "working" && (
                <g>
                  <rect x="7" y="11" width="9" height="7" rx="1.5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
                  <rect x="20" y="11" width="9" height="7" rx="1.5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
                  <line x1="16" y1="14" x2="20" y2="14" stroke="#1E293B" strokeWidth="1.5" />
                </g>
              )}

              {mood === "sleeping" ? (
                <>
                  <path d="M 9 14 Q 12 18 15 14" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 21 14 Q 24 18 27 14" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="14" r="3.5" fill="white" />
                  <circle cx="24" cy="14" r="3.5" fill="white" />

                  <circle
                    cx={12 + eyeOffset.x}
                    cy={14 + eyeOffset.y}
                    r={isDraggingOver || isHovered || mood === "happy" || mood === "playing" ? 2.4 : 1.7}
                    fill="#1E293B"
                    className="transition-all duration-75"
                  />
                  <circle
                    cx={24 + eyeOffset.x}
                    cy={14 + eyeOffset.y}
                    r={isDraggingOver || isHovered || mood === "happy" || mood === "playing" ? 2.4 : 1.7}
                    fill="#1E293B"
                    className="transition-all duration-75"
                  />

                  <circle cx={12.8 + eyeOffset.x} cy={13.2 + eyeOffset.y} r="0.6" fill="white" />
                  <circle cx={24.8 + eyeOffset.x} cy={13.2 + eyeOffset.y} r="0.6" fill="white" />
                </>
              )}

              {isDraggingOver ? (
                <circle cx="18" cy="23" r="5" fill="#1E293B" />
              ) : mood === "eating" ? (
                <ellipse cx="18" cy="23" rx="4" ry="2.5" fill="#1E293B" className="animate-pulse" />
              ) : mood === "icecream" ? (
                <ellipse cx="18" cy="23" rx="3" ry="4" fill="#1E293B" />
              ) : mood === "working" ? (
                <path d="M 12 23 L 24 23" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
              ) : mood === "playing" || mood === "happy" || isHovered ? (
                <path d="M 10 21 Q 18 30 26 21 Z" fill="#1E293B" />
              ) : (
                <path d="M 11 22 Q 18 27 25 22" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              )}

              <ellipse cx="8.5" cy="19" rx="2.2" ry="1.3" fill="#F87171" opacity="0.7" />
              <ellipse cx="27.5" cy="19" rx="2.2" ry="1.3" fill="#F87171" opacity="0.7" />
            </svg>

            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse pointer-events-none" />
          </button>
        </div>
      </div>
    </>
  );
}
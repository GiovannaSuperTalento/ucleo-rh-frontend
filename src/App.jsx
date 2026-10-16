import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  LayoutDashboard, Users, CalendarDays, LogOut, Plus, Check, X,
  Search, ChevronRight, Building2, Clock, ArrowLeft, RefreshCw,
  User, Briefcase, DollarSign, Siren, History, Loader2, KeyRound, Copy, Trash2, Camera, MessageSquare, Download, FolderDown, FileSpreadsheet, Send, Info, Calendar, Key, Shield, CheckCircle, Share2, Eye, Pencil
} from "lucide-react";
import Workbook from "exceljs";
import { api, API_BASE } from "./api";
import WorkspaceDashboard from "./components/WorkspaceDashboard";
import ChatModule from "./ChatModule";
import FloatingChatWidget from "./components/FloatingChatWidget";
import StickyNotes from "./components/dashboard/StickyNotes";
import { PdfSplitModal } from "./components/PdfSplitModal";
import { SocialPublicationsModule } from "./components/SocialPublicationsModule";
import RecruitmentModule from "./components/RecruitmentModule";
import InternalVacanciesPortal from "./components/InternalVacanciesPortal";
import PublicAssessment from "./components/PublicAssessment";
import DocumentFormatsStudio from "./components/DocumentFormatsStudio";
import { formatDateInSpanishWords } from "./utils/dateWords";
import GeneratedCompanyDocumentPreview from "./components/GeneratedCompanyDocumentPreview";
import { APPEARANCE_THEMES } from "./components/AppearanceSettings";
import { formatDate } from "./utils/formatDate";

const InlineWordEditor = React.lazy(() => import("./components/InlineWordEditor"));

const C = {
  bg: "#F3F5F4", surface: "#FFFFFF", ink: "#1B2A2E", inkSoft: "#5B6B6E", line: "#E1E6E4",
  primary: "var(--user-primary, #1B4B43)", primarySoft: "var(--user-primary-soft, #E7EFEC)", accent: "#C6793D", accentSoft: "#FBEBDC",
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
    const baseUrl = API_BASE.replace(/\/api$/, "");
    return `${baseUrl}/uploads/${filename}`;
  }
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  const baseUrl = API_BASE.replace(/\/api$/, "");
  return `${baseUrl}${clean.startsWith("/") ? clean : `/${clean}`}`;
}

function normalizeManagedUserRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (["admin", "administrator"].includes(role)) return "admin";
  if (["reclutamiento", "reclutador", "recruiter", "reclu"].includes(role)) return "reclutamiento";
  return "empleado";
}

// 🟢 HELPER COMPARADOR SEGURO DE UUIDS DE EMPRESAS Y COLABORADORES
function isSameCompany(employeeOrId, filterCompanyId) {
  if (!filterCompanyId || filterCompanyId === "all") return true;

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
const normalizeDepartmentKey = (value) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-MX");
const COMPANY_TEMPLATE_DOCUMENT_TYPES = [
  "Contratos",
  "Convenio",
  "Convenio de Confidencialidad",
  "Aviso de Privacidad",
  "ADDENDUM",
  "Constancia laboral",
  "Carta de recomendación",
  "Carta para guardería",
  "Carta probatoria de domicilio",
  "Formatos Varios",
];
const normalizeCompanyDocumentType = (value) => String(value || "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .toLocaleLowerCase("es-MX");
const companyDocumentTypeMatches = (configuredType, requestedType) => {
  const configured = normalizeCompanyDocumentType(configuredType);
  const requested = normalizeCompanyDocumentType(requestedType);
  if (configured === requested) return true;
  const confidentialityAgreementTypes = new Set(["convenio", "convenio de confidencialidad"]);
  const contractTypes = new Set(["contratos", "contrato firmado"]);
  return (confidentialityAgreementTypes.has(configured) && confidentialityAgreementTypes.has(requested))
    || (contractTypes.has(configured) && contractTypes.has(requested));
};
const BATCH_FILE_CATEGORIES = [
  "Expediente Completo",
  "Todos los CV y solicitudes",
  "Todas las identificaciones (INE / pasaporte)",
  "Todos los comprobantes",
  "Todas las constancias",
  "Todos los estados de cuenta",
  "Todos los comprobantes de estudio",
  "CV / Solicitud de Empleo",
  "Identificación Oficial (INE / Pasaporte)",
  "Comprobante de Domicilio",
  "Acta de Nacimiento",
  "CURP",
  "RFC (Constancia de Situación Fiscal)",
  "NSS (Número de Seguro Social)",
  "Comprobante de Estudios",
  "Estado de Cuenta Bancaria",
  "Comprobantes de Nómina",
  "Constancia de Trabajo",
  "Carta de Recomendación",
  "Contratos",
  "ADDENDUM",
  "Convenio de Confidencialidad",
  "Aviso de Privacidad",
  "Formatos Varios",
  "Políticas de RH",
  "Descriptivo de Puesto",
  "Requisición",
  "Test de Integridad",
];
const STATUS_OPTIONS = ["activo", "baja", "incapacidad", "permiso"];
const CONTRACT_TYPES = ["Indeterminado", "Determinado", "Periodo de prueba 90 días", "Periodo de prueba 180 días"];
const PAYROLL_OPTIONS = [
  { id: "SEM", name: "Semanal" },
  { id: "QUI", name: "Quincenal" },
  { id: "DIA", name: "Diario" },
  { id: "MEN", name: "Mensual" },
];
const PAY_PERIODS_PER_MONTH = { SEM: 52 / 12, QUI: 2, DIA: 30, MEN: 1 };
const normalizePayrollType = (value) => {
  const normalized = String(value || "QUI").trim().toUpperCase();
  if (["SEM", "SEMANAL"].includes(normalized)) return "SEM";
  if (["DIA", "DIARIO", "DIARIA"].includes(normalized)) return "DIA";
  if (["MEN", "MENSUAL", "MES"].includes(normalized)) return "MEN";
  return "QUI";
};
const periodAmountFromMonthly = (monthly, type) => {
  const periods = PAY_PERIODS_PER_MONTH[normalizePayrollType(type)];
  return Number((Number(monthly || 0) / periods).toFixed(2));
};
const monthlyAmountFromPeriod = (amount, type) =>
  Number((Number(amount || 0) * PAY_PERIODS_PER_MONTH[normalizePayrollType(type)]).toFixed(2));

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
  department: DEPARTMENTS[0], position: "", job_activities: "", manager_id: "", company_id: "", hire_date: "", recognized_seniority_date: "", employment_status: "activo",
  termination_date: "", contract_start_date: "", contract_end_date: "", contract_type: CONTRACT_TYPES[0], probation_end_date: "",
  work_schedule: "Lunes a Viernes de 09:00 a 18:00 hrs",
  base_daily_salary: "", sdi_salary: "", base_salary: "", pay_period_salary: "", payroll_type: "QUI",
  has_infonavit_credit: "NO", infonavit_credit_number: "", infonavit_discount_value: "",
  bank_name: "", bank_account: "", bank_clabe: "",
  emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "",
  beneficiary_name: "", beneficiary_relationship: "", beneficiary_phone: "",
});

const employeeDateLabels = {
  birth_date: "Fecha de nacimiento",
  hire_date: "Fecha de alta",
  recognized_seniority_date: "Fecha de ingreso reconocida para antigüedad",
  termination_date: "Fecha de baja",
  rehire_date: "Fecha de reingreso",
  contract_start_date: "Fecha de inicio de contrato",
  contract_end_date: "Fecha de término de contrato",
  probation_end_date: "Fin del periodo de prueba",
};

function normalizeEmployeeDate(value) {
  if (value === null || value === undefined || value === "") return { valid: true, value: null };
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { valid: false };
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return { valid: true, value: `${year}-${month}-${day}` };
  }
  if (typeof value !== "string") return { valid: false };

  const raw = value.trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  const dmyMatch = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  const ymdMatch = raw.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  const parts = isoMatch
    ? [Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])]
    : dmyMatch
      ? [Number(dmyMatch[3]), Number(dmyMatch[2]), Number(dmyMatch[1])]
      : ymdMatch
        ? [Number(ymdMatch[1]), Number(ymdMatch[2]), Number(ymdMatch[3])]
        : null;
  if (!parts) return { valid: false };
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? { valid: true, value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` } : { valid: false };
}

function worksheetValueText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map(part => part.text || "").join("");
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined) return worksheetValueText(value.result);
    if (value.hyperlink) return String(value.text || value.hyperlink);
    return "";
  }
  return String(value);
}

function applyReadableWorksheetLayout(worksheet, { minWidth = 12, maxWidth = 36, baseRowHeight = 20 } = {}) {
  worksheet.properties.defaultRowHeight = baseRowHeight;
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: false }, cell => {
      maxLength = Math.max(maxLength, ...worksheetValueText(cell.value).split(/\r?\n/).map(line => line.length));
    });
    column.width = Math.min(maxWidth, Math.max(minWidth, maxLength + 2));
  });

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    let requiredLines = 1;
    row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const width = worksheet.getColumn(columnNumber).width || minWidth;
      const lines = worksheetValueText(cell.value).split(/\r?\n/);
      const wrappedLines = lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / Math.max(8, width - 2))), 0);
      requiredLines = Math.max(requiredLines, wrappedLines);
      cell.alignment = {
        ...(cell.alignment || {}),
        vertical: rowNumber === 1 ? "middle" : (cell.alignment?.vertical || "top"),
        horizontal: cell.alignment?.horizontal || "left",
        wrapText: true,
      };
    });
    const estimatedHeight = Math.max(baseRowHeight, requiredLines * 14 + 6);
    row.height = Math.max(Number(row.height) || 0, estimatedHeight);
  });
}

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

function TextField({ label, value, onChange, type = "text", required, placeholder, options, list, suggestions = [], onBlur, readOnly = false }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
      {options ? (
        <select value={value || ""} onChange={onChange} disabled={readOnly} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-white disabled:opacity-75" style={{ border: `1px solid ${C.line}` }}>
          <option value="">Selecciona…</option>
          {options.map(o => <option key={o.id || o} value={o.id || o}>{o.name || o.legal_name || o.full_name || o}</option>)}
        </select>
      ) : (
        <>
        <input type={type} value={value || ""} onChange={onChange} onBlur={onBlur} list={list} readOnly={readOnly} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-white" style={{ border: `1px solid ${C.line}`, ...(readOnly ? { background: "#F8FAF9", color: C.inkSoft } : {}) }} />
          {list && <datalist id={list}>{suggestions.map(item => <option key={item.id || item.position} value={item.position || item} />)}</datalist>}
        </>
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
        <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }} translate="no" lang="es">
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
  const candidateToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("evaluacion");
  return (
    <ErrorBoundary>
      {candidateToken ? <PublicAssessment candidateToken={candidateToken} /> : <AppInner />}
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
  const [appearance, setAppearance] = useState({ themeId: "default", backgroundImage: "", accentColor: "green", fontFamily: "inter", iconShape: "rounded" });
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceSaved, setAppearanceSaved] = useState(false);
  const [appearanceError, setAppearanceError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBySender, setUnreadBySender] = useState({});
  const [incomingChatNotification, setIncomingChatNotification] = useState(null);
  const [openChatContact, setOpenChatContact] = useState(null);
  const seenChatNotificationIds = useRef(new Set());
  const updateUnreadMessages = useCallback(data => {
    setUnreadCount(data?.count || 0);
    setUnreadBySender(data?.bySender || {});
  }, []);

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [employeeStatusTab, setEmployeeStatusTab] = useState("activo");

  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState(null);
  const [selectedEmployeeDepartment, setSelectedEmployeeDepartment] = useState(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [formTab, setFormTab] = useState("personal");
  const [newEmployee, setNewEmployee] = useState(emptyEmployee());
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [positionProfiles, setPositionProfiles] = useState([]);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [employeeFiles, setEmployeeFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);

  const [pendingPdfFile, setPendingPdfFile] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSplittingPdf, setIsPdfSplitting] = useState(false);

  const [showExportAltasModal, setShowAddExportAltasModal] = useState(false);
  const [exportMode, setExportMode] = useState("altas"); // "altas" | "bajas"
  const [exportFilterType, setExportFilterType] = useState("all");
  const [exportSelectedCompanyId, setExportSelectedCompanyId] = useState("");
  const [exportSelectedEmployeeId, setExportSelectedEmployeeId] = useState("");
  const [exportGender, setExportGender] = useState("");
  const [exportSchedule, setExportSchedule] = useState("");
  const [exportMinAge, setExportMinAge] = useState("");
  const [exportMaxAge, setExportMaxAge] = useState("");

  // Filtros de la lista de empleados en pantalla (género, horario, edad)
  const [listGenderFilter, setListGenderFilter] = useState("");
  const [listScheduleFilter, setListScheduleFilter] = useState("");
  const [listMinAge, setListMinAge] = useState("");
  const [listMaxAge, setListMaxAge] = useState("");

  // Calcula edad a partir de la fecha de nacimiento
  function getAge(birthDate) {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    if (isNaN(b.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    return age;
  }

  // Aplica los filtros extra (género, edad, horario) sobre una lista de empleados
  function applyExtraExportFilters(list) {
    return list.filter((e) => {
      if (exportGender && e.gender !== exportGender) return false;
      if (exportSchedule && e.work_schedule !== exportSchedule) return false;
      if (exportMinAge || exportMaxAge) {
        const age = getAge(e.birth_date);
        if (age === null) return false;
        if (exportMinAge && age < Number(exportMinAge)) return false;
        if (exportMaxAge && age > Number(exportMaxAge)) return false;
      }
      return true;
    });
  }

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchMode, setBatchMode] = useState("generate");
  const [batchCompanyId, setBatchCompanyId] = useState("");
  const [batchEmployeeStatus, setBatchEmployeeStatus] = useState("activo");
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
  const [usersSearch, setUsersSearch] = useState("");
  const [savingUserRoleId, setSavingUserRoleId] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState(null);
  const [companySectionTabs, setCompanySectionTabs] = useState({});
  const [showAddCompany, setShowAddCompany] = useState(false);
  const companyFormRef = useRef(null);
  const [newCompany, setNewCompany] = useState({ legal_name: "", rfc: "", address: "", imss_registry: "" });
  const [newCompanyDepartments, setNewCompanyDepartments] = useState([""]);
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [companyTemplateTypeDrafts, setCompanyTemplateTypeDrafts] = useState({});
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyPositionProfiles, setCompanyPositionProfiles] = useState({});
  const [positionProfileDraft, setPositionProfileDraft] = useState(null);
  const [positionProfileSaving, setPositionProfileSaving] = useState(false);
  const [positionProfileError, setPositionProfileError] = useState("");
  const [positionProfileNotice, setPositionProfileNotice] = useState("");
  const [positionDescriptiveFile, setPositionDescriptiveFile] = useState(null);
  const [deptInputs, setDeptInputs] = useState({});
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaveError, setCompanySaveError] = useState("");

  useEffect(() => {
    if (!showAddCompany) return;
    const frame = window.requestAnimationFrame(() => {
      companyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      companyFormRef.current?.querySelector("input")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showAddCompany, editingCompany]);

  useEffect(() => {
    if (view !== "companies" || !companies.length) return;
    let active = true;
    Promise.all(companies.map(async company => {
      const response = await fetch(`${API_BASE}/employees/position-profiles?company_id=${encodeURIComponent(company.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [company.id, []];
      const rows = await response.json().catch(() => []);
      return [company.id, Array.isArray(rows) ? rows : []];
    })).then(entries => {
      if (active) setCompanyPositionProfiles(current => ({ ...current, ...Object.fromEntries(entries) }));
    }).catch(() => {});
    return () => { active = false; };
  }, [view, companies, token]);

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "empleado", display_name: "", department: "", position: "" });
  const [userSaveError, setUserSaveError] = useState("");
  const [userSaveNotice, setUserSaveNotice] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [lastCreatedPassword, setLastCreatedPassword] = useState("");
  const [sendingAccessUserId, setSendingAccessUserId] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [firstPasswordError, setFirstPasswordError] = useState("");
  const [firstPasswordSaving, setFirstPasswordSaving] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);

  const normalizedRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = !normalizedRole || ["admin", "administrator"].includes(normalizedRole);
  const isRecruitmentManager = ["reclutamiento", "reclutador", "recruiter"].includes(normalizedRole);
  const normalizeAccessLabel = value => String(value || "").trim().toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const humanResourcesLabels = [user?.department, user?.position].map(normalizeAccessLabel);
  const isHumanResources = Boolean(user?.has_full_data_access) || humanResourcesLabels.some(label =>
    label === "rh" || label === "rrhh" || label === "hr" || label.includes("recursos humanos") || label.includes("human resources")
  );
  const hasFullMenuAccess = isAdmin || isRecruitmentManager || isHumanResources;
  const canManageUsers = hasFullMenuAccess;
  const resetToken = useMemo(() => new URLSearchParams(window.location.search).get("resetToken"), []);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    if (employeeStatusTab === "todos") return employees;
    return employees.filter(e => (e.employment_status || "activo") === employeeStatusTab);
  }, [employees, employeeStatusTab]);

  const filteredUsers = useMemo(() => {
    const query = usersSearch.trim().toLocaleLowerCase("es-MX");
    if (!query) return users;
    return users.filter(account => [account.email, account.role, account.is_active ? "activo" : "inactivo"]
      .some(value => String(value || "").toLocaleLowerCase("es-MX").includes(query)));
  }, [users, usersSearch]);

  const managerOptions = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees
      .filter(e => (e.employment_status || "activo") === "activo" && e.id !== editingEmployeeId)
      .map(e => ({ id: e.id, full_name: `${e.position || 'Sin Puesto'} — ${e.first_name || ''} ${e.last_name || ''}` }));
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

  useEffect(() => {
    let active = true;
    setPositionProfiles([]);
    if (!showAddEmployee || !newEmployee.company_id) return () => { active = false; };
    fetch(`${API_BASE}/employees/position-profiles?company_id=${encodeURIComponent(newEmployee.company_id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async response => {
      if (!response.ok) throw new Error("No se pudieron cargar los perfiles de puesto");
      return response.json();
    }).then(rows => { if (active) setPositionProfiles(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (active) setPositionProfiles([]); });
    return () => { active = false; };
  }, [showAddEmployee, newEmployee.company_id, token]);

  async function loadEmployees(search = "") {
    setEmployeesLoading(true);
    setEmployeesError("");
    try {
      const data = await api.getEmployees(token, search);
      
      let employeeList = [];
      if (Array.isArray(data)) {
        employeeList = data;
      } else if (data && typeof data === 'object') {
        employeeList = data.employees || data.data || data.rows || [];
      }

      window.listaEmpleados = employeeList;
      setEmployees(employeeList);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      setEmployeesError("Error del servidor en Railway (500): " + (err.message || "Error al conectar"));
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
      const res = await fetch(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rawCompanies = Array.isArray(data) ? data : (data?.companies || []);
        const companiesWithTemplates = await Promise.all(rawCompanies.map(async (c) => {
          const cleanCompany = { ...c, id: String(c.id).trim() };
          const [templatesResult, logoResult] = await Promise.allSettled([
            fetch(`${API_BASE}/companies/${encodeURIComponent(cleanCompany.id)}/templates`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(async (response) => {
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error HTTP ${response.status}`);
              }
              return response.json();
            }),
            api.getCompanyDocumentLogo(token, cleanCompany.id),
          ]);
          const templatesData = templatesResult.status === "fulfilled" ? templatesResult.value : [];
          const logoData = logoResult.status === "fulfilled" ? logoResult.value?.logo_data : null;
          return {
            ...cleanCompany,
            templates: Array.isArray(templatesData) ? templatesData : [],
            templates_load_error: templatesResult.status === "rejected" ? templatesResult.reason?.message || "No se pudieron cargar las plantillas." : null,
            logo_data: logoData || null,
          };
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
      const res = await fetch(`${API_BASE}/companies/templates/${templateId}`, {
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
        api.getLeaveRequests ? api.getLeaveRequests(token) : fetch(`${API_BASE}/leaves/requests`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        api.getLeaveTypes ? api.getLeaveTypes(token) : fetch(`${API_BASE}/leaves/types`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      ]);
      setLeaveRequests(Array.isArray(requests) ? requests : []);
      setLeaveTypes(Array.isArray(types) ? types : []);
      
      const balance = api.getMyLeaveBalance 
        ? await api.getMyLeaveBalance(token)
        : await fetch(`${API_BASE}/leaves/my-balance`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
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
        const response = await fetch(`${API_BASE}/leaves/requests`, {
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
      await loadUsers();
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      setSavingPass(false);
    }
  }

  useEffect(() => {
    if (!token || !user) {
      setUnreadCount(0);
      setUnreadBySender({});
      setIncomingChatNotification(null);
      seenChatNotificationIds.current.clear();
      return;
    }
    let active = true;
    const pollMessages = async () => {
      const [countResult, notificationResult] = await Promise.allSettled([
        api.getUnreadCount(token),
        api.getMessageNotifications(token),
      ]);
      if (!active) return;
      if (countResult.status === "fulfilled") {
        setUnreadCount(countResult.value?.count || 0);
        setUnreadBySender(countResult.value?.bySender || {});
      }
      if (notificationResult.status === "fulfilled" && Array.isArray(notificationResult.value)) {
        const notifications = notificationResult.value;
        const unseen = notifications.filter(item => !seenChatNotificationIds.current.has(String(item.id)));
        notifications.forEach(item => seenChatNotificationIds.current.add(String(item.id)));
        if (unseen.length) setIncomingChatNotification(unseen[0]);
      }
    };
    pollMessages();
    const interval = setInterval(pollMessages, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [token, user]);

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Núcleo RH` : "Núcleo RH";
  }, [unreadCount]);

  useEffect(() => {
    if (token && user) {
      const userPos = (user.position || "").toLowerCase();
      const isRecruiter = userPos.includes("reclutad") || userPos.includes("rh");
      if (hasFullMenuAccess || isRecruiter) {
        setCanAccessSocial(true);
      } else if (api && api.checkSocialPermission) {
        api.checkSocialPermission(token)
          .then(() => setCanAccessSocial(true))
          .catch(() => setCanAccessSocial(false));
      }
    }
  }, [token, user, hasFullMenuAccess]);

  useEffect(() => {
    if (selectedEmployee) {
      setSelectedTemplateId("");
      setTemplates([]);
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
        api.getTemplates(token, selectedEmployee.company_id)
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
  }, [selectedEmployee?.id, selectedEmployee?.company_id]);

  useEffect(() => {
    if (showAddEmployee && editingEmployeeId && formTab === "movimientos") {
      api.getEmployeeHistory(token, editingEmployeeId).then(setEmployeeHistory).catch(() => setEmployeeHistory([]));
    }
  }, [showAddEmployee, editingEmployeeId, formTab]);

  useEffect(() => {
    if (token && (view === "companies" || showAddEmployee || showExportAltasModal || view === "employees" || view === "ats")) loadCompanies();
  }, [token, view, showAddEmployee, showExportAltasModal]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.getCurrentUser(token).then(profile => {
      if (!active) return;
      const refreshedUser = { ...user, ...profile };
      setUser(refreshedUser);
      localStorage.setItem("nucleo_rh_user", JSON.stringify(refreshedUser));
    }).catch(() => {});
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setAppearance({ themeId: "default", backgroundImage: "", accentColor: "green", fontFamily: "inter", iconShape: "rounded" });
      return;
    }
    let active = true;
    api.getUserPreferences(token).then(preferences => {
      if (!active) return;
      const nextAppearance = preferences?.appearance;
      if (nextAppearance && typeof nextAppearance === "object") {
        const validTheme = APPEARANCE_THEMES.some(theme => theme.id === nextAppearance.themeId);
        setAppearance({
          themeId: validTheme ? nextAppearance.themeId : "default",
          backgroundImage: typeof nextAppearance.backgroundImage === "string" ? nextAppearance.backgroundImage : "",
          attribution: nextAppearance.attribution && typeof nextAppearance.attribution === "object" ? nextAppearance.attribution : null,
          accentColor: ["green", "blue", "violet", "coral", "amber"].includes(nextAppearance.accentColor) ? nextAppearance.accentColor : "green",
          fontFamily: ["inter", "arial", "georgia", "trebuchet"].includes(nextAppearance.fontFamily) ? nextAppearance.fontFamily : "inter",
          iconShape: ["rounded", "square", "circle"].includes(nextAppearance.iconShape) ? nextAppearance.iconShape : "rounded",
        });
      }
    }).catch(error => {
      if (active) console.warn("No se pudo cargar la apariencia guardada:", error.message);
    });
    return () => { active = false; };
  }, [token]);

  async function saveAppearance(nextAppearance) {
    setAppearance(nextAppearance);
    setAppearanceSaving(true);
    setAppearanceSaved(false);
    setAppearanceError("");
    try {
      const preferences = await api.saveUserPreferences(token, { appearance: nextAppearance });
      setAppearance(preferences?.appearance || nextAppearance);
      setAppearanceSaved(true);
      return true;
    } catch (error) {
      setAppearanceError(error.message || "No se pudo guardar la apariencia.");
      return false;
    } finally {
      setAppearanceSaving(false);
    }
  }

  useEffect(() => {
    if (token && view === "users" && canManageUsers) loadUsers();
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
    if (newPassword.length < 8) { setResetError("La contraseña debe tener al menos 8 caracteres."); return; }
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
      const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
      const templateTypeId = selectedTemplate?.template_type_id || selectedTemplateId;
      const isMulti = templateTypeId === "formato_multiple";
      if (isMulti) {
        res = await api.generateDocument(token, selectedEmployee.id, templateTypeId, {
          template_record_id: selectedTemplate?.id,
          title_override: selectedTemplate?.title,
          body_override: selectedTemplate?.content,
          footer_override: selectedTemplate?.footer,
          include_logo: selectedTemplate?.include_logo,
          checked_options: checkedOptions,
          observaciones,
          fecha_solicitud: fechaSolicitud,
        });
        setCheckedOptions([]);
        setObservaciones("");
      } else {
        res = await api.generateDocument(token, selectedEmployee.id, templateTypeId, { 
          template_record_id: selectedTemplate?.id,
          title_override: selectedTemplate?.title,
          body_override: selectedTemplate?.content,
          footer_override: selectedTemplate?.footer,
          include_logo: selectedTemplate?.include_logo,
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
          : `${API_BASE.replace(/\/api$/, "")}${res.file_url.startsWith('/') ? '' : '/'}${res.file_url}`;
        
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
      ? `${API_BASE}/companies/${editingCompany.id}`
      : `${API_BASE}/companies`;
    const method = editingCompany ? "PUT" : "POST";

    try {
      const companyPayload = editingCompany
        ? newCompany
        : { ...newCompany, departments: newCompanyDepartments.map((name) => name.trim()).filter(Boolean) };
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(companyPayload)
      });

      const savedCompany = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(savedCompany.message || "No se pudo procesar la solicitud de la empresa.");

      if (editingCompany) {
        const companyId = savedCompany.id || editingCompany.id;
        const previousDepartments = Array.isArray(editingCompany.departments) ? editingCompany.departments : [];
        const nextDepartments = newCompanyDepartments.map((name) => name.trim()).filter(Boolean);
        const normalizeDepartment = (name) => String(name || "").trim().toLocaleLowerCase("es-MX");
        const nextDepartmentNames = new Set(nextDepartments.map(normalizeDepartment));
        const previousDepartmentNames = new Set(previousDepartments.map((item) => normalizeDepartment(typeof item === "string" ? item : item.name)));

        for (const department of previousDepartments) {
          const departmentName = typeof department === "string" ? department : department.name;
          if (department.id && !nextDepartmentNames.has(normalizeDepartment(departmentName))) {
            const deleteResponse = await fetch(`${API_BASE}/companies/departments/${encodeURIComponent(department.id)}`, {
              method: "DELETE", headers: { Authorization: `Bearer ${token}` },
            });
            if (!deleteResponse.ok) throw new Error(`No se pudo quitar el departamento ${departmentName}.`);
          }
        }

        for (const departmentName of nextDepartments) {
          if (previousDepartmentNames.has(normalizeDepartment(departmentName))) continue;
          const departmentResponse = await fetch(`${API_BASE}/companies/${encodeURIComponent(companyId)}/departments`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: departmentName }),
          });
          const departmentResult = await departmentResponse.json().catch(() => ({}));
          if (!departmentResponse.ok) throw new Error(departmentResult.message || `No se pudo agregar el departamento ${departmentName}.`);
        }
      }

      if (companyLogoFile && (savedCompany.id || editingCompany?.id)) {
        try {
          const companyId = String(savedCompany.id || editingCompany.id);
          const logoResult = await api.uploadCompanyDocumentLogo(token, companyId, companyLogoFile);
          setCompanies((items) => items.map((company) => String(company.id) === companyId
            ? { ...company, logo_data: logoResult?.logo_data || null }
            : company));
        } catch (logoError) {
          alert(`La empresa y sus departamentos se guardaron, pero el logo no se pudo guardar: ${logoError.message}`);
        }
      }

      setNewCompany({ legal_name: "", rfc: "", address: "", imss_registry: "" });
      setNewCompanyDepartments([""]);
      setCompanyLogoFile(null);
      setEditingCompany(null);
      setShowAddCompany(false);
      await loadCompanies();
    } catch (err) {
      setCompanySaveError(err.message);
    } finally {
      setCompanySaving(false);
    }
  }

  function openPositionProfile(companyId, profile = null) {
    setPositionProfileError("");
    setPositionProfileNotice("");
    setPositionDescriptiveFile(null);
    setPositionProfileDraft(profile ? {
      id: profile.id,
      company_id: companyId,
      position: profile.position || "",
      job_activities: profile.job_activities || "",
      work_schedule: profile.work_schedule || "",
      payroll_type: normalizePayrollType(profile.payroll_type),
      pay_period_salary: profile.pay_period_salary ?? "",
      base_daily_salary: profile.base_daily_salary ?? "",
      sdi_salary: profile.sdi_salary ?? "",
      descriptive_file_name: profile.descriptive_file_name || "",
      descriptive_file_url: profile.descriptive_file_url || "",
    } : {
      id: null, company_id: companyId, position: "", job_activities: "", work_schedule: "",
      payroll_type: "QUI", pay_period_salary: "", base_daily_salary: "", sdi_salary: "",
      descriptive_file_name: "", descriptive_file_url: "",
    });
  }

  async function saveCompanyPositionProfile(e) {
    e.preventDefault();
    if (!positionProfileDraft?.position?.trim()) {
      setPositionProfileError("Escribe el nombre del puesto.");
      return;
    }
    setPositionProfileSaving(true);
    setPositionProfileError("");
    try {
      const response = await fetch(`${API_BASE}/employees/position-profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...positionProfileDraft,
          position: positionProfileDraft.position.trim(),
          payroll_type: normalizePayrollType(positionProfileDraft.payroll_type),
          pay_period_salary: positionProfileDraft.pay_period_salary === "" ? null : Number(positionProfileDraft.pay_period_salary),
          base_daily_salary: positionProfileDraft.base_daily_salary === "" ? null : Number(positionProfileDraft.base_daily_salary),
          sdi_salary: positionProfileDraft.sdi_salary === "" ? null : Number(positionProfileDraft.sdi_salary),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo guardar el puesto.");
      let savedProfile = data;
      if (positionDescriptiveFile) {
        const formData = new FormData();
        formData.append("file", positionDescriptiveFile);
        const uploadResponse = await fetch(`${API_BASE}/employees/position-profiles/${encodeURIComponent(data.id)}/descriptive-file`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
        });
        const uploadResult = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) throw new Error(uploadResult.message || "El puesto se guardó, pero no se pudo procesar el descriptivo.");
        savedProfile = uploadResult.profile;
        setPositionProfileDraft(current => ({ ...current, id: savedProfile.id, job_activities: savedProfile.job_activities || current.job_activities, descriptive_file_name: savedProfile.descriptive_file_name, descriptive_file_url: savedProfile.descriptive_file_url }));
        setPositionDescriptiveFile(null);
        if (uploadResult.updated_employee_count) await loadEmployees();
        const syncedCount = Number(uploadResult.updated_employee_count || 0);
        setPositionProfileNotice(`${uploadResult.extraction_message || "Descriptivo cargado."}${syncedCount ? ` Se actualizaron las actividades de ${syncedCount} colaborador(es) con este puesto.` : ""}`);
      }
      setCompanyPositionProfiles(current => ({
        ...current,
        [positionProfileDraft.company_id]: [
          ...(current[positionProfileDraft.company_id] || []).filter(item => item.id !== savedProfile.id && String(item.position).toLocaleLowerCase("es-MX") !== String(savedProfile.position).toLocaleLowerCase("es-MX")),
          savedProfile,
        ].sort((a, b) => a.position.localeCompare(b.position, "es-MX")),
      }));
      if (!positionDescriptiveFile) setPositionProfileDraft(null);
    } catch (error) {
      setPositionProfileError(error.message || "No se pudo guardar el puesto.");
    } finally {
      setPositionProfileSaving(false);
    }
  }

  async function deleteCompanyPositionProfile(companyId, profile) {
    if (!window.confirm(`¿Eliminar el puesto “${profile.position}” y su configuración de esta empresa?`)) return;
    try {
      const response = await fetch(`${API_BASE}/employees/position-profiles/${encodeURIComponent(profile.id)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo eliminar el puesto.");
      setCompanyPositionProfiles(current => ({
        ...current,
        [companyId]: (current[companyId] || []).filter(item => item.id !== profile.id),
      }));
    } catch (error) {
      alert(error.message || "No se pudo eliminar el puesto.");
    }
  }

  async function deleteCompany(companyId) {
    if (!window.confirm("¿Estás seguro de eliminar esta empresa?")) return;
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}`, {
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
    const deptName = (deptInputs[companyId] || "").trim();
    if (!deptName || !deptName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: deptName })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "No se pudo guardar el departamento.");

      setDeptInputs((current) => ({ ...current, [companyId]: "" }));
      await loadCompanies();
    } catch (err) {
      console.error("Error al agregar departamento:", err);
      window.alert(err.message || "No se pudo guardar el departamento.");
    }
  }

  async function handleDeleteDept(deptId) {
    if (!window.confirm("¿Eliminar este departamento?")) return;
    try {
      const res = await fetch(`${API_BASE}/companies/departments/${deptId}`, {
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
    setUserSaveNotice("");
    try {
      const created = await api.registerUser(token, newUser);
      setUserSaveNotice(created.message || "Cuenta creada. No se envió ningún correo.");
      setLastCreatedPassword("");
      setNewUser({ email: "", password: "", role: "empleado", display_name: "", department: "", position: "" });
      await loadUsers();
    } catch (err) {
      setUserSaveError(err.message);
    } finally {
      setUserSaving(false);
    }
  }

  async function sendUserAccessEmail(account) {
    if (!window.confirm(`Se enviará un nuevo acceso a ${account.email} y se solicitará cambiar la contraseña al entrar. ¿Continuar?`)) return;
    setSendingAccessUserId(account.id);
    setUserSaveNotice("");
    setLastCreatedPassword("");
    try {
      const result = await api.sendUserAccessEmail(token, account.id);
      setUserSaveNotice(result.message || "Correo enviado.");
      if (!result.email_sent) setLastCreatedPassword(result.temporary_password || "");
      await loadUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingAccessUserId(null);
    }
  }

  async function editUserChatProfile(account) {
    const display_name = window.prompt("Nombre completo para el chat", account.display_name || "");
    if (display_name === null) return;
    const department = window.prompt("Departamento", account.department || "");
    if (department === null) return;
    const position = window.prompt("Puesto", account.position || "");
    if (position === null) return;
    try {
      await api.updateUser(token, account.id, { display_name, department, position });
      await loadUsers();
      setUserSaveNotice(`Se actualizó el perfil de ${account.email}; aparecerá con estos datos en mensajería.`);
    } catch (error) {
      setUserSaveError(error.message || "No se pudo actualizar el perfil del usuario.");
    }
  }

  async function submitFirstLoginPassword(e) {
    e.preventDefault();
    setFirstPasswordError("");
    if (!currentPassword) { setFirstPasswordError("Escribe la contraseña temporal que recibiste por correo."); return; }
    if (newPassword.length < 8) { setFirstPasswordError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setFirstPasswordError("Las contraseñas no coinciden."); return; }
    setFirstPasswordSaving(true);
    try {
      await api.changeOwnPassword(token, currentPassword, newPassword);
      const updatedUser = { ...user, must_change_password: false };
      setUser(updatedUser);
      localStorage.setItem("nucleo_rh_user", JSON.stringify(updatedUser));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setFirstPasswordError(err.message);
    } finally {
      setFirstPasswordSaving(false);
    }
  }

  async function changeUserRole(id, role) {
    const accountId = String(id);
    const account = users.find(item => String(item.id) === accountId);
    const nextRole = normalizeManagedUserRole(role);
    if (!account || accountId === String(user?.id)) return;

    setSavingUserRoleId(accountId);
    setUsers(current => current.map(item => String(item.id) === accountId ? { ...item, role: nextRole } : item));
    try {
      const updated = await api.updateUser(token, id, { role: nextRole });
      setUsers(current => current.map(item => String(item.id) === accountId
        ? { ...item, ...updated, role: normalizeManagedUserRole(updated?.role || nextRole) }
        : item));
    } catch (err) {
      setUsers(current => current.map(item => String(item.id) === accountId ? { ...item, role: account.role } : item));
      alert(err.message);
    } finally {
      setSavingUserRoleId(null);
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
        hire_date: employeeToEdit.hire_date || employeeToEdit.start_date ? String(employeeToEdit.hire_date || employeeToEdit.start_date).slice(0, 10) : "",
        recognized_seniority_date: employeeToEdit.recognized_seniority_date ? String(employeeToEdit.recognized_seniority_date).slice(0, 10) : "",
        termination_date: employeeToEdit.termination_date ? String(employeeToEdit.termination_date).slice(0, 10) : "",
        contract_start_date: employeeToEdit.contract_start_date ? String(employeeToEdit.contract_start_date).slice(0, 10) : "",
        contract_end_date: employeeToEdit.contract_end_date ? String(employeeToEdit.contract_end_date).slice(0, 10) : "",
        rehire_date: employeeToEdit.rehire_date ? String(employeeToEdit.rehire_date).slice(0, 10) : "",
        probation_end_date: employeeToEdit.probation_end_date ? String(employeeToEdit.probation_end_date).slice(0, 10) : "",
        payroll_type: normalizePayrollType(employeeToEdit.payroll_type),
        pay_period_salary: employeeToEdit.pay_period_salary !== null && employeeToEdit.pay_period_salary !== undefined && employeeToEdit.pay_period_salary !== ""
          ? String(employeeToEdit.pay_period_salary)
          : (Number(employeeToEdit.base_salary) || Number(employeeToEdit.base_daily_salary) * 30)
            ? String(periodAmountFromMonthly(Number(employeeToEdit.base_salary) || Number(employeeToEdit.base_daily_salary) * 30, employeeToEdit.payroll_type)) : "",
        is_rehire: !!employeeToEdit.rehire_date,
      });
    } else {
      setEditingEmployeeId(null);
      setNewEmployee({
        ...emptyEmployee(),
        company_id: selectedCompanyFilter?.id || "",
      });
    }
    setFormTab("personal");
    setSaveError("");
    setShowAddEmployee(true);
  }

  function updateField(key, value) {
    setNewEmployee(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "company_id" && String(prev.company_id || "") !== String(value || "")) {
        updated.department = "";
        updated.position = "";
        updated.job_activities = "";
        updated.work_schedule = "";
        updated.payroll_type = "QUI";
        updated.pay_period_salary = "";
        updated.base_salary = "";
        updated.base_daily_salary = "";
        updated.sdi_salary = "";
      }
      if (key === "same_as_personal_address" && value) {
        updated.fiscal_street = updated.street;
        updated.fiscal_exterior_number = updated.exterior_number;
        updated.fiscal_interior_number = updated.interior_number;
        updated.fiscal_neighborhood = updated.neighborhood;
        updated.fiscal_postal_code = updated.postal_code;
        updated.fiscal_municipality = updated.municipality;
        updated.fiscal_state = updated.state;
      }
      if (key === "payroll_type") {
        const currentType = normalizePayrollType(prev.payroll_type);
        const selectedType = normalizePayrollType(value);
        const currentAmount = prev.pay_period_salary !== "" && prev.pay_period_salary !== null && prev.pay_period_salary !== undefined
          ? monthlyAmountFromPeriod(prev.pay_period_salary, currentType)
          : Number(prev.base_salary) || Number(prev.base_daily_salary) * 30 || 0;
        updated.payroll_type = selectedType;
        updated.pay_period_salary = currentAmount ? String(periodAmountFromMonthly(currentAmount, selectedType)) : "";
        if (selectedType === "DIA" && updated.pay_period_salary) updated.base_daily_salary = updated.pay_period_salary;
      }
      if (key === "pay_period_salary" && normalizePayrollType(prev.payroll_type) === "DIA") {
        updated.base_daily_salary = value;
      }
      return updated;
    });
  }

  function applyPositionProfile(positionValue = newEmployee.position) {
    const cleanPosition = String(positionValue || "").trim().toLocaleLowerCase("es-MX");
    if (!cleanPosition) return;
    const profile = positionProfiles.find(item => String(item.position || "").trim().toLocaleLowerCase("es-MX") === cleanPosition);
    if (!profile) return;
    setNewEmployee(prev => {
      const payrollType = normalizePayrollType(profile.payroll_type);
      const periodSalary = profile.pay_period_salary !== null && profile.pay_period_salary !== undefined
        ? String(profile.pay_period_salary) : "";
      return {
        ...prev,
        position: profile.position,
        job_activities: profile.job_activities || "",
        work_schedule: profile.work_schedule || "",
        payroll_type: payrollType,
        pay_period_salary: periodSalary,
        base_salary: periodSalary ? String(monthlyAmountFromPeriod(periodSalary, payrollType)) : "",
        base_daily_salary: profile.base_daily_salary !== null && profile.base_daily_salary !== undefined
          ? String(profile.base_daily_salary) : (payrollType === "DIA" ? periodSalary : ""),
        sdi_salary: profile.sdi_salary !== null && profile.sdi_salary !== undefined ? String(profile.sdi_salary) : "",
      };
    });
  }

  // 🟢 SANITIZACIÓN ANTES DE ENVIAR EMPLEADO A GUARDAR
  async function addEmployee(e) {
    e.preventDefault();
    if (!newEmployee.first_name || (!newEmployee.last_name && !newEmployee.last_name_paternal) || !newEmployee.hire_date) {
      setFormTab("personal");
      setSaveError("Nombre, apellido y fecha de alta son obligatorios.");
      return;
    }

    const normalizedDates = {};
    for (const [field, label] of Object.entries(employeeDateLabels)) {
      const normalized = normalizeEmployeeDate(newEmployee[field]);
      if (!normalized.valid) {
        setSaveError(`${label}: selecciona una fecha válida antes de guardar.`);
        return;
      }
      normalizedDates[field] = normalized.value;
    }

    setSavingEmployee(true);
    setSaveError("");
    try {
      const payload = {
        ...newEmployee,
        // Sanitizar cadenas vacías para evitar Errores 500 en Postgres
        base_daily_salary: newEmployee.base_daily_salary ? parseFloat(newEmployee.base_daily_salary) : null,
        sdi_salary: newEmployee.sdi_salary ? parseFloat(newEmployee.sdi_salary) : null,
        base_salary: newEmployee.pay_period_salary !== ""
          ? monthlyAmountFromPeriod(newEmployee.pay_period_salary, newEmployee.payroll_type)
          : newEmployee.base_salary ? parseFloat(newEmployee.base_salary) : null,
        pay_period_salary: newEmployee.pay_period_salary !== "" ? parseFloat(newEmployee.pay_period_salary) : null,
        infonavit_discount_value: newEmployee.infonavit_discount_value ? parseFloat(newEmployee.infonavit_discount_value) : null,
        company_id: newEmployee.company_id && newEmployee.company_id !== "" ? newEmployee.company_id : null,
        manager_id: newEmployee.manager_id && newEmployee.manager_id !== "" ? newEmployee.manager_id : null,
        ...normalizedDates,
      };

      delete payload.is_rehire;
      delete payload.id;
      if (!payload.rehire_date) delete payload.rehire_date;

      if (payload.employment_status === "baja" && !payload.termination_date) {
        payload.termination_date = new Date().toISOString().slice(0, 10);
      } else if (payload.employment_status !== "baja") {
        delete payload.termination_date;
      }

      const ensureDatesPersisted = (savedEmployee) => {
        const dateWasNotSaved = Object.keys(employeeDateLabels).find(field => {
          const savedDate = normalizeEmployeeDate(savedEmployee?.[field]);
          return !savedDate?.valid || savedDate.value !== (payload[field] ?? null);
        });
        if (dateWasNotSaved) {
          throw new Error(`${employeeDateLabels[dateWasNotSaved]} no se confirmó en el servidor. Revisa la fecha e intenta guardar de nuevo.`);
        }
      };

      if (editingEmployeeId) {
        const savedEmployee = await api.updateEmployee(token, editingEmployeeId, payload);
        ensureDatesPersisted(savedEmployee);
        const refreshed = await api.getEmployee(token, editingEmployeeId);
        ensureDatesPersisted(refreshed);
        setSelectedEmployee(refreshed);
      } else {
        const createdEmployee = await api.createEmployee(token, payload);
        ensureDatesPersisted(createdEmployee);
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
    let bajasList = employees.filter(e => e.employment_status === "baja");

    if (exportFilterType === "company") {
      if (!exportSelectedCompanyId) { alert("Selecciona una empresa para exportar."); return; }
      bajasList = bajasList.filter(e => isSameCompany(e, exportSelectedCompanyId));
    } else if (exportFilterType === "employee") {
      if (!exportSelectedEmployeeId) { alert("Selecciona un empleado para exportar."); return; }
      bajasList = bajasList.filter(e => String(e.id) === String(exportSelectedEmployeeId));
    }
    bajasList = applyExtraExportFilters(bajasList);

    if (bajasList.length === 0) {
      alert("No hay registros de bajas para exportar.");
      return;
    }

    const workbook = new Workbook.Workbook();
    const worksheet = workbook.addWorksheet("Historial Bajas");

    const headers = [
      "Empresa", 
      "Nombre Completo (Apellidos Nombre)", 
      "Número de Seguro Social (NSS)", 
      "Fecha de Baja"
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B4B43' } };
      cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    bajasList.forEach((e) => {
      const lastName = e.last_name || e.paternal_surname || "";
      const motherLastName = e.mother_last_name || e.maternal_surname || "";
      const firstName = e.first_name || e.names || "";

      const fullNameByLastNames = `${lastName} ${motherLastName} ${firstName}`.trim().toLocaleUpperCase("es-MX") || "SIN NOMBRE";
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

    applyReadableWorksheetLayout(worksheet, { minWidth: 15, maxWidth: 40, baseRowHeight: 22 });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Reporte_Bajas_RH_${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setShowAddExportAltasModal(false);
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
    activeList = applyExtraExportFilters(activeList);

    if (activeList.length === 0) {
      alert("No se encontraron colaboradores que coincidan con la selección.");
      return;
    }

    const companyIds = [...new Set(activeList.map(e => e.company_id ?? e.companyId).filter(Boolean).map(String))];
    const profilesByCompany = { ...companyPositionProfiles };
    await Promise.all(companyIds.map(async companyId => {
      try {
        const response = await fetch(`${API_BASE}/employees/position-profiles?company_id=${encodeURIComponent(companyId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const profiles = await response.json();
          profilesByCompany[companyId] = Array.isArray(profiles) ? profiles : [];
        }
      } catch (error) {
        console.warn(`No se pudieron cargar los puestos de la empresa ${companyId}:`, error);
      }
    }));

    const getEmployeeProfile = (employee) => {
      const companyId = String(employee.company_id ?? employee.companyId ?? "");
      const profiles = profilesByCompany[companyId] || [];
      const position = String(employee.position || employee.job_position || "").trim().toLocaleLowerCase("es-MX");
      return profiles.find(profile => String(profile.position || "").trim().toLocaleLowerCase("es-MX") === position) || null;
    };
    const getBaseDailySalary = (employee, profile) => {
      const employeeDaily = Number(employee.base_daily_salary);
      if (Number.isFinite(employeeDaily) && employeeDaily > 0) return employeeDaily;
      const profileDaily = Number(profile?.base_daily_salary);
      if (Number.isFinite(profileDaily) && profileDaily > 0) return profileDaily;
      const monthlySalary = Number(employee.base_salary);
      if (Number.isFinite(monthlySalary) && monthlySalary > 0) return Number((monthlySalary / 30).toFixed(2));
      const periodSalary = Number(profile?.pay_period_salary ?? employee.pay_period_salary);
      if (Number.isFinite(periodSalary) && periodSalary > 0) {
        const payrollType = profile?.payroll_type || employee.payroll_type;
        return Number((monthlyAmountFromPeriod(periodSalary, payrollType) / 30).toFixed(2));
      }
      return "";
    };
    const getIntegratedDailySalary = (employee, profile) => {
      const employeeIntegrated = Number(employee.sdi_salary);
      if (Number.isFinite(employeeIntegrated) && employeeIntegrated > 0) return employeeIntegrated;
      const profileIntegrated = Number(profile?.sdi_salary);
      if (Number.isFinite(profileIntegrated) && profileIntegrated > 0) return profileIntegrated;
      return "";
    };
    const downloadExcel = (buffer, filename) => {
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1500);
    };

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
      const profile = getEmployeeProfile(e);
      const position = e.position || e.job_position || profile?.position || "";
      const payrollType = e.payroll_type || profile?.payroll_type || "QUI";
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
        String(e.first_name || "").toLocaleUpperCase("es-MX"),
        String(e.last_name_paternal || e.last_name || "").toLocaleUpperCase("es-MX"),
        String(e.last_name_maternal || "").toLocaleUpperCase("es-MX"),
        e.curp || "",
        getBaseDailySalary(e, profile),
        e.sdi_salary ? Number(e.sdi_salary) : (profile?.sdi_salary ? Number(profile.sdi_salary) : ""),
        formatDate(e.hire_date),
        e.department || "",
        position,
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
        payrollType,
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
      addedRow.height = 22;

      const isEven = idx % 2 === 0;
      addedRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFF' : 'F9FBF9' }
        };
        cell.font = { size: 9, name: 'Calibri' };
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E1E6E4' } },
          left: { style: 'thin', color: { argb: 'E1E6E4' } },
          bottom: { style: 'thin', color: { argb: 'E1E6E4' } },
          right: { style: 'thin', color: { argb: 'E1E6E4' } }
        };
      });
    });

    applyReadableWorksheetLayout(worksheet, { minWidth: 12, maxWidth: 34, baseRowHeight: 22 });

    const dateStamp = new Date().toISOString().slice(0, 10);
    const mainBuffer = await workbook.xlsx.writeBuffer();

    const templateResponse = await fetch("/templates/formato-alta-complemento.xlsx");
    if (!templateResponse.ok) {
      alert("No se encontró la plantilla de Complemento de altas. Vuelve a cargar la página o contacta a soporte.");
      return;
    }
    const complementWorkbook = new Workbook.Workbook();
    await complementWorkbook.xlsx.load(await templateResponse.arrayBuffer());
    const complementSheet = complementWorkbook.getWorksheet("Hoja1") || complementWorkbook.worksheets[0];
    if (!complementSheet) {
      alert("La plantilla de Complemento de altas no contiene una hoja válida.");
      return;
    }
    activeList.forEach((employee, index) => {
      const profile = getEmployeeProfile(employee);
      const company = companies.find(c => isSameCompany(employee, c.id));
      const employeeName = [employee.last_name_paternal || employee.last_name, employee.last_name_maternal, employee.first_name]
        .filter(Boolean).map(part => String(part).trim()).filter(Boolean).join(" ").toLocaleUpperCase("es-MX");
      const values = [
        "ALTA",
        formatDate(employee.hire_date),
        company?.legal_name || employee.company_name || "",
        getIntegratedDailySalary(employee, profile),
        employeeName,
        employee.nss || "",
        employee.rfc || "",
        employee.curp || "",
        "CHUCHO",
      ];
      const row = complementSheet.getRow(index + 2);
      for (let column = 1; column <= values.length; column += 1) {
        const cell = row.getCell(column);
        const templateCell = complementSheet.getRow(2).getCell(column);
        if (index > 0 && templateCell.style) cell.style = { ...templateCell.style };
        cell.value = values[column - 1];
      }
      row.commit?.();
    });
    applyReadableWorksheetLayout(complementSheet, { minWidth: 12, maxWidth: 40, baseRowHeight: 22 });
    const complementBuffer = await complementWorkbook.xlsx.writeBuffer();

    downloadExcel(mainBuffer, `Formatos_Altas_RH_${dateStamp}.xlsx`);
    window.setTimeout(() => downloadExcel(complementBuffer, `Complemento_de_Altas_RH_${dateStamp}.xlsx`), 250);
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
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }} translate="no" lang="es">
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

  if (token && user?.must_change_password) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50" lang="es">
        <div className="w-full max-w-md rounded-2xl p-7 bg-white border shadow-sm" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.primary }}><Building2 size={18} color="#fff" /></div>
            <span className="text-lg font-semibold" style={{ color: C.ink }}>Núcleo RH</span>
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: C.ink }}>Cambia tu contraseña temporal</h1>
          <p className="text-sm mb-5" style={{ color: C.inkSoft }}>Para proteger tu cuenta, crea una contraseña personal antes de continuar.</p>
          <form onSubmit={submitFirstLoginPassword} className="space-y-4">
            <TextField label="Contraseña temporal recibida por correo" type="password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
            <TextField label="Nueva contraseña" type="password" required value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Mínimo 8 caracteres" />
            <TextField label="Confirmar nueva contraseña" type="password" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
            {firstPasswordError && <p className="text-xs" style={{ color: C.danger }}>{firstPasswordError}</p>}
            <button type="submit" disabled={firstPasswordSaving} className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white disabled:opacity-60" style={{ background: C.primary }}>
              {firstPasswordSaving && <Loader2 size={14} className="animate-spin" />} Guardar y entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen w-full flex bg-[#0F172A] font-sans overflow-hidden notranslate" translate="no" lang="es">
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
    ...((hasFullMenuAccess || canAccessSocial) ? [{ key: "social", label: "Publicaciones", icon: Share2 }] : []),
    ...((hasFullMenuAccess || canAccessSocial) ? [{ key: "ats", label: "Reclutamiento", icon: Briefcase }] : []),
    { key: "internal-jobs", label: "Vacantes internas", icon: Briefcase },
    { key: "profile", label: "Mi Perfil", icon: User },
    ...(hasFullMenuAccess ? [{ key: "employees", label: "Empleados", icon: Users }] : []),
    { key: "orgchart", label: "Organigrama", icon: Building2 },
    { key: "leave", label: "Vacaciones y permisos", icon: CalendarDays },
    ...(canManageUsers ? [{ key: "users", label: "Usuarios", icon: KeyRound }] : []),
    ...(hasFullMenuAccess ? [{ key: "companies", label: "Empresas", icon: Building2 }] : []),
  ];

  const pendingCount = leaveRequests.filter(r => r.status === "pendiente").length;
  const batchSelectedCompany = companies.find(company => String(company.id) === String(batchCompanyId)) || null;
  const batchAvailableTemplates = Array.isArray(batchSelectedCompany?.templates) ? batchSelectedCompany.templates : [];
  const batchTemplateTypes = [...new Set(batchAvailableTemplates.map(template => template.document_type).filter(Boolean))];
  const batchTemplateTypeOptions = [...new Set([...COMPANY_TEMPLATE_DOCUMENT_TYPES, ...batchTemplateTypes])];
  const batchSubtypes = [...new Set(batchAvailableTemplates
    .filter(template => template.document_type === batchDocType)
    .map(template => template.sub_type || "General"))];
  const batchCompanyDepartments = [...new Set((batchSelectedCompany?.departments || [])
    .map(department => typeof department === "string" ? department : department?.name)
    .map(name => String(name || "").trim())
    .filter(Boolean))];

  const selectedAppearanceTheme = APPEARANCE_THEMES.find(theme => theme.id === appearance.themeId) || APPEARANCE_THEMES[0];
  const safeAppearanceImage = (() => {
    const image = String(appearance.backgroundImage || "");
    if (/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(image)) return image;
    try {
      const parsed = new URL(image);
      return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : "";
    } catch (_error) {
      return "";
    }
  })();
  const appBackground = safeAppearanceImage
    // Keep the selected wallpaper visible without letting it compete with text.
    ? `linear-gradient(rgba(243,245,244,0.35), rgba(243,245,244,0.35)), url("${safeAppearanceImage}")`
    : selectedAppearanceTheme.background;
  const appearancePalettes = {
    green: { primary: "#1B4B43", soft: "#E7EFEC" },
    blue: { primary: "#2457A6", soft: "#E8F0FE" },
    violet: { primary: "#7042A5", soft: "#F1EAFE" },
    coral: { primary: "#B94B54", soft: "#FCEBED" },
    amber: { primary: "#9A5B12", soft: "#FFF2D9" },
  };
  const accentPalette = appearancePalettes[appearance.accentColor] || appearancePalettes.green;
  const fontFamilies = { inter: "Inter, sans-serif", arial: "Arial, sans-serif", georgia: "Georgia, serif", trebuchet: "'Trebuchet MS', sans-serif" };
  const fontFamily = fontFamilies[appearance.fontFamily] || fontFamilies.inter;

  return (
  <div id="app-shell" data-icon-shape={appearance.iconShape || "rounded"} className="min-h-screen w-full flex notranslate" style={{ "--user-primary": accentPalette.primary, "--user-primary-soft": accentPalette.soft, "--user-font-family": fontFamily, background: appBackground, backgroundAttachment: "fixed", backgroundSize: "cover", backgroundPosition: "center", fontFamily }} translate="no" lang="es">
      <aside className="w-60 shrink-0 flex flex-col p-4" style={{ borderRight: `1px solid ${C.line}`, background: "rgba(255,255,255,0.98)" }}>
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
                {item.key === "leave" && hasFullMenuAccess && pendingCount > 0 && (
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
              <p className="text-xs truncate" style={{ color: C.inkSoft }}>{isAdmin ? "Administrador" : isRecruitmentManager ? "Reclutamiento" : isHumanResources ? "Recursos Humanos" : "Empleado"}</p>
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
            appearance={appearance}
            onSaveAppearance={saveAppearance}
            appearanceSaving={appearanceSaving}
            appearanceSaved={appearanceSaved}
            appearanceError={appearanceError}
            onNavigate={(targetView) => setView(targetView)} 
          />
        )}

        {view === "social" && (hasFullMenuAccess || canAccessSocial) && (
          <SocialPublicationsModule token={token} user={user} api={api} />
        )}

        {view === "ats" && (hasFullMenuAccess || canAccessSocial) && (
          <RecruitmentModule token={token} companies={companies} api={api} />
        )}

        {view === "internal-jobs" && (
          <InternalVacanciesPortal token={token} user={user} api={api} />
        )}

        {view === "messages" && (
          <ChatModule token={token} user={user} api={api} unreadBySender={unreadBySender} />
        )}

        {view === "profile" && (
          <UserProfileView token={token} user={user} api={api} employees={employees} />
        )}

        {view === "companies" && hasFullMenuAccess && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>Empresas</h1>
                <p className="text-sm" style={{ color: C.inkSoft }}>Catálogo corporativo de empresas, estructura organizacional y formatos ({companies.length})</p>
              </div>
              <button 
                onClick={() => { 
                  setEditingCompany(null);
                  setNewCompany({ legal_name: "", rfc: "", address: "", imss_registry: "" });
                  setNewCompanyDepartments([""]);
                  setCompanyLogoFile(null);
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
              <form ref={companyFormRef} onSubmit={submitNewCompany} className="rounded-2xl p-5 mb-6 bg-white border shadow-sm scroll-mt-6" style={{ borderColor: C.line }}>
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
                <div className="mt-5 grid gap-5 border-t pt-4 md:grid-cols-2" style={{ borderColor: C.line }}>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold" style={{ color: C.ink }}>{editingCompany ? "Departamentos de la empresa" : "Departamentos iniciales"}</label>
                        <button type="button" onClick={() => setNewCompanyDepartments((items) => [...items, ""])} className="text-xs font-semibold" style={{ color: C.primary }}>+ Agregar departamento</button>
                      </div>
                      <div className="space-y-2">
                        {newCompanyDepartments.map((department, index) => (
                          <div key={index} className="flex gap-2">
                            <input value={department} onChange={(e) => setNewCompanyDepartments((items) => items.map((item, i) => i === index ? e.target.value : item))} placeholder={`Departamento ${index + 1}`} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#1B4B43]" style={{ borderColor: C.line }} />
                            {newCompanyDepartments.length > 1 && <button type="button" onClick={() => setNewCompanyDepartments((items) => items.filter((_, i) => i !== index))} className="rounded-lg px-2 text-xs text-red-600 hover:bg-red-50" aria-label={`Quitar departamento ${index + 1}`}>Quitar</button>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-2" style={{ color: C.ink }}>Logo de la empresa <span className="font-normal" style={{ color: C.inkSoft }}>(opcional, PNG o JPG hasta 3 MB)</span></label>
                      <input type="file" accept="image/png,image/jpeg" onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file && !["image/png", "image/jpeg"].includes(file.type)) {
                          setCompanySaveError("El logo debe ser una imagen PNG o JPG.");
                          e.target.value = "";
                          return;
                        }
                        if (file && file.size > 3 * 1024 * 1024) {
                          setCompanySaveError("El logo no debe superar 3 MB.");
                          e.target.value = "";
                          return;
                        }
                        setCompanyLogoFile(file);
                        setCompanySaveError("");
                      }} className="block w-full rounded-lg border bg-white px-3 py-2 text-xs" style={{ borderColor: C.line }} />
                      {companyLogoFile && <p className="mt-2 truncate text-[11px]" style={{ color: C.inkSoft }}>Logo seleccionado: {companyLogoFile.name}</p>}
                    </div>
                  </div>
                {companySaveError && <p className="text-xs mt-3 font-medium" style={{ color: C.danger }}>{companySaveError}</p>}
                <div className="flex justify-end gap-3 mt-4">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddCompany(false); setEditingCompany(null); setNewCompanyDepartments([""]); setCompanyLogoFile(null); }} 
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
                  <div key={c.id || i} className="overflow-hidden rounded-2xl bg-white border shadow-sm" style={{ borderColor: expandedCompanyId === c.id ? C.primary : C.line }}>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <button type="button" onClick={() => setExpandedCompanyId(current => current === c.id ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border" style={{ background: C.primarySoft, color: C.primary, borderColor: C.line }}>
                          {c.logo_data
                            ? <img src={c.logo_data} alt={`Logo de ${c.legal_name || c.name}`} className="h-full w-full object-contain p-1" />
                            : <Building2 size={24} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold" style={{ color: C.ink }}>{c.legal_name || c.name}</p>
                          <p className="mt-0.5 truncate text-xs" style={{ color: C.inkSoft }}>RFC {c.rfc || "Sin registrar"} · Registro patronal {c.imss_registry || c.registro_patronal || "Sin registrar"}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: C.primarySoft, color: C.primary }}>{c.departments?.length || 0} departamentos</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#F1F5F4", color: C.inkSoft }}>{companyPositionProfiles[c.id]?.length || 0} puestos</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#F1F5F4", color: C.inkSoft }}>{c.templates?.length || 0} formatos</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className={`shrink-0 transition-transform ${expandedCompanyId === c.id ? "rotate-90" : ""}`} style={{ color: C.inkSoft }} />
                      </button>

                      <div className="flex shrink-0 items-center gap-2 pl-[4.5rem] sm:pl-0">
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
                            setNewCompanyDepartments(Array.isArray(c.departments) && c.departments.length ? c.departments.map((department) => typeof department === "string" ? department : department.name || "") : [""]);
                            setCompanyLogoFile(null);
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

                    {expandedCompanyId === c.id && <div className="border-t" style={{ borderColor: C.line, background: "#FCFDFC" }}>
                    <div className="flex flex-wrap gap-1 border-b px-4 pt-3 sm:px-5" style={{ borderColor: C.line }}>
                      {[
                        ["info", "Resumen"], ["departments", "Departamentos"], ["positions", "Puestos"], ["templates", "Formatos"],
                      ].map(([tab, label]) => (
                        <button key={tab} type="button" onClick={() => setCompanySectionTabs(current => ({ ...current, [c.id]: tab }))} className="rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold transition-colors" style={{ borderColor: (companySectionTabs[c.id] || "info") === tab ? C.primary : "transparent", color: (companySectionTabs[c.id] || "info") === tab ? C.primary : C.inkSoft, background: (companySectionTabs[c.id] || "info") === tab ? "#FFFFFF" : "transparent" }}>{label}</button>
                      ))}
                    </div>
                    <div className="p-4 sm:p-5">
                    {(companySectionTabs[c.id] || "info") === "info" && <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3" style={{ borderColor: C.line }}>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.inkSoft }}>Razón social</p><p className="mt-1 text-xs font-medium" style={{ color: C.ink }}>{c.legal_name || c.name || "—"}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.inkSoft }}>RFC y registro patronal</p><p className="mt-1 text-xs font-medium" style={{ color: C.ink }}>{c.rfc || "—"} · {c.imss_registry || c.registro_patronal || "—"}</p></div>
                      <div className="sm:col-span-1"><p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.inkSoft }}>Domicilio</p><p className="mt-1 text-xs font-medium" style={{ color: C.ink }}>{c.address || "Sin dirección registrada"}</p></div>
                    </div>}

                    {(companySectionTabs[c.id] || "info") === "departments" && <div className="rounded-xl border bg-white p-4" style={{ borderColor: C.line }}>
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
                    </div>}

                    {(companySectionTabs[c.id] || "info") === "positions" && <div className="rounded-xl border bg-white p-4" style={{ borderColor: C.line }}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold block" style={{ color: C.primary }}>Puestos y condiciones por empresa</span>
                          <span className="text-[11px]" style={{ color: C.inkSoft }}>Define aquí actividades, horario, salario y modalidad para reutilizarlos en expedientes.</span>
                        </div>
                        <button type="button" onClick={() => openPositionProfile(c.id)} className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: C.primary }}>+ Agregar puesto</button>
                      </div>
                      <div className="mb-3 space-y-2">
                        {(companyPositionProfiles[c.id] || []).length ? companyPositionProfiles[c.id].map(profile => (
                          <div key={profile.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-slate-50 px-3 py-2" style={{ borderColor: C.line }}>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold" style={{ color: C.ink }}>{profile.position}</p>
                              <p className="text-[11px]" style={{ color: C.inkSoft }}>{PAYROLL_OPTIONS.find(option => option.id === normalizePayrollType(profile.payroll_type))?.name || "Quincenal"} · {profile.pay_period_salary === null || profile.pay_period_salary === undefined ? "Salario sin definir" : `$${Number(profile.pay_period_salary).toLocaleString("es-MX")} por periodo`} · {profile.work_schedule || "Horario sin definir"}</p>
                              <p className="truncate text-[11px]" style={{ color: C.inkSoft }}>{profile.job_activities || "Actividades sin definir"}</p>
                              {profile.descriptive_file_url && <a href={`${API_BASE.replace(/\/api$/, "")}${profile.descriptive_file_url}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-semibold underline" style={{ color: C.primary }}>Ver descriptivo: {profile.descriptive_file_name || "archivo"}</a>}
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => openPositionProfile(c.id, profile)} className="rounded-md border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: C.line, color: C.primary }}>Editar</button>
                              <button type="button" onClick={() => deleteCompanyPositionProfile(c.id, profile)} className="rounded-md px-2 py-1 text-[11px] font-semibold text-red-600">Eliminar</button>
                            </div>
                          </div>
                        )) : <p className="text-xs italic text-slate-400">Aún no hay puestos definidos para esta empresa.</p>}
                      </div>
                      {positionProfileDraft?.company_id === c.id && (
                        <form onSubmit={saveCompanyPositionProfile} className="space-y-3 rounded-xl border p-4" style={{ borderColor: C.line, background: "#FBFCFB" }}>
                          <p className="text-xs font-bold" style={{ color: C.ink }}>{positionProfileDraft.id ? "Editar puesto" : "Nuevo puesto"}</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <TextField label="Puesto" required value={positionProfileDraft.position} onChange={e => setPositionProfileDraft(current => ({ ...current, position: e.target.value }))} placeholder="Ej. Oficial fierrero" />
                            <TextField label="Horario laboral" value={positionProfileDraft.work_schedule} onChange={e => setPositionProfileDraft(current => ({ ...current, work_schedule: e.target.value }))} placeholder="Ej. Lunes a viernes, 08:00 a 17:00" />
                            <TextField label="Modalidad de pago" value={positionProfileDraft.payroll_type} options={PAYROLL_OPTIONS} onChange={e => setPositionProfileDraft(current => ({ ...current, payroll_type: e.target.value }))} />
                            <TextField label={`Salario ${PAYROLL_OPTIONS.find(option => option.id === normalizePayrollType(positionProfileDraft.payroll_type))?.name || "Quincenal"} (MXN)`} type="number" value={positionProfileDraft.pay_period_salary} onChange={e => setPositionProfileDraft(current => ({ ...current, pay_period_salary: e.target.value }))} />
                            <TextField label="Salario diario integrado (opcional)" type="number" value={positionProfileDraft.sdi_salary} onChange={e => setPositionProfileDraft(current => ({ ...current, sdi_salary: e.target.value }))} />
                            <TextField label="Salario diario base (opcional)" type="number" value={positionProfileDraft.base_daily_salary} onChange={e => setPositionProfileDraft(current => ({ ...current, base_daily_salary: e.target.value }))} />
                            <div className="md:col-span-2">
                              <label className="mb-1.5 block text-xs font-medium" style={{ color: C.inkSoft }}>Actividades del puesto</label>
                              <textarea rows={3} value={positionProfileDraft.job_activities} onChange={e => setPositionProfileDraft(current => ({ ...current, job_activities: e.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none" style={{ borderColor: C.line }} placeholder="Describe las actividades y responsabilidades del puesto" />
                            </div>
                            <div className="md:col-span-2 rounded-lg border bg-white p-3" style={{ borderColor: C.line }}>
                              <label className="mb-1.5 block text-xs font-semibold" style={{ color: C.ink }}>Descriptivo del puesto</label>
                              <p className="mb-2 text-[11px]" style={{ color: C.inkSoft }}>Sube un PDF o archivo Word. Se intentará extraer la sección de actividades para rellenar el campo anterior.</p>
                              <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={event => { setPositionDescriptiveFile(event.target.files?.[0] || null); setPositionProfileNotice(""); }} className="block w-full text-xs" />
                              {positionProfileDraft.descriptive_file_url && <p className="mt-2 text-[11px]" style={{ color: C.inkSoft }}>Archivo actual: <a href={`${API_BASE.replace(/\/api$/, "")}${positionProfileDraft.descriptive_file_url}`} target="_blank" rel="noreferrer" className="font-semibold underline" style={{ color: C.primary }}>{positionProfileDraft.descriptive_file_name || "Ver descriptivo"}</a></p>}
                              {positionDescriptiveFile && <p className="mt-2 truncate text-[11px]" style={{ color: C.inkSoft }}>Nuevo archivo: {positionDescriptiveFile.name}</p>}
                            </div>
                          </div>
                          {positionProfileError && <p className="text-xs" style={{ color: C.danger }}>{positionProfileError}</p>}
                          {positionProfileNotice && <p className="rounded-lg p-2 text-xs" style={{ background: C.primarySoft, color: C.primary }}>{positionProfileNotice}</p>}
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => { setPositionProfileDraft(null); setPositionProfileError(""); setPositionProfileNotice(""); setPositionDescriptiveFile(null); }} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.line, color: C.inkSoft }}>Cancelar</button>
                            <button type="submit" disabled={positionProfileSaving} className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" style={{ background: C.primary }}>{positionProfileSaving ? "Guardando…" : positionProfileNotice ? "Guardar actividades" : "Guardar puesto"}</button>
                          </div>
                        </form>
                      )}
                    </div>}

                    {(companySectionTabs[c.id] || "info") === "templates" && <div className="rounded-xl border bg-white p-4" style={{ borderColor: C.line }}>
                      <span className="text-xs font-bold block mb-2" style={{ color: C.primary }}>
                        📄 Plantillas de Formatos para Generación de Expedientes:
                      </span>
                      {c.templates_load_error && (
                        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                          No se pudieron consultar las plantillas guardadas. {c.templates_load_error} Actualiza la pantalla o revisa la conexión con el servidor.
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {[...new Set([...COMPANY_TEMPLATE_DOCUMENT_TYPES, ...(c.templates || []).map(template => template.document_type).filter(Boolean)])].map((docType) => {
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
                                        const res = await fetch(`${API_BASE}/companies/${c.id}/upload-template`, {
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
                      <div className="pt-3 border-t border-slate-200/60">
                        <label className="text-xs font-bold block mb-2 text-slate-700">Agregar otro tipo de formato para esta empresa</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={companyTemplateTypeDrafts[c.id] || ""}
                            onChange={event => setCompanyTemplateTypeDrafts(current => ({ ...current, [c.id]: event.target.value }))}
                            placeholder="Ej. Carta de autorización"
                            className="min-w-0 flex-1 px-3 py-2 rounded-lg border bg-white text-xs outline-none focus:border-[#1B4B43]"
                            style={{ borderColor: C.line }}
                          />
                          <label className="px-3 py-2 rounded-lg bg-[#1B4B43] text-white text-xs font-bold hover:opacity-90 cursor-pointer shrink-0">
                            Subir .docx
                            <input
                              type="file"
                              accept=".docx"
                              className="hidden"
                              onChange={async event => {
                                const file = event.target.files?.[0];
                                const docType = String(companyTemplateTypeDrafts[c.id] || "").trim();
                                if (!file) return;
                                if (!docType) {
                                  alert("Escribe el tipo de formato antes de seleccionar la plantilla.");
                                  event.target.value = "";
                                  return;
                                }
                                const formData = new FormData();
                                formData.append("template", file);
                                formData.append("document_type", docType);
                                formData.append("sub_type", "General");
                                try {
                                  const response = await fetch(`${API_BASE}/companies/${c.id}/upload-template`, {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` },
                                    body: formData,
                                  });
                                  if (!response.ok) {
                                    const error = await response.json().catch(() => ({}));
                                    throw new Error(error.message || "No se pudo guardar la plantilla.");
                                  }
                                  alert(`Plantilla de '${docType}' guardada. Ya aparecerá en Generación Masiva.`);
                                  setCompanyTemplateTypeDrafts(current => ({ ...current, [c.id]: "" }));
                                  await loadCompanies();
                                } catch (error) {
                                  alert("Error al subir la plantilla: " + error.message);
                                } finally {
                                  event.target.value = "";
                                }
                              }}
                            />
                          </label>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">Los tipos personalizados se agregan automáticamente a la lista de generación masiva de esta empresa.</p>
                      </div>
                    </div>}
                    </div>
                    </div>}
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
              <div className="rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>
                  {hasFullMenuAccess
                    ? "Organigrama por Empresa" 
                    : `Organigrama de Departamento: ${userDept}`}
                </h1>
                <p className="text-sm" style={{ color: C.inkSoft }}>
                  {hasFullMenuAccess
                    ? "Estructura jerárquica organizada individualmente por Razón Social." 
                    : "Estructura interna y puestos activos asignados a tu departamento."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {hasFullMenuAccess && companies.length > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
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
                    .filter(e => hasFullMenuAccess || (userDept && e.department === userDept))
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

        {/* 🟢 SECCIÓN EMPLEADOS RENDERIZADA DIRECTA SIN BLOQUEOS DE ROL NI EMPRESA */}
        {view === "employees" && (
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
                        <TextField label="Puesto" value={newEmployee.position} onChange={e => { updateField("position", e.target.value); applyPositionProfile(e.target.value); }} options={[
                          ...positionProfiles.map(profile => ({ id: profile.position, name: profile.position })),
                          ...(newEmployee.position && !positionProfiles.some(profile => profile.position === newEmployee.position) ? [{ id: newEmployee.position, name: newEmployee.position }] : []),
                        ]} />
                        <TextField 
                          label="Actividades del Puesto" 
                          value={newEmployee.job_activities || ""} 
                          readOnly
                        />
                        <p className="col-span-2 -mt-2 text-[11px]" style={{ color: C.inkSoft }}>Los puestos y sus condiciones se administran en Empresas; al seleccionar uno se cargan automáticamente.</p>
                        <TextField 
                          label="Jefe Directo (Reporta a)" 
                          value={newEmployee.manager_id} 
                          onChange={e => updateField("manager_id", e.target.value)} 
                          options={managerOptions} 
                        />
                        <TextField 
                          label="Horario Laboral" 
                          value={newEmployee.work_schedule} 
                          readOnly
                        />
                        <TextField label="Fecha de Alta" type="date" required value={newEmployee.hire_date} onChange={e => updateField("hire_date", e.target.value)} />
                        <TextField label="Fecha de ingreso reconocida para antigüedad (opcional)" type="date" value={newEmployee.recognized_seniority_date} onChange={e => updateField("recognized_seniority_date", e.target.value)} />
                        <p className="col-span-2 -mt-2 text-[11px]" style={{ color: C.inkSoft }}>Déjala vacía si la antigüedad reconocida coincide con la fecha de alta o no aplica.</p>
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
                        <TextField label="S.D Alta (Salario Diario)" type="number" value={newEmployee.base_daily_salary} onChange={e => updateField("base_daily_salary", e.target.value)} readOnly />
                        <TextField label="S.D.I. Alta (Salario Diario Integrado)" type="number" value={newEmployee.sdi_salary} onChange={e => updateField("sdi_salary", e.target.value)} readOnly />
                        <TextField label={`Salario ${PAYROLL_OPTIONS.find(option => option.id === normalizePayrollType(newEmployee.payroll_type))?.name || "Quincenal"} MXN`} type="number" value={newEmployee.pay_period_salary} onChange={e => updateField("pay_period_salary", e.target.value)} readOnly />
                        <TextField label="Modalidad de pago" value={normalizePayrollType(newEmployee.payroll_type)} onChange={e => updateField("payroll_type", e.target.value)} options={PAYROLL_OPTIONS} readOnly />
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
                              <p className="text-[10px] text-slate-400">{formatDate(h.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : !selectedCompanyFilter ? (
              <div>
                <div className="mb-6 inline-block rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                  <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>Directorio de Colaboradores</h1>
                  <p className="text-sm" style={{ color: C.inkSoft }}>Selecciona una empresa para ver a sus colaboradores.</p>
                </div>

                {companiesLoading ? <Spinner label="Cargando empresas…" /> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companies.map((c) => {
                      const count = employees.filter(e => isSameCompany(e, c.id)).length;
                      return (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedEmployeeDepartment(null); setSelectedCompanyFilter(c); }}
                          className="text-left rounded-2xl p-5 bg-white border cursor-pointer hover:shadow-md transition-shadow"
                          style={{ borderColor: C.line }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.primarySoft }}>
                              <Building2 size={18} style={{ color: C.primary }} />
                            </div>
                            <h2 className="text-sm font-bold" style={{ color: C.ink }}>{c.legal_name || c.name}</h2>
                          </div>
                          <p className="text-xs" style={{ color: C.inkSoft }}>
                            {count} {count === 1 ? "colaborador" : "colaboradores"}
                          </p>
                        </button>
                      );
                    })}

                    {companies.length === 0 && (
                      <div className="col-span-full rounded-2xl p-8 text-center bg-white border" style={{ borderColor: C.line }}>
                        <p className="text-sm" style={{ color: C.inkSoft }}>
                          No hay empresas registradas todavía. Ve a la sección "Empresas" para crear una.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : selectedEmployee ? (
              <EmployeeDetail
                employee={selectedEmployee}
                onBack={() => setSelectedEmployeeId(null)}
                onEdit={() => openNewEmployeeForm(selectedEmployee)}
                templates={templates}
                onTemplatesChange={setTemplates}
                documents={employeeDocuments}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={setSelectedTemplateId}
                onGenerate={generateDocument}
                generating={generatingDoc}
                isMultiForm={
                  (templates.find((t) => t.id === selectedTemplateId)?.template_type_id || selectedTemplateId) === "formato_multiple"
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
            ) : (
              <div>
                <button
                  onClick={() => { setSelectedCompanyFilter(null); setSelectedEmployeeDepartment(null); }}
                  className="mb-3 inline-flex items-center gap-1 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-sm cursor-pointer"
                  style={{ color: C.inkSoft }}
                >
                  <ArrowLeft size={14} /> Volver a empresas
                </button>

                <div className="flex items-center justify-between mb-6">
                  <div className="rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                    <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>
                      {selectedCompanyFilter.legal_name || selectedCompanyFilter.name}
                    </h1>
                    <p className="text-sm" style={{ color: C.inkSoft }}>{selectedEmployeeDepartment ? `Colaboradores del departamento ${selectedEmployeeDepartment}.` : "Selecciona un departamento para ver a sus colaboradores."}</p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openNewEmployeeForm()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-white" style={{ background: C.primary }}>
                      <Plus size={16} /> Nuevo empleado
                    </button>
                    <label className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold border bg-white cursor-pointer hover:bg-slate-50 transition-colors shadow-sm" style={{ borderColor: C.line, color: C.ink }}>
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
                            alert(res.message || "Importación completada");
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

                <div className="mb-5 inline-flex w-fit items-center gap-1 rounded-xl border border-white/80 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
                  <button
                    onClick={() => setEmployeeStatusTab("activo")}
                    className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer transition-colors"
                    style={{ background: employeeStatusTab === "activo" ? C.primarySoft : "transparent", color: employeeStatusTab === "activo" ? C.primary : C.inkSoft }}
                  >
                    Activos ({employees.filter(e => isSameCompany(e, selectedCompanyFilter?.id) && (e.employment_status || "activo") === "activo").length})
                  </button>
                  <button
                    onClick={() => setEmployeeStatusTab("baja")}
                    className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer transition-colors"
                    style={{ background: employeeStatusTab === "baja" ? C.primarySoft : "transparent", color: employeeStatusTab === "baja" ? C.primary : C.inkSoft }}
                  >
                    Bajas ({employees.filter(e => isSameCompany(e, selectedCompanyFilter?.id) && e.employment_status === "baja").length})
                  </button>
                  <button
                    onClick={() => setEmployeeStatusTab("todos")}
                    className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer transition-colors"
                    style={{ background: employeeStatusTab === "todos" ? C.primarySoft : "transparent", color: employeeStatusTab === "todos" ? C.primary : C.inkSoft }}
                  >
                    Todos ({employees.filter(e => isSameCompany(e, selectedCompanyFilter?.id)).length})
                  </button>
                </div>

                {selectedEmployeeDepartment && (
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeDepartment(null)}
                    className="mb-4 inline-flex items-center gap-1 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur-sm cursor-pointer"
                    style={{ color: C.primary }}
                  >
                    <ArrowLeft size={14} /> Volver a departamentos
                  </button>
                )}

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
                        onClick={() => { setExportMode("altas"); setShowAddExportAltasModal(true); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap cursor-pointer"
                        style={{ background: C.primary }}
                      >
                        <FileSpreadsheet size={16} /> Exportar Formato Altas (Excel)
                      </button>

                      <button
                        onClick={() => {
                          const initialCompany = selectedCompanyFilter || companies[0] || null;
                          const firstTemplate = initialCompany?.templates?.[0];
                          setBatchMode("generate");
                          setBatchCompanyId(initialCompany?.id || "");
                          setBatchDepartment("all");
                          setBatchEmployeeStatus("activo");
                          if (firstTemplate) {
                            setBatchDocType(firstTemplate.document_type);
                            setBatchSubType(firstTemplate.sub_type || "General");
                          }
                          setShowBatchModal(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap cursor-pointer transition-all hover:opacity-90"
                        style={{ background: C.ok }}
                      >
                        <FolderDown size={16} /> Generación Masiva de Formatos (ZIP)
                      </button>
                    </div>
                  )}

                  {employeeStatusTab === "baja" && (
                    <button
                      onClick={() => { setExportMode("bajas"); setShowAddExportAltasModal(true); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap cursor-pointer"
                      style={{ background: C.ok }}
                    >
                      <FileSpreadsheet size={16} /> Exportar Bajas (Excel)
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <select value={listGenderFilter} onChange={e => setListGenderFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs border outline-none bg-white" style={{ borderColor: C.line }}>
                    <option value="">Género: Todos</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                  <select value={listScheduleFilter} onChange={e => setListScheduleFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs border outline-none bg-white" style={{ borderColor: C.line }}>
                    <option value="">Horario: Todos</option>
                    {[...new Set(employees.map(e => e.work_schedule).filter(Boolean))].map(sch => (
                      <option key={sch} value={sch}>{sch}</option>
                    ))}
                  </select>
                  <input type="number" min="0" placeholder="Edad mín." value={listMinAge} onChange={e => setListMinAge(e.target.value)} className="w-24 px-3 py-2 rounded-lg text-xs border outline-none bg-white" style={{ borderColor: C.line }} />
                  <input type="number" min="0" placeholder="Edad máx." value={listMaxAge} onChange={e => setListMaxAge(e.target.value)} className="w-24 px-3 py-2 rounded-lg text-xs border outline-none bg-white" style={{ borderColor: C.line }} />
                  {(listGenderFilter || listScheduleFilter || listMinAge || listMaxAge) && (
                    <button
                      onClick={() => { setListGenderFilter(""); setListScheduleFilter(""); setListMinAge(""); setListMaxAge(""); }}
                      className="text-xs underline cursor-pointer"
                      style={{ color: C.inkSoft }}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                {employeesLoading && <Spinner label="Cargando empleados desde servidor…" />}
                {employeesError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs space-y-1 my-4">
                    <p className="font-bold">Aviso de conexión:</p>
                    <p>{employeesError}</p>
                  </div>
                )}

                {!employeesLoading && !employeesError && (() => {
                  const companyEmployees = filteredEmployees.filter(e => {
                    if (!isSameCompany(e, selectedCompanyFilter?.id)) return false;
                    if (listGenderFilter && e.gender !== listGenderFilter) return false;
                    if (listScheduleFilter && e.work_schedule !== listScheduleFilter) return false;
                    if (listMinAge || listMaxAge) {
                      const age = getAge(e.birth_date);
                      if (age === null) return false;
                      if (listMinAge && age < Number(listMinAge)) return false;
                      if (listMaxAge && age > Number(listMaxAge)) return false;
                    }
                    return true;
                  });

                  const configuredDepartments = (selectedCompanyFilter.departments || [])
                    .map(department => typeof department === "string" ? department : department?.name)
                    .map(department => String(department || "").trim().replace(/\s+/g, " "))
                    .filter(Boolean);
                  const departmentLabels = {};
                  configuredDepartments.forEach(department => {
                    const key = normalizeDepartmentKey(department);
                    if (key && !departmentLabels[key]) departmentLabels[key] = department;
                  });
                  const groupedByDepartment = companyEmployees.reduce((acc, emp) => {
                    const rawDepartment = (emp && emp.department) ? String(emp.department).trim().replace(/\s+/g, " ") : "Sin Departamento Asignado";
                    const key = normalizeDepartmentKey(rawDepartment);
                    if (!departmentLabels[key]) departmentLabels[key] = rawDepartment;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(emp);
                    return acc;
                  }, {});
                  const departmentEntries = Object.entries(departmentLabels)
                    .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB, "es-MX"));

                  if (!selectedEmployeeDepartment) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {departmentEntries.map(([deptKey, deptName]) => {
                          const count = groupedByDepartment[deptKey]?.length || 0;
                          return (
                            <button
                              key={deptName}
                              type="button"
                              onClick={() => setSelectedEmployeeDepartment(deptName)}
                              className="flex items-center justify-between rounded-2xl border bg-white p-5 text-left shadow-2xs transition hover:shadow-md"
                              style={{ borderColor: C.line }}
                            >
                              <span className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: C.primarySoft }}>
                                  <Users size={18} style={{ color: C.primary }} />
                                </span>
                                <span>
                                  <span className="block text-sm font-bold" style={{ color: C.ink }}>{deptName}</span>
                                  <span className="mt-1 block text-xs" style={{ color: C.inkSoft }}>{count} {count === 1 ? "colaborador" : "colaboradores"}</span>
                                </span>
                              </span>
                              <ChevronRight size={18} style={{ color: C.inkSoft }} />
                            </button>
                          );
                        })}
                        {departmentEntries.length === 0 && (
                          <div className="col-span-full rounded-2xl border bg-white p-8 text-center" style={{ borderColor: C.line }}>
                            <p className="text-sm" style={{ color: C.inkSoft }}>Esta empresa aún no tiene departamentos ni colaboradores registrados.</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const selectedDepartmentKey = normalizeDepartmentKey(selectedEmployeeDepartment);
                  const departmentEmployees = groupedByDepartment[selectedDepartmentKey] || [];

                  return (
                    <div className="space-y-6">
                      {departmentEmployees.length === 0 ? (
                        <div className="rounded-2xl border bg-white p-8 text-center" style={{ borderColor: C.line }}>
                          <p className="text-sm" style={{ color: C.inkSoft }}>No hay colaboradores en este departamento para el filtro seleccionado.</p>
                        </div>
                      ) : (
                        <div 
                          key={selectedEmployeeDepartment}
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
                                {selectedEmployeeDepartment}
                              </h2>
                            </div>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                              {departmentEmployees.length} {departmentEmployees.length === 1 ? "colaborador" : "colaboradores"}
                            </span>
                          </div>

                          <div className="divide-y" style={{ borderColor: C.line }}>
                            {departmentEmployees.map((e, idx) => (
                              <div
                                key={e.id || `emp-${idx}`}
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
                                      initials(`${e.first_name || ''} ${e.last_name || ''}`)
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold" style={{ color: C.ink }}>
                                      {e.first_name} {e.last_name || e.last_name_paternal || ''}
                                    </p>
                                    <p className="text-xs" style={{ color: C.inkSoft }}>
                                      {e.position || "Puesto no asignado"} {e.personal_email ? `· ${e.personal_email}` : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <Badge tone={e.employment_status === "activo" ? "ok" : e.employment_status === "baja" ? "danger" : "pending"}>
                                    {e.employment_status || "activo"}
                                  </Badge>

                                  {hasFullMenuAccess && (
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
                      )}
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
              <h2 className="text-lg font-bold" style={{ color: C.ink }}>
                {exportMode === "bajas" ? "Exportar Bajas (Excel)" : "Exportar Formato de Altas (Excel)"}
              </h2>
              <p className="text-xs text-slate-500">Selecciona los filtros para generar el documento.</p>
              
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
                      {employees.filter(e => e.employment_status === (exportMode === "bajas" ? "baja" : "activo")).map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t space-y-2" style={{ borderColor: C.line }}>
                <p className="text-[11px] font-semibold uppercase" style={{ color: C.inkSoft }}>Filtros adicionales (opcional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={exportGender} onChange={e => setExportGender(e.target.value)} className="px-3 py-2 rounded-lg text-xs border outline-none bg-white">
                    <option value="">Género: Todos</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                  <select value={exportSchedule} onChange={e => setExportSchedule(e.target.value)} className="px-3 py-2 rounded-lg text-xs border outline-none bg-white">
                    <option value="">Horario: Todos</option>
                    {[...new Set(employees.map(e => e.work_schedule).filter(Boolean))].map(sch => (
                      <option key={sch} value={sch}>{sch}</option>
                    ))}
                  </select>
                  <input
                    type="number" min="0" placeholder="Edad mínima"
                    value={exportMinAge} onChange={e => setExportMinAge(e.target.value)}
                    className="px-3 py-2 rounded-lg text-xs border outline-none bg-white"
                  />
                  <input
                    type="number" min="0" placeholder="Edad máxima"
                    value={exportMaxAge} onChange={e => setExportMaxAge(e.target.value)}
                    className="px-3 py-2 rounded-lg text-xs border outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: C.line }}>
                <button onClick={() => setShowAddExportAltasModal(false)} className="px-4 py-2 rounded-lg text-xs font-medium border cursor-pointer" style={{ borderColor: C.line, color: C.inkSoft }}>
                  Cancelar
                </button>
                <button onClick={exportMode === "bajas" ? exportBajasToExcel : processExportAltasExcel} className="px-4 py-2 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer" style={{ background: C.primary }}>
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
                {batchMode === "generate"
                  ? "Genera en lote los formatos que ya tienen una plantilla cargada para la empresa seleccionada."
                  : "Descarga en lote los archivos existentes en los expedientes de la empresa, organizados por colaborador."}
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold block mb-1 text-slate-700">1. Empresa / Razón Social *</label>
                  <select
                    value={batchCompanyId}
                    onChange={(e) => {
                      const nextCompanyId = e.target.value;
                      const nextCompany = companies.find(company => String(company.id) === String(nextCompanyId));
                      const firstTemplate = nextCompany?.templates?.[0];
                      setBatchCompanyId(nextCompanyId);
                      setBatchDepartment("all");
                      if (batchMode === "generate") {
                        setBatchDocType(firstTemplate?.document_type || COMPANY_TEMPLATE_DOCUMENT_TYPES[0]);
                        setBatchSubType(firstTemplate?.sub_type || "General");
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                    style={{ borderColor: C.line }}
                  >
                    <option value="">Selecciona una Empresa...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.legal_name || c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700">2. Acción *</label>
                  <select value={batchMode} onChange={(e) => {
                    const nextMode = e.target.value;
                    setBatchMode(nextMode);
                    if (nextMode === "files") setBatchDocType("Expediente Completo");
                    else {
                      const firstType = batchTemplateTypes[0] || "Contratos";
                      setBatchDocType(firstType);
                      const firstSubtype = batchAvailableTemplates.find(template => template.document_type === firstType)?.sub_type || "General";
                      setBatchSubType(firstSubtype);
                    }
                  }} className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]" style={{ borderColor: C.line }}>
                    <option value="generate">Generar formatos usando plantillas</option>
                    <option value="files">Descargar archivos del expediente</option>
                  </select>
                </div>

                <div className={batchMode === "generate" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">3. Tipo de Documento *</label>
                    <select
                      value={batchDocType}
                      onChange={(e) => {
                        setBatchDocType(e.target.value);
                        const firstSubtype = batchAvailableTemplates.find(template => template.document_type === e.target.value)?.sub_type || "General";
                        setBatchSubType(firstSubtype);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                      style={{ borderColor: C.line }}
                    >
                      {batchMode === "files"
                        ? BATCH_FILE_CATEGORIES.map(category => <option key={category} value={category}>{category === "Expediente Completo" ? "Todos los documentos del expediente" : category}</option>)
                        : batchTemplateTypeOptions.map(type => {
                          const hasTemplate = batchTemplateTypes.includes(type);
                          return <option key={type} value={type} disabled={!hasTemplate}>{hasTemplate ? type : `${type} (cargar plantilla)`}</option>;
                        })}
                    </select>
                    {batchMode === "generate" && <p className="mt-1 text-[10px] text-slate-500">Los formatos sin plantilla se habilitan al subir su archivo .docx en Empresas → Formatos. Los tipos personalizados también se agregan automáticamente.</p>}
                  </div>

                  {batchMode === "generate" && <div>
                    <label className="font-bold block mb-1 text-slate-700">4. Variante / Subtipo *</label>
                      <select
                        value={batchSubType}
                        onChange={(e) => setBatchSubType(e.target.value)}
                        disabled={!batchSubtypes.length}
                        className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                        style={{ borderColor: C.line }}
                      >
                        {batchSubtypes.length
                          ? batchSubtypes.map(subtype => <option key={subtype} value={subtype}>{subtype}</option>)
                          : <option value="">Sin variantes cargadas</option>}
                      </select>
                    </div>}
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700">{batchMode === "generate" ? "5." : "4."} Departamento (Opcional)</label>
                  <select
                    value={batchDepartment}
                    onChange={(e) => setBatchDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]"
                    style={{ borderColor: C.line }}
                  >
                    <option value="all">Todos los Departamentos de la Empresa</option>
                    {batchCompanyDepartments.map(department => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                  {!batchCompanyDepartments.length && batchCompanyId && <p className="mt-1 text-[10px] text-amber-700">La empresa no tiene departamentos registrados. El filtro mostrará todos sus colaboradores.</p>}
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700">Estatus de colaboradores</label>
                  <select value={batchEmployeeStatus} onChange={(e) => setBatchEmployeeStatus(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 outline-none focus:border-[#1B4B43]" style={{ borderColor: C.line }}>
                    <option value="activo">Activos</option>
                    <option value="baja">Bajas</option>
                    <option value="todos">Todos</option>
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
                  disabled={batchGenerating || !batchCompanyId || (batchMode === "generate" && (!batchTemplateTypes.includes(batchDocType) || !batchSubtypes.length))}
                  onClick={async () => {
                    const compId = batchCompanyId;
                    if (!compId) {
                      alert("Selecciona una empresa para realizar la generación masiva.");
                      return;
                    }

                    setBatchGenerating(true);
                    try {
                      alert("⏳ Procesando y empaquetando todos los documentos en formato ZIP...");

                      const response = await fetch(`${API_BASE}/companies/${compId}/fill-template-batch`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          mode: batchMode === "files" ? "files" : "generate",
                          document_type: batchDocType,
                          sub_type: batchSubType,
                          department: batchDepartment,
                          employment_status: batchEmployeeStatus,
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
            isAdmin={hasFullMenuAccess}
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

        {view === "users" && canManageUsers && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink }}>Usuarios</h1>
              <p className="text-sm" style={{ color: C.inkSoft }}>Cuentas de acceso al sistema ({filteredUsers.length} de {users.length})</p>
              </div>
              <button onClick={() => { setShowAddUser(v => !v); setLastCreatedPassword(""); setUserSaveError(""); setUserSaveNotice(""); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer" style={{ background: C.primary, color: "#fff" }}>
                <Plus size={16} /> Nueva cuenta
              </button>
            </div>

            <div className="relative mb-4 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.inkSoft }} />
              <input
                type="search"
                value={usersSearch}
                onChange={event => setUsersSearch(event.target.value)}
                placeholder="Buscar por correo, rol o estatus..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none border bg-white"
                style={{ borderColor: C.line, color: C.ink }}
              />
            </div>

            {showAddUser && (
              <form onSubmit={submitNewUser} className="rounded-2xl p-5 mb-6 bg-white border" style={{ borderColor: C.line }}>
                <p className="text-xs mb-4" style={{ color: C.inkSoft }}>
                  Registra el nombre, área y puesto para que el directorio de mensajería muestre correctamente a cada usuario. Usa el mismo correo del expediente cuando exista. Crear la cuenta no envía correo.
                </p>
                <div className="grid grid-cols-3 gap-4 items-end">
                  <TextField label="Nombre completo" required value={newUser.display_name} onChange={e => setNewUser(f => ({ ...f, display_name: e.target.value }))} placeholder="Nombre y apellidos" />
                  <TextField label="Departamento" required value={newUser.department} onChange={e => setNewUser(f => ({ ...f, department: e.target.value }))} placeholder="Recursos Humanos" />
                  <TextField label="Puesto" required value={newUser.position} onChange={e => setNewUser(f => ({ ...f, position: e.target.value }))} placeholder="Reclutador" />
                  <TextField label="Correo" type="email" required value={newUser.email} onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))} placeholder="empleado@empresa.com" />
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft }}>Contraseña temporal *</label>
                    <div className="flex gap-2">
                      <input type="password" minLength={8} required value={newUser.password} onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: C.line }} />
                      <button type="button" onClick={generatePassword} className="px-3 rounded-lg text-xs shrink-0 cursor-pointer" style={{ background: C.primarySoft, color: C.primary }}>Generar</button>
                    </div>
                  </div>
                  <TextField label="Rol" value={newUser.role} onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))} options={["admin", "reclutamiento", "empleado"]} />
                </div>
                {userSaveError && <p className="text-xs mt-3" style={{ color: C.danger }}>{userSaveError}</p>}
                <div className="flex justify-end mt-4">
                  <button type="submit" disabled={userSaving} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer disabled:opacity-60" style={{ background: C.primary, color: "#fff" }}>
                    {userSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear cuenta
                  </button>
                </div>
              </form>
            )}

            {(userSaveNotice || lastCreatedPassword) && (
              <div className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4" style={{ background: lastCreatedPassword ? C.accentSoft : C.okSoft }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: lastCreatedPassword ? C.accent : C.ok }}>{userSaveNotice || "Acceso listo."}</p>
                  {lastCreatedPassword && <p className="mt-2 text-xs" style={{ color: C.inkSoft }}>Como el correo no se pudo enviar, comparte manualmente esta contraseña temporal:</p>}
                  {lastCreatedPassword && <p className="text-lg font-mono font-semibold" style={{ color: C.accent }}>{lastCreatedPassword}</p>}
                </div>
                {lastCreatedPassword && <button onClick={() => navigator.clipboard.writeText(lastCreatedPassword)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ background: "#fff", color: C.accent }}>
                  <Copy size={13} /> Copiar
                </button>}
              </div>
            )}

            {usersLoading && <Spinner label="Cargando usuarios…" />}

            {!usersLoading && (
              <div className="rounded-2xl overflow-hidden bg-white border" style={{ borderColor: C.line }}>
                {filteredUsers.map((u, i) => {
                  const isSelf = u.id === user.id;
                  return (
                    <div key={u.id} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.line}` : "none" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: C.primarySoft, color: C.primary }}>{initials(u.email)}</div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: C.ink }}>{u.display_name || u.email}{isSelf && <span className="font-normal" style={{ color: C.inkSoft }}> (tú)</span>}</p>
                          <p className="text-xs" style={{ color: C.inkSoft }}>{u.email}{u.department ? ` · ${u.department}` : ""}{u.position ? ` · ${u.position}` : ""}</p>
                          <p className="text-xs" style={{ color: C.inkSoft }}>
                            Creada el {formatDate(u.created_at)}{u.must_change_password ? " · Cambio de contraseña pendiente" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => editUserChatProfile(u)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" style={{ color: C.primary }} title="Editar nombre, departamento y puesto del chat">
                          <Pencil size={15} />
                        </button>
                        <select
                          value={normalizeManagedUserRole(u.role)}
                          disabled={isSelf || savingUserRoleId === String(u.id)}
                          title={isSelf ? "Por seguridad, el rol de tu propia cuenta no se puede cambiar desde aquí." : "Cambiar rol de usuario"}
                          onChange={e => changeUserRole(u.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg text-xs outline-none border bg-white cursor-pointer"
                          style={{ borderColor: C.line, color: C.ink, opacity: isSelf ? 0.6 : 1, cursor: isSelf || savingUserRoleId === String(u.id) ? "not-allowed" : "pointer" }}
                        >
                          <option value="empleado">empleado</option>
                          <option value="admin">admin</option>
                          <option value="reclutamiento">reclutamiento</option>
                        </select>
                        {isSelf && <span className="text-[10px] whitespace-nowrap" style={{ color: C.inkSoft }}>Tu rol está protegido</span>}
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

                        {!isSelf && <button
                          type="button"
                          disabled={sendingAccessUserId === u.id}
                          onClick={() => sendUserAccessEmail(u)}
                          className="px-2 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
                          style={{ color: C.ok }}
                          title="Enviar accesos por correo (requiere aprobación)"
                        >
                          {sendingAccessUserId === u.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />} Enviar accesos
                        </button>}

                        {!isSelf && (
                          <button onClick={() => deleteUser(u)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer" style={{ color: C.danger }}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && <p className="px-5 py-8 text-center text-sm" style={{ color: C.inkSoft }}>
                  {users.length ? "No hay usuarios que coincidan con la búsqueda." : "No hay cuentas registradas."}
                </p>}
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

      {token && user && (
        <FloatingChatWidget
          token={token}
          user={user}
          api={api}
          unreadCount={unreadCount}
          unreadBySender={unreadBySender}
          notification={incomingChatNotification}
          onNotificationOpen={() => {
            if (!incomingChatNotification) return;
            setOpenChatContact({
              id: String(incomingChatNotification.sender_id),
              email: incomingChatNotification.sender_email,
              first_name: incomingChatNotification.first_name,
              last_name: incomingChatNotification.last_name,
              position: incomingChatNotification.position,
              department: incomingChatNotification.department,
              photo_url: incomingChatNotification.photo_url,
            });
            setIncomingChatNotification(null);
          }}
          onNotificationDismiss={() => setIncomingChatNotification(null)}
          onRefreshUnread={updateUnreadMessages}
          openContact={openChatContact}
          onOpenContactConsumed={() => setOpenChatContact(null)}
          hidden={view === "messages"}
        />
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
    fetch(`${API_BASE}/leaves/department-calendar`, {
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
      const start = formatDate(item.start_date);
      const end = formatDate(item.end_date);
      return formattedDate >= start && formattedDate <= end;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
        <div className="rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
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
                        {formatDate(r.start_date)} → {formatDate(r.end_date)} · {r.days_requested || 1} día(s)
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
  const [failedProfilePhoto, setFailedProfilePhoto] = useState("");

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
          {cleanPhoto && failedProfilePhoto !== cleanPhoto ? (
            <img src={cleanPhoto} alt="" className="w-full h-full object-cover" onError={() => setFailedProfilePhoto(cleanPhoto)} />
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
        <div><p className="text-xs" style={{ color: C.inkSoft }}>Fecha de Alta</p><p className="font-medium" style={{ color: C.ink }}>{formatDate(profile.hire_date)}</p></div>
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
  employee, onBack, onEdit, templates = [], documents = [], selectedTemplateId, onSelectTemplate,
  isMultiForm, multiFormOptions = [], checkedOptions = [], onToggleOption, observaciones, onObservacionesChange, fechaSolicitud,
  onFechaSolicitudChange, childName, onChildNameChange, incidentDate, onIncidentDateChange, incidentTime, onIncidentTimeChange,
  incidentLocation, onIncidentLocationChange, witness1, onWitness1Change, witness2, onWitness2Change, photoUploading, onPhotoChange,
  employeeFiles = [], onUploadFile, onDeleteFile, fileUploading, token, api, loadEmployeeDocuments, loadEmployeeFiles, onSelectBatchPdf, onTemplatesChange
}) {
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
  const [showFullActivities, setShowFullActivities] = useState(false);
  const [failedEmployeePhoto, setFailedEmployeePhoto] = useState("");
  const [companyTemplatePreview, setCompanyTemplatePreview] = useState(null);
  const [companyTemplateChoice, setCompanyTemplateChoice] = useState(null);
  const [companyTemplatePreviewLoading, setCompanyTemplatePreviewLoading] = useState(false);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState("");
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [documentPreviewError, setDocumentPreviewError] = useState("");
  const [documentPreviewDirty, setDocumentPreviewDirty] = useState(false);
  const [documentEditorReady, setDocumentEditorReady] = useState(false);
  const [documentSaving, setDocumentSaving] = useState(false);
  const inlineWordEditorRef = useRef(null);
  useEffect(() => {
    setShowFullActivities(false);
    setFailedEmployeePhoto("");
  }, [employee?.id]);
  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId);
  const markPreviewEdited = useCallback(() => setDocumentPreviewDirty(true), []);
  useEffect(() => () => {
    if (documentPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(documentPreviewUrl);
  }, [documentPreviewUrl]);

  const renderDocumentPreview = async () => {
    setDocumentPreviewLoading(true);
    setDocumentPreviewError("");
    try {
      const result = await api.previewDocument(token, employee.id, selectedTemplate?.template_type_id || selectedTemplateId, {
        template_record_id: selectedTemplate?.id,
        title_override: selectedTemplate?.title,
        body_override: selectedTemplate?.content,
        footer_override: selectedTemplate?.footer,
        include_logo: selectedTemplate?.include_logo,
        child_name: childName,
        incident_date: incidentDate,
        incident_time: incidentTime,
        incident_location: incidentLocation,
        observaciones,
        witness1,
        witness2,
        checked_options: checkedOptions,
        fecha_solicitud: fechaSolicitud,
      });
      const baseUrl = API_BASE.replace(/\/api$/, "");
      const previewResponse = await fetch(result.file_url.startsWith("http") ? result.file_url : `${baseUrl}${result.file_url}`);
      if (!previewResponse.ok) throw new Error("No se pudo cargar el Word de vista previa. Vuelve a abrirlo desde el expediente.");
      const previewBlob = await previewResponse.blob();
      if (!previewBlob.size || (previewBlob.type && previewBlob.type.includes("pdf"))) {
        throw new Error("El servidor no devolvió un documento Word válido para la vista previa.");
      }
      setDocumentPreviewUrl(URL.createObjectURL(previewBlob));
      setDocumentPreviewDirty(false);
      setIsDocumentPreviewOpen(true);
    } catch (error) {
      setDocumentPreviewError(error.message || "No se pudo preparar la vista previa.");
    } finally {
      setDocumentPreviewLoading(false);
    }
  };

  const openDocumentPreview = () => {
    setDocumentPreviewError("");
    setDocumentPreviewDirty(false);
    setDocumentEditorReady(false);
    renderDocumentPreview();
  };

  const closeDocumentPreview = () => {
    setIsDocumentPreviewOpen(false);
    setDocumentPreviewUrl("");
    setDocumentPreviewDirty(false);
    setDocumentEditorReady(false);
  };

  const saveInlineEditedDocument = async () => {
    if (!inlineWordEditorRef.current || !selectedTemplate) return;
    setDocumentSaving(true);
    setDocumentPreviewError("");
    try {
      const editedText = inlineWordEditorRef.current.getEditedText();
      const safeName = (selectedTemplate.name || "Documento").replace(/[^\p{L}\p{N}_-]+/gu, "_");
      const result = await api.saveEditedDocumentWord(token, {
        employee_id: employee.id,
        template_id: selectedTemplate.template_type_id || selectedTemplateId,
        template_record_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        edited_text: editedText,
      });
      const baseUrl = API_BASE.replace(/\/api$/, "");
      const response = await fetch(result.file_url.startsWith("http") ? result.file_url : `${baseUrl}${result.file_url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("El documento se guardó, pero no se pudo preparar la descarga Word.");
      const editedWord = await response.blob();
      const downloadUrl = URL.createObjectURL(editedWord);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = result.filename || `${safeName}_${employee.id}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      await loadEmployeeDocuments(employee.id);
      closeDocumentPreview();
    } catch (error) {
      setDocumentPreviewError(error.message || "No se pudo guardar el documento editado.");
    } finally {
      setDocumentSaving(false);
    }
  };

  const REQUIRED_DOCUMENTS = [
    "CV / Solicitud de Empleo",
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
    "ADDENDUM",
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
    "ADDENDUM",
    "Convenio de Confidencialidad",
    "Aviso de Privacidad",
    "Formatos Varios"
  ];

  async function generateCompanyTemplatePreview(docType, targetCategory, selectedSubType) {
    setCompanyTemplatePreviewLoading(true);
    try {
      const response = await fetch(`${API_BASE}/companies/${employee.company_id}/preview-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ document_type: targetCategory, sub_type: selectedSubType, employee_id: employee.id })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Error al generar el documento.");
      }
      const previewBlob = await response.blob();
      const encodedFilename = response.headers.get("X-Document-Filename") || `${docType}_${employee.first_name}.docx`;
      let previewFilename = encodedFilename;
      try { previewFilename = decodeURIComponent(encodedFilename); } catch { /* usar el valor enviado */ }
      setCompanyTemplatePreview({ blob: previewBlob, filename: previewFilename, title: `${docType}${selectedSubType ? ` · ${selectedSubType}` : ""}` });
      setCompanyTemplateChoice(null);
    } catch (error) {
      alert("No se pudo preparar el documento: " + (error.message || "Error inesperado."));
    } finally {
      setCompanyTemplatePreviewLoading(false);
    }
  }

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
        nombre_completo: `${employee.first_name || ""} ${employee.last_name_paternal || employee.last_name || ""} ${employee.last_name_maternal || ""}`.trim().toLocaleUpperCase("es-MX"),
        nombre: String(employee.first_name || "").toLocaleUpperCase("es-MX"),
        apellido_paterno: String(employee.last_name_paternal || employee.last_name || "").toLocaleUpperCase("es-MX"),
        apellido_materno: String(employee.last_name_maternal || "").toLocaleUpperCase("es-MX"),
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
        fecha_alta_escrita: formatDateInSpanishWords(employee.hire_date),
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

      const response = await fetch(`${API_BASE}/employees/${employee.id}/fill-custom-template`, {
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
          : `${API_BASE.replace(/\/api$/, "")}${res.file_url.startsWith("/") ? "" : "/"}${res.file_url}`;
        
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
      const res = await fetch(`${API_BASE}/employees/${employee.id}/files/${fileId}/move`, {
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
  const activitiesText = employee.job_activities || "Sin definir";
  const canExpandActivities = activitiesText.length > 280;
  const safeFiles = Array.isArray(employeeFiles) ? employeeFiles : [];
  const safeDocs = Array.isArray(documents) ? documents : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={onBack} className="mb-2 inline-flex items-center gap-1 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-sm cursor-pointer" style={{ color: C.inkSoft }}>
        <ArrowLeft size={14} /> Volver a empleados
      </button>

      <div className="rounded-2xl p-6 flex items-center justify-between bg-[#0F172A] text-white border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-slate-700 bg-slate-800">
            {cleanPhoto && failedEmployeePhoto !== cleanPhoto ? (
              <img src={cleanPhoto} alt={`Foto de ${employee.first_name || "colaborador"}`} className="w-full h-full object-cover" onError={() => setFailedEmployeePhoto(cleanPhoto)} />
            ) : (
              <span className="text-lg font-bold text-emerald-400">{initials(`${employee.first_name} ${employee.last_name}`)}</span>
            )}
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              {photoUploading ? <Loader2 size={16} color="#fff" className="animate-spin" /> : <Camera size={16} color="#fff" />}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={photoUploading} onChange={e => {
                const file = e.target.files?.[0];
                if (file && onPhotoChange) onPhotoChange(file);
                e.target.value = "";
              }} />
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
          <div className="text-xs">
            <strong>Actividades del Puesto:</strong>
            <div
              className="mt-1 whitespace-pre-wrap break-words"
              style={canExpandActivities && !showFullActivities ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 5,
                overflow: "hidden",
              } : { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {activitiesText}
            </div>
            {canExpandActivities && (
              <button
                type="button"
                aria-expanded={showFullActivities}
                onClick={() => setShowFullActivities(value => !value)}
                className="mt-1 text-xs font-semibold cursor-pointer"
                style={{ color: C.primary }}
              >
                {showFullActivities ? "Ver menos" : "Ver más"}
              </button>
            )}
          </div>
          <p className="text-xs"><strong>CURP:</strong> {employee.curp || "—"}</p>
          <p className="text-xs"><strong>RFC:</strong> {employee.rfc || "—"}</p>
          <p className="text-xs"><strong>NSS:</strong> {employee.nss || "—"}</p>
          <p className="text-xs"><strong>Domicilio Personal:</strong> {personalAddress}</p>
          <p className="text-xs"><strong>Domicilio Fiscal (CSF):</strong> {fiscalAddress}</p>
          <p className="text-xs"><strong>Salario Base:</strong> ${Number(employee.base_salary || 0).toLocaleString()} MXN</p>
          <p className="text-xs"><strong>Contacto Emergencia:</strong> {employee.emergency_contact_name ? `${employee.emergency_contact_name} (${employee.emergency_contact_phone || "Sin tel."})` : "—"}</p>
          <p className="text-xs"><strong>Beneficiario:</strong> {employee.beneficiary_name ? `${employee.beneficiary_name} ${employee.beneficiary_relationship ? `(${employee.beneficiary_relationship})` : ''} ${employee.beneficiary_phone ? `· ${employee.beneficiary_phone}` : ''}` : "—"}</p>
          <p className="text-xs"><strong>Alta:</strong> {formatDate(employee.hire_date)}</p>
        </div>

        <div className="rounded-2xl p-5 space-y-4 bg-white border" style={{ borderColor: C.line }}>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.inkSoft }}>Expediente Digital</h2>
            
            {safeFiles.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch(`${API_BASE}/employees/${employee.id}/download-all`, {
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
                            if (companyTemplatePreviewLoading) return;
                            setCompanyTemplatePreviewLoading(true);
                            try {
                              const tmplRes = await fetch(`${API_BASE}/companies/${employee.company_id}/templates`, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (!tmplRes.ok) {
                                const errorData = await tmplRes.json().catch(() => ({}));
                                throw new Error(errorData.message || `No se pudieron consultar las plantillas (HTTP ${tmplRes.status}).`);
                              }
                              const compTemplates = await tmplRes.json();

                              const targetCategory = docType.includes("Contrato") ? "Contratos" : docType;
                              const available = (Array.isArray(compTemplates) ? compTemplates : []).filter(t => companyDocumentTypeMatches(t.document_type, targetCategory));

                              if (available.length === 0) {
                                alert(`❌ No hay plantillas de '${docType}' configuradas para la empresa ${employee.company_name || ''}. Cárgalas desde el módulo de Empresas.`);
                                return;
                              }

                              if (available.length > 1) {
                                setCompanyTemplateChoice({
                                  documentType: docType,
                                  targetCategory,
                                  templates: available,
                                  selectedId: String(available[0].id),
                                });
                                return;
                              }
                              await generateCompanyTemplatePreview(docType, targetCategory, available[0].sub_type);
                            } catch (err) {
                              alert("❌ Error: " + err.message);
                            } finally {
                              setCompanyTemplatePreviewLoading(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all hover:opacity-90 disabled:opacity-60"
                          disabled={companyTemplatePreviewLoading}
                          style={{ background: C.primarySoft, color: C.primary, border: `1px solid ${C.line}` }}
                          title={`Generar ${docType} desde la plantilla de la empresa`}
                        >
                          {companyTemplatePreviewLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                          <span>{companyTemplatePreviewLoading ? "Preparando…" : "Vista previa"}</span>
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
                        const fileBaseUrl = API_BASE.replace(/\/api$/, "");
                        const fullFileUrl = fileTargetUrl.startsWith("http")
                          ? fileTargetUrl
                          : `${fileBaseUrl}${fileTargetUrl.startsWith("/") ? "" : "/"}${fileTargetUrl}`;

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
        <DocumentFormatsStudio
          token={token}
          employee={employee}
          templates={templates}
          onTemplatesChange={onTemplatesChange}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={onSelectTemplate}
          onRefreshDocuments={() => loadEmployeeDocuments(employee.id)}
        />
        <div className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: C.line }}>
          <h2 className="text-sm font-semibold" style={{ color: C.ink }}>Generar documento para {[employee.first_name, employee.last_name_paternal || employee.last_name, employee.last_name_maternal].filter(Boolean).join(" ")}</h2>
          <p className="mt-1 text-xs" style={{ color: C.inkSoft }}>Selecciona una carta o formato. Se llenará con los datos de este colaborador y su empresa; podrás revisarlo antes de descargarlo.</p>
        </div>
        
        <div className="p-4 rounded-xl border bg-slate-50 space-y-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[#1B4B43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Subir y Autorrellenar Formato Personalizado (Contrato / Convenio)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Sube una plantilla en formato Word (`.docx`) o HTML con etiquetas como <code>{"{nombre}"}</code>, <code>{"{puesto}"}</code>, <code>{"{actividades_puesto}"}</code>, <code>{"{curp}"}</code>, <code>{"{rfc}"}</code>, <code>{"{domicilio_empresa}"}</code>, <code>{"{salario_periodo}"}</code>, <code>{"{modalidad_pago}"}</code>, <code>{"{salario_semanal}"}</code>, <code>{"{salario_quincenal}"}</code>, <code>{"{salario_diario}"}</code>, <code>{"{salario_mensual}"}</code> o <code>{"{domicilio_personal}"}</code>. El importe de <code>{"{salario_periodo}"}</code> corresponde a la modalidad elegida para <strong>{employee.first_name} {employee.last_name}</strong>.
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
              options={templates.filter((template) => !template.is_custom)}
            />
          </div>
          <button
            disabled={!selectedTemplateId || generating || documentPreviewLoading}
            onClick={openDocumentPreview}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white flex items-center gap-2 transition-opacity cursor-pointer"
            style={{ background: C.primary, opacity: (!selectedTemplateId || generating) ? 0.5 : 1 }}
          >
            {documentPreviewLoading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
            {documentPreviewLoading ? "Preparando vista…" : "Revisar y generar"}
          </button>
        </div>
        {documentPreviewError && <p role="alert" className="text-xs text-red-700">{documentPreviewError}</p>}

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
                const docBaseUrl = API_BASE.replace(/\/api$/, "");
                const fullDocUrl = docTargetUrl.startsWith("http")
                  ? docTargetUrl
                  : `${docBaseUrl}${docTargetUrl.startsWith("/") ? "" : "/"}${docTargetUrl}`;
                const isWordDocument = /\.docx(?:$|\?)/i.test(docTargetUrl);

                return (
                  <div key={doc.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg border bg-white" style={{ borderColor: C.line }}>
                    <div>
                      <p className="font-medium" style={{ color: C.ink }}>{doc.template_name || "Documento generado"}</p>
                      <p className="text-[10px]" style={{ color: C.inkSoft }}>Emitido el {formatDate(doc.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={fullDocUrl}
                        download={`${doc.template_name || "Documento"}.${isWordDocument ? "docx" : "pdf"}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1"
                        style={{ background: C.primarySoft, color: C.primary }}
                      >
                        <Download size={13} /> {isWordDocument ? "Ver / Descargar Word" : "Ver / Descargar PDF"}
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
      {isDocumentPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6">
          <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div><h3 className="text-sm font-semibold text-slate-900">Editar documento Word · {selectedTemplate?.name || "Documento"}</h3><p className="text-[11px] text-slate-500">Haz clic en el texto de la hoja y edítalo directamente, como en Word.</p></div>
              <button onClick={closeDocumentPreview} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="relative min-h-0 flex-1 bg-slate-200 p-3 sm:p-5">
              {documentPreviewLoading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-200/80 text-sm font-medium text-slate-700">Preparando documento…</div>}
              {documentPreviewError && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{documentPreviewError}</div>}
              {documentPreviewUrl && <React.Suspense fallback={<div className="grid min-h-[55vh] place-items-center text-sm text-slate-600">Abriendo documento Word editable…</div>}><InlineWordEditor ref={inlineWordEditorRef} fileUrl={documentPreviewUrl} onEdit={markPreviewEdited} onReadyChange={setDocumentEditorReady} /></React.Suspense>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
              <p className="text-[11px] text-slate-500">{documentPreviewDirty ? "Los cambios se guardarán como un archivo Word editable." : "Haz clic en cualquier parte del texto para editarlo directamente en la hoja."}</p>
              <div className="flex gap-2"><button onClick={closeDocumentPreview} disabled={documentSaving} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Cancelar</button><button disabled={documentSaving || documentPreviewLoading || !documentEditorReady || !documentPreviewDirty} onClick={saveInlineEditedDocument} className="inline-flex items-center gap-2 rounded-lg bg-[#1B4B43] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><Download size={14} /> {documentSaving ? "Guardando…" : "Guardar y descargar Word"}</button></div>
            </div>
          </div>
        </div>
      )}
      {companyTemplateChoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCompanyTemplateChoice(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="company-template-choice-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="border-b border-slate-100 bg-gradient-to-r from-[#F3F7F5] to-white px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5B6B6E]">Generación de documentos</p>
              <h2 id="company-template-choice-title" className="mt-1 text-lg font-bold text-[#1B2A2E]">Selecciona el formato</h2>
              <p className="mt-1 text-xs text-slate-500">{companyTemplateChoice.documentType} para {employee.first_name} {employee.last_name_paternal || employee.last_name}</p>
            </header>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto p-5">
              {companyTemplateChoice.templates.map((template, index) => {
                const id = String(template.id);
                const selected = companyTemplateChoice.selectedId === id;
                return (
                  <button key={id} type="button" onClick={() => setCompanyTemplateChoice(current => ({ ...current, selectedId: id }))} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${selected ? "border-[#1B4B43] bg-[#F3F7F5] ring-1 ring-[#1B4B43]/10" : "border-slate-200 bg-white hover:border-[#B7CBC5] hover:bg-slate-50"}`}>
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${selected ? "bg-[#1B4B43] text-white" : "bg-slate-100 text-slate-500"}`}>{selected ? <Check size={13} /> : index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{template.sub_type || "Formato general"}</span>
                      <span className="mt-1 block break-words text-xs text-slate-500">{template.file_name || "Plantilla de empresa"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4">
              <button type="button" disabled={companyTemplatePreviewLoading} onClick={() => setCompanyTemplateChoice(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="button" disabled={companyTemplatePreviewLoading || !companyTemplateChoice.selectedId} onClick={() => {
                const selected = companyTemplateChoice.templates.find(template => String(template.id) === companyTemplateChoice.selectedId);
                if (selected) generateCompanyTemplatePreview(companyTemplateChoice.documentType, companyTemplateChoice.targetCategory, selected.sub_type);
              }} className="inline-flex items-center gap-2 rounded-lg bg-[#1B4B43] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#153B34] disabled:opacity-60">
                {companyTemplatePreviewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                {companyTemplatePreviewLoading ? "Preparando vista previa…" : "Continuar"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {companyTemplatePreview && (
        <GeneratedCompanyDocumentPreview
          blob={companyTemplatePreview.blob}
          filename={companyTemplatePreview.filename}
          title={companyTemplatePreview.title}
          employeeId={employee.id}
          documentType={companyTemplatePreview.title.split(" · ")[0]}
          token={token}
          onClose={() => setCompanyTemplatePreview(null)}
          onSaved={() => loadEmployeeFiles?.(employee.id)}
        />
      )}
    </div>
  );
}

function renderAssistantMessage(text) {
  return String(text || "").split(/(\*\*[\s\S]+?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part.replace(/\*\*/g, "");
  });
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
        { sender: "ai", text: `⚠️ ${err.message || "No pude conectar con el servicio de IA. Intenta nuevamente."}` }
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
                      <p className="whitespace-pre-line">{isAI ? renderAssistantMessage(m.text) : m.text}</p>
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

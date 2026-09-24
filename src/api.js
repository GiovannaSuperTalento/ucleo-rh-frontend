// src/api.js
export const API_BASE = import.meta.env.VITE_API_URL || "https://ucleo-rh-backend-production.up.railway.app";

// 🟢 Interceptor seguro: No expulsa al usuario ante errores de expedientes
const handleResponse = async (res, defaultErrorMsg) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.warn(`[API Warning] ${res.status}: ${data.message || defaultErrorMsg}`);
    throw new Error(data.message || defaultErrorMsg);
  }
  return data;
};

// Helper de formateo de fotos
export const formatPhotoUrl = (url) => {
  if (!url || typeof url !== "string" || url === "null" || url === "undefined") return null;
  if (url.startsWith("data:image")) return url;
  
  const baseUrl = API_BASE.replace(/\/api$/, "");
  
  if (url.includes("/uploads/")) {
    const filename = url.split("/uploads/").pop();
    return `${baseUrl}/uploads/${filename}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
};

export const api = {

  // 🟢 ACTUALIZADO: Permite recibir un mapeo dinámico de páginas
  uploadBatchEmployeeFiles: (token, employeeId, file, mapping = null) => {
    const formData = new FormData();
    formData.append("file", file);

    // Si se pasa un objeto con la distribución de páginas, se envía serializado
    if (mapping) {
      formData.append("mapping", typeof mapping === "string" ? mapping : JSON.stringify(mapping));
    }

    return fetch(`${API_BASE}/employees/${employeeId}/upload-batch-documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "Error al procesar el expediente masivo."));
  },

  // Autenticación
  login: (email, password) =>
    fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then((res) => handleResponse(res, "Error al iniciar sesión")),

  forgotPassword: (email) =>
    fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then((res) => handleResponse(res, "Error al solicitar recuperación")),

  resetPassword: (resetToken, newPassword) =>
    fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToken, newPassword }),
    }).then((res) => handleResponse(res, "Error al restablecer contraseña")),

  getMyProfile: (token) =>
    fetch(`${API_BASE}/employees/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener perfil")),

  // Empleados
  getEmployees: (token, search = "") =>
    fetch(`${API_BASE}/employees?search=${encodeURIComponent(search)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar empleados")),

  getEmployee: (token, id) =>
    fetch(`${API_BASE}/employees/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener empleado")),

  createEmployee: (token, payload) =>
    fetch(`${API_BASE}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al crear empleado")),

  updateEmployee: (token, id, payload) =>
    fetch(`${API_BASE}/employees/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al actualizar empleado")),

  deleteEmployee: (token, id) =>
    fetch(`${API_BASE}/employees/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar empleado")),

  getEmployeeHistory: (token, id) =>
    fetch(`${API_BASE}/employees/${id}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener historial")).catch(() => []),

  // 🟢 CARGA MASIVA DE EMPLEADOS DESDE EXCEL
  uploadEmployeesExcel: (token, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/employees/upload-excel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "Error al cargar el archivo de empleados"));
  },

  // Archivos y Expediente
  uploadEmployeePhoto: (token, employeeId, file) => {
    const formData = new FormData();
    formData.append("photo", file);
    return fetch(`${API_BASE}/employees/${employeeId}/upload-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "Error al subir la foto de perfil"));
  },

  getEmployeeFiles: (token, employeeId) =>
    fetch(`${API_BASE}/employees/${employeeId}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener expedientes digitales")).catch(() => []),

  uploadEmployeeFile: (token, employeeId, file, fileType) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", fileType);
    formData.append("file_type", fileType);
    return fetch(`${API_BASE}/employees/${employeeId}/upload-document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "Error al subir documento"));
  },

  moveEmployeeFile: (token, employeeId, fileId, targetType) =>
    fetch(`${API_BASE}/employees/${employeeId}/files/${fileId}/move`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetType }),
    }).then((res) => handleResponse(res, "Error al mover documento")),

  deleteEmployeeFile: (token, employeeId, fileId) =>
    fetch(`${API_BASE}/employees/${employeeId}/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar documento")),

  downloadExpedienteZipUrl: (employeeId) =>
    `${API_BASE}/employees/${employeeId}/download-all`,

  // Plantillas
  getTemplates: (token) =>
    fetch(`${API_BASE}/documents/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => handleResponse(res, "Error al obtener plantillas"))
      .catch(() => [
        { id: "constancia_laboral", name: "Constancia Laboral" },
        { id: "carta_recomendacion", name: "Carta de Recomendación" },
        { id: "carta_guarderia", name: "Carta para Guardería (IMSS)" },
        { id: "acta_administrativa", name: "Acta Administrativa (Mala Actuación)" },
        { id: "formato_multiple", name: "Formato Múltiple de Solicitudes" },
      ]),

  getMultiFormOptions: (token) =>
    fetch(`${API_BASE}/templates/multi-form-options`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => handleResponse(res, "Error al obtener opciones"))
      .catch(() => [
        "Vacaciones",
        "Permiso con Goce",
        "Permiso sin Goce",
        "Cambio de Cuenta Bancaria",
        "Constancia de Trabajo",
        "Incapacidad / Salud",
      ]),

  getEmployeeDocuments: (token, employeeId) =>
    fetch(`${API_BASE}/documents/employee/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener documentos emitidos")).catch(() => []),

  generateDocument: (token, employeeId, templateId, extraData = {}) =>
    fetch(`${API_BASE}/documents/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ employee_id: employeeId, template_id: templateId, ...extraData }),
    }).then((res) => handleResponse(res, "Error al generar el documento")),

  generateMultiForm: (token, payload) =>
    fetch(`${API_BASE}/documents/multi-form`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al generar formato múltiple")),

  deleteEmployeeDocument: (token, docId, fileUrl) =>
    fetch(`${API_BASE}/documents/${docId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ file_url: fileUrl }),
    }).then((res) => handleResponse(res, "Error al eliminar documento emitido")),

  // Permisos y Vacaciones
  getLeaveRequests: (token) =>
    fetch(`${API_BASE}/leaves/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener solicitudes")).catch(() => []),

  getLeaveTypes: (token) =>
    fetch(`${API_BASE}/leaves/types`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener tipos de permiso")).catch(() => []),

  getMyLeaveBalance: (token) =>
    fetch(`${API_BASE}/leaves/my-balance`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al consultar saldo de días")).catch(() => ({ days_available: 12 })),

  requestLeave: (token, payload) =>
    fetch(`${API_BASE}/leaves/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al solicitar permiso")),

  reviewLeave: (token, requestId, status) =>
    fetch(`${API_BASE}/leaves/requests/${requestId}/review`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }).then((res) => handleResponse(res, "Error al revisar solicitud")),

  // Empresas
  getCompanies: (token) =>
    fetch(`${API_BASE}/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener empresas")).catch(() => []),

  createCompany: (token, payload) =>
    fetch(`${API_BASE}/companies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al crear empresa")),

  deleteCompany: (token, id) =>
    fetch(`${API_BASE}/companies/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar empresa")),

  // Usuarios
  getUsers: (token) =>
    fetch(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener usuarios")).catch(() => []),

  registerUser: (token, payload) =>
    fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al registrar usuario")),

  updateUser: (token, id, payload) =>
    fetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al actualizar usuario")),

  deleteUser: (token, id) =>
    fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar usuario")),

  // Mensajería
  getContacts: (token) =>
    fetch(`${API_BASE}/chat/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener contactos de chat")).catch(() => []),

  getMessages: (token, contactId) =>
    fetch(`${API_BASE}/chat/messages/${contactId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar mensajes")).catch(() => []),

  sendMessage: (token, recipientId, message) =>
    fetch(`${API_BASE}/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipient_id: recipientId, message }),
    }).then((res) => handleResponse(res, "Error al enviar mensaje")),

  getUnreadCount: (token) =>
    fetch(`${API_BASE}/chat/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener contador de mensajes")).catch(() => ({ count: 0 })),

  // IA
  askAI: (token, message) =>
    fetch(`${API_BASE}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    }).then((res) => handleResponse(res, "Error al conectar con la IA")),

  // 🟢 MÓDULO: CENTRO DE PUBLICACIONES SOCIALES (RECLUTAMIENTO)
  
  // 1. Verificación de permiso conceptual PUBLICACIONES_SOCIALES
  checkSocialPermission: (token) =>
    fetch(`${API_BASE}/social-publications/check-permission`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No cuentas con autorización para acceder al Centro de Publicaciones.")),

  // 2. Obtener estadísticas del Dashboard del Centro de Publicaciones
  getSocialStats: (token) =>
    fetch(`${API_BASE}/social-publications/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar métricas de publicaciones.")),

  // 3. Obtener vacantes registradas en Núcleo RH para autopoblar publicaciones
  getSocialVacancies: (token) =>
    fetch(`${API_BASE}/social-publications/vacancies`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener catálogo de vacantes.")),

  // 4. Listar publicaciones creadas y programadas
  getSocialPosts: (token, filter = "") =>
    fetch(`${API_BASE}/social-publications/posts?filter=${encodeURIComponent(filter)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener historial de publicaciones.")),

  // 5. Crear una nueva publicación a partir de una vacante o plantilla
  createSocialPost: (token, payload) =>
    fetch(`${API_BASE}/social-publications/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al guardar la publicación.")),

  // 6. Actualizar / Programar / Cancelar publicación existente
  updateSocialPost: (token, id, payload) =>
    fetch(`${API_BASE}/social-publications/posts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al actualizar la publicación.")),

  // 7. Eliminar publicación
  deleteSocialPost: (token, id) =>
    fetch(`${API_BASE}/social-publications/posts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar la publicación.")),

  // 8. Obtener plantillas de publicaciones (Vacante General, Urgente, Operativa, etc.)
  getSocialTemplates: (token) =>
    fetch(`${API_BASE}/social-publications/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar plantillas de publicaciones.")),

  // 9. Administrar catálogo de Grupos de Facebook / Redes
  getSocialGroups: (token) =>
    fetch(`${API_BASE}/social-publications/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar grupos sociales.")),

  createSocialGroup: (token, payload) =>
    fetch(`${API_BASE}/social-publications/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al registrar grupo social.")),

  deleteSocialGroup: (token, id) =>
    fetch(`${API_BASE}/social-publications/groups/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar grupo.")),

  // 🟢 FASE 5: Métodos de Auditoría y Programación
  getSocialLogs: (token) =>
    fetch(`${API_BASE}/social-publications/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar el historial de auditoría.")),

  scheduleSocialPost: (token, postId, scheduled_at) =>
    fetch(`${API_BASE}/social-publications/posts/${postId}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ scheduled_at }),
    }).then((res) => handleResponse(res, "Error al programar la publicación.")),

  // 🟢 FASE 6: Métodos de Distribución Multigrupo
  getPostGroups: (token, postId) =>
    fetch(`${API_BASE}/social-publications/posts/${postId}/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener grupos del anuncio.")),

  assignPostGroups: (token, postId, group_ids) =>
    fetch(`${API_BASE}/social-publications/posts/${postId}/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ group_ids }),
    }).then((res) => handleResponse(res, "Error al asignar grupos al anuncio.")),
};
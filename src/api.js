// src/api.js

const rawUrl = import.meta.env.VITE_API_URL || "https://ucleo-rh-backend-production.up.railway.app/api";
const cleanUrl = rawUrl.replace(/\/$/, "");

// 🟢 Si la URL ya termina en /api la deja tal cual, si no, se lo agrega
export const API_BASE = cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;

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
    try {
      const fileUrl = new URL(url, baseUrl);
      const uploadPath = fileUrl.pathname.slice(fileUrl.pathname.indexOf("/uploads/"));
      return `${baseUrl}${uploadPath}${fileUrl.search}`;
    } catch (_error) {
      const [path, query = ""] = url.split("?");
      const filename = path.split("/uploads/").pop();
      return `${baseUrl}/uploads/${filename}${query ? `?${query}` : ""}`;
    }
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
};

export const api = {

  getCurrentUser: (token) =>
    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudo validar la sesión")),

  getUserPreferences: (token) =>
    fetch(`${API_BASE}/user/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudieron cargar tus preferencias")),

  searchWallpapers: (token, query) =>
    fetch(`${API_BASE}/user/wallpapers/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudieron buscar fondos")),

  saveUserPreferences: (token, preferences) =>
    fetch(`${API_BASE}/user/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(preferences),
    }).then((res) => handleResponse(res, "No se pudieron guardar tus preferencias")),

  // 🟢 MÓDULO: COMUNICADOS / ANUNCIOS
  getPersonalDashboard: (token) =>
    fetch(`${API_BASE}/dashboard/personal`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar tus notas y pendientes")),

  savePersonalDashboard: (token, payload) =>
    fetch(`${API_BASE}/dashboard/personal`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al guardar tus notas y pendientes")),

  getAnnouncements: (token) =>
    fetch(`${API_BASE}/announcements`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar comunicados")).catch(() => []),

  createAnnouncement: (token, payload) =>
    (() => {
      const formData = new FormData();
      formData.append("title", payload.title || "");
      formData.append("content", payload.content || "");
      formData.append("category", payload.category || "General");
      formData.append("links", JSON.stringify(payload.links || []));
      (payload.files || []).forEach(file => formData.append("files", file));
      return fetch(`${API_BASE}/announcements`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then((res) => handleResponse(res, "Error al publicar aviso"));
    })(),

  updateAnnouncement: (token, id, payload) => {
    const formData = new FormData();
    formData.append("title", payload.title || "");
    formData.append("content", payload.content || "");
    formData.append("category", payload.category || "General");
    formData.append("links", JSON.stringify(payload.links || []));
    formData.append("remove_attachment_urls", JSON.stringify(payload.removeAttachmentUrls || []));
    (payload.files || []).forEach(file => formData.append("files", file));
    return fetch(`${API_BASE}/announcements/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "Error al actualizar aviso"));
  },

  getAnnouncementPermissions: (token) =>
    fetch(`${API_BASE}/announcements/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al consultar permisos de avisos")),

  deleteAnnouncement: (token, id) =>
    fetch(`${API_BASE}/announcements/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar comunicado")),

  // 🟢 ACTUALIZADO: Permite recibir un mapeo dinámico de páginas
  uploadBatchEmployeeFiles: (token, employeeId, file, mapping = null) => {
    const formData = new FormData();
    formData.append("file", file);

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
      body: JSON.stringify({ token: resetToken, newPassword }),
    }).then((res) => handleResponse(res, "Error al restablecer contraseña")),

  changeOwnPassword: (token, currentPassword, newPassword) =>
    fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }).then((res) => handleResponse(res, "Error al cambiar contraseña")),

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
  getTemplates: (token, companyId = null) =>
    fetch(`${API_BASE}/documents/templates${companyId ? `?company_id=${encodeURIComponent(companyId)}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => handleResponse(res, "Error al obtener plantillas"))
      .catch(() => [
        { id: "constancia_laboral", name: "Constancia Laboral" },
        { id: "carta_recomendacion", name: "Carta de Recomendación" },
        { id: "carta_guarderia", name: "Carta para Guardería (IMSS)" },
        { id: "carta_probatoria_domicilio", name: "Carta Probatoria de Domicilio (IMSS)" },
        { id: "acta_administrativa", name: "Acta Administrativa (Mala Actuación)" },
        { id: "formato_multiple", name: "Formato Múltiple de Solicitudes" },
      ]),

  saveDocumentTemplate: (token, template, id = null) =>
    fetch(`${API_BASE}/documents/templates${id ? `/${encodeURIComponent(id)}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(template),
    }).then((res) => handleResponse(res, "Error al guardar el formato")),

  deleteDocumentTemplate: (token, id) =>
    fetch(`${API_BASE}/documents/templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar el formato")),

  getCompanyDocumentLogo: (token, companyId) =>
    fetch(`${API_BASE}/documents/company-logo/${encodeURIComponent(companyId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar el logo de la empresa")),

  uploadCompanyDocumentLogo: (token, companyId, file) => {
    const formData = new FormData();
    formData.append("logo", file);
    return fetch(`${API_BASE}/documents/company-logo/${encodeURIComponent(companyId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "Error al guardar el logo de la empresa"));
  },

  deleteCompanyDocumentLogo: (token, companyId) =>
    fetch(`${API_BASE}/documents/company-logo/${encodeURIComponent(companyId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar el logo de la empresa")),

  generateCustomDocument: (token, payload) =>
    fetch(`${API_BASE}/documents/generate-custom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al generar el PDF")),

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

  previewDocument: (token, employeeId, templateId, extraData = {}) =>
    fetch(`${API_BASE}/documents/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ employee_id: employeeId, template_id: templateId, ...extraData }),
    }).then((res) => handleResponse(res, "Error al preparar la vista previa")),

  saveEditedDocument: (token, metadata, file) => {
    const formData = new FormData();
    Object.entries(metadata || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    formData.append("file", file, file.name || "documento_editado.pdf");
    return fetch(`${API_BASE}/documents/save-edited`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "Error al guardar el documento editado"));
  },

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

  sendUserAccessEmail: (token, id) =>
    fetch(`${API_BASE}/users/${id}/send-access-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al enviar el acceso por correo")),

  // Mensajería
  getContacts: (token) =>
    fetch(`${API_BASE}/chat/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener contactos de chat")),

  getMessages: (token, contactId) =>
    fetch(`${API_BASE}/chat/messages/${contactId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar mensajes")),

  sendMessage: (token, recipientId, message) =>
    fetch(`${API_BASE}/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipient_id: recipientId, message }),
    }).then((res) => handleResponse(res, "Error al enviar mensaje")),

  sendChatContent: (token, recipientId, { message = "", messageType = "text", attachment = null } = {}) => {
    if (attachment) {
      const body = new FormData();
      body.append("recipient_id", recipientId);
      body.append("message", message);
      body.append("attachment", attachment);
      return fetch(`${API_BASE}/chat/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      }).then((res) => handleResponse(res, "Error al enviar la imagen"));
    }
    return fetch(`${API_BASE}/chat/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipient_id: recipientId, message, message_type: messageType }),
    }).then((res) => handleResponse(res, "Error al enviar mensaje"));
  },

  getUnreadCount: (token) =>
    fetch(`${API_BASE}/chat/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener contador de mensajes")).catch(() => ({ count: 0 })),

  getMessageNotifications: (token) =>
    fetch(`${API_BASE}/chat/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener notificaciones de mensajes")),

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

  // MÓDULO: CENTRO DE PUBLICACIONES SOCIALES (RECLUTAMIENTO)
  checkSocialPermission: (token) =>
    fetch(`${API_BASE}/social-publications/check-permission`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No cuentas con autorización para acceder al Centro de Publicaciones.")),

  getSocialStats: (token) =>
    fetch(`${API_BASE}/social-publications/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar métricas de publicaciones.")),

  getSocialVacancies: (token) =>
    fetch(`${API_BASE}/social-publications/vacancies`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener catálogo de vacantes.")),

  getSocialPosts: (token, filter = "") =>
    fetch(`${API_BASE}/social-publications/posts?filter=${encodeURIComponent(filter)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al obtener historial de publicaciones.")),

  createSocialPost: (token, payload) =>
    fetch(`${API_BASE}/social-publications/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al guardar la publicación.")),

  updateSocialPost: (token, id, payload) =>
    fetch(`${API_BASE}/social-publications/posts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al actualizar la publicación.")),

  deleteSocialPost: (token, id) =>
    fetch(`${API_BASE}/social-publications/posts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al eliminar la publicación.")),

  getSocialTemplates: (token) =>
    fetch(`${API_BASE}/social-publications/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar plantillas de publicaciones.")),

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

  // ATS de reclutamiento
  getAtsVacancies: (token) =>
    fetch(`${API_BASE}/ats/vacancies`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar vacantes.")),

  getInternalVacancies: (token) =>
    fetch(`${API_BASE}/ats/internal/vacancies`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudieron cargar las vacantes internas.")),

  getMyInternalApplications: (token) =>
    fetch(`${API_BASE}/ats/internal/my-applications`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudieron cargar tus postulaciones.")),

  submitInternalApplication: (token, vacancyId, formData) =>
    fetch(`${API_BASE}/ats/internal/vacancies/${vacancyId}/applications`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "No se pudo enviar la postulación.")),

  createAtsVacancy: (token, payload) =>
    fetch(`${API_BASE}/ats/vacancies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al crear la vacante.")),

  updateAtsVacancy: (token, id, payload) =>
    fetch(`${API_BASE}/ats/vacancies/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse(res, "Error al actualizar la vacante.")),

  getAtsApplications: (token, vacancyId, search = "") => {
    const params = new URLSearchParams();
    if (vacancyId) params.set("vacancy_id", vacancyId);
    if (search.trim()) params.set("search", search.trim());
    return fetch(`${API_BASE}/ats/applications?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar candidatos."));
  },

  previewAtsCv: (token, vacancyId, file) => {
    const formData = new FormData();
    formData.append("cv", file);
    return fetch(`${API_BASE}/ats/vacancies/${vacancyId}/cv-preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "No se pudo analizar el CV."));
  },

  createAtsApplication: (token, vacancyId, formData) =>
    fetch(`${API_BASE}/ats/vacancies/${vacancyId}/applications`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => handleResponse(res, "Error al registrar candidato.")),

  updateAtsApplicationStage: (token, id, stage) =>
    fetch(`${API_BASE}/ats/applications/${id}/stage`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stage }),
    }).then((res) => handleResponse(res, "Error al actualizar la etapa.")),

  getAtsActivities: (token, id) =>
    fetch(`${API_BASE}/ats/applications/${id}/activities`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar el seguimiento.")),

  getAtsAssessment: (token, id) =>
    fetch(`${API_BASE}/ats/applications/${id}/assessment`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar la evaluación.")),

  getAtsAssessments: (token, id) =>
    fetch(`${API_BASE}/ats/applications/${id}/assessments`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "Error al cargar las pruebas.")),

  createAtsAssessmentDraft: (token, id, type) =>
    fetch(`${API_BASE}/ats/applications/${id}/assessments/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type }),
    }).then((res) => handleResponse(res, "No se pudo generar la prueba.")),

  uploadAtsAssessmentDraft: (token, id, { type, title, file }) => {
    const body = new FormData();
    body.append("type", type);
    body.append("title", title);
    body.append("testFile", file);
    return fetch(`${API_BASE}/ats/applications/${id}/assessments/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    }).then((res) => handleResponse(res, "No se pudo cargar el archivo de prueba."));
  },

  updateAtsAssessmentDraft: (token, id, draft) =>
    fetch(`${API_BASE}/ats/assessments/${id}/draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(draft),
    }).then((res) => handleResponse(res, "No se pudo guardar la prueba.")),

  sendAtsAssessmentById: (token, id) =>
    fetch(`${API_BASE}/ats/assessments/${id}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudo enviar la prueba.")),

  downloadAtsAssessmentFile: async (token, id, kind) => {
    const res = await fetch(`${API_BASE}/ats/assessments/${id}/files/${kind}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) await handleResponse(res, "Error al descargar el archivo de prueba.");
    const disposition = res.headers.get("content-disposition") || "";
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const filename = decodeURIComponent(match?.[1] || match?.[2] || "archivo-prueba");
    return { blob: await res.blob(), filename };
  },

  sendAtsAssessment: (token, id) =>
    fetch(`${API_BASE}/ats/applications/${id}/assessment/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudo enviar la evaluación.")),

  saveAtsAssessmentReview: (token, id, reviews) =>
    fetch(`${API_BASE}/ats/assessments/${id}/manual-review`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reviews }),
    }).then((res) => handleResponse(res, "No se pudo guardar la revisión manual.")),

  getPublicAtsAssessment: (candidateToken) =>
    fetch(`${API_BASE}/ats/public/assessment`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${candidateToken}` },
    }).then((res) => handleResponse(res, "No se pudo abrir la evaluación.")),

  submitPublicAtsAssessment: (candidateToken, answers) =>
    fetch(`${API_BASE}/ats/public/assessment/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({ answers }),
    }).then((res) => handleResponse(res, "No se pudieron enviar las respuestas.")),

  addAtsActivity: (token, id, content) =>
    fetch(`${API_BASE}/ats/applications/${id}/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    }).then((res) => handleResponse(res, "Error al guardar la nota.")),

  downloadAtsCv: async (token, id) => {
    const res = await fetch(`${API_BASE}/ats/applications/${id}/cv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) await handleResponse(res, "Error al descargar el CV.");
    const disposition = res.headers.get("content-disposition") || "";
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const filename = decodeURIComponent(match?.[1] || match?.[2] || "CV-candidato");
    return { blob: await res.blob(), filename };
  },

  deleteAtsCv: (token, id) =>
    fetch(`${API_BASE}/ats/applications/${id}/cv`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudo eliminar el CV.")),

  deleteAtsApplication: (token, id) =>
    fetch(`${API_BASE}/ats/applications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => handleResponse(res, "No se pudo eliminar la postulación.")),
};

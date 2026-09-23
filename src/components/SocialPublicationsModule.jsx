// src/components/SocialPublicationsModule.jsx
import React, { useState, useEffect } from "react";
import { 
  Share2, Send, Calendar, Clock, CheckCircle2, AlertCircle, 
  Plus, RefreshCw, Loader2, ShieldAlert, Sparkles, Eye, FileText, ArrowLeft, Building2, MapPin, DollarSign, Smartphone, Trash2, Users, ExternalLink, History, Copy, Check, Play, CheckSquare, Square, Edit3, Image
} from "lucide-react";

export function SocialPublicationsModule({ token, user, api }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "groups" | "logs"
  const [stats, setStats] = useState({ today_posts: 0, scheduled: 0, published: 0, pending: 0, errors: 0, active_groups: 0 });

  // Listados principales
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [logs, setLogs] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Creador / Editor
  const [isCreating, setIsCreating] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [selectedVacancy, setSelectedVacancy] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [postTitle, setCustomTitle] = useState("");
  const [postContent, setCustomContent] = useState("");
  const [contactPhone, setContactPhone] = useState("33 2156 8832");
  const [imageUrl, setImageUrl] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modales
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", url: "", location: "", category: "Facebook", notes: "" });
  const [savingGroup, setSavingGroup] = useState(false);

  const [schedulingPost, setSchedulingPost] = useState(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Modal Multigrupo
  const [assigningPost, setAssigningPost] = useState(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [savingPostGroups, setSavingPostGroups] = useState(false);

  const loadModuleData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      if (user?.role === "admin") {
        setHasPermission(true);
      } else {
        await api.checkSocialPermission(token);
        setHasPermission(true);
      }

      const [statsData, postsData, groupsData, vacanciesData, templatesData, logsData] = await Promise.all([
        api.getSocialStats(token),
        api.getSocialPosts ? api.getSocialPosts(token) : Promise.resolve([]),
        api.getSocialGroups ? api.getSocialGroups(token) : Promise.resolve([]),
        api.getSocialVacancies(token),
        api.getSocialTemplates ? api.getSocialTemplates(token) : Promise.resolve([]),
        api.getSocialLogs ? api.getSocialLogs(token) : Promise.resolve([])
      ]);

      setStats(statsData);
      setPosts(Array.isArray(postsData) ? postsData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      if (user?.role === "admin") {
        setHasPermission(true);
      } else {
        setHasPermission(false);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadModuleData();

    // Refresco en tiempo real cada 5 segundos
    const interval = setInterval(() => {
      loadModuleData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [token, user]);

  const handleCopyToken = () => {
    if (!token) {
      alert("No hay un token activo de sesión.");
      return;
    }
    navigator.clipboard.writeText(token);
    alert("🔑 Token de sesión copiado al portapapeles. Pégalo en la extensión de Chrome.");
  };

  const handleLocalImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCopyText = () => {
    if (!postContent) return;
    navigator.clipboard.writeText(postContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setEditingPostId(null);
    setSelectedVacancy(null);
    setSelectedTemplate(null);
    setCustomTitle("");
    setCustomContent("");
    setImageUrl("");
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleEditPost = (post) => {
    setEditingPostId(post.id);
    setCustomTitle(post.title || "");
    setCustomContent(post.content || "");
    setImageUrl(post.image_url || "");
    
    if (post.vacancy_id) {
      const vac = vacancies.find(v => String(v.id) === String(post.vacancy_id));
      if (vac) setSelectedVacancy(vac);
    } else {
      setSelectedVacancy(null);
    }

    setIsCreating(true);
  };

  const handleSaveAsTemplate = async (post) => {
    if (!window.confirm(`¿Deseas guardar "${post.title}" como una plantilla reutilizable?`)) return;

    try {
      if (api.createSocialTemplate) {
        await api.createSocialTemplate(token, {
          name: post.title,
          description: "Plantilla generada desde borrador",
          content: post.content,
          image_url: post.image_url || null
        });
      } else {
        await fetch("http://localhost:4000/api/social-publications/templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: post.title,
            description: "Plantilla generada desde borrador",
            content: post.content,
            image_url: post.image_url || null
          })
        });
      }

      alert("⭐ ¡Plantilla guardada con éxito! Ya puedes utilizarla para crear nuevas publicaciones.");
      await loadModuleData();
    } catch (err) {
      alert("❌ Error al guardar plantilla: " + err.message);
    }
  };

  const applyVacancyToTemplate = (vacancy, template) => {
    if (!vacancy || !template) return;

    let text = template.content || "";
    text = text.replace(/\{puesto\}/g, vacancy.title || "Colaborador");
    text = text.replace(/\{empresa\}/g, vacancy.company_name || "Núcleo RH");
    text = text.replace(/\{ubicacion\}/g, vacancy.location || "Guadalajara, Jal.");
    text = text.replace(/\{sueldo\}/g, vacancy.salary ? `$${Number(vacancy.salary).toLocaleString()} MXN` : "Atractivo sueldo competitivo");
    text = text.replace(/\{horario\}/g, vacancy.schedule || "Lunes a Viernes");
    text = text.replace(/\{tipo_contrato\}/g, vacancy.contract_type || "Indeterminado");
    text = text.replace(/\{requisitos\}/g, vacancy.description ? vacancy.description.slice(0, 100) + "..." : "Ganas de trabajar y proactividad.");
    text = text.replace(/\{contacto\}/g, contactPhone);

    setCustomTitle(`Vacante: ${vacancy.title || "Puesto General"}`);
    setCustomContent(text);

    if (template.image_url) {
      setImageUrl(template.image_url);
    }
  };

  const handleSelectVacancy = (vac) => {
    setSelectedVacancy(vac);
    if (selectedTemplate) {
      applyVacancyToTemplate(vac, selectedTemplate);
    } else if (templates.length > 0) {
      setSelectedTemplate(templates[0]);
      applyVacancyToTemplate(vac, templates[0]);
    }
  };

  // 🟢 SELECCIÓN Y CARGA DE PLANTILLA GUARDADA
  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    setCustomTitle(tmpl.name || "Nueva Publicación");

    if (selectedVacancy) {
      applyVacancyToTemplate(selectedVacancy, tmpl);
    } else {
      setCustomContent(tmpl.content || "");
      if (tmpl.image_url) setImageUrl(tmpl.image_url);
    }
  };

  const handleSaveDraft = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      alert("Por favor completa el título y el contenido de la publicación.");
      return;
    }

    setSavingPost(true);
    try {
      if (editingPostId) {
        await api.updateSocialPost(token, editingPostId, {
          title: postTitle,
          content: postContent,
          image_url: imageUrl,
          vacancy_id: selectedVacancy ? selectedVacancy.id : null,
          status: "Borrador"
        });
        alert("✅ Publicación actualizada correctamente.");
      } else {
        await api.createSocialPost(token, {
          title: postTitle,
          content: postContent,
          image_url: imageUrl,
          vacancy_id: selectedVacancy ? selectedVacancy.id : null,
          status: "Borrador"
        });
        alert("✅ Publicación guardada como Borrador exitosamente.");
      }

      setIsCreating(false);
      resetForm();
      await loadModuleData();
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      setSavingPost(false);
    }
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;

    setSavingGroup(true);
    try {
      await api.createSocialGroup(token, newGroup);
      alert("✅ Grupo social registrado correctamente.");
      setNewGroup({ name: "", url: "", location: "", category: "Facebook", notes: "" });
      setShowAddGroupModal(false);
      await loadModuleData();
    } catch (err) {
      alert("❌ Error al guardar grupo: " + err.message);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleConfirmSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingPost || !scheduleDateTime) return;

    setSavingSchedule(true);
    try {
      if (api.scheduleSocialPost) {
        await api.scheduleSocialPost(token, schedulingPost.id, scheduleDateTime);
      } else {
        await api.updateSocialPost(token, schedulingPost.id, {
          status: "Programada",
          scheduled_at: scheduleDateTime
        });
      }

      alert("📅 ¡Publicación programada correctamente!");
      setSchedulingPost(null);
      setScheduleDateTime("");
      await loadModuleData();
    } catch (err) {
      alert("❌ Error al programar: " + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleOpenAssignModal = async (post) => {
    setAssigningPost(post);
    try {
      if (api.getPostGroups) {
        const assigned = await api.getPostGroups(token, post.id);
        setSelectedGroupIds(assigned.map(g => g.group_id));
      }
    } catch (err) {
      setSelectedGroupIds([]);
    }
  };

  const handleToggleSelectAllGroups = () => {
    if (selectedGroupIds.length === groups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(groups.map(g => g.id));
    }
  };

  const handleSavePostGroups = async (e) => {
    e.preventDefault();
    if (!assigningPost) return;

    setSavingPostGroups(true);
    try {
      if (api.assignPostGroups) {
        await api.assignPostGroups(token, assigningPost.id, selectedGroupIds);
      }
      alert("✅ Grupos de distribución guardados para esta publicación.");
      setAssigningPost(null);
      await loadModuleData();
    } catch (err) {
      alert("❌ Error al guardar grupos: " + err.message);
    } finally {
      setSavingPostGroups(false);
    }
  };

  const handleDeleteGroup = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el canal/grupo "${name}"?`)) return;
    try {
      await api.deleteSocialGroup(token, id);
      await loadModuleData();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro de publicación?")) return;
    try {
      await api.deleteSocialPost(token, id);
      await loadModuleData();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.updateSocialPost(token, id, { status: newStatus });
      await loadModuleData();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm font-medium">Cargando Centro de Publicaciones...</span>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-base font-bold text-slate-900">Acceso Restringido (403 Forbidden)</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          El <strong>Centro de Publicaciones</strong> está disponible exclusivamente para el personal autorizado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="text-[#1B4B43]" size={24} /> Centro de Publicaciones
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra y distribuye ofertas de empleo a Facebook y canales sociales oficiales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyToken}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
            title="Copiar token JWT para la extensión de Chrome"
          >
            <span>🔑</span>
            <span>Copiar Token Bot</span>
          </button>

          {!isCreating && (
            <div className="flex bg-slate-200/60 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("posts")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "posts" ? "bg-white shadow-xs text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Historial
              </button>
              <button
                onClick={() => setActiveTab("groups")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "groups" ? "bg-white shadow-xs text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Grupos ({groups.length})
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "logs" ? "bg-white shadow-xs text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Auditoría
              </button>
            </div>
          )}

          {!isCreating ? (
            <button 
              onClick={handleStartCreate}
              className="px-4 py-2.5 bg-[#1B4B43] hover:bg-[#153B34] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} /> Nueva Publicación
            </button>
          ) : (
            <button 
              onClick={() => { setIsCreating(false); resetForm(); }}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} /> Volver al Historial
            </button>
          )}
        </div>
      </div>

      {!isCreating ? (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hoy</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.today_posts}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Publicaciones creadas</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Programadas</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.scheduled}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Listas para salir</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-2xs">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Publicadas</p>
              <p className="text-2xl font-bold text-emerald-950 mt-1">{stats.published}</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Exitosas en redes</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-2xs">
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pendientes</p>
              <p className="text-2xl font-bold text-amber-950 mt-1">{stats.pending}</p>
              <p className="text-[10px] text-amber-700 mt-0.5">En proceso de envío</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-2xs">
              <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Errores</p>
              <p className="text-2xl font-bold text-rose-950 mt-1">{stats.errors}</p>
              <p className="text-[10px] text-rose-700 mt-0.5">Requieren atención</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Grupos Activos</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{groups.length}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Canales habilitados</p>
            </div>
          </div>

          {/* Vistas según pestaña */}
          {activeTab === "posts" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-[#1B4B43]" /> Historial de Publicaciones y Borradores
                </h3>
                <button onClick={() => loadModuleData()} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>

              {posts.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <Sparkles size={28} className="mx-auto text-emerald-700 opacity-60" />
                  <p className="font-bold text-slate-700">No hay publicaciones guardadas aún.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {posts.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#1B4B43] flex items-center justify-center font-bold shrink-0">
                          📢
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{p.title}</p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Creada el {p.created_at?.slice(0, 10)} · {p.scheduled_at ? `Programada: ${p.scheduled_at.slice(0, 16)}` : `Vacante: ${p.vacancy_title || "General"}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === "Publicada" ? "bg-emerald-100 text-emerald-800" :
                          p.status === "Programada" ? "bg-blue-100 text-blue-800" :
                          p.status === "En Proceso" ? "bg-amber-100 text-amber-900 animate-pulse" :
                          p.status === "Borrador" ? "bg-slate-100 text-slate-700" : "bg-rose-100 text-rose-800"
                        }`}>
                          {p.status}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenAssignModal(p)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                            title="Asignar grupos de Facebook"
                          >
                            <Users size={12} /> Grupos
                          </button>

                          <button
                            onClick={() => handleEditPost(p)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                            title="Editar borrador"
                          >
                            <Edit3 size={12} /> Editar
                          </button>

                          <button
                            onClick={() => handleSaveAsTemplate(p)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#1B4B43] border border-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                            title="Guardar este texto e imagen como plantilla reutilizable"
                          >
                            <Sparkles size={12} /> Plantilla
                          </button>

                          {(p.status === "Borrador" || p.status === "Programada" || p.status === "Vencida") && (
                            <>
                              <button
                                onClick={() => setSchedulingPost(p)}
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Programar
                              </button>

                              <button
                                onClick={() => handleUpdateStatus(p.id, "Programada")}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                                title="Forzar salida inmediata hacia la extensión de Chrome"
                              >
                                <Play size={10} /> Ejecutar Ahora
                              </button>

                              <button
                                onClick={() => handleUpdateStatus(p.id, "Publicada")}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Publicar
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDeletePost(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "groups" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-[#1B4B43]" /> Catálogo de Grupos de Facebook y Redes
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddGroupModal(true)}
                  className="px-3 py-1.5 bg-[#1B4B43] hover:bg-[#153B34] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Registrar Grupo
                </button>
              </div>

              {groups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No hay grupos registrados. Registra los grupos de Facebook de tu zona para organizar el envío.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groups.map((g) => (
                    <div key={g.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                            {g.category || "Facebook"}
                          </span>
                          <button onClick={() => handleDeleteGroup(g.id, g.name)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p className="font-bold text-slate-900 text-xs mt-1.5">{g.name}</p>
                        <p className="text-[11px] text-slate-500">{g.location || "General"}</p>
                      </div>

                      {g.url && (
                        <a href={g.url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#1B4B43] hover:underline flex items-center gap-1 pt-1 border-t border-slate-200/60">
                          <span>Abrir Grupo</span> <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <History size={16} className="text-[#1B4B43]" /> Registro de Auditoría y Movimientos
                </h3>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Sin eventos de auditoría registrados.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {logs.map((l) => (
                    <div key={l.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-800">{l.action} — <span className="font-normal text-slate-600">{l.message}</span></p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Por: {l.user_email} ({l.user_position || "Reclutador"}) · {l.created_at?.slice(0, 19).replace('T', ' ')}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                        {l.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* CREADOR Y EDITOR DE PUBLICACIONES CON SELECTOR DE PLANTILLAS GUARDADAS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h2 className="text-sm font-bold text-[#1B4B43] uppercase tracking-wider flex items-center gap-2">
                {editingPostId ? "✏️ Editando Publicación Existente" : "➕ Crear Nueva Publicación"}
              </h2>
              {editingPostId && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  ID: #{editingPostId}
                </span>
              )}
            </div>

            {/* 🟢 SECCIÓN DE PLANTILLAS GUARDADAS (REUTILIZABLES) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#1B4B43]" /> Plantillas y Formatos Guardados
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Haz clic para cargar el anuncio</span>
              </div>

              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  No hay plantillas personalizadas. Guarda un borrador como plantilla desde el historial para reutilizarlo aquí.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {templates.map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between relative ${
                        selectedTemplate?.id === tmpl.id
                          ? "border-[#1B4B43] bg-emerald-50 text-[#1B4B43] font-bold shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate font-bold text-[11px]">{tmpl.name}</p>
                          {tmpl.image_url && (
                            <span className="text-[10px] text-emerald-600 font-normal shrink-0" title="Contiene imagen">
                              🖼️
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-normal line-clamp-2 mt-1 leading-tight">
                          {tmpl.description || tmpl.content?.slice(0, 50) + "..."}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                1. Seleccionar Vacante de Núcleo RH (Opcional)
              </label>
              <select
                value={selectedVacancy ? selectedVacancy.id : ""}
                onChange={(e) => {
                  const vac = vacancies.find(v => String(v.id) === e.target.value);
                  if (vac) handleSelectVacancy(vac);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium outline-none focus:border-[#1B4B43]"
              >
                <option value="">Seleccionar Vacante Activa...</option>
                {vacancies.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.title} — {v.company_name || "General"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                2. Título del Anuncio
              </label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ej. Vacante: Auxiliar de Nóminas - GDL"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1B4B43] mb-3"
              />

              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Redactar / Editar Contenido
                </label>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copied ? "¡Copiado!" : "Copiar Texto"}</span>
                </button>
              </div>

              <textarea
                rows={8}
                value={postContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Escribe o selecciona una plantilla..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1B4B43] font-mono leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  4. Teléfono WhatsApp Contacto
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => {
                    setContactPhone(e.target.value);
                    if (selectedVacancy && selectedTemplate) {
                      applyVacancyToTemplate(selectedVacancy, selectedTemplate);
                    }
                  }}
                  placeholder="33 2156 8832"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1B4B43]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  5. Imagen del Anuncio
                </label>
                <div className="flex gap-2">
                  <label className="px-3 py-2 bg-[#1B4B43] hover:bg-[#153B34] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0 shadow-xs">
                    <span>🖼️ Galería</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLocalImageUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="O pega URL (https://...)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1B4B43] truncate"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingPost}
                className="px-5 py-2.5 bg-[#1B4B43] hover:bg-[#153B34] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingPost ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                <span>{editingPostId ? "Guardar Cambios" : "Guardar Borrador"}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={16} className="text-[#1B4B43]" /> Previsualización en Facebook
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#1B4B43] text-white flex items-center justify-center font-bold text-xs">
                  RH
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Núcleo RH — Reclutamiento</p>
                  <p className="text-[10px] text-slate-400">Justo ahora · Publicación Oficial</p>
                </div>
              </div>

              <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans min-h-[120px] bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                {postContent || "Aquí aparecerá el texto redactado en tiempo real..."}
              </div>

              <div className="relative w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center group">
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Vista previa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer shadow-md"
                    >
                      ✕ Quitar imagen
                    </button>
                  </>
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <Building2 size={32} className="mx-auto mb-1 opacity-50" />
                    <p className="text-[11px] font-medium">Anuncio de Vacante Institucional</p>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="font-semibold truncate">📲 Enviar CV por WhatsApp: {contactPhone}</span>
                <span className="bg-[#2F7D5A] text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0">
                  Contactar
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR GRUPOS DE FACEBOOK */}
      {assigningPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-[#1B4B43]" /> Asignar Grupos
              </h3>

              {groups.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAllGroups}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#1B4B43] border border-emerald-200 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {selectedGroupIds.length === groups.length ? (
                    <>
                      <CheckSquare size={13} />
                      <span>Desmarcar Todos</span>
                    </>
                  ) : (
                    <>
                      <Square size={13} />
                      <span>Seleccionar Todos ({groups.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-slate-500">
              Selecciona los canales donde se difundirá la vacante: <strong>{assigningPost.title}</strong>
            </p>

            <form onSubmit={handleSavePostGroups} className="space-y-3">
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 p-2.5 rounded-xl bg-slate-50/50">
                {groups.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No hay grupos registrados en el catálogo.</p>
                ) : (
                  groups.map((g) => (
                    <label key={g.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupIds([...selectedGroupIds, g.id]);
                            } else {
                              setSelectedGroupIds(selectedGroupIds.filter(id => id !== g.id));
                            }
                          }}
                          className="rounded text-[#1B4B43] focus:ring-[#1B4B43]"
                        />
                        <div>
                          <p className="font-bold text-slate-800">{g.name}</p>
                          <p className="text-[10px] text-slate-400">{g.location || "General"}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {g.category || "Facebook"}
                      </span>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningPost(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPostGroups}
                  className="px-4 py-2 bg-[#1B4B43] hover:bg-[#153B34] text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingPostGroups ? "Guardando..." : `Guardar (${selectedGroupIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROGRAMAR PUBLICACIÓN */}
      {schedulingPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-[#1B4B43]" /> Programar Salida de Anuncio
            </h3>
            <p className="text-xs text-slate-500">
              Selecciona la fecha y hora en la que deseas que la vacante pase a estado <strong>Programada</strong>.
            </p>

            <form onSubmit={handleConfirmSchedule} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700">Fecha y Hora de Salida *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1B4B43]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSchedulingPost(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule || !scheduleDateTime}
                  className="px-4 py-2 bg-[#1B4B43] hover:bg-[#153B34] text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingSchedule ? "Guardando..." : "Confirmar Programación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO GRUPO */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-[#1B4B43]" /> Registrar Grupo o Canal Social
            </h3>

            <form onSubmit={handleSaveGroup} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700">Nombre del Grupo *</label>
                <input
                  type="text"
                  required
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="Ej. Empleos Guadalajara y Zapopan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1B4B43]"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700">Enlace/URL del Grupo</label>
                <input
                  type="text"
                  value={newGroup.url}
                  onChange={(e) => setNewGroup({ ...newGroup, url: e.target.value })}
                  placeholder="https://facebook.com/groups/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1B4B43]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1 text-slate-700">Ubicación / Zona</label>
                  <input
                    type="text"
                    value={newGroup.location}
                    onChange={(e) => setNewGroup({ ...newGroup, location: e.target.value })}
                    placeholder="Ej. Zona Metropolitana"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1B4B43]"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700">Categoría</label>
                  <select
                    value={newGroup.category}
                    onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1B4B43]"
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Telegram">Telegram</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGroup || !newGroup.name.trim()}
                  className="px-4 py-2 bg-[#1B4B43] hover:bg-[#153B34] text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingGroup ? "Guardando..." : "Guardar Grupo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
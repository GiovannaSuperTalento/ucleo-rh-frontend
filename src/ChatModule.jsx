import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Loader2, RefreshCw, Search, Image as ImageIcon, Smile, X } from "lucide-react";
import { API_BASE } from "./api";

// 🟢 HELPER RESILIENTE PARA RESOLVER FOTOS O INICIALES EN EL CHAT
function getChatAvatar(c) {
  if (!c) return "https://ui-avatars.com/api/?name=RH&background=1B4B43&color=fff";

  const rawPhoto = c.photo_url || c.avatar_url || c.profile_picture || c.photo || c.image || "";

  if (typeof rawPhoto === "string") {
    const clean = rawPhoto.trim();
    if (clean && clean !== "null" && clean !== "undefined") {
      const baseUrl = API_BASE.replace(/\/api$/, "");
      // 1. Si ya es una URL completa de nuestro propio servidor o externa (pero no localhost, que ya no existe en producción)
      if ((clean.startsWith("http://") || clean.startsWith("https://")) && !clean.includes("localhost")) {
        return clean;
      }
      if (clean.startsWith("data:")) {
        return clean;
      }
      // 2. Si incluye "/uploads/" en cualquier parte (ruta relativa o URL vieja de localhost), tomamos solo el nombre del archivo
      if (clean.includes("/uploads/")) {
        const filename = clean.split("/uploads/").pop();
        return `${baseUrl}/uploads/${filename}`;
      }
      // 3. Cualquier otra ruta relativa
      const cleanPath = clean.replace(/^public[\\/]/, "").replace(/\\/g, "/");
      return `${baseUrl}/${cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath}`;
    }
  }

  // 3. Fallback dinámico con iniciales e identificador
  const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "Colaborador";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1B4B43&color=fff`;
}

export default function ChatModule({ token, user, api, unreadBySender = {} }) {
  const [contacts, setContacts] = useState([]);
  const [searchContact, setSearchContact] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const [conversationError, setConversationError] = useState("");
  const messagesEndRef = useRef(null);
  const contactsListRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const previousContactOrderRef = useRef("");

  const loadContacts = async ({ silent = false } = {}) => {
    if (!silent) setLoadingContacts(true);
    if (!silent) setContactsError("");
    try {
      if (api.getContacts) {
        const data = await api.getContacts(token);
        setContacts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error al cargar contactos:", err);
      if (!silent) setContactsError(err.message || "No se pudo cargar el directorio.");
    } finally {
      if (!silent) setLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadContacts();
    const interval = setInterval(() => loadContacts({ silent: true }), 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const order = contacts.map(contact => String(contact.id)).join(",");
    if (previousContactOrderRef.current && order !== previousContactOrderRef.current && contactsListRef.current) {
      contactsListRef.current.scrollTop = 0;
    }
    previousContactOrderRef.current = order;
  }, [contacts]);

  const loadMessages = async (contactId) => {
    if (!contactId) return;
    try {
      if (api.getMessages) {
        const data = await api.getMessages(token, contactId);
        setMessages(Array.isArray(data) ? data : []);
        setConversationError("");
      }
    } catch (err) {
      console.error("Error al cargar mensajes:", err);
      setConversationError(err.message || "No se pudo cargar la conversación.");
    }
  };

  useEffect(() => {
    if (selectedContact) {
      setLoadingMessages(true);
      loadMessages(selectedContact.id).finally(() => setLoadingMessages(false));

      const interval = setInterval(() => {
        loadMessages(selectedContact.id);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [selectedContact, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !selectedContact || sending) return;

    const textToSend = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      if (api.sendChatContent) {
        await api.sendChatContent(token, selectedContact.id, { message: textToSend, attachment });
        setAttachment(null);
        setShowStickers(false);
        await loadMessages(selectedContact.id);
      } else if (api.sendMessage && textToSend) {
        await api.sendMessage(token, selectedContact.id, textToSend);
        await loadMessages(selectedContact.id);
      }
    } catch (err) {
      alert("No se pudo enviar el mensaje: " + err.message);
      setNewMessage(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleSendSticker = async sticker => {
    if (!selectedContact || sending) return;
    setSending(true);
    setShowStickers(false);
    try {
      if (api.sendChatContent) await api.sendChatContent(token, selectedContact.id, { message: sticker, messageType: "sticker" });
      else await api.sendMessage(token, selectedContact.id, sticker);
      await loadMessages(selectedContact.id);
    } catch (err) {
      alert("No se pudo enviar el sticker: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // Filtrado dinámico de contactos para la búsqueda
  const filteredContacts = contacts.filter((c) => {
    const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    const query = searchContact.toLowerCase();
    return (
      fullName.includes(query) ||
      (c.email || "").toLowerCase().includes(query) ||
      (c.position || "").toLowerCase().includes(query) ||
      (c.department || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[calc(100vh-8rem)] flex overflow-hidden">
      {/* COLUMNA IZQUIERDA: CONTACTOS Y BÚSQUEDA */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={16} className="text-[#1B4B43]" /> Colaboradores ({filteredContacts.length})
            </h2>
            <button
              onClick={loadContacts}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              title="Actualizar contactos"
            >
              <RefreshCw size={14} className={loadingContacts ? "animate-spin" : ""} />
            </button>
          </div>

          {/* BARRA DE BÚSQUEDA DE CONTACTOS */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador o puesto..."
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 outline-none focus:border-[#1B4B43] transition-colors"
            />
          </div>
        </div>

        <div ref={contactsListRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingContacts && (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <span className="inline-block animate-spin"><Loader2 size={16} /></span>
              <span>Cargando directorio...</span>
            </div>
          )}

          {!loadingContacts && filteredContacts.length === 0 && (
            <div className="text-center py-12 px-4 text-xs text-slate-400">
              {contactsError || (searchContact ? "No se encontraron usuarios." : "No hay usuarios disponibles para chatear.")}
            </div>
          )}

          {filteredContacts.map((c) => {
            const isSelected = selectedContact?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                  isSelected
                    ? "bg-[#1B4B43] text-white shadow-sm"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                {/* 🟢 AVATAR CON FALLBACK ANTI-ROTO */}
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-emerald-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#1B4B43]">
                  <img
                    src={getChatAvatar(c)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const fallbackName = encodeURIComponent(`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "RH");
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${fallbackName}&background=1B4B43&color=fff`;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                    {c.first_name} {c.last_name}
                  </p>
                  <p className={`text-[10px] truncate ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                    {c.position || c.department || c.email}
                  </p>
                </div>
                {Number(unreadBySender[String(c.id)] || 0) > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadBySender[String(c.id)]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ÁREA DE CONVERSACIÓN */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedContact ? (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
              {/* 🟢 AVATAR EN EL ENCABEZADO DEL CHAT */}
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-emerald-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#1B4B43]">
                <img
                  src={getChatAvatar(selectedContact)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const fallbackName = encodeURIComponent(`${selectedContact.first_name || ""} ${selectedContact.last_name || ""}`.trim() || selectedContact.email || "RH");
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${fallbackName}&background=1B4B43&color=fff`;
                  }}
                />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  {selectedContact.first_name} {selectedContact.last_name}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {selectedContact.position || "Colaborador"} · {selectedContact.department || "General"}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
              {loadingMessages && (
                <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                  <span className="inline-block animate-spin"><Loader2 size={16} /></span>
                  <span>Cargando conversación...</span>
                </div>
              )}

              {!loadingMessages && messages.map((m) => {
                const isMine = String(m.sender_id) === String(user.id);
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isMine
                          ? "bg-[#1B4B43] text-white rounded-br-none"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                      }`}
                    >
                      {m.attachment_url && (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mb-1 block">
                          <img src={m.attachment_url} alt="Imagen compartida" className="max-h-72 max-w-full rounded-lg object-contain" loading="lazy" />
                        </a>
                      )}
                      {m.message && <p className={`${m.message_type === "sticker" ? "text-5xl leading-tight" : "whitespace-pre-line"}`}>{m.message}</p>}
                      <p className={`text-[9px] mt-1 text-right ${isMine ? "text-emerald-200/80" : "text-slate-400"}`}>
                        {m.created_at ? new Date(m.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              {conversationError && (
                <p role="alert" className="mx-auto max-w-lg rounded-lg bg-rose-50 px-3 py-2 text-center text-xs text-rose-700">
                  {conversationError}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {showStickers && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-2" aria-label="Stickers">
                {["😀", "😂", "🥰", "🤗", "🎉", "👍", "👏", "❤️", "🔥", "✨", "😎", "🙌"].map(sticker => (
                  <button key={sticker} type="button" onClick={() => handleSendSticker(sticker)} aria-label={`Enviar sticker ${sticker}`} className="rounded-lg p-1 text-2xl hover:bg-slate-100">{sticker}</button>
                ))}
              </div>
            )}
            {attachment && (
              <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <ImageIcon size={14} /> <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} aria-label="Quitar imagen" className="rounded p-1 text-slate-500 hover:bg-white"><X size={14} /></button>
              </div>
            )}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white">
              <input ref={attachmentInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={event => { setAttachment(event.target.files?.[0] || null); event.target.value = ""; }} />
              <button type="button" onClick={() => attachmentInputRef.current?.click()} aria-label="Adjuntar imagen o GIF" title="Adjuntar imagen o GIF" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ImageIcon size={17} /></button>
              <button type="button" onClick={() => setShowStickers(value => !value)} aria-label="Elegir sticker" title="Elegir sticker" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 ${showStickers ? "bg-emerald-50 text-[#1B4B43]" : "text-slate-600"}`}><Smile size={17} /></button>
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 outline-none focus:border-[#1B4B43] transition-colors"
              />
              <button
                type="submit"
                disabled={(!newMessage.trim() && !attachment) || sending}
                className="px-4 py-2.5 bg-[#1B4B43] text-white rounded-xl text-xs font-bold hover:bg-[#12332D] transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              >
                {sending ? (
                  <span className="inline-block animate-spin"><Loader2 size={14} /></span>
                ) : (
                  <Send size={14} />
                )}
                <span>Enviar</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-3 border border-slate-100">
              <MessageSquare size={28} />
            </div>
            <p className="text-xs font-semibold text-slate-600">Mensajería Interna Núcleo RH</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Usa el buscador o selecciona a cualquier colaborador del directorio para chatear.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

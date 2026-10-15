import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Loader2, MessageSquare, RefreshCw, Search, Send, Smile, X } from "lucide-react";
import { formatMessageTime } from "../utils/formatMessageTime";
import ChatStickerPicker from "./ChatStickerPicker";

export default function FloatingChatWidget({
  token,
  user,
  api,
  unreadCount = 0,
  unreadBySender = {},
  notification,
  onNotificationOpen,
  onNotificationDismiss,
  onRefreshUnread,
  openContact,
  onOpenContactConsumed,
  hidden = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const contactsListRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const previousContactOrderRef = useRef("");

  const refreshContacts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingContacts(true);
    try {
      const rows = await api.getContacts(token);
      setContacts(Array.isArray(rows) ? rows : []);
      setError("");
    } catch (err) {
      if (!silent) setError(err.message || "No se pudo cargar el directorio.");
    } finally {
      if (!silent) setLoadingContacts(false);
    }
  }, [api, token]);

  useEffect(() => {
    if (openContact?.id) {
      setSelectedContact(openContact);
      setIsOpen(true);
      onOpenContactConsumed?.();
    }
  }, [openContact?.id]);

  useEffect(() => {
    if (!isOpen || selectedContact?.id) return;
    refreshContacts();
    const interval = setInterval(() => refreshContacts({ silent: true }), 5000);
    return () => clearInterval(interval);
  }, [isOpen, selectedContact?.id, refreshContacts]);

  useEffect(() => {
    const order = contacts.map(contact => String(contact.id)).join(",");
    if (previousContactOrderRef.current && order !== previousContactOrderRef.current && contactsListRef.current) {
      contactsListRef.current.scrollTop = 0;
    }
    previousContactOrderRef.current = order;
  }, [contacts]);

  useEffect(() => {
    if (!isOpen || !selectedContact?.id) {
      setMessages([]);
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const rows = await api.getMessages(token, selectedContact.id);
        if (!active) return;
        setMessages(Array.isArray(rows) ? rows : []);
        setError("");
        const unread = await api.getUnreadCount(token);
        onRefreshUnread?.(unread || { count: 0, bySender: {} });
      } catch (err) {
        if (active) setError(err.message || "No se pudo cargar la conversación.");
      }
    };
    setLoadingMessages(true);
    refresh().finally(() => { if (active) setLoadingMessages(false); });
    const interval = setInterval(refresh, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [isOpen, selectedContact?.id, token, api, onRefreshUnread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredContacts = contacts.filter(contact => {
    const text = `${contact.first_name || ""} ${contact.last_name || ""} ${contact.email || ""} ${contact.position || ""}`.toLocaleLowerCase("es-MX");
    return text.includes(search.trim().toLocaleLowerCase("es-MX"));
  });

  const sendMessage = async event => {
    event.preventDefault();
    const message = draft.trim();
    if ((!message && !attachment) || !selectedContact || sending) return;
    setSending(true);
    setError("");
    try {
      if (api.sendChatContent) await api.sendChatContent(token, selectedContact.id, { message, attachment });
      else if (message) await api.sendMessage(token, selectedContact.id, message);
      setAttachment(null);
      setShowStickers(false);
      setDraft("");
      const rows = await api.getMessages(token, selectedContact.id);
      setMessages(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  const sendSticker = async sticker => {
    if (!selectedContact || sending) return;
    setSending(true);
    setError("");
    setShowStickers(false);
    try {
      if (api.sendChatContent) await api.sendChatContent(token, selectedContact.id, { message: sticker, messageType: "sticker" });
      else await api.sendMessage(token, selectedContact.id, sticker);
      const rows = await api.getMessages(token, selectedContact.id);
      setMessages(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "No se pudo enviar el sticker.");
    } finally {
      setSending(false);
    }
  };

  if (hidden) return null;

  return (
    <>
      {notification && !isOpen && (
        <div className="fixed bottom-24 right-5 z-[95] w-[min(92vw,360px)] rounded-xl border border-emerald-200 bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B4B43] text-white">
              <MessageSquare size={17} />
            </div>
            <button type="button" onClick={onNotificationOpen} className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-slate-900">Mensaje nuevo de {notification.first_name} {notification.last_name}</p>
              <p className="mt-1 line-clamp-2 break-words text-xs text-slate-600">{notification.message}</p>
              <p className="mt-2 text-[10px] font-semibold text-[#1B4B43]">Abrir chat para responder</p>
            </button>
            <button type="button" onClick={onNotificationDismiss} aria-label="Cerrar notificación" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <section className="fixed bottom-20 right-5 z-[90] flex h-[min(560px,calc(100vh-110px))] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-label="Chat de mensajería">
          <header className="flex items-center gap-2 bg-[#1B4B43] px-4 py-3 text-white">
            {selectedContact ? (
              <button type="button" onClick={() => setSelectedContact(null)} aria-label="Volver al directorio" className="rounded-lg p-1.5 hover:bg-white/10">
                <ArrowLeft size={17} />
              </button>
            ) : <MessageSquare size={18} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{selectedContact ? `${selectedContact.first_name || ""} ${selectedContact.last_name || ""}`.trim() || selectedContact.email : "Mensajería"}</p>
              <p className="text-[10px] text-emerald-100">{selectedContact ? selectedContact.email : "Conversaciones entre usuarios"}</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Minimizar chat" className="rounded-lg p-1.5 hover:bg-white/10">
              <X size={17} />
            </button>
          </header>

          {selectedContact ? (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
                {loadingMessages && messages.length === 0 && <div className="flex justify-center py-8 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>}
                {!loadingMessages && !messages.length && <p className="py-10 text-center text-xs text-slate-400">Aún no hay mensajes. Inicia la conversación.</p>}
                {messages.map(message => {
                  const isMine = String(message.sender_id) === String(user?.id);
                  return (
                    <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${isMine ? "rounded-br-sm bg-[#1B4B43] text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"}`}>
                        {message.attachment_url && <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mb-1 block"><img src={message.attachment_url} alt="Imagen compartida" className="max-h-60 max-w-full rounded-lg object-contain" loading="lazy" /></a>}
                        {message.message && <p className={`${message.message_type === "sticker" ? "text-5xl leading-tight" : "whitespace-pre-wrap break-words"}`}>{message.message}</p>}
                        <p className={`mt-1 text-right text-[9px] ${isMine ? "text-emerald-100" : "text-slate-400"}`}>{formatMessageTime(message.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p>}
              {showStickers && <ChatStickerPicker onSelect={sendSticker} />}
              {attachment && <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"><ImageIcon size={14} /><span className="min-w-0 flex-1 truncate">{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} aria-label="Quitar imagen" className="rounded p-1 hover:bg-white"><X size={14} /></button></div>}
              <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-slate-200 p-3">
                <input ref={attachmentInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={event => { setAttachment(event.target.files?.[0] || null); event.target.value = ""; }} />
                <button type="button" onClick={() => attachmentInputRef.current?.click()} aria-label="Adjuntar imagen o GIF" title="Adjuntar imagen o GIF" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ImageIcon size={16} /></button>
                <button type="button" onClick={() => setShowStickers(value => !value)} aria-label="Elegir sticker" title="Elegir sticker" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 ${showStickers ? "bg-emerald-50 text-[#1B4B43]" : "text-slate-600"}`}><Smile size={16} /></button>
                <input value={draft} onChange={event => setDraft(event.target.value)} maxLength={5000} placeholder="Escribe un mensaje..." className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#1B4B43]" />
                <button type="submit" disabled={sending || (!draft.trim() && !attachment)} aria-label="Enviar mensaje" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B4B43] text-white disabled:opacity-50">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="relative border-b border-slate-100 p-3">
                <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar usuario..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-[#1B4B43]" />
              <button type="button" onClick={() => refreshContacts()} aria-label="Actualizar usuarios" className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1B4B43]">
                  <RefreshCw size={13} />
                </button>
              </div>
              <div ref={contactsListRef} className="flex-1 overflow-y-auto p-2">
                {loadingContacts && <div className="flex justify-center py-8 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>}
                {error && <p role="alert" className="m-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
                {!loadingContacts && !filteredContacts.length && !error && <p className="py-8 text-center text-xs text-slate-400">No hay otros usuarios disponibles.</p>}
                {filteredContacts.map(contact => (
                  <button key={contact.id} type="button" onClick={() => { setSelectedContact(contact); setError(""); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B4B43] text-xs font-bold text-white">{`${contact.first_name?.[0] || "U"}${contact.last_name?.[0] || ""}`.toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-800">{contact.first_name} {contact.last_name}</span>
                      <span className="block truncate text-[10px] text-slate-500">{contact.position || contact.email}</span>
                    </span>
                    {Number(unreadBySender[String(contact.id)] || 0) > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadBySender[String(contact.id)]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <button type="button" onClick={() => setIsOpen(value => !value)} aria-label="Abrir mensajería" className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#1B4B43] text-white shadow-xl transition-transform hover:scale-105">
        <MessageSquare size={22} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
    </>
  );
}

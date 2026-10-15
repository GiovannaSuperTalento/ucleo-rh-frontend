import React, { useMemo, useState } from "react";
import { Search, Smile } from "lucide-react";

const STICKERS = [
  { emoji: "😂", name: "risa", category: "Divertidos" },
  { emoji: "🤣", name: "muerto de risa", category: "Divertidos" },
  { emoji: "🫠", name: "derretido", category: "Divertidos" },
  { emoji: "🤡", name: "payaso", category: "Divertidos" },
  { emoji: "🐸", name: "rana", category: "Divertidos" },
  { emoji: "💀", name: "me muero", category: "Divertidos" },
  { emoji: "😭", name: "llorar", category: "Divertidos" },
  { emoji: "😜", name: "broma", category: "Divertidos" },
  { emoji: "😎", name: "genial", category: "Reacciones" },
  { emoji: "🤔", name: "pensando", category: "Reacciones" },
  { emoji: "🙄", name: "ojos arriba", category: "Reacciones" },
  { emoji: "🥹", name: "conmovido", category: "Reacciones" },
  { emoji: "👏", name: "aplausos", category: "Reacciones" },
  { emoji: "👍", name: "pulgar arriba", category: "Reacciones" },
  { emoji: "👎", name: "pulgar abajo", category: "Reacciones" },
  { emoji: "🤦", name: "facepalm", category: "Reacciones" },
  { emoji: "👋", name: "hola", category: "Saludos" },
  { emoji: "🤗", name: "abrazo", category: "Saludos" },
  { emoji: "🙏", name: "gracias", category: "Saludos" },
  { emoji: "💪", name: "ánimo", category: "Saludos" },
  { emoji: "🥰", name: "cariño", category: "Afecto" },
  { emoji: "❤️", name: "corazón", category: "Afecto" },
  { emoji: "🫶", name: "te quiero", category: "Afecto" },
  { emoji: "😘", name: "beso", category: "Afecto" },
  { emoji: "🎉", name: "fiesta", category: "Celebración" },
  { emoji: "🥳", name: "celebrar", category: "Celebración" },
  { emoji: "🎂", name: "cumpleaños", category: "Celebración" },
  { emoji: "🍾", name: "brindis", category: "Celebración" },
  { emoji: "✅", name: "listo", category: "Trabajo" },
  { emoji: "☕", name: "café", category: "Trabajo" },
  { emoji: "📅", name: "agenda", category: "Trabajo" },
  { emoji: "🚀", name: "vamos", category: "Trabajo" },
];

const CATEGORIES = ["Todos", ...new Set(STICKERS.map(sticker => sticker.category))];

export default function ChatStickerPicker({ onSelect }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const filteredStickers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return STICKERS.filter(sticker =>
      (category === "Todos" || sticker.category === category) &&
      (!query || `${sticker.name} ${sticker.category} ${sticker.emoji}`.toLocaleLowerCase("es-MX").includes(query))
    );
  }, [search, category]);

  return (
    <section className="border-t border-slate-100 bg-white p-3" aria-label="Biblioteca de stickers">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar stickers…"
          aria-label="Buscar stickers"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#1B4B43]"
        />
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${category === item ? "bg-[#1B4B43] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {filteredStickers.length ? (
        <div className="mt-2 grid max-h-36 grid-cols-8 gap-1 overflow-y-auto">
          {filteredStickers.map(sticker => (
            <button
              key={`${sticker.category}-${sticker.name}`}
              type="button"
              onClick={() => onSelect(sticker.emoji)}
              title={`${sticker.name} · ${sticker.category}`}
              aria-label={`Enviar sticker: ${sticker.name}`}
              className="rounded-lg p-1 text-2xl transition hover:scale-110 hover:bg-emerald-50"
            >
              {sticker.emoji}
            </button>
          ))}
        </div>
      ) : (
        <p className="flex items-center justify-center gap-1 py-5 text-xs text-slate-400"><Smile size={14} /> No encontramos stickers.</p>
      )}
      <p className="mt-1 text-[10px] text-slate-400">También puedes adjuntar imágenes o GIF desde el botón de archivo.</p>
    </section>
  );
}

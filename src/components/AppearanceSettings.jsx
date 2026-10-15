import React, { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, RotateCcw, Search } from "lucide-react";

export const APPEARANCE_THEMES = [
  { id: "default", name: "Claro", background: "linear-gradient(135deg, #f3f5f4 0%, #e5eeeb 100%)" },
  { id: "ocean", name: "Océano", background: "linear-gradient(135deg, #dbeafe 0%, #cffafe 48%, #e0f2fe 100%)" },
  { id: "lavender", name: "Lavanda", background: "linear-gradient(135deg, #ede9fe 0%, #f5e9f7 50%, #e0e7ff 100%)" },
  { id: "sunset", name: "Atardecer", background: "linear-gradient(135deg, #ffedd5 0%, #fce7d8 48%, #ffe4e6 100%)" },
  { id: "forest", name: "Bosque", background: "linear-gradient(135deg, #dcfce7 0%, #e7f3df 50%, #d1fae5 100%)" },
  { id: "rose", name: "Rosa", background: "linear-gradient(135deg, #fce7f3 0%, #fae8ff 50%, #ffe4e6 100%)" },
];

const ACCENT_COLORS = [
  { id: "green", name: "Verde", color: "#1B4B43" },
  { id: "blue", name: "Azul", color: "#2457A6" },
  { id: "violet", name: "Violeta", color: "#7042A5" },
  { id: "coral", name: "Coral", color: "#B94B54" },
  { id: "amber", name: "Ámbar", color: "#9A5B12" },
];

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      image.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/webp", 0.78);
        if (compressed.length > 1_800_000) return reject(new Error("La imagen sigue siendo muy pesada. Elige otra de menor tamaño."));
        resolve(compressed);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AppearanceSettings({ appearance, onSave, saving, error, saved, token, api }) {
  const [localError, setLocalError] = useState("");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const fileInput = useRef(null);
  const current = appearance || { themeId: "default", backgroundImage: "" };

  async function handleSearch(event) {
    event.preventDefault();
    if (query.trim().length < 2) return setSearchError("Escribe al menos dos caracteres para buscar.");
    setSearching(true);
    setSearchError("");
    try {
      const results = await api.searchWallpapers(token, query.trim());
      setPhotos(Array.isArray(results) ? results : []);
      if (!results?.length) setSearchError("No encontramos fondos con esas palabras. Prueba otra búsqueda.");
    } catch (searchError) {
      setPhotos([]);
      setSearchError(searchError.message || "No se pudo realizar la búsqueda.");
    } finally {
      setSearching(false);
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setLocalError("Selecciona un archivo de imagen.");
    if (file.size > 12 * 1024 * 1024) return setLocalError("La imagen original no debe superar 12 MB.");
    setLocalError("");
    try {
      const backgroundImage = await compressImage(file);
      onSave({ ...current, backgroundImage, attribution: null });
    } catch (uploadError) {
      setLocalError(uploadError.message || "No se pudo preparar la imagen.");
    }
  }

  return (
    <section className="max-w-4xl">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-slate-800">Personaliza tu panel</h1>
        <p className="text-sm text-slate-500">Elige colores, letra, estilo de botones y fondos. Los cambios solo se aplican a tu cuenta.</p>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Colores, letra e iconos</h2>
        <p className="mb-4 text-xs text-slate-500">La personalización es individual y se guarda automáticamente.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 text-xs font-semibold text-slate-700">Color principal</h3>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map(option => <button key={option.id} type="button" disabled={saving} onClick={() => onSave({ ...current, accentColor: option.id })} title={option.name} aria-label={`Usar color ${option.name}`} className="h-8 w-8 rounded-full border-2 border-white shadow ring-1 ring-slate-300 disabled:opacity-60" style={{ background: option.color, outline: current.accentColor === option.id ? `2px solid ${option.color}` : "none", outlineOffset: 2 }} />)}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{ACCENT_COLORS.find(option => option.id === current.accentColor)?.name || "Verde"}</p>
          </div>
          <label className="block text-xs font-semibold text-slate-700">Tipo de letra
            <select value={current.fontFamily || "inter"} disabled={saving} onChange={event => onSave({ ...current, fontFamily: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700">
              <option value="inter">Moderna (Inter)</option><option value="arial">Sencilla (Arial)</option><option value="georgia">Clásica (Georgia)</option><option value="trebuchet">Redondeada (Trebuchet)</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">Forma de botones con icono
            <select value={current.iconShape || "rounded"} disabled={saving} onChange={event => onSave({ ...current, iconShape: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700">
              <option value="rounded">Redondeada</option><option value="square">Cuadrada</option><option value="circle">Circular</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
          {saving && <><Loader2 size={13} className="animate-spin" /> Guardando cambios…</>}
          {!saving && saved && <><Check size={13} className="text-emerald-700" /> Preferencias guardadas</>}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Temas incluidos</h2>
        <p className="mb-4 text-xs text-slate-500">Elige uno de estos fondos gratuitos. Las tarjetas conservan su contraste para que el sistema siga siendo fácil de leer.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {APPEARANCE_THEMES.map(theme => {
            const selected = current.themeId === theme.id && !current.backgroundImage;
            return (
              <button key={theme.id} type="button" disabled={saving} onClick={() => onSave({ ...current, themeId: theme.id, backgroundImage: "", attribution: null })}
                className="group overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: selected ? "var(--user-primary, #1B4B43)" : "#E1E6E4", borderWidth: selected ? 2 : 1 }}>
                <span className="flex h-20 items-center justify-center" style={{ background: theme.background }}>
                  {selected && <span className="rounded-full bg-white/90 p-1.5 text-emerald-800 shadow"><Check size={16} /></span>}
                </span>
                <span className="block px-3 py-2 text-xs font-medium text-slate-700">{theme.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">Buscar fondos</h2>
          <p className="mb-3 text-xs text-slate-500">Busca paisajes, colores, arte, naturaleza, arquitectura y muchos otros estilos. Imágenes abiertas de Openverse, sin necesidad de crear una clave.</p>
          <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ej. flores rosas, bosque, minimalista…" maxLength={100}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
            <button type="submit" disabled={searching || saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B4B43] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
            </button>
          </form>
          {searchError && <p className="mt-3 text-xs text-red-600">{searchError}</p>}
          {photos.length > 0 && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map(photo => <button key={photo.id} type="button" disabled={saving} onClick={() => onSave({
              ...current,
              themeId: current.themeId || "default",
              backgroundImage: photo.imageUrl,
              attribution: {
                title: photo.alt,
                photographer: photo.photographer,
                attributionText: photo.attributionText,
                photographerUrl: photo.photographerUrl,
                photoUrl: photo.photoUrl,
                license: photo.license,
                licenseVersion: photo.licenseVersion,
                licenseUrl: photo.licenseUrl,
              },
            })} className="overflow-hidden rounded-xl border border-slate-200 text-left transition hover:border-emerald-700 hover:shadow-md disabled:opacity-60">
              <img src={photo.previewUrl} alt={photo.alt} loading="lazy" className="h-32 w-full object-cover" />
              <span className="block truncate px-3 pt-2 text-xs font-medium text-slate-700">{photo.alt || "Elegir este fondo"}</span>
              <span className="block px-3 pt-1 text-[11px] text-slate-500">{photo.photographer} · {String(photo.license || "licencia abierta").toUpperCase()}{photo.licenseVersion ? ` ${photo.licenseVersion}` : ""}</span>
              <span className="block px-3 pb-2 pt-1 text-[10px] text-slate-500">Ver origen y licencia</span>
            </button>)}
          </div>}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">Tu propia imagen</h2>
          <p className="mb-3 text-xs text-slate-500">La imagen se ajusta y comprime antes de guardarse de forma privada en tu cuenta.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={saving} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-[#1B4B43] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
              <ImagePlus size={16} /> Elegir imagen
            </button>
            {current.backgroundImage && <button type="button" disabled={saving} onClick={() => onSave({ ...current, themeId: current.themeId || "default", backgroundImage: "", attribution: null })} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-60"><RotateCcw size={15} /> Quitar imagen</button>}
            <input ref={fileInput} type="file" accept="image/*" disabled={saving} className="hidden" onChange={handleUpload} />
            {saving && <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Guardando…</span>}
            {!saving && saved && <span className="text-xs font-medium text-emerald-700">Cambios guardados</span>}
          </div>
          {current.backgroundImage && <div className="mt-4 h-28 max-w-lg rounded-xl border border-slate-200 bg-cover bg-center" style={{ backgroundImage: `url("${current.backgroundImage}")` }} />}
          {current.attribution?.photographer && <p className="mt-2 text-xs text-slate-500">“{current.attribution.title}”, de <a href={current.attribution.photographerUrl || current.attribution.photoUrl} target="_blank" rel="noreferrer" className="underline">{current.attribution.photographer}</a> · catálogo <a href="https://openverse.org/" target="_blank" rel="noreferrer" className="underline">Openverse</a> · <a href={current.attribution.photoUrl} target="_blank" rel="noreferrer" className="underline">fuente original</a>{current.attribution.license && <> · <a href={current.attribution.licenseUrl} target="_blank" rel="noreferrer" className="underline">{current.attribution.license.toUpperCase()} {current.attribution.licenseVersion}</a></>}</p>}
          {(localError || error) && <p className="mt-3 text-xs text-red-600">{localError || error}</p>}
        </div>
      </div>
    </section>
  );
}

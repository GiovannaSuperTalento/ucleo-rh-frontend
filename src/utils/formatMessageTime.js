export function formatMessageTime(value) {
  if (value === null || value === undefined || value === "") return "";

  let date = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number" || (typeof value === "string" && /^\d{10,13}$/.test(value.trim()))) {
    const numeric = Number(value);
    date = new Date(numeric < 100_000_000_000 ? numeric * 1000 : numeric);
  } else if (typeof value === "string") {
    const raw = value.trim();
    date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      // Acepta timestamps PostgreSQL como "YYYY-MM-DD HH:mm:ss.ffffff+00".
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/i);
      if (match) {
        const [, year, month, day, hour, minute, second = "0", fraction = "", zone = ""] = match;
        const milliseconds = Number(`0.${fraction}`) * 1000;
        const normalizedZone = zone && /^[+-]\d{2}$/.test(zone) ? `${zone}:00` : zone;
        const normalized = `${year}-${month}-${day}T${hour}:${minute}:${second}.${String(Math.floor(milliseconds)).padStart(3, "0")}${normalizedZone}`;
        date = new Date(normalized);
      }
    }
  } else if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      try { date = value.toDate(); } catch { date = null; }
    } else if (Number.isFinite(Number(value.seconds))) {
      date = new Date(Number(value.seconds) * 1000);
    }
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });
}

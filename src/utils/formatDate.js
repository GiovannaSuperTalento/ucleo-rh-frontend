export function formatDate(value, includeTime = false) {
  if (value === null || value === undefined || value === "") return "";
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  const iso = date.toISOString();
  return includeTime ? iso.slice(0, 16).replace("T", " ") : iso.slice(0, 10);
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (!value || typeof value !== "object") return null;

  if (typeof value.toDate === "function") {
    try { return toDate(value.toDate()); } catch { return null; }
  }

  for (const key of ["value", "date", "timestamp", "created_at", "$date"]) {
    if (value[key] !== undefined && value[key] !== value) {
      const date = toDate(value[key]);
      if (date) return date;
    }
  }

  if (Number.isFinite(Number(value.seconds))) {
    const date = new Date(Number(value.seconds) * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const year = Number(value.year);
  const month = Number(value.month);
  const day = Number(value.day);
  if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
    // Calendar objects commonly use either a 1-based month or JavaScript's 0-based month.
    const monthIndex = month === 0 ? 0 : month - 1;
    const date = new Date(Date.UTC(year, monthIndex, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex && date.getUTCDate() === day
      ? date
      : null;
  }

  return null;
}

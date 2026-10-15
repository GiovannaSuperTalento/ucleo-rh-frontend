export function formatDateInSpanishWords(value) {
  if (!value) return "—";
  let year; let monthIndex; let day;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    year = value.getUTCFullYear(); monthIndex = value.getUTCMonth(); day = value.getUTCDate();
  } else {
    const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!match) return "—";
    year = Number(match[1]); monthIndex = Number(match[2]) - 1; day = Number(match[3]);
    const date = new Date(Date.UTC(year, monthIndex, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) return "—";
  }
  const month = new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("es-MX", { month: "long", timeZone: "UTC" });
  return `${day} de ${month} del ${year}`.toLocaleUpperCase("es-MX");
}

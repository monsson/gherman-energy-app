export function formatLei(value: number) {
  return value.toLocaleString("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 2 });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLiters(value: number) {
  return `${value.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
}

/** `yyyy-MM` -> eticheta scurta de luna. Backendul trimite cheia, limba o alege frontendul. */
export function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return month;
  return new Date(year, m - 1, 1).toLocaleDateString("ro-RO", { month: "short" });
}

/** Cat ocupa un scan, ca butonul de descarcare sa poata spune ce se ia - util pe telefon. */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} MB`;
}

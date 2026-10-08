const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "2026-10-13" (fecha local, sin zona horaria) */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date → "19:30" */
export function toTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-10-13" → Date local */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-10-13" → "13/10/2026" */
export function formatDate(s: string): string {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

/** "19:30:00" → "19:30" */
export function formatTime(s: string): string {
  return s.slice(0, 5);
}

/** Date con la hora indicada */
export function withTime(h: number, m = 0): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function isPastBooking(date: string, end: string): boolean {
  const d = parseISODate(date);
  const [h, m] = end.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime() < Date.now();
}

/** Teléfono israelí → formato internacional para WhatsApp */
export function toWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '972' + digits.slice(1);
  return digits;
}

/** Mantiene el orden izquierda→derecha de horas y fechas dentro de texto en hebreo */
export function ltr(s: string): string {
  return `\u2066${s}\u2069`;
}

/** "19:00:00","23:00:00" → "19:00 – 23:00" (sin invertirse en hebreo) */
export function timeRange(start: string, end: string): string {
  return ltr(`${formatTime(start)} – ${formatTime(end)}`);
}

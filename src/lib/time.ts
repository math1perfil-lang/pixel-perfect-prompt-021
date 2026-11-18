/** "HH:MM[:SS]" -> minutes since midnight */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function hhmm(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function atTime(day: Date, t: string): Date {
  const d = new Date(day);
  const mins = timeToMinutes(t);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type DayPeriod = "morning" | "afternoon" | "evening" | "night";
export function periodOf(d: Date): DayPeriod {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export type DurationClass = "rapido" | "algumas-horas" | "integral";
export const DURATION_CLASS_LABEL: Record<DurationClass, string> = {
  rapido: "Rolê rápido",
  "algumas-horas": "Rolê de algumas horas",
  integral: "Experiência de período integral",
};
/** Up to 2h = quick, up to 5h = a few hours, beyond = full period. */
export function classifyDuration(minutes: number): DurationClass {
  if (minutes <= 120) return "rapido";
  if (minutes <= 300) return "algumas-horas";
  return "integral";
}

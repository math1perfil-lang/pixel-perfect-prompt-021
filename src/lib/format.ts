import { PRICE_LEVEL_LABEL } from "./constants";

export function priceLabel(level: number | null | undefined, isEstimate = true): string {
  if (level == null) return "Preço não verificado";
  if (level === 0) return "Gratuito";
  return `${PRICE_LEVEL_LABEL[level]}${isEstimate ? " · estimado" : ""}`;
}

export function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
}

export function km(n: number | null | undefined): string {
  if (n == null) return "—";
  return n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1).replace(".", ",")} km`;
}

export function durationRange(min: number, max: number): string {
  const f = (m: number) => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`);
  return min === max ? f(min) : `${f(min)}–${f(max)}`;
}

export function dateLabel(d: Date, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  const s = d.toLocaleDateString("pt-BR", opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

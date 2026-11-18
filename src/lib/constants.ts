import natureza from "@/assets/cat-natureza.jpg";
import gastronomia from "@/assets/cat-gastronomia.jpg";
import entretenimento from "@/assets/cat-entretenimento.jpg";
import esporte from "@/assets/cat-esporte.jpg";
import cultura from "@/assets/cat-cultura.jpg";
import social from "@/assets/cat-social.jpg";
import familia from "@/assets/cat-familia.jpg";

export type GroupKey =
  | "natureza"
  | "gastronomia"
  | "entretenimento"
  | "esporte"
  | "cultura"
  | "social"
  | "familia";

export const GROUPS: { key: GroupKey; label: string; short: string }[] = [
  { key: "natureza", label: "Natureza", short: "Natureza" },
  { key: "gastronomia", label: "Gastronomia", short: "Comer & beber" },
  { key: "entretenimento", label: "Entretenimento", short: "Entretenimento" },
  { key: "esporte", label: "Esporte e movimento", short: "Movimento" },
  { key: "cultura", label: "Cultura", short: "Cultura" },
  { key: "social", label: "Social", short: "Social" },
  { key: "familia", label: "Família", short: "Família" },
];

export const GROUP_LABEL: Record<string, string> = Object.fromEntries(
  GROUPS.map((g) => [g.key, g.label]),
);

/** Illustrative cover per group, used when a place has no verified photo. */
export const GROUP_IMAGE: Record<string, string> = {
  natureza,
  gastronomia,
  entretenimento,
  esporte,
  cultura,
  social,
  familia,
};

/** Literal class names so Tailwind can see them. */
export const GROUP_DOT: Record<string, string> = {
  natureza: "bg-cat-natureza",
  gastronomia: "bg-cat-gastronomia",
  entretenimento: "bg-cat-entretenimento",
  esporte: "bg-cat-esporte",
  cultura: "bg-cat-cultura",
  social: "bg-cat-social",
  familia: "bg-cat-familia",
};
export const GROUP_TEXT: Record<string, string> = {
  natureza: "text-cat-natureza",
  gastronomia: "text-cat-gastronomia",
  entretenimento: "text-cat-entretenimento",
  esporte: "text-cat-esporte",
  cultura: "text-cat-cultura",
  social: "text-cat-social",
  familia: "text-cat-familia",
};

/** Florianópolis city center (Praça XV) — default origin when location isn't shared. */
export const CITY_CENTER = { lat: -27.5969, lng: -48.5495, label: "centro de Florianópolis" };

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const DISTANCE_OPTIONS = [3, 5, 10, 20, 30, 60];

export const BUDGET_OPTIONS: { value: string; label: string; maxLevel: number | null }[] = [
  { value: "free", label: "Gratuito", maxLevel: 0 },
  { value: "30", label: "Até R$ 30", maxLevel: 1 },
  { value: "30_60", label: "R$ 30 a R$ 60", maxLevel: 2 },
  { value: "60_100", label: "R$ 60 a R$ 100", maxLevel: 3 },
  { value: "100_200", label: "R$ 100 a R$ 200", maxLevel: 4 },
  { value: "200_plus", label: "Acima de R$ 200", maxLevel: 5 },
  { value: "none", label: "Sem limite definido", maxLevel: null },
];

export const PRICE_LEVEL_LABEL: Record<number, string> = {
  0: "Gratuito",
  1: "Até R$ 30",
  2: "R$ 30–60",
  3: "R$ 60–100",
  4: "R$ 100–200",
  5: "Acima de R$ 200",
};

/** Midpoint used only to estimate totals. Always shown as an estimate. */
export const PRICE_LEVEL_MIDPOINT: Record<number, number> = {
  0: 0,
  1: 20,
  2: 45,
  3: 80,
  4: 150,
  5: 250,
};

export type CalendarKind = "work" | "study" | "commitment" | "exercise" | "leisure" | "rest";
export const KIND_LABEL: Record<CalendarKind, string> = {
  work: "Trabalho",
  study: "Estudo",
  commitment: "Compromisso",
  exercise: "Atividade física",
  leisure: "Lazer",
  rest: "Descanso",
};
export const KIND_BG: Record<CalendarKind, string> = {
  work: "bg-kind-work",
  study: "bg-kind-study",
  commitment: "bg-kind-commitment",
  exercise: "bg-kind-exercise",
  leisure: "bg-kind-leisure",
  rest: "bg-kind-rest",
};

export const PERIOD_LABEL: Record<string, string> = {
  morning: "manhã",
  afternoon: "tarde",
  evening: "fim de tarde",
  night: "noite",
};

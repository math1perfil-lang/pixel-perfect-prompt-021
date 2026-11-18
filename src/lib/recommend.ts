/**
 * RULIS Intelligence — rule-based contextual scoring (MVP).
 * Deterministic: no machine learning. Weights come from the backend
 * (recommendation_weights) so they can be tuned without a deploy.
 */
import { BUDGET_OPTIONS, GROUP_LABEL, PRICE_LEVEL_LABEL } from "./constants";
import { estimateTravelMinutes, haversineKm, type LatLng } from "./geo";
import { minutesToLabel, periodOf } from "./time";

export type WeightKey = "interest" | "time" | "distance" | "budget" | "daypart" | "history" | "novelty";
export type Weights = Record<WeightKey, number>;
export const DEFAULT_WEIGHTS: Weights = {
  interest: 25,
  time: 25,
  distance: 15,
  budget: 10,
  daypart: 10,
  history: 10,
  novelty: 5,
};

export type RecoActivity = {
  id: string;
  title: string;
  group_key: string;
  category_id: string | null;
  lat: number | null;
  lng: number | null;
  price_level: number | null;
  duration_min_minutes: number;
  duration_max_minutes: number;
  indoor: boolean;
  energy: string;
  crowd: string;
  solo_friendly: boolean;
  group_friendly: boolean;
  family_friendly: boolean;
  best_periods: string[];
  vibe_tags: string[];
};

export type RecoPrefs = {
  pace: string[];
  crowd: string[];
  company: string[];
  price_openness: string[];
  max_distance_km: number;
  budget_per_experience: string;
};

export type RecoHistory = {
  completedIds: Set<string>;
  completedGroups: Record<string, number>;
  savedIds: Set<string>;
  dislikedIds: Set<string>;
  ignoredIds: Set<string>;
};

export type RecoContext = {
  interestCategoryIds: Set<string>;
  interestGroups: Set<string>;
  categoryNames: Record<string, string>;
  prefs: RecoPrefs;
  origin: LatLng;
  when: Date;
  /** Minutes available, including the way there and back. null = not constrained. */
  availableMinutes?: number | null;
  /** Overrides from RULIS Agora / Surpresa. */
  maxPriceLevel?: number | null;
  maxDistanceKm?: number | null;
  rainProbability?: number | null;
  history: RecoHistory;
};

export type Scored = {
  activity: RecoActivity;
  score: number;
  reasons: string[];
  distanceKm: number | null;
  travelMinutes: number | null;
  components: Record<WeightKey, number>;
};

export function emptyHistory(): RecoHistory {
  return {
    completedIds: new Set(),
    completedGroups: {},
    savedIds: new Set(),
    dislikedIds: new Set(),
    ignoredIds: new Set(),
  };
}

export function budgetMaxLevel(budget: string): number | null {
  return BUDGET_OPTIONS.find((b) => b.value === budget)?.maxLevel ?? null;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Returns null when the activity must not be suggested in this context (hard rules). */
export function scoreActivity(a: RecoActivity, ctx: RecoContext, weights: Weights = DEFAULT_WEIGHTS): Scored | null {
  if (ctx.history.dislikedIds.has(a.id)) return null;

  const maxDist = ctx.maxDistanceKm ?? ctx.prefs.max_distance_km;
  const distanceKm = a.lat != null && a.lng != null ? haversineKm(ctx.origin, { lat: a.lat, lng: a.lng }) : null;
  const travelMinutes = distanceKm != null ? estimateTravelMinutes(distanceKm, "car") : null;

  // Hard rule: outside the accepted radius.
  if (distanceKm != null && distanceKm > maxDist) return null;

  // Hard rule: must fit the free time, counting the way there AND back.
  const needed = a.duration_min_minutes + 2 * (travelMinutes ?? 0);
  if (ctx.availableMinutes != null && needed > ctx.availableMinutes) return null;

  // Hard rule: known price above the budget ceiling.
  const maxLevel = ctx.maxPriceLevel !== undefined ? ctx.maxPriceLevel : budgetMaxLevel(ctx.prefs.budget_per_experience);
  if (maxLevel != null && a.price_level != null && a.price_level > maxLevel) return null;

  const reasons: string[] = [];
  const catName = a.category_id ? ctx.categoryNames[a.category_id] : undefined;

  // Interest + style
  const catMatch = a.category_id != null && ctx.interestCategoryIds.has(a.category_id);
  const groupMatch = ctx.interestGroups.has(a.group_key);
  let style = 0.5;
  let styleHits = 0;
  if (ctx.prefs.pace.length) {
    style = ctx.prefs.pace.includes(a.energy) ? 1 : 0.2;
    styleHits++;
  }
  if (ctx.prefs.crowd.length) {
    const c = ctx.prefs.crowd.includes(a.crowd) ? 1 : 0.2;
    style = styleHits ? (style + c) / 2 : c;
    styleHits++;
  }
  if (ctx.prefs.company.length) {
    const ok =
      (ctx.prefs.company.includes("solo") && a.solo_friendly) ||
      ((ctx.prefs.company.includes("pair") || ctx.prefs.company.includes("group")) && a.group_friendly) ||
      (ctx.prefs.company.includes("family") && a.family_friendly);
    style = styleHits ? (style + (ok ? 1 : 0.3)) / 2 : ok ? 1 : 0.3;
  }
  const interest = clamp((catMatch ? 1 : groupMatch ? 0.6 : 0.1) * 0.8 + style * 0.2);

  // Time
  let time = 0.6;
  if (ctx.availableMinutes != null) {
    const comfy = a.duration_max_minutes + 2 * (travelMinutes ?? 0) <= ctx.availableMinutes;
    time = comfy ? 1 : 0.75;
  }

  // Distance
  const distance = distanceKm == null ? 0.4 : clamp(1 - distanceKm / Math.max(maxDist, 1));

  // Budget
  let budget = 0.5;
  if (a.price_level === 0) budget = ctx.prefs.price_openness.includes("free") || maxLevel === 0 ? 1 : 0.85;
  else if (a.price_level != null) {
    if (maxLevel != null) budget = 1 - (a.price_level / Math.max(maxLevel, 1)) * 0.3;
    else budget = ctx.prefs.price_openness.includes("premium") ? 0.9 : 0.7;
  }

  // Day part + weather
  const period = periodOf(ctx.when);
  let daypart = a.best_periods.includes(period) ? 1 : 0.3;
  const rainy = (ctx.rainProbability ?? 0) >= 60;
  if (rainy) daypart = a.indoor ? Math.min(1, daypart + 0.4) : daypart * 0.3;

  // History
  let history = 0.5;
  if (ctx.history.savedIds.has(a.id)) history = 1;
  else if (ctx.history.ignoredIds.has(a.id)) history = 0.2;
  else if ((ctx.history.completedGroups[a.group_key] ?? 0) > 0) history = 0.75;

  // Novelty
  const groupDone = (ctx.history.completedGroups[a.group_key] ?? 0) > 0;
  const novelty = ctx.history.completedIds.has(a.id) ? 0.2 : groupDone ? 0.6 : 1;

  const components: Record<WeightKey, number> = { interest, time, distance, budget, daypart, history, novelty };
  const totalW = Object.values(weights).reduce((s, w) => s + w, 0) || 1;
  const score =
    (Object.keys(components) as WeightKey[]).reduce((s, k) => s + components[k] * (weights[k] ?? 0), 0) / totalW;

  // Explanations (only for what is actually true)
  const near = distanceKm != null && distanceKm <= maxDist;
  if (catMatch && catName && near) reasons.push(`Você gosta de ${catName.toLowerCase()} e fica dentro do seu raio habitual.`);
  else if (catMatch && catName) reasons.push(`Você marcou ${catName.toLowerCase()} entre seus interesses.`);
  else if (groupMatch) reasons.push(`Combina com seu interesse por ${GROUP_LABEL[a.group_key]?.toLowerCase()}.`);
  if (ctx.availableMinutes != null)
    reasons.push(`Cabe no seu intervalo de ${minutesToLabel(ctx.availableMinutes)}, contando ida e volta.`);
  if (distanceKm != null && distanceKm <= 5) reasons.push(`Fica a ${distanceKm.toFixed(1).replace(".", ",")} km de você.`);
  if (a.price_level === 0) reasons.push("É gratuito.");
  else if (a.price_level != null && maxLevel != null)
    reasons.push(`Faixa estimada (${PRICE_LEVEL_LABEL[a.price_level]}) dentro do seu orçamento.`);
  if (rainy && a.indoor) reasons.push("A previsão indica chuva e é um programa em lugar coberto.");
  if (!groupDone && !catMatch) reasons.push("Você ainda não experimentou essa categoria.");
  if (a.best_periods.includes(period) && !rainy) reasons.push("Combina com este horário do dia.");

  return {
    activity: a,
    score: Math.round(score * 1000) / 10,
    reasons: reasons.slice(0, 3),
    distanceKm,
    travelMinutes,
    components,
  };
}

export function rankActivities(list: RecoActivity[], ctx: RecoContext, weights?: Weights): Scored[] {
  return list
    .map((a) => scoreActivity(a, ctx, weights))
    .filter((s): s is Scored => s !== null)
    .sort((x, y) => y.score - x.score);
}

/** "Saia do Óbvio": best-scored activity from a group the user has never done nor marked. */
export function outsideTheBox(ranked: Scored[], ctx: RecoContext): Scored | null {
  return (
    ranked.find(
      (s) =>
        !ctx.interestGroups.has(s.activity.group_key) &&
        !(ctx.history.completedGroups[s.activity.group_key] > 0),
    ) ?? null
  );
}

/** RULIS Agora: one calm, one food, one different option. */
export function pickTrio(ranked: Scored[], ctx: RecoContext, exclude: Set<string> = new Set()) {
  const pool = ranked.filter((s) => !exclude.has(s.activity.id));
  const used = new Set<string>();
  const take = (pred: (s: Scored) => boolean) => {
    const found = pool.find((s) => !used.has(s.activity.id) && pred(s));
    if (found) used.add(found.activity.id);
    return found ?? null;
  };
  const calm = take((s) => s.activity.energy === "calm" && s.activity.group_key !== "gastronomia");
  const food = take((s) => s.activity.group_key === "gastronomia");
  const different =
    take((s) => !ctx.interestGroups.has(s.activity.group_key)) ?? take(() => true);
  return { calm, food, different };
}

export type SurpriseKind =
  | "economica"
  | "gastronomica"
  | "natureza"
  | "cultural"
  | "romantica"
  | "amigos"
  | "aventura"
  | "perto";

export const SURPRISE_LABEL: Record<SurpriseKind, string> = {
  economica: "Surpresa econômica",
  gastronomica: "Surpresa gastronômica",
  natureza: "Surpresa na natureza",
  cultural: "Surpresa cultural",
  romantica: "Surpresa romântica",
  amigos: "Surpresa com amigos",
  aventura: "Surpresa de aventura",
  perto: "Surpresa perto de casa",
};

export function surpriseFilter(kind: SurpriseKind) {
  return (s: Scored) => {
    const a = s.activity;
    switch (kind) {
      case "economica":
        return a.price_level === 0 || a.price_level === 1;
      case "gastronomica":
        return a.group_key === "gastronomia";
      case "natureza":
        return a.group_key === "natureza";
      case "cultural":
        return a.group_key === "cultura" || a.group_key === "entretenimento";
      case "romantica":
        return a.vibe_tags.includes("romantic");
      case "amigos":
        return a.vibe_tags.includes("friends") || a.group_friendly;
      case "aventura":
        return a.vibe_tags.includes("adventure") || a.group_key === "esporte";
      case "perto":
        return s.distanceKm != null && s.distanceKm <= 5;
    }
  };
}

/** Weighted random pick among the top candidates (randomness injected for testability). */
export function drawSurprise(ranked: Scored[], kind: SurpriseKind, exclude: Set<string>, rand: () => number = Math.random) {
  const pool = ranked.filter((s) => !exclude.has(s.activity.id)).filter(surpriseFilter(kind)).slice(0, 8);
  if (!pool.length) return null;
  const total = pool.reduce((s, p) => s + p.score, 0);
  let r = rand() * total;
  for (const p of pool) {
    r -= p.score;
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

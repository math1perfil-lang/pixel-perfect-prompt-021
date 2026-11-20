import { describe, expect, it } from "vitest";
import { computeFreeWindows } from "@/lib/freetime";
import { classifyDuration } from "@/lib/time";
import {
  DEFAULT_WEIGHTS,
  drawSurprise,
  emptyHistory,
  rankActivities,
  scoreActivity,
  type RecoActivity,
  type RecoContext,
} from "@/lib/recommend";

const origin = { lat: -27.5969, lng: -48.5495 };

const base: RecoActivity = {
  id: "a",
  title: "Parque",
  group_key: "natureza",
  category_id: "parques",
  lat: -27.593,
  lng: -48.554,
  price_level: 0,
  duration_min_minutes: 60,
  duration_max_minutes: 90,
  indoor: false,
  energy: "calm",
  crowd: "reserved",
  solo_friendly: true,
  group_friendly: true,
  family_friendly: true,
  best_periods: ["morning", "afternoon"],
  vibe_tags: [],
};

function ctx(over: Partial<RecoContext> = {}): RecoContext {
  return {
    interestCategoryIds: new Set(["parques"]),
    interestGroups: new Set(["natureza"]),
    categoryNames: { parques: "Parques" },
    prefs: { pace: [], crowd: [], company: [], price_openness: [], max_distance_km: 10, budget_per_experience: "none" },
    origin,
    when: new Date(2026, 10, 18, 10, 0),
    history: emptyHistory(),
    ...over,
  };
}

describe("Meu Tempo Livre", () => {
  it("subtracts recurring commitments from declared availability (Wed 19h–22h minus gym 19h–20h = 20h–22h)", () => {
    const wed = new Date(2026, 10, 18, 8, 0); // Wednesday
    const w = computeFreeWindows({
      availability: [{ weekday: 3, start_time: "19:00", end_time: "22:00" }],
      commitments: [{ title: "Academia", weekdays: [3], start_time: "19:00", end_time: "20:00" }],
      events: [],
      from: wed,
      days: 1,
    });
    expect(w).toHaveLength(1);
    expect(w[0]!.start.getHours()).toBe(20);
    expect(w[0]!.minutes).toBe(120);
  });

  it("does not presume free time when no availability was declared", () => {
    const w = computeFreeWindows({ availability: [], commitments: [], events: [], from: new Date(2026, 10, 18), days: 7 });
    expect(w).toHaveLength(0);
  });

  it("classifies 90 min as a quick outing and 6h as a full period", () => {
    expect(classifyDuration(90)).toBe("rapido");
    expect(classifyDuration(240)).toBe("algumas-horas");
    expect(classifyDuration(360)).toBe("integral");
  });
});

describe("RULIS Intelligence", () => {
  it("never suggests a 3-hour activity for 90 free minutes", () => {
    const long = { ...base, id: "long", duration_min_minutes: 180, duration_max_minutes: 240 };
    expect(scoreActivity(long, ctx({ availableMinutes: 90 }))).toBeNull();
  });

  it("counts the way back: a 60 min activity 30 min away does not fit in 90 min", () => {
    const far = { ...base, id: "far", lat: -27.7, lng: -48.49 }; // ~13 km
    expect(scoreActivity(far, ctx({ availableMinutes: 90, prefs: { ...ctx().prefs, max_distance_km: 30 } }))).toBeNull();
  });

  it("excludes places outside the accepted radius", () => {
    const far = { ...base, id: "far", lat: -27.43, lng: -48.5 };
    expect(scoreActivity(far, ctx({ prefs: { ...ctx().prefs, max_distance_km: 5 } }))).toBeNull();
  });

  it("excludes activities above the budget ceiling", () => {
    const pricey = { ...base, id: "p", price_level: 3 };
    expect(scoreActivity(pricey, ctx({ prefs: { ...ctx().prefs, budget_per_experience: "30" } }))).toBeNull();
  });

  it("never suggests something the user disliked", () => {
    const h = emptyHistory();
    h.dislikedIds.add("a");
    expect(scoreActivity(base, ctx({ history: h }))).toBeNull();
  });

  it("ranks a matching interest above a non-matching one", () => {
    const other = { ...base, id: "b", group_key: "cultura", category_id: "museus" };
    const ranked = rankActivities([other, base], ctx());
    expect(ranked[0]!.activity.id).toBe("a");
  });

  it("uses the configured weights (default 25/25/15/10/10/10/5 = 100)", () => {
    expect(Object.values(DEFAULT_WEIGHTS).reduce((s, w) => s + w, 0)).toBe(100);
  });

  it("explains each suggestion", () => {
    const s = scoreActivity(base, ctx({ availableMinutes: 180 }))!;
    expect(s.reasons.length).toBeGreaterThan(0);
  });

  it("surprise respects the chosen kind", () => {
    const food = { ...base, id: "f", group_key: "gastronomia", category_id: "bares" };
    const ranked = rankActivities([base, food], ctx());
    expect(drawSurprise(ranked, "gastronomica", new Set(), () => 0)?.activity.id).toBe("f");
  });
});

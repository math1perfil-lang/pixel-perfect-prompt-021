import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  activitiesQuery,
  categoriesQuery,
  experiencesQuery,
  interactionsQuery,
  interestsQuery,
  prefsQuery,
  savedQuery,
  weightsQuery,
  type ActivityWithRefs,
} from "@/lib/queries";
import { rankActivities, type RecoContext, type Scored } from "@/lib/recommend";
import { weatherQuery } from "@/lib/weather";
import { CITY_CENTER } from "@/lib/constants";
import { useOrigin } from "./use-origin";

export type ScoredActivity = Scored & { activity: ActivityWithRefs };

export function useRecoBase() {
  const activities = useQuery(activitiesQuery);
  const categories = useQuery(categoriesQuery);
  const interests = useQuery(interestsQuery);
  const prefs = useQuery(prefsQuery);
  const saved = useQuery(savedQuery);
  const interactions = useQuery(interactionsQuery);
  const experiences = useQuery(experiencesQuery);
  const weights = useQuery(weightsQuery);
  const weather = useQuery(weatherQuery(CITY_CENTER.lat, CITY_CENTER.lng));
  const { origin } = useOrigin();

  const isLoading =
    activities.isLoading || categories.isLoading || interests.isLoading || prefs.isLoading || weights.isLoading;
  const error = activities.error || categories.error || interests.error || prefs.error;

  const ctx = useMemo<Omit<RecoContext, "when" | "availableMinutes"> | null>(() => {
    if (!categories.data || !interests.data) return null;
    const p = prefs.data;
    const interestIds = new Set(interests.data);
    const groups = new Set(categories.data.filter((c) => interestIds.has(c.id)).map((c) => c.group_key));
    const completedGroups: Record<string, number> = {};
    for (const e of experiences.data ?? []) if (e.group_key) completedGroups[e.group_key] = (completedGroups[e.group_key] ?? 0) + 1;
    return {
      interestCategoryIds: interestIds,
      interestGroups: groups,
      categoryNames: Object.fromEntries(categories.data.map((c) => [c.id, c.name])),
      prefs: {
        pace: p?.pace ?? [],
        crowd: p?.crowd ?? [],
        company: p?.company ?? [],
        price_openness: p?.price_openness ?? [],
        max_distance_km: p?.max_distance_km ?? 10,
        budget_per_experience: p?.budget_per_experience ?? "none",
      },
      origin,
      rainProbability: weather.data?.rainProbability ?? null,
      history: {
        completedIds: new Set((experiences.data ?? []).map((e) => e.activity_id).filter(Boolean) as string[]),
        completedGroups,
        savedIds: new Set(saved.data ?? []),
        dislikedIds: new Set((interactions.data ?? []).filter((i) => i.kind === "disliked").map((i) => i.activity_id)),
        ignoredIds: new Set((interactions.data ?? []).filter((i) => i.kind === "ignored").map((i) => i.activity_id)),
      },
    };
  }, [categories.data, interests.data, prefs.data, experiences.data, saved.data, interactions.data, origin, weather.data]);

  const rank = (over: Partial<RecoContext> = {}): ScoredActivity[] => {
    if (!ctx || !activities.data) return [];
    return rankActivities(activities.data, { ...ctx, when: new Date(), ...over }, weights.data) as ScoredActivity[];
  };

  return { isLoading, error, ctx, rank, activities: activities.data ?? [], weather, prefs: prefs.data, categories: categories.data ?? [] };
}

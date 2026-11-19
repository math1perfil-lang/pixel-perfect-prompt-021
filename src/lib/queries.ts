import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DEFAULT_WEIGHTS, type Weights } from "./recommend";

export type Activity = Tables<"activities">;
export type Category = Tables<"activity_categories">;
export type Profile = Tables<"profiles">;
export type Preferences = Tables<"user_preferences">;
export type CalendarEvent = Tables<"user_calendar_events">;
export type Itinerary = Tables<"personal_itineraries">;
export type ItineraryItem = Tables<"itinerary_items">;
export type Experience = Tables<"completed_experiences">;
export type EventRow = Tables<"events">;

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const qk = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  prefs: ["prefs"] as const,
  interests: ["interests"] as const,
  categories: ["categories"] as const,
  activities: ["activities"] as const,
  activity: (id: string) => ["activity", id] as const,
  events: ["events"] as const,
  availability: ["availability"] as const,
  commitments: ["commitments"] as const,
  calendar: ["calendar"] as const,
  saved: ["saved"] as const,
  interactions: ["interactions"] as const,
  experiences: ["experiences"] as const,
  weights: ["weights"] as const,
  budgets: ["budgets"] as const,
  itineraries: ["itineraries"] as const,
  itinerary: (id: string) => ["itinerary", id] as const,
  isAdmin: ["isAdmin"] as const,
};

export const meQuery = queryOptions({
  queryKey: qk.me,
  queryFn: async () => {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
});

export const profileQuery = queryOptions({
  queryKey: qk.profile,
  queryFn: async () => {
    const id = await uid();
    return must(await supabase.from("profiles").select("*").eq("id", id).maybeSingle());
  },
});

export const prefsQuery = queryOptions({
  queryKey: qk.prefs,
  queryFn: async () => {
    const id = await uid();
    return must(await supabase.from("user_preferences").select("*").eq("user_id", id).maybeSingle());
  },
});

export const interestsQuery = queryOptions({
  queryKey: qk.interests,
  queryFn: async () => {
    const id = await uid();
    const rows = must(await supabase.from("user_interests").select("category_id").eq("user_id", id));
    return rows.map((r) => r.category_id);
  },
});

export const categoriesQuery = queryOptions({
  queryKey: qk.categories,
  staleTime: 1000 * 60 * 30,
  queryFn: async () =>
    must(await supabase.from("activity_categories").select("*").eq("is_active", true).order("group_key").order("sort_order")),
});

async function fetchActivities() {
  return must(
    await supabase
      .from("activities")
      .select("*, activity_categories(name, slug), data_sources(name, kind, last_updated_at)")
      .eq("is_active", true)
      .order("title"),
  );
}
export type ActivityWithRefs = Awaited<ReturnType<typeof fetchActivities>>[number];
export const activitiesQuery = queryOptions({
  queryKey: qk.activities,
  staleTime: 1000 * 60 * 5,
  queryFn: fetchActivities,
});

export const activityQuery = (id: string) =>
  queryOptions({
    queryKey: qk.activity(id),
    queryFn: async () =>
      must(
        await supabase
          .from("activities")
          .select("*, activity_categories(name, slug), data_sources(name, kind, notes, last_updated_at), activity_opening_hours(*), activity_images(*)")
          .eq("id", id)
          .maybeSingle(),
      ),
  });

export const eventsQuery = queryOptions({
  queryKey: qk.events,
  queryFn: async () =>
    must(
      await supabase
        .from("events")
        .select("*, data_sources(name, kind, last_updated_at)")
        .eq("is_active", true)
        .gte("starts_at", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
        .order("starts_at"),
    ),
});

export const availabilityQuery = queryOptions({
  queryKey: qk.availability,
  queryFn: async () => {
    const id = await uid();
    return must(await supabase.from("user_availability").select("*").eq("user_id", id).order("weekday").order("start_time"));
  },
});

export const commitmentsQuery = queryOptions({
  queryKey: qk.commitments,
  queryFn: async () => {
    const id = await uid();
    return must(await supabase.from("user_recurring_commitments").select("*").eq("user_id", id).order("start_time"));
  },
});

export const calendarQuery = queryOptions({
  queryKey: qk.calendar,
  queryFn: async () => {
    const id = await uid();
    return must(
      await supabase.from("user_calendar_events").select("*").eq("user_id", id).is("deleted_at", null).order("starts_at"),
    );
  },
});

export const savedQuery = queryOptions({
  queryKey: qk.saved,
  queryFn: async () => {
    const id = await uid();
    const rows = must(await supabase.from("saved_activities").select("activity_id, created_at").eq("user_id", id));
    return rows.map((r) => r.activity_id);
  },
});

export const interactionsQuery = queryOptions({
  queryKey: qk.interactions,
  queryFn: async () => {
    const id = await uid();
    return must(
      await supabase
        .from("activity_interactions")
        .select("activity_id, kind, created_at")
        .eq("user_id", id)
        .in("kind", ["ignored", "disliked"])
        .order("created_at", { ascending: false })
        .limit(500),
    );
  },
});

export const experiencesQuery = queryOptions({
  queryKey: qk.experiences,
  queryFn: async () => {
    const id = await uid();
    return must(
      await supabase.from("completed_experiences").select("*").eq("user_id", id).order("completed_at", { ascending: false }),
    );
  },
});

export const weightsQuery = queryOptions({
  queryKey: qk.weights,
  staleTime: 1000 * 60 * 10,
  queryFn: async (): Promise<Weights> => {
    const rows = must(await supabase.from("recommendation_weights").select("key, weight"));
    const w = { ...DEFAULT_WEIGHTS };
    for (const r of rows) if (r.key in w) w[r.key as keyof Weights] = Number(r.weight);
    return w;
  },
});

export const budgetsQuery = queryOptions({
  queryKey: qk.budgets,
  queryFn: async () => {
    const id = await uid();
    return must(await supabase.from("leisure_budgets").select("*").eq("user_id", id));
  },
});

export const itinerariesQuery = queryOptions({
  queryKey: qk.itineraries,
  queryFn: async () => {
    const id = await uid();
    return must(
      await supabase
        .from("personal_itineraries")
        .select("*, itinerary_items(*)")
        .eq("user_id", id)
        .is("deleted_at", null)
        .order("start_date"),
    );
  },
});

export const isAdminQuery = queryOptions({
  queryKey: qk.isAdmin,
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase.rpc("has_role", { _user_id: id, _role: "admin" });
    if (error) throw new Error(error.message);
    return Boolean(data);
  },
});

/** Records a behavioural signal used by the recommendation rules. Fire-and-forget. */
export async function track(activityId: string, kind: "viewed" | "saved" | "scheduled" | "completed" | "ignored" | "disliked" | "shared", context?: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("activity_interactions").insert({ activity_id: activityId, kind, context, user_id: data.user.id });
}

import { supabase } from "@/integrations/supabase/client";

/** Persist what was shown, so accepted/rejected rates can be measured. Returns the log ids. */
export async function logShown(surface: string, items: { id: string; score: number; reasons: string[] }[]) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user || !items.length) return [] as string[];
  const { data } = await supabase
    .from("recommendation_logs")
    .insert(items.map((i) => ({ user_id: u.user!.id, activity_id: i.id, surface, score: i.score, reasons: i.reasons })))
    .select("id, activity_id");
  return (data ?? []).map((d) => d.id);
}

export async function markLog(id: string | undefined, accepted: boolean) {
  if (!id) return;
  await supabase.from("recommendation_logs").update({ accepted }).eq("id", id);
}

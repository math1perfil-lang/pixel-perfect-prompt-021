import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import type { Availability, Commitment } from "./freetime";
import type { CalendarKind } from "./constants";

export type CommitmentDraft = Commitment & { kind: CalendarKind };

async function userId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export async function saveInterests(categoryIds: string[]) {
  const id = await userId();
  const del = await supabase.from("user_interests").delete().eq("user_id", id);
  if (del.error) throw del.error;
  if (categoryIds.length) {
    const ins = await supabase.from("user_interests").insert(categoryIds.map((c) => ({ user_id: id, category_id: c })));
    if (ins.error) throw ins.error;
  }
}

export async function savePrefs(p: Omit<TablesUpdate<"user_preferences">, "user_id">) {
  const id = await userId();
  const { error } = await supabase.from("user_preferences").upsert({ ...p, user_id: id });
  if (error) throw error;
}

export async function saveRoutine(availability: Availability[], commitments: CommitmentDraft[]) {
  const id = await userId();
  const a = await supabase.from("user_availability").delete().eq("user_id", id);
  if (a.error) throw a.error;
  const valid = availability.filter((x) => x.end_time > x.start_time);
  if (valid.length) {
    const r = await supabase.from("user_availability").insert(valid.map((x) => ({ ...x, user_id: id })));
    if (r.error) throw r.error;
  }
  const c = await supabase.from("user_recurring_commitments").delete().eq("user_id", id);
  if (c.error) throw c.error;
  const vc = commitments.filter((x) => x.end_time > x.start_time && x.weekdays.length && x.title.trim());
  if (vc.length) {
    const r = await supabase.from("user_recurring_commitments").insert(
      vc.map((x) => ({
        user_id: id,
        title: x.title.trim(),
        kind: x.kind,
        weekdays: x.weekdays,
        start_time: x.start_time,
        end_time: x.end_time,
        is_active: x.is_active ?? true,
      })),
    );
    if (r.error) throw r.error;
  }
}

export async function updateProfile(p: TablesUpdate<"profiles">) {
  const id = await userId();
  const { id: _omit, is_active: _a, plan: _p, created_at: _c, updated_at: _u, deleted_at: _d, ...safe } = p;
  const { error } = await supabase.from("profiles").update(safe).eq("id", id);
  if (error) throw error;
}

export async function uploadAvatar(file: File): Promise<string> {
  const id = await userId();
  if (file.size > 5 * 1024 * 1024) throw new Error("A foto precisa ter até 5 MB.");
  if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function avatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** LGPD: permanently deletes the caller's account. The id comes only from the verified session. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
    if (files?.length) await supabaseAdmin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Não foi possível excluir a conta agora.");
    return { ok: true };
  });

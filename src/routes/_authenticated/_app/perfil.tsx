import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookHeart, Camera, ChevronRight, Clock, Download, Loader2, LogOut, PiggyBank, Save, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ActivityCard } from "@/components/rulis/ActivityCard";
import { Chip, ErrorBlock, LoadingBlock, PageHeader, Section } from "@/components/rulis/common";
import { useSignOut } from "@/components/rulis/AppShell";
import { activitiesQuery, categoriesQuery, interestsQuery, meQuery, prefsQuery, profileQuery, qk, savedQuery } from "@/lib/queries";
import { avatarUrl, saveInterests, savePrefs, updateProfile, uploadAvatar } from "@/lib/profile-save";
import { deleteMyAccount } from "@/lib/account.functions";
import { BUDGET_OPTIONS, GROUP_DOT, GROUPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — RULIS" },
      { name: "description", content: "Seu perfil de lazer, preferências, privacidade e dados." },
      { property: "og:title", content: "Meu perfil — RULIS" },
      { property: "og:description", content: "Seu perfil de lazer, preferências, privacidade e dados." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery(meQuery);
  const profile = useQuery(profileQuery);
  const prefs = useQuery(prefsQuery);
  const interests = useQuery(interestsQuery);
  const cats = useQuery(categoriesQuery);
  const saved = useQuery(savedQuery);
  const acts = useQuery(activitiesQuery);
  const signOut = useSignOut();
  const del = useServerFn(deleteMyAccount);

  const [form, setForm] = useState({ full_name: "", city: "", state: "", birth_date: "" });
  const [sel, setSel] = useState<string[]>([]);
  const [dist, setDist] = useState(10);
  const [budget, setBudget] = useState("none");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data) {
      setForm({ full_name: profile.data.full_name, city: profile.data.city ?? "", state: profile.data.state ?? "", birth_date: profile.data.birth_date ?? "" });
      avatarUrl(profile.data.avatar_url).then(setPhoto);
    }
  }, [profile.data]);
  useEffect(() => { if (interests.data) setSel(interests.data); }, [interests.data]);
  useEffect(() => { if (prefs.data) { setDist(prefs.data.max_distance_km); setBudget(prefs.data.budget_per_experience); } }, [prefs.data]);

  const savedActs = useMemo(() => (acts.data ?? []).filter((a) => saved.data?.includes(a.id)), [acts.data, saved.data]);

  if (profile.isLoading) return <LoadingBlock />;
  if (profile.error) return <ErrorBlock error={profile.error} />;
  const p = profile.data!;

  async function wrap(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  }

  const setPrivacy = (k: "is_public" | "share_activities" | "share_availability" | "allow_invites" | "location_consent", v: boolean) =>
    wrap(k, async () => { await updateProfile({ [k]: v }); await qc.invalidateQueries({ queryKey: qk.profile }); }, "Privacidade atualizada");

  async function exportData() {
    setBusy("export");
    try {
      const uid = p.id;
      const tables = ["profiles", "user_preferences", "user_interests", "user_availability", "user_recurring_commitments", "user_calendar_events", "saved_activities", "activity_interactions", "completed_experiences", "personal_itineraries", "itinerary_items", "leisure_budgets", "recommendation_logs"] as const;
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), email: me.data?.email };
      for (const t of tables) {
        const col = t === "profiles" ? "id" : "user_id";
        const { data } = await supabase.from(t).select("*").eq(col, uid);
        out[t] = data;
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "meus-dados-rulis.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Meu perfil" title="Seu jeito de aproveitar." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-card p-5 shadow-card">
            <div className="flex items-center gap-4">
              <label className="relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-primary-soft">
                {photo ? <img src={photo} alt="Sua foto" className="size-full object-cover" /> : <User className="size-8 text-primary" />}
                <span className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full bg-ink text-ink-foreground"><Camera className="size-3.5" /></span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void wrap("photo", async () => { const path = await uploadAvatar(f); await updateProfile({ avatar_url: path }); await qc.invalidateQueries({ queryKey: qk.profile }); }, "Foto atualizada");
                  }}
                />
              </label>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold">{p.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">{me.data?.email}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="space-y-1.5"><Label htmlFor="pf-name">Nome</Label><Input id="pf-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="pf-birth">Nascimento</Label><Input id="pf-birth" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div className="space-y-1.5"><Label htmlFor="pf-city">Cidade</Label><Input id="pf-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="pf-uf">UF</Label><Input id="pf-uf" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              </div>
              <Button
                variant="soft"
                disabled={busy === "profile" || form.full_name.trim().length < 2}
                onClick={() => wrap("profile", async () => { await updateProfile({ full_name: form.full_name.trim(), city: form.city.trim() || null, state: form.state.trim().toUpperCase() || null, birth_date: form.birth_date || null }); await qc.invalidateQueries({ queryKey: qk.profile }); }, "Perfil salvo")}
              >
                {busy === "profile" ? <Loader2 className="animate-spin" /> : <Save />} Salvar dados
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-card shadow-card">
            {[
              { to: "/meus-roles" as const, icon: BookHeart, label: "Meus rolês" },
              { to: "/orcamento" as const, icon: PiggyBank, label: "Orçamento de lazer" },
              { to: "/tempo-livre" as const, icon: Clock, label: "Meu tempo livre e rotina" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="flex items-center gap-3 border-b px-5 py-4 last:border-0 hover:bg-secondary">
                <l.icon className="size-5 text-primary" /> <span className="flex-1 font-medium">{l.label}</span> <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>

          <div className="rounded-[2rem] bg-card p-5 shadow-card">
            <h2 className="text-lg font-bold">Privacidade</h2>
            <p className="text-sm text-muted-foreground">Nada é compartilhado sem você ligar aqui.</p>
            <div className="mt-4 space-y-4">
              {([
                ["is_public", "Perfil público", "Outras pessoas podem te encontrar pelo nome."],
                ["share_activities", "Compartilhar atividades", "Amigos veem os rolês que você registrar."],
                ["share_availability", "Compartilhar disponibilidade", "Amigos veem quando vocês estão livres ao mesmo tempo."],
                ["allow_invites", "Receber convites", "Amigos podem te chamar para rolês."],
                ["location_consent", "Lembrar que posso usar minha localização", "Mesmo assim, ela só é lida quando você pedir e nunca vira histórico."],
              ] as const).map(([k, l, d]) => (
                <div key={k} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{l}</p>
                    <p className="text-xs text-muted-foreground">{d}</p>
                  </div>
                  <Switch checked={!!p[k]} disabled={busy === k} onCheckedChange={(v) => setPrivacy(k, v)} aria-label={l} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] bg-card p-5 shadow-card">
            <h2 className="text-lg font-bold">Interesses</h2>
            <div className="mt-3 space-y-4">
              {GROUPS.map((g) => (
                <div key={g.key}>
                  <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><span className={cn("size-2 rounded-full", GROUP_DOT[g.key])} /> {g.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(cats.data ?? []).filter((c) => c.group_key === g.key).map((c) => (
                      <Chip key={c.id} active={sel.includes(c.id)} onClick={() => setSel(sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])} className="px-3 py-1.5 text-xs">{c.name}</Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="text-sm font-semibold">Distância máxima: {dist} km</p>
              <Slider className="mt-3" min={1} max={100} value={[dist]} onValueChange={([v]) => setDist(v ?? 10)} aria-label="Distância máxima" />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Orçamento por rolê</p>
              <div className="flex flex-wrap gap-1.5">
                {BUDGET_OPTIONS.map((b) => <Chip key={b.value} active={budget === b.value} onClick={() => setBudget(b.value)} className="px-3 py-1.5 text-xs">{b.label}</Chip>)}
              </div>
            </div>
            <Button
              variant="hero"
              className="mt-5"
              disabled={busy === "prefs" || sel.length === 0}
              onClick={() => wrap("prefs", async () => { await saveInterests(sel); await savePrefs({ max_distance_km: dist, budget_per_experience: budget }); await Promise.all([qc.invalidateQueries({ queryKey: qk.interests }), qc.invalidateQueries({ queryKey: qk.prefs })]); }, "Preferências salvas")}
            >
              {busy === "prefs" ? <Loader2 className="animate-spin" /> : <Save />} Salvar preferências
            </Button>
          </div>

          <Section title="Salvos">
            {savedActs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Toque no coração de uma experiência para guardar aqui.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">{savedActs.map((a) => <ActivityCard key={a.id} activity={a} variant="grid" />)}</div>
            )}
          </Section>

          <div className="rounded-[2rem] bg-card p-5 shadow-card">
            <h2 className="text-lg font-bold">Seus dados</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportData} disabled={busy === "export"}>{busy === "export" ? <Loader2 className="animate-spin" /> : <Download />} Exportar meus dados</Button>
              <Button variant="outline" onClick={signOut}><LogOut /> Sair</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive"><Trash2 /> Excluir conta</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
                    <AlertDialogDescription>Isso apaga seu perfil, rotina, agenda, roteiros e memórias. Não dá para desfazer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        try {
                          await del();
                          qc.clear();
                          await supabase.auth.signOut();
                          navigate({ to: "/", replace: true });
                          toast.success("Conta excluída");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Erro");
                        }
                      }}
                    >
                      Excluir definitivamente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

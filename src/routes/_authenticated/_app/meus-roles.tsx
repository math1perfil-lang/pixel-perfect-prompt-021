import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookHeart, Heart, Plus, Repeat, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, Section } from "@/components/rulis/common";
import { ExperienceDialog } from "@/components/rulis/ExperienceDialog";
import { experiencesQuery, itinerariesQuery, qk } from "@/lib/queries";
import { GROUP_DOT, GROUP_LABEL } from "@/lib/constants";
import { brl, dateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/meus-roles")({
  head: () => ({
    meta: [
      { title: "Meus rolês — RULIS" },
      { name: "description", content: "Sua memória de experiências: o que você fez, descobriu e quer repetir." },
      { property: "og:title", content: "Meus rolês — RULIS" },
      { property: "og:description", content: "Sua memória de experiências na RULIS." },
    ],
  }),
  component: MeusRoles,
});

function MeusRoles() {
  const qc = useQueryClient();
  const xp = useQuery(experiencesQuery);
  const its = useQuery(itinerariesQuery);
  const [adding, setAdding] = useState(false);

  const fav = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: boolean }) => {
      const { error } = await supabase.from("completed_experiences").update({ is_favorite: v }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.experiences }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("completed_experiences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.experiences }); toast.success("Removido"); },
  });

  const stats = useMemo(() => {
    const list = xp.data ?? [];
    const now = new Date();
    const thisMonth = list.filter((e) => { const d = new Date(e.completed_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const groups: Record<string, number> = {};
    for (const e of list) if (e.group_key) groups[e.group_key] = (groups[e.group_key] ?? 0) + 1;
    const monthGroups: Record<string, number> = {};
    for (const e of thisMonth) if (e.group_key) monthGroups[e.group_key] = (monthGroups[e.group_key] ?? 0) + 1;
    const places = new Set(list.map((e) => e.activity_id).filter(Boolean)).size;
    const firstSeen = new Map<string, string>();
    for (const e of [...list].reverse()) if (e.activity_id && !firstSeen.has(e.activity_id)) firstSeen.set(e.activity_id, e.completed_at);
    const newPlacesThisMonth = [...firstSeen.values()].filter((d) => { const x = new Date(d); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); }).length;
    const byMonth = new Map<string, typeof list>();
    for (const e of list) {
      const d = new Date(e.completed_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
    }
    const favorites = list.filter((e) => e.is_favorite || (e.rating ?? 0) >= 5);
    const doneItineraries = (its.data ?? []).filter((i) => new Date(i.end_date) < now && i.itinerary_items.length > 0).length;
    return { list, thisMonth, groups, monthGroups, places, newPlacesThisMonth, byMonth, favorites, doneItineraries };
  }, [xp.data, its.data]);

  if (xp.isLoading) return <LoadingBlock />;
  if (xp.error) return <ErrorBlock error={xp.error} onRetry={() => xp.refetch()} />;

  const topGroups = Object.entries(stats.groups).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <PageHeader eyebrow="Memória de experiências" title="Meus rolês" subtitle="Uma memória pessoal do que valeu a pena. Sem placar, sem metas." action={<Button variant="hero" onClick={() => setAdding(true)}><Plus /> Registrar rolê</Button>} />

      {stats.list.length === 0 ? (
        <EmptyState icon={<BookHeart className="size-5" />} title="Ainda sem rolês registrados">
          Depois de uma experiência, toque em “Já fui” na página dela — ou registre aqui qualquer coisa boa que você fez.
        </EmptyState>
      ) : (
        <>
          <div className="relative mb-10 overflow-hidden rounded-[2rem] bg-ink p-6 text-ink-foreground shadow-float">
            <div className="absolute -bottom-20 -right-10 size-64 rounded-full bg-sunset opacity-50 blur-2xl" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.16em] text-sun">Seu mês na RULIS · {dateLabel(new Date(), { month: "long" })}</p>
            <div className="relative mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat n={stats.thisMonth.length} l="experiências realizadas" />
              <Stat n={stats.newPlacesThisMonth} l="lugares novos" />
              <Stat n={stats.monthGroups.natureza ?? 0} l="passeios ao ar livre" />
              <Stat n={stats.monthGroups.gastronomia ?? 0} l="experiências gastronômicas" />
            </div>
          </div>

          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-card p-5 shadow-card"><p className="text-sm text-muted-foreground">Lugares descobertos</p><p className="font-display text-3xl font-extrabold">{stats.places}</p></div>
            <div className="rounded-3xl bg-card p-5 shadow-card"><p className="text-sm text-muted-foreground">Roteiros concluídos</p><p className="font-display text-3xl font-extrabold">{stats.doneItineraries}</p></div>
            <div className="rounded-3xl bg-card p-5 shadow-card">
              <p className="text-sm text-muted-foreground">Categorias mais exploradas</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topGroups.length === 0 ? <span className="text-sm">—</span> : topGroups.slice(0, 3).map(([g, n]) => (
                  <span key={g} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"><span className={cn("size-2 rounded-full", GROUP_DOT[g])} />{GROUP_LABEL[g]} · {n}</span>
                ))}
              </div>
            </div>
          </div>

          {stats.favorites.length > 0 && (
            <Section title="Favoritas">
              <div className="flex flex-wrap gap-2">
                {stats.favorites.map((f) => <span key={f.id} className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary">{f.title}</span>)}
              </div>
            </Section>
          )}

          <Section title="Histórico">
            <div className="space-y-6">
              {[...stats.byMonth.entries()].map(([k, list]) => {
                const [y, m] = k.split("-").map(Number);
                return (
                  <div key={k}>
                    <p className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">{dateLabel(new Date(y!, m! - 1, 1), { month: "long", year: "numeric" })}</p>
                    <div className="space-y-2">
                      {list.map((e) => (
                        <div key={e.id} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card">
                          <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", e.group_key ? GROUP_DOT[e.group_key] : "bg-muted-foreground")} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{e.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(e.completed_at).toLocaleDateString("pt-BR")}
                              {e.rating && <> · {Array.from({ length: e.rating }).map((_, i) => <Star key={i} className="inline size-3 fill-sun text-sun" />)}</>}
                              {e.would_repeat && <> · <Repeat className="inline size-3" /> repetiria</>}
                              {e.spent != null && ` · ${brl(Number(e.spent))}`}
                            </p>
                            {e.highlight && <p className="mt-1 text-sm">“{e.highlight}”</p>}
                            {e.notes && <p className="mt-1 text-sm text-muted-foreground">{e.notes}</p>}
                          </div>
                          <button aria-label={e.is_favorite ? "Desfavoritar" : "Favoritar"} onClick={() => fav.mutate({ id: e.id, v: !e.is_favorite })} className="p-1">
                            <Heart className={cn("size-4", e.is_favorite ? "fill-primary text-primary" : "text-muted-foreground")} />
                          </button>
                          <button aria-label="Remover" onClick={() => remove.mutate(e.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}
      {adding && <ExperienceDialog open onOpenChange={setAdding} activity={null} />}
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-extrabold">{n}</p>
      <p className="text-sm opacity-80">{l}</p>
    </div>
  );
}

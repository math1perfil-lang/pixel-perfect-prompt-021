import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActivityCard } from "@/components/rulis/ActivityCard";
import { ErrorBlock, HScroll, LoadingBlock, PageHeader, Section } from "@/components/rulis/common";
import { useRecoBase } from "@/hooks/use-reco";
import { activitiesQuery, budgetsQuery, calendarQuery, experiencesQuery, itinerariesQuery, qk } from "@/lib/queries";
import { GROUP_DOT, GROUP_LABEL } from "@/lib/constants";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/orcamento")({
  head: () => ({
    meta: [
      { title: "Orçamento de lazer — RULIS" },
      { name: "description", content: "Planeje quanto quer investir em lazer por semana, mês e categoria." },
      { property: "og:title", content: "Orçamento de lazer — RULIS" },
      { property: "og:description", content: "Planeje quanto quer investir em lazer." },
    ],
  }),
  component: Orcamento,
});

const BUCKETS = ["gastronomia", "natureza", "entretenimento", "cultura", "esporte", "outros"];

function Orcamento() {
  const qc = useQueryClient();
  const budgets = useQuery(budgetsQuery);
  const cal = useQuery(calendarQuery);
  const its = useQuery(itinerariesQuery);
  const xp = useQuery(experiencesQuery);
  const acts = useQuery(activitiesQuery);
  const reco = useRecoBase();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!budgets.data) return;
    const v: Record<string, string> = {};
    for (const b of budgets.data) v[`${b.period}:${b.group_key}`] = String(Number(b.amount));
    setVals(v);
  }, [budgets.data]);

  const now = new Date();
  const inMonth = (iso: string) => { const d = new Date(iso); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); };
  const groupOf = useMemo(() => new Map((acts.data ?? []).map((a) => [a.id, a.group_key])), [acts.data]);

  const planned = useMemo(() => {
    const by: Record<string, number> = {};
    const add = (g: string | undefined | null, n: number) => { const k = g && BUCKETS.includes(g) ? g : "outros"; by[k] = (by[k] ?? 0) + n; };
    for (const e of cal.data ?? []) if (inMonth(e.starts_at) && e.estimated_cost != null) add(e.activity_id ? groupOf.get(e.activity_id) : null, Number(e.estimated_cost));
    for (const it of its.data ?? []) for (const i of it.itinerary_items) if (inMonth(i.day_date + "T12:00:00") && i.estimated_cost != null) add(i.activity_id ? groupOf.get(i.activity_id) : null, Number(i.estimated_cost));
    return by;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cal.data, its.data, groupOf]);
  const spent = useMemo(() => (xp.data ?? []).filter((e) => inMonth(e.completed_at)).reduce((s, e) => s + Number(e.spent ?? 0), 0), [xp.data]);
  const plannedTotal = Object.values(planned).reduce((s, n) => s + n, 0);
  const monthly = Number(vals["monthly:total"] || 0);

  const freeAlternatives = reco.rank({ maxPriceLevel: 0 }).slice(0, 6);
  const cheapAlternatives = reco.rank({ maxPriceLevel: 1 }).filter((s) => s.activity.price_level === 1).slice(0, 6);

  if (budgets.isLoading) return <LoadingBlock />;
  if (budgets.error) return <ErrorBlock error={budgets.error} />;

  async function save() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const rows = Object.entries(vals)
        .filter(([, v]) => v !== "" && !Number.isNaN(Number(v.replace(",", "."))))
        .map(([k, v]) => { const [period, group_key] = k.split(":"); return { user_id: u.user!.id, period: period!, group_key: group_key!, amount: Math.max(0, Number(v.replace(",", "."))) }; });
      const empty = Object.entries(vals).filter(([, v]) => v === "").map(([k]) => k);
      if (rows.length) {
        const { error } = await supabase.from("leisure_budgets").upsert(rows, { onConflict: "user_id,period,group_key" });
        if (error) throw error;
      }
      for (const k of empty) {
        const [period, group_key] = k.split(":");
        await supabase.from("leisure_budgets").delete().eq("user_id", u.user.id).eq("period", period!).eq("group_key", group_key!);
      }
      await qc.invalidateQueries({ queryKey: qk.budgets });
      toast.success("Orçamento salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const field = (k: string, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
        <Input id={k} inputMode="decimal" className="pl-9" value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} placeholder="—" />
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="Meu orçamento de lazer" title="Planejar, não controlar." subtitle="Um norte para escolher rolês. Nada aqui mexe com dinheiro de verdade, e as estimativas não são preços garantidos." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[2rem] bg-card p-5 shadow-card">
          <h2 className="text-lg font-bold">Quanto você quer reservar?</h2>
          <div className="grid grid-cols-2 gap-3">
            {field("weekly:total", "Por semana")}
            {field("monthly:total", "Por mês")}
          </div>
          <h3 className="pt-2 font-semibold">Por categoria (mensal)</h3>
          <div className="grid grid-cols-2 gap-3">
            {BUCKETS.map((g) => field(`monthly:${g}`, g === "outros" ? "Outros" : GROUP_LABEL[g]!))}
          </div>
          <Button variant="hero" onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar orçamento</Button>
        </div>

        <div className="space-y-4 rounded-[2rem] bg-card p-5 shadow-card">
          <h2 className="text-lg font-bold">Este mês</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Planejado (estimado)</p><p className="font-display text-2xl font-extrabold">{brl(plannedTotal)}</p></div>
            <div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Registrado como gasto</p><p className="font-display text-2xl font-extrabold">{brl(spent)}</p></div>
          </div>
          {monthly > 0 && (
            <div>
              <div className="flex justify-between text-sm"><span>Do seu orçamento mensal</span><span>{brl(plannedTotal)} de {brl(monthly)}</span></div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-sunset" style={{ width: `${Math.min(100, (plannedTotal / monthly) * 100)}%` }} /></div>
              {plannedTotal > monthly && <p className="mt-1 text-xs text-muted-foreground">Passou um pouco do que você planejou. Que tal umas opções gratuitas abaixo?</p>}
            </div>
          )}
          <div className="space-y-2.5">
            {BUCKETS.map((g) => {
              const lim = Number(vals[`monthly:${g}`] || 0);
              const p = planned[g] ?? 0;
              if (!lim && !p) return null;
              return (
                <div key={g}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", g === "outros" ? "bg-muted-foreground" : GROUP_DOT[g])} /> {g === "outros" ? "Outros" : GROUP_LABEL[g]}</span>
                    <span className="text-muted-foreground">{brl(p)}{lim ? ` / ${brl(lim)}` : ""}</span>
                  </div>
                  {lim > 0 && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (p / lim) * 100)}%` }} /></div>}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Planejado = custos estimados de itens da agenda e dos roteiros deste mês. Custos de deslocamento aparecem na página de cada experiência.</p>
        </div>
      </div>

      <div className="mt-10">
        {freeAlternatives.length > 0 && (
          <Section title="Alternativas gratuitas">
            <HScroll>{freeAlternatives.map((s) => <ActivityCard key={s.activity.id} activity={s.activity} reasons={s.reasons} distanceKm={s.distanceKm} travelMinutes={s.travelMinutes} />)}</HScroll>
          </Section>
        )}
        {cheapAlternatives.length > 0 && (
          <Section title="Alternativas econômicas">
            <HScroll>{cheapAlternatives.map((s) => <ActivityCard key={s.activity.id} activity={s.activity} reasons={s.reasons} distanceKm={s.distanceKm} travelMinutes={s.travelMinutes} />)}</HScroll>
          </Section>
        )}
      </div>
    </div>
  );
}

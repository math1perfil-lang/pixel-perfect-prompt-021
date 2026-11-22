import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Link2, Loader2, Plus, Sofa, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/rulis/common";
import { useOrigin } from "@/hooks/use-origin";
import { activitiesQuery, itinerariesQuery, qk, type ItineraryItem } from "@/lib/queries";
import { PRICE_LEVEL_MIDPOINT, WEEKDAYS } from "@/lib/constants";
import { brl, dateLabel } from "@/lib/format";
import { estimateTravelMinutes, haversineKm } from "@/lib/geo";
import { addDays, isoDate, parseIsoDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/fim-de-semana")({
  head: () => ({
    meta: [
      { title: "Meu fim de semana — RULIS" },
      { name: "description", content: "Planeje cada fim de semana do mês, no seu ritmo, com espaço para não fazer nada." },
      { property: "og:title", content: "Meu fim de semana — RULIS" },
      { property: "og:description", content: "Planeje cada fim de semana do mês, no seu ritmo." },
    ],
  }),
  component: Weekends,
});

function saturdaysOf(year: number, month: number) {
  const out: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  while (d.getMonth() === month) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

function Weekends() {
  const qc = useQueryClient();
  const its = useQuery(itinerariesQuery);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [openId, setOpenId] = useState<string | null>(null);
  const sats = saturdaysOf(month.getFullYear(), month.getMonth());

  const create = useMutation({
    mutationFn: async (sat: Date) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("personal_itineraries")
        .insert({ user_id: u.user.id, title: `Fim de semana de ${sat.getDate()}/${sat.getMonth() + 1}`, kind: "weekend", start_date: isoDate(sat), end_date: isoDate(addDays(sat, 1)) })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: qk.itineraries });
      setOpenId(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (its.isLoading) return <LoadingBlock />;
  if (its.error) return <ErrorBlock error={its.error} onRetry={() => its.refetch()} />;
  const byStart = new Map((its.data ?? []).map((i) => [i.start_date, i]));
  const open = (its.data ?? []).find((i) => i.id === openId) ?? null;

  return (
    <div>
      <PageHeader eyebrow="Meu fim de semana" title="Não deixe o próximo fim de semana para depois." subtitle="Monte só o que der vontade. Espaço livre também é plano." />
      <div className="mb-5 flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></Button>
        <p className="min-w-40 text-center font-display text-lg font-bold">{dateLabel(month, { month: "long", year: "numeric" })}</p>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sats.map((sat) => {
          const it = byStart.get(isoDate(sat));
          const items = [...(it?.itinerary_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
          const total = items.reduce((s, i) => s + Number(i.estimated_cost ?? 0), 0);
          const past = addDays(sat, 2) < new Date();
          return (
            <div key={isoDate(sat)} className={cn("rounded-[2rem] bg-card p-5 shadow-card", past && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sáb {sat.getDate()} · Dom {addDays(sat, 1).getDate()}</p>
                  <p className="font-display text-xl font-bold">{it?.title ?? "Ainda sem planos"}</p>
                </div>
                <Sun className="size-6 text-sun" />
              </div>
              {it ? (
                <>
                  <div className="mt-3 space-y-1 text-sm">
                    {[sat, addDays(sat, 1)].map((d) => {
                      const di = items.filter((i) => i.day_date === isoDate(d));
                      const freeDay = it.free_days.includes(isoDate(d));
                      return (
                        <p key={isoDate(d)} className="text-muted-foreground">
                          <span className="font-semibold text-foreground">{WEEKDAYS[d.getDay()]}:</span>{" "}
                          {freeDay ? "dia sem planos" : di.length ? di.map((i) => i.label).join(" → ") : "livre"}
                        </p>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Estimado: {brl(total)}{it.people_count > 1 && ` · ${brl(total / it.people_count)} por pessoa`}</p>
                  <Button variant="soft" size="sm" className="mt-3" onClick={() => setOpenId(it.id)}>Abrir roteiro</Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="mt-4" disabled={create.isPending} onClick={() => create.mutate(sat)}>
                  <Plus /> Planejar este fim de semana
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {open && <ItineraryEditor itineraryId={open.id} onClose={() => setOpenId(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ItineraryEditor({ itineraryId, onClose }: { itineraryId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const its = useQuery(itinerariesQuery);
  const acts = useQuery(activitiesQuery);
  const { origin } = useOrigin();
  const it = its.data?.find((i) => i.id === itineraryId);
  const [adding, setAdding] = useState<string | null>(null);
  const [form, setForm] = useState({ time: "10:00", label: "", activity_id: "", cost: "" });
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.itineraries });
  const items = useMemo(() => [...(it?.itinerary_items ?? [])].sort((a, b) => a.sort_order - b.sort_order), [it]);

  const run = useMutation({
    mutationFn: async (fn: () => Promise<{ error: unknown }>) => {
      const r = await fn();
      if (r.error) throw r.error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message ?? "Erro"),
  });

  if (!it) return <LoadingBlock />;
  const days = [parseIsoDate(it.start_date), parseIsoDate(it.end_date)];
  const total = items.reduce((s, i) => s + Number(i.estimated_cost ?? 0), 0);
  const travel = items.reduce((s, i) => s + (i.travel_minutes ?? 0), 0);

  const addItem = (day: string) => {
    const act = acts.data?.find((a) => a.id === form.activity_id);
    const label = form.label.trim() || act?.title;
    if (!label) return toast.error("Escolha uma atividade ou escreva algo");
    const dist = act?.lat != null && act.lng != null ? haversineKm(origin, { lat: act.lat, lng: act.lng }) : null;
    const dayItems = items.filter((i) => i.day_date === day);
    run.mutate(async () => {
      const { data: u } = await supabase.auth.getUser();
      return supabase.from("itinerary_items").insert({
        user_id: u.user!.id,
        itinerary_id: it.id,
        day_date: day,
        start_time: form.time || null,
        label: label.slice(0, 120),
        activity_id: act?.id ?? null,
        estimated_cost: form.cost ? Number(form.cost.replace(",", ".")) : act?.price_level != null ? PRICE_LEVEL_MIDPOINT[act.price_level] : null,
        travel_minutes: dist != null ? estimateTravelMinutes(dist) : null,
        sort_order: (dayItems.at(-1)?.sort_order ?? 0) + 1,
      });
    });
    setAdding(null);
    setForm({ time: "10:00", label: "", activity_id: "", cost: "" });
  };

  const swap = (a: ItineraryItem, b: ItineraryItem) =>
    run.mutate(async () => {
      const r1 = await supabase.from("itinerary_items").update({ sort_order: b.sort_order }).eq("id", a.id);
      if (r1.error) return r1;
      return supabase.from("itinerary_items").update({ sort_order: a.sort_order }).eq("id", b.id);
    });

  const duplicate = () =>
    run.mutate(async () => {
      const { data: u } = await supabase.auth.getUser();
      const ns = addDays(parseIsoDate(it.start_date), 7);
      const { data, error } = await supabase
        .from("personal_itineraries")
        .insert({ user_id: u.user!.id, title: `${it.title} (cópia)`, kind: it.kind, start_date: isoDate(ns), end_date: isoDate(addDays(ns, 1)), people_count: it.people_count })
        .select("id")
        .single();
      if (error) return { error };
      if (!items.length) return { error: null };
      const shift = (d: string) => isoDate(addDays(parseIsoDate(d), 7));
      const res = await supabase.from("itinerary_items").insert(
        items.map((i) => ({ user_id: u.user!.id, itinerary_id: data.id, day_date: shift(i.day_date), start_time: i.start_time, label: i.label, activity_id: i.activity_id, estimated_cost: i.estimated_cost, travel_minutes: i.travel_minutes, sort_order: i.sort_order })),
      );
      if (!res.error) toast.success("Duplicado para o fim de semana seguinte");
      return res;
    });

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/roteiro/${it.id}` : "";

  return (
    <div className="space-y-6 pb-10">
      <SheetHeader>
        <SheetTitle className="font-display text-2xl">Roteiro</SheetTitle>
      </SheetHeader>
      <div className="space-y-1.5 px-4">
        <Label htmlFor="it-title">Nome</Label>
        <Input id="it-title" defaultValue={it.title} onBlur={(e) => e.target.value.trim() && e.target.value !== it.title && run.mutate(async () => supabase.from("personal_itineraries").update({ title: e.target.value.trim().slice(0, 80) }).eq("id", it.id))} />
      </div>
      {days.map((d) => {
        const day = isoDate(d);
        const di = items.filter((i) => i.day_date === day);
        const freeDay = it.free_days.includes(day);
        return (
          <div key={day} className="space-y-2 px-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold">{WEEKDAYS[d.getDay()]} {d.getDate()}</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sofa className="size-3.5" /> Deixar o dia sem planos
                <Switch
                  checked={freeDay}
                  onCheckedChange={(v) =>
                    run.mutate(async () =>
                      supabase.from("personal_itineraries").update({ free_days: v ? [...it.free_days, day] : it.free_days.filter((x) => x !== day) }).eq("id", it.id),
                    )
                  }
                />
              </label>
            </div>
            {freeDay ? (
              <p className="rounded-2xl bg-accent p-3 text-sm text-accent-foreground">Dia livre. Descanso também é rolê.</p>
            ) : (
              <>
                {di.map((i, idx) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-2xl border bg-background p-2.5">
                    <span className="w-12 text-sm font-semibold">{i.start_time ? i.start_time.slice(0, 5) : "—"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {i.estimated_cost != null ? `~${brl(Number(i.estimated_cost))}` : "custo não informado"}
                        {i.travel_minutes != null && ` · ~${i.travel_minutes} min de deslocamento`}
                      </p>
                    </div>
                    <button aria-label="Subir" disabled={idx === 0} className="p-1 disabled:opacity-30" onClick={() => swap(i, di[idx - 1]!)}><ArrowUp className="size-4" /></button>
                    <button aria-label="Descer" disabled={idx === di.length - 1} className="p-1 disabled:opacity-30" onClick={() => swap(i, di[idx + 1]!)}><ArrowDown className="size-4" /></button>
                    <button aria-label="Remover" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => run.mutate(async () => supabase.from("itinerary_items").delete().eq("id", i.id))}><Trash2 className="size-4" /></button>
                  </div>
                ))}
                {adding === day ? (
                  <div className="space-y-2 rounded-2xl border border-dashed p-3">
                    <div className="grid grid-cols-[90px_1fr] gap-2">
                      <Input type="time" aria-label="Horário" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                      <select aria-label="Atividade" className="h-10 rounded-md border bg-background px-2 text-sm" value={form.activity_id} onChange={(e) => setForm({ ...form, activity_id: e.target.value })}>
                        <option value="">Escolher da RULIS (opcional)</option>
                        {(acts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                      </select>
                    </div>
                    <Input placeholder="Ou escreva: Café da manhã, Almoço…" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                    <Input inputMode="decimal" placeholder="Custo estimado (R$, opcional)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>Cancelar</Button>
                      <Button size="sm" variant="hero" onClick={() => addItem(day)} disabled={run.isPending}>{run.isPending && <Loader2 className="animate-spin" />} Adicionar</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setAdding(day)}><Plus /> Adicionar atividade</Button>
                )}
              </>
            )}
          </div>
        );
      })}
      <div className="mx-4 rounded-3xl bg-secondary p-4 text-sm">
        <div className="flex items-center justify-between">
          <span>Pessoas</span>
          <Input type="number" min={1} className="h-8 w-20" defaultValue={it.people_count} onBlur={(e) => { const n = Math.max(1, Number(e.target.value) || 1); if (n !== it.people_count) run.mutate(async () => supabase.from("personal_itineraries").update({ people_count: n }).eq("id", it.id)); }} />
        </div>
        <p className="mt-2">Custo estimado total: <strong>{brl(total)}</strong>{it.people_count > 1 && <> · por pessoa <strong>{brl(total / it.people_count)}</strong> (grupo: {brl(total)})</>}</p>
        <p>Deslocamentos: ~{travel} min (estimativa, só ida)</p>
        <p className="mt-1 text-xs text-muted-foreground">Valores estimados, não são preços garantidos.</p>
      </div>
      <div className="space-y-3 px-4">
        <div className="flex items-center justify-between rounded-2xl border p-3">
          <div>
            <p className="text-sm font-semibold">Compartilhar por link</p>
            <p className="text-xs text-muted-foreground">Quem tiver o link vê o roteiro (sem seus dados pessoais).</p>
          </div>
          <Switch checked={it.is_public} onCheckedChange={(v) => run.mutate(async () => supabase.from("personal_itineraries").update({ is_public: v }).eq("id", it.id))} />
        </div>
        {it.is_public && (
          <Button variant="soft" size="sm" onClick={async () => { await navigator.clipboard.writeText(shareUrl); toast.success("Link copiado"); }}>
            <Link2 /> Copiar link
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={duplicate}><Copy /> Duplicar para a semana seguinte</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { run.mutate(async () => supabase.from("personal_itineraries").update({ deleted_at: new Date().toISOString() }).eq("id", it.id)); onClose(); }}>
            <Trash2 /> Excluir roteiro
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Quer levar algo para a agenda? Abra a atividade em <Link to="/explorar" className="underline">Explorar</Link> e toque em “Adicionar à agenda”.</p>
      </div>
    </div>
  );
}

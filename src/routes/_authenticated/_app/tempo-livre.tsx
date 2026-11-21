import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/rulis/common";
import { AvailabilityEditor, CommitmentsEditor } from "@/components/rulis/RoutineEditors";
import { availabilityQuery, calendarQuery, commitmentsQuery, qk } from "@/lib/queries";
import { computeFreeWindows, type Availability } from "@/lib/freetime";
import { saveRoutine, type CommitmentDraft } from "@/lib/profile-save";
import { WEEKDAYS, WEEKDAYS_SHORT, type CalendarKind } from "@/lib/constants";
import { addDays, classifyDuration, DURATION_CLASS_LABEL, hhmm, isoDate, minutesToLabel, startOfDay } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/tempo-livre")({
  head: () => ({
    meta: [
      { title: "Meu tempo livre — RULIS" },
      { name: "description", content: "Seus intervalos livres da semana e do mês, calculados a partir da sua rotina." },
      { property: "og:title", content: "Meu tempo livre — RULIS" },
      { property: "og:description", content: "Seus intervalos livres calculados a partir da sua rotina." },
    ],
  }),
  component: TempoLivre,
});

function TempoLivre() {
  const qc = useQueryClient();
  const av = useQuery(availabilityQuery);
  const com = useQuery(commitmentsQuery);
  const cal = useQuery(calendarQuery);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [commitments, setCommitments] = useState<CommitmentDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (av.data && !dirty) setAvailability(av.data.map((a) => ({ weekday: a.weekday, start_time: a.start_time.slice(0, 5), end_time: a.end_time.slice(0, 5) })));
  }, [av.data, dirty]);
  useEffect(() => {
    if (com.data && !dirty)
      setCommitments(com.data.map((c) => ({ title: c.title, kind: c.kind as CalendarKind, weekdays: c.weekdays, start_time: c.start_time.slice(0, 5), end_time: c.end_time.slice(0, 5), is_active: c.is_active })));
  }, [com.data, dirty]);

  const windows = useMemo(
    () => computeFreeWindows({ availability, commitments, events: cal.data ?? [], from: new Date(), days: 31 }),
    [availability, commitments, cal.data],
  );

  if (av.isLoading || com.isLoading) return <LoadingBlock />;
  if (av.error || com.error) return <ErrorBlock error={av.error || com.error} />;

  async function save() {
    setSaving(true);
    try {
      await saveRoutine(availability, commitments);
      await Promise.all([qc.invalidateQueries({ queryKey: qk.availability }), qc.invalidateQueries({ queryKey: qk.commitments })]);
      setDirty(false);
      toast.success("Rotina salva");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const today = startOfDay(new Date());
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const byDay = (d: Date) => windows.filter((w) => isoDate(w.start) === isoDate(d));
  const month = Array.from({ length: 28 }, (_, i) => addDays(today, i));
  const maxMin = Math.max(60, ...month.map((d) => byDay(d).reduce((s, w) => s + w.minutes, 0)));

  return (
    <div>
      <PageHeader
        eyebrow="Meu tempo livre"
        title="Quando dá pra viver?"
        subtitle="Disponibilidade que você informou, menos compromissos e agenda. A gente não presume horários."
        action={
          dirty ? (
            <Button variant="hero" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar rotina
            </Button>
          ) : undefined
        }
      />
      <Tabs defaultValue="semana">
        <TabsList className="rounded-full">
          <TabsTrigger value="semana" className="rounded-full">Semana</TabsTrigger>
          <TabsTrigger value="mes" className="rounded-full">Mês</TabsTrigger>
          <TabsTrigger value="rotina" className="rounded-full">Minha rotina</TabsTrigger>
        </TabsList>

        <TabsContent value="semana" className="mt-6 space-y-3">
          {week.map((d) => {
            const ws = byDay(d);
            const total = ws.reduce((s, w) => s + w.minutes, 0);
            return (
              <div key={isoDate(d)} className="rounded-3xl bg-card p-4 shadow-card">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-lg font-bold">
                    {isoDate(d) === isoDate(today) ? "Hoje" : WEEKDAYS[d.getDay()]} <span className="text-sm font-normal text-muted-foreground">{d.getDate()}/{d.getMonth() + 1}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {ws.length === 0 ? "Sem disponibilidade cadastrada" : total >= 600 ? "Dia livre" : `${minutesToLabel(total)} livres`}
                  </p>
                </div>
                {ws.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ws.map((w) => (
                      <Link
                        key={w.start.toISOString()}
                        to="/agora"
                        search={{ min: w.minutes, at: w.start.toISOString() }}
                        className="group inline-flex items-center gap-2 rounded-2xl border border-dashed border-success/60 bg-success/5 px-3 py-2 text-sm transition hover:border-primary hover:bg-primary-soft"
                      >
                        <span className="font-semibold">{hhmm(w.start)} às {hhmm(w.end)}</span>
                        <span className="text-xs text-muted-foreground">{DURATION_CLASS_LABEL[classifyDuration(w.minutes)]}</span>
                        <Sparkles className="size-3.5 text-primary opacity-0 transition group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">Toque num intervalo para ver o que cabe nele.</p>
        </TabsContent>

        <TabsContent value="mes" className="mt-6">
          <div className="rounded-3xl bg-card p-4 shadow-card">
            <div className="grid grid-cols-7 gap-1.5">
              {month.map((d) => {
                const total = byDay(d).reduce((s, w) => s + w.minutes, 0);
                const pct = total / maxMin;
                return (
                  <div key={isoDate(d)} className="flex flex-col items-center gap-1 rounded-2xl bg-secondary/50 p-2 text-center" title={`${minutesToLabel(total)} livres`}>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">{WEEKDAYS_SHORT[d.getDay()]}</span>
                    <span className="text-sm font-bold">{d.getDate()}</span>
                    <span className="flex h-10 w-2 items-end overflow-hidden rounded-full bg-border">
                      <span className={cn("w-full rounded-full bg-success")} style={{ height: `${Math.round(pct * 100)}%` }} />
                    </span>
                    <span className="text-[10px] text-muted-foreground">{total ? minutesToLabel(total) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rotina" className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-bold">Compromissos recorrentes</h2>
            <CommitmentsEditor value={commitments} onChange={(v) => { setCommitments(v); setDirty(true); }} />
          </div>
          <div>
            <h2 className="mb-3 text-lg font-bold">Disponibilidade</h2>
            <AvailabilityEditor value={availability} onChange={(v) => { setAvailability(v); setDirty(true); }} />
          </div>
          {dirty && (
            <div className="lg:col-span-2">
              <Button variant="hero" size="lg" className="w-full" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar rotina
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

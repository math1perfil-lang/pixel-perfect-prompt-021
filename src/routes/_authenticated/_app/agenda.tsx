import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from "@/components/rulis/common";
import { EventDialog } from "@/components/rulis/EventDialog";
import { calendarQuery, commitmentsQuery, availabilityQuery, type CalendarEvent } from "@/lib/queries";
import { computeFreeWindows, eventOccurrencesOnDay, findConflicts } from "@/lib/freetime";
import { KIND_BG, KIND_LABEL, WEEKDAYS_SHORT, type CalendarKind } from "@/lib/constants";
import { dateLabel } from "@/lib/format";
import { addDays, atTime, hhmm, isoDate, minutesToLabel, startOfDay } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/agenda")({
  head: () => ({
    meta: [
      { title: "Minha agenda — RULIS" },
      { name: "description", content: "Compromissos, rolês e tempo livre em um só calendário." },
      { property: "og:title", content: "Minha agenda — RULIS" },
      { property: "og:description", content: "Compromissos, rolês e tempo livre em um só calendário." },
    ],
  }),
  component: Agenda,
});

type Entry = { id: string; title: string; kind: CalendarKind; start: Date; end: Date; recurring: boolean; source: "event" | "commitment"; event?: CalendarEvent };

function Agenda() {
  const cal = useQuery(calendarQuery);
  const com = useQuery(commitmentsQuery);
  const av = useQuery(availabilityQuery);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState<Date | null>(null);

  const entriesOn = useMemo(() => {
    return (day: Date): Entry[] => {
      const out: Entry[] = [];
      for (const ev of cal.data ?? []) {
        for (const o of eventOccurrencesOnDay(ev, day))
          out.push({ id: `${ev.id}:${isoDate(day)}`, title: ev.title, kind: ev.kind as CalendarKind, start: o.start, end: o.end, recurring: ev.recurrence === "weekly", source: "event", event: ev });
      }
      for (const c of com.data ?? []) {
        if (!c.is_active || !c.weekdays.includes(day.getDay())) continue;
        out.push({ id: `c:${c.id}:${isoDate(day)}`, title: c.title, kind: c.kind as CalendarKind, start: atTime(day, c.start_time), end: atTime(day, c.end_time), recurring: true, source: "commitment" });
      }
      return out.sort((a, b) => a.start.getTime() - b.start.getTime());
    };
  }, [cal.data, com.data]);

  const freeOn = (day: Date) =>
    computeFreeWindows({ availability: av.data ?? [], commitments: com.data ?? [], events: cal.data ?? [], from: startOfDay(day), days: 1 });

  if (cal.isLoading || com.isLoading || av.isLoading) return <LoadingBlock />;
  if (cal.error) return <ErrorBlock error={cal.error} onRetry={() => cal.refetch()} />;

  const step = view === "day" ? 1 : view === "week" ? 7 : 0;
  const move = (dir: 1 | -1) => {
    if (view === "month") {
      const d = new Date(cursor);
      d.setMonth(d.getMonth() + dir, 1);
      setCursor(d);
    } else setCursor(addDays(cursor, dir * step));
  };
  const weekStart = addDays(cursor, -((cursor.getDay() + 6) % 7));
  const days = view === "day" ? [cursor] : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [];
  const nothingAtAll = (cal.data?.length ?? 0) === 0 && (com.data?.length ?? 0) === 0;

  const title =
    view === "month"
      ? dateLabel(cursor, { month: "long", year: "numeric" })
      : view === "week"
        ? `${weekStart.getDate()}–${addDays(weekStart, 6).getDate()} ${addDays(weekStart, 6).toLocaleDateString("pt-BR", { month: "short" })}`
        : dateLabel(cursor);

  return (
    <div>
      <PageHeader
        eyebrow="Minha agenda"
        title="Seu tempo, num lugar só."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/tempo-livre">Meu tempo livre</Link></Button>
            <Button variant="hero" size="sm" onClick={() => setCreating(cursor)}><CalendarPlus /> Novo</Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border bg-card p-1">
          {(["day", "week", "month"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", view === v && "bg-ink text-ink-foreground")}>
              {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Anterior" onClick={() => move(-1)}><ChevronLeft /></Button>
          <button className="min-w-40 text-center font-display font-bold" onClick={() => setCursor(startOfDay(new Date()))} title="Voltar para hoje">{title}</button>
          <Button variant="ghost" size="icon" aria-label="Próximo" onClick={() => move(1)}><ChevronRight /></Button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(KIND_LABEL) as CalendarKind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full", KIND_BG[k])} /> {KIND_LABEL[k]}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-dashed border-success" /> Tempo livre</span>
      </div>

      {nothingAtAll && (
        <div className="mb-6">
          <EmptyState icon={<CalendarPlus className="size-5" />} title="Seu calendário ainda está vazio." action={<Button asChild variant="soft"><Link to="/explorar">Encontrar um rolê</Link></Button>}>
            Que tal começar planejando alguma coisa boa?
          </EmptyState>
        </div>
      )}

      {view === "month" ? (
        <MonthGrid cursor={cursor} entriesOn={entriesOn} onPick={(d) => { setCursor(d); setView("day"); }} />
      ) : (
        <div className={cn("grid gap-3", view === "week" && "md:grid-cols-7")}>
          {days.map((d) => {
            const entries = entriesOn(d);
            const conflicts = findConflicts(entries);
            const free = freeOn(d);
            const freeMin = free.reduce((s, w) => s + w.minutes, 0);
            const isToday = isoDate(d) === isoDate(new Date());
            return (
              <div key={isoDate(d)} className={cn("min-h-28 rounded-3xl bg-card p-3 shadow-card", isToday && "ring-2 ring-primary/40")}>
                <div className="mb-2 flex items-baseline justify-between">
                  <button className="text-left" onClick={() => { setCursor(d); setView("day"); }}>
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{WEEKDAYS_SHORT[d.getDay()]}</span>{" "}
                    <span className="font-display text-lg font-bold">{d.getDate()}</span>
                  </button>
                  <button aria-label="Adicionar neste dia" className="text-primary" onClick={() => setCreating(d)}><CalendarPlus className="size-4" /></button>
                </div>
                {freeMin > 0 && (
                  <p className="mb-2 rounded-xl border border-dashed border-success/60 px-2 py-1 text-[11px] font-medium text-success">
                    {minutesToLabel(freeMin)} livre{view === "day" && `: ${free.map((w) => `${hhmm(w.start)}–${hhmm(w.end)}`).join(", ")}`}
                  </p>
                )}
                <div className="space-y-1.5">
                  {entries.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => e.event && setEditing(e.event)}
                      disabled={e.source === "commitment"}
                      title={e.source === "commitment" ? "Compromisso recorrente — edite em Meu tempo livre" : "Editar"}
                      className="flex w-full items-start gap-2 rounded-xl bg-secondary/60 px-2 py-1.5 text-left text-xs disabled:cursor-default"
                    >
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", KIND_BG[e.kind])} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{e.title}</span>
                        <span className="text-muted-foreground">{hhmm(e.start)}–{hhmm(e.end)}</span>
                      </span>
                      {e.recurring && <Repeat className="mt-0.5 size-3 text-muted-foreground" />}
                      {conflicts.has(e.id) && <AlertTriangle className="mt-0.5 size-3.5 text-warning" aria-label="Conflito de horário" />}
                    </button>
                  ))}
                  {entries.length === 0 && freeMin === 0 && <p className="text-xs text-muted-foreground">Nada por aqui.</p>}
                </div>
                {conflicts.size > 0 && <p className="mt-2 text-[11px] font-medium text-warning">Há horários sobrepostos neste dia.</p>}
              </div>
            );
          })}
        </div>
      )}

      {creating && <EventDialog open onOpenChange={(o) => !o && setCreating(null)} defaultDate={creating} />}
      {editing && <EventDialog open event={editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </div>
  );
}

function MonthGrid({ cursor, entriesOn, onPick }: { cursor: Date; entriesOn: (d: Date) => Entry[]; onPick: (d: Date) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return (
    <div className="rounded-3xl bg-card p-3 shadow-card">
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-muted-foreground">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => <div key={d} className="py-1">{WEEKDAYS_SHORT[d]}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const es = entriesOn(d);
          const today = isoDate(d) === isoDate(new Date());
          return (
            <button key={isoDate(d)} onClick={() => onPick(d)} className={cn("flex aspect-square flex-col items-center rounded-2xl p-1 text-sm transition hover:bg-secondary", !inMonth && "opacity-35", today && "bg-primary-soft font-bold text-primary")}>
              <span>{d.getDate()}</span>
              <span className="mt-auto flex flex-wrap justify-center gap-0.5">
                {es.slice(0, 4).map((e) => <span key={e.id} className={cn("size-1.5 rounded-full", KIND_BG[e.kind])} />)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

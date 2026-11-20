import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KIND_BG, KIND_LABEL, WEEKDAYS, WEEKDAYS_SHORT, type CalendarKind } from "@/lib/constants";
import type { Availability } from "@/lib/freetime";
import type { CommitmentDraft } from "@/lib/profile-save";
import { cn } from "@/lib/utils";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AvailabilityEditor({ value, onChange }: { value: Availability[]; onChange: (v: Availability[]) => void }) {
  const update = (idx: number, patch: Partial<Availability>) => onChange(value.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  return (
    <div className="space-y-3">
      {ORDER.map((wd) => {
        const rows = value.map((v, i) => ({ v, i })).filter((r) => r.v.weekday === wd);
        return (
          <div key={wd} className="rounded-2xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{WEEKDAYS[wd]}</p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                onClick={() => onChange([...value, { weekday: wd, start_time: "19:00", end_time: "22:00" }])}
              >
                <Plus className="size-3.5" /> Intervalo
              </button>
            </div>
            {rows.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Sem disponibilidade cadastrada.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {rows.map(({ v, i }) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="time" aria-label="Início" value={v.start_time.slice(0, 5)} onChange={(e) => update(i, { start_time: e.target.value })} className="h-9" />
                    <span className="text-muted-foreground">às</span>
                    <Input type="time" aria-label="Fim" value={v.end_time.slice(0, 5)} onChange={(e) => update(i, { end_time: e.target.value })} className="h-9" />
                    <button type="button" aria-label="Remover intervalo" className="p-2 text-muted-foreground hover:text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                {rows.some((r) => r.v.end_time <= r.v.start_time) && (
                  <p className="text-xs text-destructive">O fim precisa ser depois do início.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const KINDS: CalendarKind[] = ["work", "study", "exercise", "commitment", "rest"];

export function CommitmentsEditor({ value, onChange }: { value: CommitmentDraft[]; onChange: (v: CommitmentDraft[]) => void }) {
  const update = (idx: number, patch: Partial<CommitmentDraft>) => onChange(value.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  const presets: CommitmentDraft[] = [
    { title: "Trabalho", kind: "work", weekdays: [1, 2, 3, 4, 5], start_time: "08:00", end_time: "18:00" },
    { title: "Academia", kind: "exercise", weekdays: [1, 3, 5], start_time: "18:30", end_time: "19:30" },
    { title: "Estudo", kind: "study", weekdays: [2, 4], start_time: "19:00", end_time: "21:00" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button key={p.title} type="button" size="sm" variant="outline" onClick={() => onChange([...value, { ...p }])}>
            <Plus /> {p.title}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...value, { title: "", kind: "commitment", weekdays: [], start_time: "09:00", end_time: "10:00" }])}>
          <Plus /> Outro
        </Button>
      </div>
      {value.length === 0 && <p className="text-sm text-muted-foreground">Nenhum compromisso recorrente. Tudo bem também.</p>}
      {value.map((c, i) => (
        <div key={i} className="space-y-3 rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className={cn("size-3 shrink-0 rounded-full", KIND_BG[c.kind])} />
            <Input value={c.title} placeholder="Nome do compromisso" onChange={(e) => update(i, { title: e.target.value })} className="h-9" />
            <button type="button" aria-label="Remover compromisso" className="p-2 text-muted-foreground hover:text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button key={k} type="button" onClick={() => update(i, { kind: k })} className={cn("rounded-full border px-2.5 py-1 text-xs", c.kind === k ? "border-foreground bg-foreground text-background" : "bg-background")}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ORDER.map((wd) => {
              const on = c.weekdays.includes(wd);
              return (
                <button
                  key={wd}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update(i, { weekdays: on ? c.weekdays.filter((d) => d !== wd) : [...c.weekdays, wd] })}
                  className={cn("size-10 rounded-full border text-xs font-semibold", on ? "border-primary bg-primary text-primary-foreground" : "bg-background")}
                >
                  {WEEKDAYS_SHORT[wd]}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Input type="time" aria-label="Início" value={c.start_time.slice(0, 5)} onChange={(e) => update(i, { start_time: e.target.value })} className="h-9" />
            <span className="text-muted-foreground">às</span>
            <Input type="time" aria-label="Fim" value={c.end_time.slice(0, 5)} onChange={(e) => update(i, { end_time: e.target.value })} className="h-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { KIND_BG, KIND_LABEL, type CalendarKind } from "@/lib/constants";
import { qk, type CalendarEvent } from "@/lib/queries";
import { isoDate } from "@/lib/time";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event?: CalendarEvent | null;
  defaultDate?: Date;
}) {
  const qc = useQueryClient();
  const s0 = event ? new Date(event.starts_at) : (() => { const d = new Date(defaultDate ?? new Date()); d.setHours(19, 0, 0, 0); return d; })();
  const e0 = event ? new Date(event.ends_at) : new Date(s0.getTime() + 60 * 60000);
  const [title, setTitle] = useState(event?.title ?? "");
  const [kind, setKind] = useState<CalendarKind>((event?.kind as CalendarKind) ?? "leisure");
  const [date, setDate] = useState(isoDate(s0));
  const [start, setStart] = useState(hm(s0));
  const [end, setEnd] = useState(hm(e0));
  const [weekly, setWeekly] = useState(event?.recurrence === "weekly");
  const [notes, setNotes] = useState(event?.notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      if (!title.trim()) throw new Error("Dê um nome");
      const [y, m, d] = date.split("-").map(Number);
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const s = new Date(y!, m! - 1, d!, sh!, sm!);
      let e = new Date(y!, m! - 1, d!, eh!, em!);
      if (e <= s) e = new Date(e.getTime() + 86400000); // crosses midnight
      const row = {
        user_id: u.user.id,
        title: title.trim().slice(0, 120),
        kind,
        starts_at: s.toISOString(),
        ends_at: e.toISOString(),
        recurrence: weekly ? "weekly" : "none",
        notes: notes.trim() || null,
      };
      const res = event
        ? await supabase.from("user_calendar_events").update(row).eq("id", event.id)
        : await supabase.from("user_calendar_events").insert(row);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.calendar });
      toast.success(event ? "Atualizado" : "Adicionado à agenda");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_calendar_events").update({ deleted_at: new Date().toISOString() }).eq("id", event!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.calendar });
      toast.success("Removido da agenda");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">{event ? "Editar" : "Novo na agenda"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Título</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(KIND_LABEL) as CalendarKind[]).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", kind === k ? "border-foreground bg-foreground text-background" : "bg-background")}>
                <span className={cn("size-2 rounded-full", KIND_BG[k])} /> {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 space-y-1.5 sm:col-span-1">
              <Label htmlFor="ev-date">Dia</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-s">Início</Label>
              <Input id="ev-s" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-e">Fim</Label>
              <Input id="ev-e" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ev-w">Repetir toda semana</Label>
            <Switch id="ev-w" checked={weekly} onCheckedChange={setWeekly} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-n">Notas</Label>
            <Textarea id="ev-n" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {event ? (
            <Button variant="ghost" className="text-destructive" onClick={() => del.mutate()} disabled={del.isPending}>
              <Trash2 /> Excluir
            </Button>
          ) : <span />}
          <Button variant="hero" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

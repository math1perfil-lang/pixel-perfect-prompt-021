import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { qk, savedQuery, track, type Activity } from "@/lib/queries";
import { PRICE_LEVEL_MIDPOINT } from "@/lib/constants";
import { isoDate } from "@/lib/time";
import { cn } from "@/lib/utils";

type Minimal = Pick<Activity, "id" | "title" | "duration_min_minutes" | "price_level">;

export function SaveButton({ activity, className }: { activity: Pick<Activity, "id">; className?: string }) {
  const qc = useQueryClient();
  const { data: saved = [] } = useQuery(savedQuery);
  const isSaved = saved.includes(activity.id);
  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      if (isSaved) {
        const { error } = await supabase.from("saved_activities").delete().eq("activity_id", activity.id).eq("user_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_activities").insert({ activity_id: activity.id, user_id: u.user.id });
        if (error) throw error;
        void track(activity.id, "saved");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.saved });
      toast.success(isSaved ? "Removido dos salvos" : "Salvo para depois");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <button
      type="button"
      aria-label={isSaved ? "Remover dos salvos" : "Salvar"}
      aria-pressed={isSaved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        m.mutate();
      }}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-card/90 shadow-card backdrop-blur transition active:scale-90",
        className,
      )}
    >
      <Heart className={cn("size-4", isSaved ? "fill-primary text-primary" : "text-foreground")} />
    </button>
  );
}

export function AddToAgendaButton({
  activity,
  defaultStart,
  size = "sm",
  variant = "default",
  label = "Adicionar à agenda",
  onAdded,
}: {
  activity: Minimal;
  defaultStart?: Date;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "hero" | "soft" | "outline" | "ink";
  label?: string;
  onAdded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <CalendarPlus /> {label}
      </Button>
      {open && (
        <AddToAgendaDialog
          activity={activity}
          defaultStart={defaultStart}
          open={open}
          onOpenChange={setOpen}
          onAdded={onAdded}
        />
      )}
    </>
  );
}

function AddToAgendaDialog({
  activity,
  defaultStart,
  open,
  onOpenChange,
  onAdded,
}: {
  activity: Minimal;
  defaultStart?: Date;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdded?: () => void;
}) {
  const qc = useQueryClient();
  const start = defaultStart ?? nextRoundHour();
  const [date, setDate] = useState(isoDate(start));
  const [time, setTime] = useState(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`);
  const [duration, setDuration] = useState(activity.duration_min_minutes);

  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const [y, mo, d] = date.split("-").map(Number);
      const [h, mi] = time.split(":").map(Number);
      const s = new Date(y, mo - 1, d, h, mi);
      const e = new Date(s.getTime() + duration * 60000);
      const { error } = await supabase.from("user_calendar_events").insert({
        user_id: u.user.id,
        title: activity.title,
        kind: "leisure",
        starts_at: s.toISOString(),
        ends_at: e.toISOString(),
        activity_id: activity.id,
        estimated_cost: activity.price_level != null ? PRICE_LEVEL_MIDPOINT[activity.price_level] : null,
      });
      if (error) throw error;
      void track(activity.id, "scheduled");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.calendar });
      toast.success("Rolê na agenda!", { description: activity.title });
      onOpenChange(false);
      onAdded?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="font-display">Quando vai ser?</DialogTitle>
          <DialogDescription>{activity.title}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ag-date">Dia</Label>
            <Input id="ag-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-time">Horário</Label>
            <Input id="ag-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="ag-dur">Duração (minutos)</Label>
            <Input id="ag-dur" type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="hero" onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending && <Loader2 className="animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function nextRoundHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

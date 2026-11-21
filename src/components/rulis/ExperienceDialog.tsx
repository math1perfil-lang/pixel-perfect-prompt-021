import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "./common";
import { qk, track } from "@/lib/queries";
import { isoDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export function ExperienceDialog({
  open,
  onOpenChange,
  activity,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activity?: { id: string; title: string; group_key: string } | null;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(activity?.title ?? "");
  const [date, setDate] = useState(isoDate(new Date()));
  const [rating, setRating] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<boolean | null>(null);
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [highlight, setHighlight] = useState("");
  const [notes, setNotes] = useState("");
  const [spent, setSpent] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      if (!title.trim()) throw new Error("Dê um nome para o rolê");
      const [y, mo, d] = date.split("-").map(Number);
      const { error } = await supabase.from("completed_experiences").insert({
        user_id: u.user.id,
        activity_id: activity?.id ?? null,
        title: title.trim().slice(0, 120),
        group_key: activity?.group_key ?? null,
        completed_at: new Date(y!, (mo ?? 1) - 1, d ?? 1, 12).toISOString(),
        rating,
        would_repeat: repeat,
        would_recommend: recommend,
        highlight: highlight.trim().slice(0, 300) || null,
        notes: notes.trim().slice(0, 1000) || null,
        spent: spent ? Number(spent.replace(",", ".")) : null,
      });
      if (error) throw error;
      if (activity) void track(activity.id, "completed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.experiences });
      toast.success("Guardado em Meus rolês");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const YesNo = ({ value, set }: { value: boolean | null; set: (v: boolean | null) => void }) => (
    <div className="flex gap-2">
      <Chip active={value === true} onClick={() => set(value === true ? null : true)} className="py-1.5 text-xs">Sim</Chip>
      <Chip active={value === false} onClick={() => set(value === false ? null : false)} className="py-1.5 text-xs">Não</Chip>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Como foi?</DialogTitle>
          <DialogDescription>Tudo opcional. É a sua memória de lazer, não uma avaliação pública.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!activity && (
            <div className="space-y-1.5">
              <Label htmlFor="xp-title">O que você fez?</Label>
              <Input id="xp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Pôr do sol com amigos" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="xp-date">Quando</Label>
            <Input id="xp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Nota</Label>
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} estrelas`} onClick={() => setRating(rating === n ? null : n)}>
                  <Star className={cn("size-7", rating != null && n <= rating ? "fill-sun text-sun" : "text-border")} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Repetiria?</Label>
              <div className="mt-1.5"><YesNo value={repeat} set={setRepeat} /></div>
            </div>
            <div>
              <Label>Recomendaria?</Label>
              <div className="mt-1.5"><YesNo value={recommend} set={setRecommend} /></div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xp-hl">O que mais gostou?</Label>
            <Input id="xp-hl" value={highlight} onChange={(e) => setHighlight(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xp-notes">Observação</Label>
            <Textarea id="xp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xp-spent">Quanto gastou? (R$, opcional)</Label>
            <Input id="xp-spent" inputMode="decimal" value={spent} onChange={(e) => setSpent(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Fotos das experiências chegam numa próxima versão.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending && <Loader2 className="animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

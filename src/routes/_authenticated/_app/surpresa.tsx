import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Dices, Gift, ThumbsDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/rulis/ActivityCard";
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from "@/components/rulis/common";
import { AddToAgendaButton } from "@/components/rulis/ActivityActions";
import { OriginControl } from "@/components/rulis/WeatherAndOrigin";
import { useRecoBase } from "@/hooks/use-reco";
import { useFreeWindows } from "@/hooks/use-freetime";
import { drawSurprise, SURPRISE_LABEL, type Scored, type SurpriseKind } from "@/lib/recommend";
import { track } from "@/lib/queries";
import { logShown, markLog } from "@/lib/reco-log";
import { minutesToLabel } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/surpresa")({
  head: () => ({
    meta: [
      { title: "Surpreenda-me — RULIS" },
      { name: "description", content: "Não sabe o que fazer? Deixa a RULIS sortear um rolê com a sua cara." },
      { property: "og:title", content: "Surpreenda-me — RULIS" },
      { property: "og:description", content: "Deixa a RULIS sortear um rolê com a sua cara." },
    ],
  }),
  component: Surpresa,
});

const KINDS = Object.keys(SURPRISE_LABEL) as SurpriseKind[];

function Surpresa() {
  const reco = useRecoBase();
  const free = useFreeWindows(2);
  const [kind, setKind] = useState<SurpriseKind>("perto");
  const [result, setResult] = useState<Scored | null>(null);
  const [logId, setLogId] = useState<string>();
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [spinning, setSpinning] = useState(false);
  const [noneLeft, setNoneLeft] = useState(false);

  // Respect availability when known: the next window today/tomorrow, if any.
  const window = free.windows[0];

  function draw(markPrevious?: "rejected") {
    if (markPrevious && result) {
      void markLog(logId, false);
      void track(result.activity.id, "ignored", "surpresa");
    }
    setSpinning(true);
    setResult(null);
    setTimeout(() => {
      const ranked = reco.rank(window ? { availableMinutes: window.minutes, when: window.start } : {});
      const exclude = new Set(seen);
      const pick = drawSurprise(ranked, kind, exclude);
      setSpinning(false);
      if (!pick) {
        setNoneLeft(true);
        return;
      }
      setNoneLeft(false);
      setSeen(new Set([...exclude, pick.activity.id]));
      setResult(pick);
      logShown(`surpresa:${kind}`, [{ id: pick.activity.id, score: pick.score, reasons: pick.reasons }]).then((ids) => setLogId(ids[0]));
    }, 900);
  }

  return (
    <div>
      <PageHeader eyebrow="RULIS Surpresa" title="Surpreenda-me." subtitle="Escolha o clima da surpresa. A gente só revela depois do sorteio." />
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => { setKind(k); setSeen(new Set()); setResult(null); setNoneLeft(false); }}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
              kind === k ? "border-primary bg-primary-soft text-primary" : "bg-card hover:border-primary/40",
            )}
          >
            {SURPRISE_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-1">
        <OriginControl />
        {window && <p className="text-xs text-muted-foreground">Respeitando seu próximo intervalo de {minutesToLabel(window.minutes)}, seu raio e seu orçamento.</p>}
      </div>

      <div className="mt-8 flex flex-col items-center">
        {reco.isLoading ? (
          <LoadingBlock />
        ) : reco.error ? (
          <ErrorBlock error={reco.error} />
        ) : result ? (
          <div className="w-full max-w-sm animate-pop">
            <ActivityCard
              activity={result.activity as never}
              reasons={result.reasons}
              distanceKm={result.distanceKm}
              travelMinutes={result.travelMinutes}
              defaultStart={window?.start}
              variant="grid"
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Sugestão, não reserva: confirme horários e disponibilidade com o local.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => { void markLog(logId, false); setResult(null); }}>
                <X /> Recusar
              </Button>
              <Button variant="outline" onClick={() => { void markLog(logId, false); void track(result.activity.id, "disliked", "surpresa"); draw(); }}>
                <ThumbsDown /> Não curti
              </Button>
              <Button variant="soft" onClick={() => draw("rejected")}>
                <Dices /> De novo
              </Button>
            </div>
            <div className="mt-2 flex justify-center">
              <AddToAgendaButton
                activity={result.activity}
                defaultStart={window?.start}
                variant="hero"
                size="lg"
                label="Topei! Pôr na agenda"
                onAdded={() => void markLog(logId, true)}
              />
            </div>
          </div>
        ) : noneLeft ? (
          <EmptyState icon={<Gift className="size-5" />} title="Acabaram as surpresas desse tipo" action={<Button variant="soft" onClick={() => { setSeen(new Set()); setNoneLeft(false); }}>Recomeçar</Button>}>
            Nada mais cabe no seu tempo, raio e orçamento. Experimente outro tipo de surpresa.
          </EmptyState>
        ) : (
          <button
            type="button"
            onClick={() => draw()}
            disabled={spinning}
            className="group relative grid size-56 place-items-center rounded-full bg-sunset text-primary-foreground shadow-glow transition active:scale-95 disabled:opacity-90"
            aria-label="Surpreenda-me"
          >
            <span className="absolute inset-0 rounded-full animate-pulse-ring" />
            <span className="flex flex-col items-center gap-2">
              <Gift className={cn("size-12", spinning && "animate-spin-slow")} />
              <span className="font-display text-2xl font-extrabold">{spinning ? "Sorteando…" : "SURPREENDA-ME"}</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

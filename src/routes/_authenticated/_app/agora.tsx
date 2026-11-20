import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/rulis/ActivityCard";
import { Chip, EmptyState, ErrorBlock, LoadingBlock, PageHeader } from "@/components/rulis/common";
import { OriginControl, WeatherChip } from "@/components/rulis/WeatherAndOrigin";
import { useRecoBase } from "@/hooks/use-reco";
import { pickTrio } from "@/lib/recommend";
import { prefsQuery } from "@/lib/queries";
import { logShown } from "@/lib/reco-log";
import { minutesToLabel, timeToMinutes } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/_app/agora")({
  validateSearch: z.object({ min: z.number().optional(), at: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "RULIS Agora — o que fazer com o tempo que você tem" },
      { name: "description", content: "Diga quanto tempo tem e receba três possibilidades que cabem nele." },
      { property: "og:title", content: "RULIS Agora" },
      { property: "og:description", content: "Diga quanto tempo tem e receba três possibilidades que cabem nele." },
    ],
  }),
  component: Agora,
});

const TIMES = [
  { key: "30", label: "Tenho 30 minutos", min: 30 },
  { key: "60", label: "Tenho 1 hora", min: 60 },
  { key: "120", label: "Tenho 2 horas", min: 120 },
  { key: "180", label: "Tenho 3 horas", min: 180 },
  { key: "noite", label: "Tenho a noite livre", min: -1 },
  { key: "dia", label: "Tenho o dia livre", min: 600 },
];
const BUDGETS: { label: string; level: number | null | undefined }[] = [
  { label: "Meu orçamento", level: undefined },
  { label: "Grátis", level: 0 },
  { label: "Até R$ 30", level: 1 },
  { label: "Até R$ 60", level: 2 },
  { label: "Até R$ 100", level: 3 },
  { label: "Sem limite", level: null },
];
const DISTS = [3, 5, 10, 20, 40];

function Agora() {
  const search = Route.useSearch();
  const reco = useRecoBase();
  const prefs = useQuery(prefsQuery);
  const [timeKey, setTimeKey] = useState<string | null>(search.min ? "custom" : null);
  const [budgetIdx, setBudgetIdx] = useState(0);
  const [dist, setDist] = useState<number | null>(null);
  const [exclude, setExclude] = useState<Set<string>>(new Set());
  const [logIds, setLogIds] = useState<Record<string, string>>({});

  const when = search.at ? new Date(search.at) : new Date();
  const minutes = useMemo(() => {
    if (timeKey === "custom") return search.min ?? 120;
    const t = TIMES.find((x) => x.key === timeKey);
    if (!t) return null;
    if (t.min > 0) return t.min;
    // "Noite livre": until the user's usual bedtime (default 23h)
    const sleep = timeToMinutes(prefs.data?.sleep_time ?? "23:00");
    const nowMin = when.getHours() * 60 + when.getMinutes();
    const start = Math.max(nowMin, 18 * 60);
    return Math.max(60, (sleep > start ? sleep : 24 * 60) - start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeKey, search.min, prefs.data?.sleep_time]);

  const trio = useMemo(() => {
    if (minutes == null || !reco.ctx) return null;
    const ranked = reco.rank({
      availableMinutes: minutes,
      when,
      ...(BUDGETS[budgetIdx]!.level !== undefined ? { maxPriceLevel: BUDGETS[budgetIdx]!.level } : {}),
      ...(dist ? { maxDistanceKm: dist } : {}),
    });
    return pickTrio(ranked, reco.ctx as never, exclude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes, reco.ctx, reco.activities, budgetIdx, dist, exclude]);

  const shown = trio ? [trio.calm, trio.food, trio.different].filter(Boolean) : [];
  const shownKey = shown.map((s) => s!.activity.id).join(",");

  useEffect(() => {
    if (!shown.length) return;
    logShown("agora", shown.map((s) => ({ id: s!.activity.id, score: s!.score, reasons: s!.reasons }))).then((ids) => {
      const map: Record<string, string> = {};
      shown.forEach((s, i) => ids[i] && (map[s!.activity.id] = ids[i]!));
      setLogIds((m) => ({ ...m, ...map }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey]);

  const count = shown.length;
  const labels = ["Uma opção tranquila", "Uma opção gastronômica", "Uma opção diferente"];

  return (
    <div>
      <PageHeader eyebrow="RULIS Agora" title="Quanto tempo você tem?" subtitle="Menos tempo pensando no que fazer. Mais tempo vivendo." action={<WeatherChip />} />
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => (
            <Chip key={t.key} active={timeKey === t.key} onClick={() => { setTimeKey(t.key); setExclude(new Set()); }}>
              {t.label}
            </Chip>
          ))}
          {search.min && <Chip active={timeKey === "custom"} onClick={() => setTimeKey("custom")}>Meu intervalo ({minutesToLabel(search.min)})</Chip>}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {BUDGETS.map((b, i) => (
            <Chip key={b.label} active={budgetIdx === i} onClick={() => setBudgetIdx(i)} className="py-1.5 text-xs">{b.label}</Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip active={dist == null} onClick={() => setDist(null)} className="py-1.5 text-xs">Meu raio</Chip>
          {DISTS.map((d) => (
            <Chip key={d} active={dist === d} onClick={() => setDist(d)} className="py-1.5 text-xs">Até {d} km</Chip>
          ))}
        </div>
        <OriginControl />
      </div>

      <div className="mt-8">
        {reco.isLoading ? (
          <LoadingBlock />
        ) : reco.error ? (
          <ErrorBlock error={reco.error} />
        ) : minutes == null ? (
          <EmptyState icon={<Sparkles className="size-5" />} title="Escolha quanto tempo você tem">
            A gente considera ida, volta e duração para só sugerir o que cabe de verdade.
          </EmptyState>
        ) : count === 0 ? (
          <EmptyState icon={<Sparkles className="size-5" />} title="Nada cabe nesse tempo e raio" action={<Button variant="soft" onClick={() => setExclude(new Set())}>Recomeçar</Button>}>
            Tente aumentar o tempo, a distância ou o orçamento.
          </EmptyState>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold animate-rise">
              Você tem {minutesToLabel(minutes)} livres. Encontramos {count === 1 ? "uma possibilidade" : `${count} possibilidades`}.
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[trio!.calm, trio!.food, trio!.different].map((s, i) =>
                s ? (
                  <div key={s.activity.id} className="animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{labels[i]}</p>
                    <ActivityCard
                      activity={s.activity as never}
                      reasons={s.reasons}
                      distanceKm={s.distanceKm}
                      travelMinutes={s.travelMinutes}
                      defaultStart={when}
                      variant="grid"
                    />
                  </div>
                ) : null,
              )}
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  shown.forEach((s) => logIds[s!.activity.id]);
                  setExclude(new Set([...exclude, ...shown.map((s) => s!.activity.id)]));
                }}
              >
                <RefreshCw /> Atualizar sugestões
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

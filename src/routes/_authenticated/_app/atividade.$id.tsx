import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bike, Bus, Car, Check, Clock, ExternalLink, Footprints, MapPin, Share2, ThumbsDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddToAgendaButton, SaveButton } from "@/components/rulis/ActivityActions";
import { DemoBadge, EmptyState, ErrorBlock, LoadingBlock } from "@/components/rulis/common";
import { ExperienceDialog } from "@/components/rulis/ExperienceDialog";
import { OriginControl } from "@/components/rulis/WeatherAndOrigin";
import { useOrigin } from "@/hooks/use-origin";
import { activityQuery, track } from "@/lib/queries";
import { GROUP_DOT, GROUP_IMAGE, GROUP_LABEL, PERIOD_LABEL, WEEKDAYS } from "@/lib/constants";
import { brl, durationRange, km, priceLabel } from "@/lib/format";
import { estimateTravelCost, estimateTravelMinutes, haversineKm, mapsDirectionsUrl, TRAVEL_MODE_LABEL, type TravelMode } from "@/lib/geo";
import { classifyDuration, DURATION_CLASS_LABEL } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/atividade/$id")({
  head: () => ({
    meta: [
      { title: "Experiência — RULIS" },
      { name: "description", content: "Detalhes, deslocamento e custo estimado desta experiência." },
      { property: "og:title", content: "Experiência — RULIS" },
      { property: "og:description", content: "Detalhes, deslocamento e custo estimado desta experiência." },
    ],
  }),
  component: ActivityDetail,
});

const MODES: { mode: TravelMode; icon: typeof Car }[] = [
  { mode: "car", icon: Car },
  { mode: "bus", icon: Bus },
  { mode: "bike", icon: Bike },
  { mode: "walk", icon: Footprints },
];

function ActivityDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const q = useQuery(activityQuery(id));
  const { origin } = useOrigin();
  const [mode, setMode] = useState<TravelMode>("car");
  const [doneOpen, setDoneOpen] = useState(false);

  useEffect(() => {
    void track(id, "viewed");
  }, [id]);

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data;
  if (!a) return <EmptyState title="Essa experiência não está mais disponível" action={<Button asChild variant="soft"><Link to="/explorar">Explorar outras</Link></Button>} />;

  const dist = a.lat != null && a.lng != null ? haversineKm(origin, { lat: a.lat, lng: a.lng }) : null;
  const minutes = dist != null ? estimateTravelMinutes(dist, mode) : null;
  const cost = dist != null ? estimateTravelCost(dist, mode) : null;
  const img = a.cover_image_url || GROUP_IMAGE[a.group_key];
  const hours = [...(a.activity_opening_hours ?? [])].sort((x, y) => x.weekday - y.weekday);

  async function share() {
    const url = window.location.href;
    void track(id, "shared");
    if (navigator.share) {
      try {
        await navigator.share({ title: a!.title, text: `Bora? ${a!.title}`, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => router.history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <div className="relative overflow-hidden rounded-[2rem] shadow-float">
        <img src={img} alt="" className="aspect-[16/10] w-full object-cover md:aspect-[21/9]" />
        <div className="absolute inset-0 bg-scrim" />
        <div className="absolute right-4 top-4 flex gap-2">
          <SaveButton activity={a} />
          <button onClick={share} aria-label="Compartilhar" className="grid size-9 place-items-center rounded-full bg-card/90 shadow-card backdrop-blur">
            <Share2 className="size-4" />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 text-ink-foreground md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold text-foreground">
              <span className={cn("size-2 rounded-full", GROUP_DOT[a.group_key])} />
              {a.activity_categories?.name ?? GROUP_LABEL[a.group_key]}
            </span>
            {a.is_demo && <DemoBadge />}
            {!a.cover_image_url && <span className="text-[11px] opacity-80">Imagem ilustrativa</span>}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">{a.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 opacity-90">
            <MapPin className="size-4" /> {a.neighborhood ? `${a.neighborhood}, ` : ""}{a.city}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {a.description && <p className="text-lg leading-relaxed">{a.description}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Info icon={<Clock className="size-4" />} label="Duração sugerida" value={durationRange(a.duration_min_minutes, a.duration_max_minutes)} hint={DURATION_CLASS_LABEL[classifyDuration(a.duration_min_minutes)]} />
            <Info icon={<Wallet className="size-4" />} label="Preço" value={priceLabel(a.price_level, a.price_is_estimate)} hint={a.price_level != null && a.price_level > 0 ? "Faixa estimada, não garantida" : undefined} />
            <Info label="Ambiente" value={a.indoor ? "Coberto" : "Ao ar livre"} />
            <Info label="Melhor período" value={a.best_periods.map((p) => PERIOD_LABEL[p]).join(", ")} />
          </div>

          <div className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="text-lg font-bold">Horário de funcionamento</h2>
            {hours.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Horário não verificado. Confirme com o local antes de ir.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {hours.map((h) => (
                  <li key={h.id} className="flex justify-between">
                    <span>{WEEKDAYS[h.weekday]}</span>
                    <span>
                      {h.opens.slice(0, 5)}–{h.closes.slice(0, 5)} {h.is_verified ? "" : <span className="text-muted-foreground">(não verificado)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="text-lg font-bold">Como chegar</h2>
            <div className="mt-1"><OriginControl /></div>
            {a.address && <p className="mt-3 text-sm">{a.address}</p>}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {MODES.map(({ mode: m, icon: Icon }) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={cn("flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-semibold", mode === m ? "border-primary bg-primary-soft text-primary" : "bg-background")}
                >
                  <Icon className="size-5" /> {TRAVEL_MODE_LABEL[m]}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Distância</p>
                <p className="font-display text-xl font-bold">{km(dist)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tempo</p>
                <p className="font-display text-xl font-bold">{minutes != null ? `~${minutes} min` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo (ida)</p>
                <p className="font-display text-xl font-bold">{cost == null ? "—" : cost === 0 ? "R$ 0" : `~${brl(cost)}`}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Estimativas a partir de parâmetros fixos (distância em linha reta × 1,35, velocidade média, combustível ~R$ 0,85/km), sem trânsito em tempo real.
              {mode === "bus" && " A tarifa de ônibus ainda não foi configurada."} Não estimamos preços de aplicativos de transporte.
            </p>
            {a.lat != null && a.lng != null && (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <a href={mapsDirectionsUrl({ lat: a.lat, lng: a.lng }, origin)} target="_blank" rel="noreferrer">
                  Abrir rota no mapa <ExternalLink />
                </a>
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Fonte: {a.data_sources?.name ?? "cadastro da equipe RULIS"}
            {a.data_sources?.last_updated_at && ` · atualizado em ${new Date(a.data_sources.last_updated_at).toLocaleDateString("pt-BR")}`}
            {a.data_sources?.notes && ` · ${a.data_sources.notes}`}
          </p>
        </div>

        <aside className="space-y-3 md:sticky md:top-6 md:self-start">
          <div className="rounded-3xl bg-card p-5 shadow-card">
            <p className="font-display text-xl font-bold">Bora?</p>
            <div className="mt-3 flex flex-col gap-2">
              <AddToAgendaButton activity={a} variant="hero" size="lg" />
              <Button variant="outline" onClick={() => setDoneOpen(true)}>
                <Check /> Já fui · registrar
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  await track(id, "disliked");
                  toast("Entendido. Não vamos mais sugerir isso.");
                }}
              >
                <ThumbsDown /> Não tenho interesse
              </Button>
            </div>
          </div>
        </aside>
      </div>
      {doneOpen && <ExperienceDialog open={doneOpen} onOpenChange={setDoneOpen} activity={a} />}
    </div>
  );
}

function Info({ icon, label, value, hint }: { icon?: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</p>
      <p className="mt-1 font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

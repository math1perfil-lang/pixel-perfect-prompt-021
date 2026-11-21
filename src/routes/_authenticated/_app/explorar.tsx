import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { List, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ActivityCard } from "@/components/rulis/ActivityCard";
import { Chip, EmptyState, ErrorBlock, LoadingBlock } from "@/components/rulis/common";
import { OriginControl } from "@/components/rulis/WeatherAndOrigin";
import { useRecoBase } from "@/hooks/use-reco";
import { useOrigin } from "@/hooks/use-origin";
import { GROUP_DOT, GROUP_LABEL, GROUPS } from "@/lib/constants";
import { haversineKm, estimateTravelMinutes } from "@/lib/geo";
import { durationRange, km, priceLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const ActivityMap = lazy(() => import("@/components/rulis/ActivityMap"));

export const Route = createFileRoute("/_authenticated/_app/explorar")({
  head: () => ({
    meta: [
      { title: "Explorar — RULIS" },
      { name: "description", content: "Mapa e lista de experiências perto de você, com filtros por distância, preço e duração." },
      { property: "og:title", content: "Explorar — RULIS" },
      { property: "og:description", content: "Mapa e lista de experiências perto de você." },
    ],
  }),
  component: Explorar,
});

type Filters = {
  groups: string[];
  radius: number;
  maxPrice: number | null;
  maxDuration: number | null;
  setting: "any" | "indoor" | "outdoor";
  company: "any" | "solo" | "group";
  family: boolean;
  free: boolean;
  nightlife: boolean;
  different: boolean;
};

function Explorar() {
  const reco = useRecoBase();
  const { origin } = useOrigin();
  const [view, setView] = useState<"map" | "list">("map");
  const [openFilters, setOpenFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [f, setF] = useState<Filters>({
    groups: [],
    radius: 20,
    maxPrice: null,
    maxDuration: null,
    setting: "any",
    company: "any",
    family: false,
    free: false,
    nightlife: false,
    different: false,
  });

  const items = useMemo(() => {
    return reco.activities
      .map((a) => {
        const d = a.lat != null && a.lng != null ? haversineKm(origin, { lat: a.lat, lng: a.lng }) : null;
        return { a, d, t: d != null ? estimateTravelMinutes(d) : null };
      })
      .filter(({ a, d }) => {
        if (d != null && d > f.radius) return false;
        if (f.groups.length && !f.groups.includes(a.group_key)) return false;
        if (f.free && a.price_level !== 0) return false;
        if (f.maxPrice != null && (a.price_level == null || a.price_level > f.maxPrice)) return false;
        if (f.maxDuration != null && a.duration_min_minutes > f.maxDuration) return false;
        if (f.setting === "indoor" && !a.indoor) return false;
        if (f.setting === "outdoor" && a.indoor) return false;
        if (f.company === "solo" && !a.solo_friendly) return false;
        if (f.company === "group" && !a.group_friendly) return false;
        if (f.family && !a.family_friendly) return false;
        if (f.nightlife && !a.best_periods.includes("night")) return false;
        if (f.different && reco.ctx?.interestGroups.has(a.group_key)) return false;
        return true;
      })
      .sort((x, y) => (x.d ?? 99) - (y.d ?? 99));
  }, [reco.activities, reco.ctx, origin, f]);

  const sel = items.find((i) => i.a.id === selected);
  const toggleGroup = (g: string) => setF({ ...f, groups: f.groups.includes(g) ? f.groups.filter((x) => x !== g) : [...f.groups, g] });
  const activeCount =
    f.groups.length + (f.maxPrice != null ? 1 : 0) + (f.maxDuration != null ? 1 : 0) + (f.setting !== "any" ? 1 : 0) + (f.company !== "any" ? 1 : 0) + [f.family, f.free, f.nightlife, f.different].filter(Boolean).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Explorar</p>
          <h1 className="text-3xl font-extrabold md:text-4xl">Tem coisa boa acontecendo por perto.</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border bg-card p-1">
            <button className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold", view === "map" && "bg-ink text-ink-foreground")} onClick={() => setView("map")} aria-pressed={view === "map"}>
              <MapIcon className="size-4" /> Mapa
            </button>
            <button className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold", view === "list" && "bg-ink text-ink-foreground")} onClick={() => setView("list")} aria-pressed={view === "list"}>
              <List className="size-4" /> Lista
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpenFilters(true)}>
            <SlidersHorizontal /> Filtros{activeCount > 0 && ` (${activeCount})`}
          </Button>
        </div>
      </div>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
        <Chip active={f.groups.length === 0 && !f.free && !f.nightlife && !f.family && !f.different} onClick={() => setF({ ...f, groups: [], free: false, nightlife: false, family: false, different: false })}>Tudo</Chip>
        {GROUPS.filter((g) => g.key !== "social").map((g) => (
          <Chip key={g.key} active={f.groups.includes(g.key)} onClick={() => toggleGroup(g.key)}>
            <span className={cn("size-2 rounded-full", GROUP_DOT[g.key])} /> {g.short}
          </Chip>
        ))}
        <Chip active={f.free} onClick={() => setF({ ...f, free: !f.free })}>Gratuito</Chip>
        <Chip active={f.family} onClick={() => setF({ ...f, family: !f.family })}>Familiar</Chip>
        <Chip active={f.nightlife} onClick={() => setF({ ...f, nightlife: !f.nightlife })}>Vida noturna</Chip>
        <Chip active={f.different} onClick={() => setF({ ...f, different: !f.different })}>Experiências diferentes</Chip>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <OriginControl />
        <p className="text-xs text-muted-foreground">{items.length} lugar(es) em até {f.radius} km · avaliações ainda não disponíveis</p>
      </div>

      {reco.isLoading ? (
        <LoadingBlock />
      ) : reco.error ? (
        <ErrorBlock error={reco.error} />
      ) : view === "map" ? (
        <div className="relative h-[62dvh] overflow-hidden rounded-[2rem] shadow-card">
          <ClientOnly fallback={<LoadingBlock label="Carregando mapa…" />}>
            <Suspense fallback={<LoadingBlock label="Carregando mapa…" />}>
              <ActivityMap
                items={items.filter((i) => i.a.lat != null && i.a.lng != null).map((i) => ({ id: i.a.id, title: i.a.title, lat: i.a.lat!, lng: i.a.lng!, group_key: i.a.group_key }))}
                origin={origin}
                radiusKm={f.radius}
                selectedId={selected}
                onSelect={setSelected}
              />
            </Suspense>
          </ClientOnly>
          {sel && (
            <div className="absolute inset-x-3 bottom-3 z-[500] animate-rise md:left-auto md:right-4 md:w-96">
              <div className="relative rounded-3xl bg-card p-4 shadow-float">
                <button className="absolute right-3 top-3 text-muted-foreground" aria-label="Fechar" onClick={() => setSelected(null)}>
                  <X className="size-4" />
                </button>
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={cn("size-2 rounded-full", GROUP_DOT[sel.a.group_key])} />
                  {sel.a.activity_categories?.name ?? GROUP_LABEL[sel.a.group_key]}
                  {sel.a.is_demo && <span className="text-muted-foreground">· demonstração</span>}
                </p>
                <p className="mt-1 pr-6 font-display text-lg font-bold">{sel.a.title}</p>
                <p className="text-sm text-muted-foreground">
                  {km(sel.d)} · ~{sel.t} min de carro (estimativa) · {durationRange(sel.a.duration_min_minutes, sel.a.duration_max_minutes)}
                </p>
                <p className="mt-1 text-sm font-semibold">{priceLabel(sel.a.price_level, sel.a.price_is_estimate)}</p>
                <Button asChild variant="soft" size="sm" className="mt-3">
                  <Link to="/atividade/$id" params={{ id: sel.a.id }}>Ver detalhes</Link>
                </Button>
              </div>
            </div>
          )}
          {items.length === 0 && (
            <div className="absolute inset-x-4 top-4 z-[500] rounded-2xl bg-card p-3 text-center text-sm shadow-card">Nenhum lugar com esses filtros. Aumente o raio.</div>
          )}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nada com esses filtros">Tente aumentar o raio ou remover algum filtro.</EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <ActivityCard key={i.a.id} activity={i.a} distanceKm={i.d} travelMinutes={i.t} variant="grid" />
          ))}
        </div>
      )}

      <Sheet open={openFilters} onOpenChange={setOpenFilters}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-[2rem]">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Filtros</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 px-4 pb-8">
            <div>
              <p className="mb-2 font-semibold">Raio de busca: {f.radius} km</p>
              <Slider min={1} max={60} step={1} value={[f.radius]} onValueChange={([v]) => setF({ ...f, radius: v ?? 20 })} aria-label="Raio de busca" />
            </div>
            <FilterRow label="Preço">
              {[[null, "Qualquer"], [0, "Gratuito"], [1, "Até R$ 30"], [2, "Até R$ 60"], [3, "Até R$ 100"]].map(([v, l]) => (
                <Chip key={String(l)} active={f.maxPrice === v} onClick={() => setF({ ...f, maxPrice: v as number | null })}>{l as string}</Chip>
              ))}
            </FilterRow>
            <FilterRow label="Duração">
              {[[null, "Qualquer"], [60, "Até 1h"], [120, "Até 2h"], [240, "Até 4h"]].map(([v, l]) => (
                <Chip key={String(l)} active={f.maxDuration === v} onClick={() => setF({ ...f, maxDuration: v as number | null })}>{l as string}</Chip>
              ))}
            </FilterRow>
            <FilterRow label="Ambiente">
              {([["any", "Tanto faz"], ["indoor", "Interno"], ["outdoor", "Ao ar livre"]] as const).map(([v, l]) => (
                <Chip key={v} active={f.setting === v} onClick={() => setF({ ...f, setting: v })}>{l}</Chip>
              ))}
            </FilterRow>
            <FilterRow label="Companhia">
              {([["any", "Tanto faz"], ["solo", "Individual"], ["group", "Coletiva"]] as const).map(([v, l]) => (
                <Chip key={v} active={f.company === v} onClick={() => setF({ ...f, company: v })}>{l}</Chip>
              ))}
            </FilterRow>
            <p className="text-xs text-muted-foreground">
              Horário de funcionamento, acessibilidade e avaliações ainda não foram verificados para os lugares de demonstração, por isso esses filtros não aparecem.
            </p>
            <Button variant="hero" className="w-full" onClick={() => setOpenFilters(false)}>Ver {items.length} lugares</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

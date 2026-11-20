import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Gift, Radar, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/rulis/ActivityCard";
import { EmptyState, ErrorBlock, HScroll, LoadingBlock, Section } from "@/components/rulis/common";
import { OriginControl, WeatherChip } from "@/components/rulis/WeatherAndOrigin";
import { useRecoBase, type ScoredActivity } from "@/hooks/use-reco";
import { useFreeWindows } from "@/hooks/use-freetime";
import { eventsQuery, profileQuery } from "@/lib/queries";
import { outsideTheBox } from "@/lib/recommend";
import { dateLabel } from "@/lib/format";
import { greeting, hhmm, minutesToLabel } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/_app/inicio")({
  head: () => ({
    meta: [
      { title: "Início — RULIS" },
      { name: "description", content: "Seu painel de possibilidades para o tempo livre." },
      { property: "og:title", content: "Início — RULIS" },
      { property: "og:description", content: "Seu painel de possibilidades para o tempo livre." },
    ],
  }),
  component: Home,
});

function Rail({ items, start }: { items: ScoredActivity[]; start?: Date }) {
  return (
    <HScroll>
      {items.map((s) => (
        <ActivityCard
          key={s.activity.id}
          activity={s.activity}
          reasons={s.reasons}
          distanceKm={s.distanceKm}
          travelMinutes={s.travelMinutes}
          defaultStart={start}
        />
      ))}
    </HScroll>
  );
}

function Home() {
  const { data: profile } = useQuery(profileQuery);
  const reco = useRecoBase();
  const free = useFreeWindows(7);
  const events = useQuery(eventsQuery);
  const now = new Date();
  const next = free.windows[0];
  const first = profile?.full_name?.split(" ")[0] ?? "";

  const sections = useMemo(() => {
    if (!reco.ctx) return null;
    const all = reco.rank();
    const fitsNext = next ? reco.rank({ availableMinutes: next.minutes, when: next.start }).slice(0, 8) : [];
    const ids = (l: ScoredActivity[]) => new Set(l.map((s) => s.activity.id));
    const near = all.filter((s) => s.distanceKm != null && s.distanceKm <= 5).slice(0, 8);
    const forYou = all.filter((s) => reco.ctx!.interestGroups.has(s.activity.group_key)).slice(0, 8);
    const free = all.filter((s) => s.activity.price_level === 0 || s.activity.price_level === 1).slice(0, 8);
    const solo = all.filter((s) => s.activity.solo_friendly && s.activity.crowd === "reserved").slice(0, 8);
    const share = all.filter((s) => s.activity.vibe_tags.includes("friends") || s.activity.group_key === "gastronomia").slice(0, 8);
    const weekend = all.filter((s) => s.activity.duration_min_minutes >= 120).slice(0, 8);
    const obvious = outsideTheBox(all, { ...reco.ctx, when: now });
    void ids;
    return { all, fitsNext, near, forYou, free, solo, share, weekend, obvious };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reco.ctx, reco.activities, next?.start.getTime()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <WeatherChip />
      </div>
      <h1 className="text-[2.1rem] font-extrabold leading-tight md:text-5xl animate-rise">
        {greeting(now)}, {first}.
        <span className="block text-muted-foreground">Seu próximo rolê pode estar mais perto do que você imagina.</span>
      </h1>
      <div className="mt-3">
        <OriginControl />
      </div>

      {/* Next free time */}
      <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-ink-foreground shadow-float animate-rise">
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-sunset opacity-60 blur-2xl" />
          <p className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sun">
            <CalendarClock className="size-4" /> Seu próximo intervalo disponível
          </p>
          {free.isLoading ? (
            <p className="relative mt-3 opacity-70">Calculando…</p>
          ) : next ? (
            <div className="relative">
              <p className="mt-3 font-display text-3xl font-extrabold">{dateLabel(next.start, { weekday: "long", day: "numeric", month: "short" })}</p>
              <p className="text-xl opacity-90">
                {hhmm(next.start)} às {hhmm(next.end)} · {minutesToLabel(next.minutes)} disponíveis
              </p>
              <Button asChild variant="hero" className="mt-5">
                <Link to="/agora" search={{ min: next.minutes, at: next.start.toISOString() }}>
                  Descobrir o que fazer <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="relative">
              <p className="mt-3 font-display text-2xl font-bold">
                {free.hasAvailability ? "Sua semana está cheia." : "Ainda não sabemos quando você está livre."}
              </p>
              <p className="mt-1 opacity-80">
                {free.hasAvailability
                  ? "Nenhum intervalo livre nos próximos 7 dias. Tudo bem — descansar também conta."
                  : "Conte seus horários livres e a gente encaixa os rolês."}
              </p>
              <Button asChild variant="hero" className="mt-5">
                <Link to="/tempo-livre">Configurar meu tempo livre</Link>
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/agora" className="flex flex-col justify-between rounded-[2rem] bg-sunset p-5 text-primary-foreground shadow-glow transition hover:-translate-y-0.5">
            <Sparkles className="size-6" />
            <div>
              <p className="font-display text-xl font-extrabold">RULIS Agora</p>
              <p className="text-sm opacity-90">Tenho um tempinho. E aí?</p>
            </div>
          </Link>
          <Link to="/surpresa" className="flex flex-col justify-between rounded-[2rem] bg-lagoon-gradient p-5 text-lagoon-foreground shadow-card transition hover:-translate-y-0.5">
            <Gift className="size-6" />
            <div>
              <p className="font-display text-xl font-extrabold">Surpreenda-me</p>
              <p className="text-sm opacity-90">Deixa que a gente escolhe.</p>
            </div>
          </Link>
          <Link to="/fim-de-semana" className="col-span-2 flex items-center justify-between rounded-[2rem] bg-card p-5 shadow-card transition hover:-translate-y-0.5">
            <div>
              <p className="font-display text-lg font-extrabold">Seu sábado ainda está sem planos?</p>
              <p className="text-sm text-muted-foreground">Monte o fim de semana no seu ritmo.</p>
            </div>
            <Sun className="size-7 text-sun" />
          </Link>
        </div>
      </div>

      <div className="mt-10">
        {reco.isLoading ? (
          <LoadingBlock label="Procurando coisas boas por perto…" />
        ) : reco.error ? (
          <ErrorBlock error={reco.error} />
        ) : sections && sections.all.length === 0 ? (
          <EmptyState icon={<Sparkles className="size-5" />} title="Nada dentro do seu raio e orçamento">
            Tente aumentar a distância ou o orçamento no seu perfil.
          </EmptyState>
        ) : sections ? (
          <>
            {next && sections.fitsNext.length > 0 && (
              <Section title="Ideias para o seu próximo intervalo" subtitle={`Cabe em ${minutesToLabel(next.minutes)}, contando ida e volta.`}>
                <Rail items={sections.fitsNext} start={next.start} />
              </Section>
            )}
            {sections.forYou.length > 0 && (
              <Section title="Experiências que combinam com você">
                <Rail items={sections.forYou} />
              </Section>
            )}
            {sections.near.length > 0 && (
              <Section title="Tem coisa boa por perto" subtitle="Até 5 km de distância.">
                <Rail items={sections.near} />
              </Section>
            )}
            {sections.obvious && (
              <Section title="Saia do óbvio" subtitle="Uma ideia diferente do que você costuma escolher. Só se der vontade.">
                <div className="max-w-sm">
                  <ActivityCard
                    activity={sections.obvious.activity as ScoredActivity["activity"]}
                    reasons={["Encontramos uma experiência diferente do que você costuma escolher."]}
                    distanceKm={sections.obvious.distanceKm}
                    travelMinutes={sections.obvious.travelMinutes}
                    variant="grid"
                  />
                </div>
              </Section>
            )}
            {sections.free.length > 0 && (
              <Section title="Grátis ou quase">
                <Rail items={sections.free} />
              </Section>
            )}
            {sections.weekend.length > 0 && (
              <Section
                title="Seu fim de semana merece"
                action={
                  <Link to="/fim-de-semana" className="text-sm font-semibold text-primary">
                    Planejar
                  </Link>
                }
              >
                <Rail items={sections.weekend} />
              </Section>
            )}
            {sections.solo.length > 0 && (
              <Section title="Para fazer sozinho">
                <Rail items={sections.solo} />
              </Section>
            )}
            {sections.share.length > 0 && (
              <Section title="Para compartilhar">
                <Rail items={sections.share} />
              </Section>
            )}
            <Section title="Radar da cidade" subtitle="Eventos e programações cadastrados.">
              {events.isLoading ? (
                <LoadingBlock />
              ) : (events.data ?? []).length === 0 ? (
                <EmptyState icon={<Radar className="size-5" />} title="Nenhum evento cadastrado por enquanto">
                  Ainda não há fonte de eventos conectada. Quando a equipe cadastrar programações reais, elas aparecem aqui com data e origem.
                </EmptyState>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {events.data!.slice(0, 6).map((ev) => (
                    <div key={ev.id} className="rounded-3xl bg-card p-4 shadow-card">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {dateLabel(new Date(ev.starts_at), { weekday: "short", day: "numeric", month: "short" })} · {hhmm(new Date(ev.starts_at))}
                      </p>
                      <p className="mt-1 font-display text-lg font-bold">{ev.title}</p>
                      {ev.address && <p className="text-sm text-muted-foreground">{ev.address}</p>}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Fonte: {ev.data_sources?.name ?? "cadastro da equipe"}
                        {ev.is_demo && " · demonstração"}
                      </p>
                      {ev.external_url && (
                        <a href={ev.external_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary">
                          Ver detalhes
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        ) : null}
      </div>
    </div>
  );
}

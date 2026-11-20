import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/rulis/Logo";
import { Chip, LoadingBlock } from "@/components/rulis/common";
import { AvailabilityEditor, CommitmentsEditor } from "@/components/rulis/RoutineEditors";
import { categoriesQuery, profileQuery, prefsQuery } from "@/lib/queries";
import { BUDGET_OPTIONS, DISTANCE_OPTIONS, GROUP_DOT, GROUPS } from "@/lib/constants";
import type { Availability } from "@/lib/freetime";
import { saveInterests, savePrefs, saveRoutine, updateProfile, uploadAvatar, type CommitmentDraft } from "@/lib/profile-save";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Seu perfil de lazer — RULIS" },
      { name: "description", content: "Conte pra gente do que você gosta e quando pode sair." },
      { property: "og:title", content: "Seu perfil de lazer — RULIS" },
      { property: "og:description", content: "Conte pra gente do que você gosta e quando pode sair." },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Você", "Interesses", "Estilo", "Distância", "Orçamento", "Rotina", "Pronto"];

type Style = {
  pace: string[];
  crowd: string[];
  company: string[];
  planning: string[];
  novelty: string;
  price_openness: string[];
};

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery(profileQuery);
  const prefs = useQuery(prefsQuery);
  const cats = useQuery(categoriesQuery);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [me, setMe] = useState({ full_name: "", birth_date: "", city: "Florianópolis", state: "SC", terms: false });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [style, setStyle] = useState<Style>({ pace: [], crowd: [], company: [], planning: [], novelty: "sometimes", price_openness: [] });
  const [distance, setDistance] = useState(10);
  const [custom, setCustom] = useState(false);
  const [budget, setBudget] = useState("none");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [commitments, setCommitments] = useState<CommitmentDraft[]>([]);
  const [sleep, setSleep] = useState("23:00");
  const [weekdayLeisure, setWeekdayLeisure] = useState(true);
  const [weekendLeisure, setWeekendLeisure] = useState(true);

  useEffect(() => {
    if (profile.data) {
      if (profile.data.onboarding_completed) navigate({ to: "/inicio", replace: true });
      setMe((m) => ({
        ...m,
        full_name: profile.data!.full_name ?? "",
        birth_date: profile.data!.birth_date ?? "",
        city: profile.data!.city ?? "Florianópolis",
        state: profile.data!.state ?? "SC",
        terms: !!profile.data!.terms_accepted_at,
      }));
    }
  }, [profile.data, navigate]);

  useEffect(() => {
    if (prefs.data) setDistance(prefs.data.max_distance_km);
  }, [prefs.data]);

  const catsByGroup = useMemo(() => {
    const m: Record<string, NonNullable<typeof cats.data>> = {};
    for (const c of cats.data ?? []) (m[c.group_key] ??= []).push(c);
    return m;
  }, [cats.data]);

  if (profile.isLoading || cats.isLoading) return <LoadingBlock label="Preparando seu perfil…" />;

  const canNext =
    step === 0 ? me.full_name.trim().length >= 2 && me.terms : step === 1 ? interests.length > 0 : true;

  async function finish() {
    setSaving(true);
    try {
      let avatar_url: string | undefined;
      if (avatarFile) avatar_url = await uploadAvatar(avatarFile);
      await updateProfile({
        full_name: me.full_name.trim(),
        birth_date: me.birth_date || null,
        city: me.city.trim() || null,
        state: me.state.trim().toUpperCase() || null,
        ...(avatar_url ? { avatar_url } : {}),
        terms_accepted_at: profile.data?.terms_accepted_at ?? new Date().toISOString(),
      });
      await saveInterests(interests);
      await savePrefs({
        ...style,
        max_distance_km: distance,
        budget_per_experience: budget,
        weekday_leisure: weekdayLeisure,
        weekend_leisure: weekendLeisure,
        sleep_time: sleep || null,
      });
      await saveRoutine(availability, commitments);
      await updateProfile({ onboarding_completed: true });
      await qc.invalidateQueries();
      toast.success("Perfil de lazer criado!");
      navigate({ to: "/inicio", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  const selectedCats = (cats.data ?? []).filter((c) => interests.includes(c.id));

  return (
    <div className="min-h-dvh bg-background bg-canvas">
      <div className="mx-auto max-w-2xl px-5 pb-32 pt-6">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-sm text-muted-foreground">
            {step + 1} de {STEPS.length}
          </span>
        </div>
        <div className="mt-5 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all", i <= step ? "bg-primary" : "bg-border")} />
          ))}
        </div>

        <div key={step} className="mt-8 animate-rise">
          {step === 0 && (
            <>
              <h1 className="text-3xl font-extrabold">Prazer! Vamos começar por você.</h1>
              <p className="mt-2 text-muted-foreground">Só o básico. Nada de rotina por enquanto.</p>
              <div className="mt-6 space-y-4">
                <label className="flex cursor-pointer items-center gap-4">
                  <span className="grid size-20 place-items-center overflow-hidden rounded-full border-2 border-dashed bg-card">
                    {avatarFile ? (
                      <img src={URL.createObjectURL(avatarFile)} alt="Prévia da foto" className="size-full object-cover" />
                    ) : (
                      <Camera className="size-6 text-muted-foreground" />
                    )}
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">Foto de perfil</span>
                    <span className="block text-muted-foreground">Opcional · até 5 MB</span>
                  </span>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-name">Como podemos te chamar?</Label>
                  <Input id="ob-name" value={me.full_name} onChange={(e) => setMe({ ...me, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-birth">Data de nascimento</Label>
                  <Input id="ob-birth" type="date" value={me.birth_date} onChange={(e) => setMe({ ...me, birth_date: e.target.value })} />
                </div>
                <div className="grid grid-cols-[1fr_88px] gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-city">Cidade</Label>
                    <Input id="ob-city" value={me.city} onChange={(e) => setMe({ ...me, city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-uf">UF</Label>
                    <Input id="ob-uf" maxLength={2} value={me.state} onChange={(e) => setMe({ ...me, state: e.target.value })} />
                  </div>
                </div>
                {me.city && !/florian/i.test(me.city) && (
                  <p className="rounded-2xl bg-accent p-3 text-sm text-accent-foreground">
                    Por enquanto a RULIS tem lugares cadastrados só em Florianópolis. Sua cidade fica salva para quando chegarmos aí.
                  </p>
                )}
                {!profile.data?.terms_accepted_at && (
                  <label className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Checkbox checked={me.terms} onCheckedChange={(v) => setMe({ ...me, terms: v === true })} className="mt-0.5" />
                    <span>
                      Li e aceito os <a href="/termos" target="_blank" className="font-semibold text-foreground underline">termos de uso</a> e a{" "}
                      <a href="/privacidade" target="_blank" className="font-semibold text-foreground underline">política de privacidade</a>.
                    </span>
                  </label>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-3xl font-extrabold">O que você gosta de fazer?</h1>
              <p className="mt-2 text-muted-foreground">Escolha quantos quiser. Ninguém é uma coisa só.</p>
              <div className="mt-6 space-y-6">
                {GROUPS.map((g) => (
                  <div key={g.key}>
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                      <span className={cn("size-2.5 rounded-full", GROUP_DOT[g.key])} /> {g.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(catsByGroup[g.key] ?? []).map((c) => (
                        <Chip key={c.id} active={interests.includes(c.id)} onClick={() => setInterests(toggle(interests, c.id))}>
                          {c.name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-3xl font-extrabold">Seu estilo de rolê</h1>
              <p className="mt-2 text-muted-foreground">Pode marcar mais de uma. Sem resposta certa.</p>
              <div className="mt-6 space-y-6">
                <Question label="Você prefere atividades…">
                  <Chip active={style.pace.includes("calm")} onClick={() => setStyle({ ...style, pace: toggle(style.pace, "calm") })}>Tranquilas</Chip>
                  <Chip active={style.pace.includes("lively")} onClick={() => setStyle({ ...style, pace: toggle(style.pace, "lively") })}>Movimentadas</Chip>
                </Question>
                <Question label="E os lugares?">
                  <Chip active={style.crowd.includes("busy")} onClick={() => setStyle({ ...style, crowd: toggle(style.crowd, "busy") })}>Cheios de gente</Chip>
                  <Chip active={style.crowd.includes("reserved")} onClick={() => setStyle({ ...style, crowd: toggle(style.crowd, "reserved") })}>Mais reservados</Chip>
                </Question>
                <Question label="Costuma sair…">
                  {[["solo", "Sozinho"], ["pair", "Acompanhado"], ["group", "Em grupo"], ["family", "Com a família"]].map(([v, l]) => (
                    <Chip key={v} active={style.company.includes(v!)} onClick={() => setStyle({ ...style, company: toggle(style.company, v!) })}>{l}</Chip>
                  ))}
                </Question>
                <Question label="Você prefere…">
                  <Chip active={style.planning.includes("ahead")} onClick={() => setStyle({ ...style, planning: toggle(style.planning, "ahead") })}>Planejar antes</Chip>
                  <Chip active={style.planning.includes("spontaneous")} onClick={() => setStyle({ ...style, planning: toggle(style.planning, "spontaneous") })}>Decidir na hora</Chip>
                </Question>
                <Question label="Gosta de experimentar coisas novas?">
                  {[["love", "Adoro"], ["sometimes", "Às vezes"], ["rarely", "Prefiro o conhecido"]].map(([v, l]) => (
                    <Chip key={v} active={style.novelty === v} onClick={() => setStyle({ ...style, novelty: v! })}>{l}</Chip>
                  ))}
                </Question>
                <Question label="Sobre gastar…">
                  {[["free", "Gratuitas"], ["budget", "Econômicas"], ["premium", "Aberto a experiências mais caras"]].map(([v, l]) => (
                    <Chip key={v} active={style.price_openness.includes(v!)} onClick={() => setStyle({ ...style, price_openness: toggle(style.price_openness, v!) })}>{l}</Chip>
                  ))}
                </Question>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-3xl font-extrabold">Até onde você topa ir?</h1>
              <p className="mt-2 text-muted-foreground">Distância máxima que você costuma aceitar. Dá pra mudar depois.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {DISTANCE_OPTIONS.map((d) => (
                  <Chip key={d} active={!custom && distance === d} onClick={() => { setCustom(false); setDistance(d); }}>
                    {d === 60 ? "Mais de 30 km" : `Até ${d} km`}
                  </Chip>
                ))}
                <Chip active={custom} onClick={() => setCustom(true)}>Personalizar</Chip>
              </div>
              {custom && (
                <div className="mt-6 rounded-3xl bg-card p-5 shadow-card">
                  <p className="font-display text-3xl font-bold">{distance} km</p>
                  <Slider className="mt-4" min={1} max={100} step={1} value={[distance]} onValueChange={([v]) => setDistance(v ?? 10)} aria-label="Distância máxima" />
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="text-3xl font-extrabold">Quanto costuma gastar por rolê?</h1>
              <p className="mt-2 text-muted-foreground">É só uma referência para filtrar sugestões. Orçamentos por categoria ficam em “Orçamento de lazer”.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBudget(b.value)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border bg-card px-4 py-3.5 text-left font-medium transition",
                      budget === b.value ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40",
                    )}
                  >
                    {b.label} {budget === b.value && <Check className="size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="text-3xl font-extrabold">Sua rotina, do seu jeito</h1>
              <p className="mt-2 text-muted-foreground">
                Tudo opcional. A gente não presume horários: só usamos o que você informar aqui.
              </p>
              <div className="mt-6 space-y-8">
                <div>
                  <h2 className="mb-3 text-lg font-bold">Compromissos recorrentes</h2>
                  <CommitmentsEditor value={commitments} onChange={setCommitments} />
                </div>
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold">Quando você costuma estar livre?</h2>
                    <Button
                      type="button"
                      size="sm"
                      variant="soft"
                      onClick={() =>
                        setAvailability([
                          ...[1, 2, 3, 4, 5].map((d) => ({ weekday: d, start_time: "19:00", end_time: "22:00" })),
                          { weekday: 6, start_time: "09:00", end_time: "22:00" },
                          { weekday: 0, start_time: "09:00", end_time: "20:00" },
                        ])
                      }
                    >
                      Preencher noites e fins de semana
                    </Button>
                  </div>
                  <AvailabilityEditor value={availability} onChange={setAvailability} />
                </div>
                <div className="space-y-4 rounded-3xl bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="ob-sleep">Horário habitual de dormir</Label>
                    <Input id="ob-sleep" type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} className="w-32" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ob-wd">Curto lazer durante a semana</Label>
                    <Switch id="ob-wd" checked={weekdayLeisure} onCheckedChange={setWeekdayLeisure} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ob-we">Curto lazer nos fins de semana</Label>
                    <Switch id="ob-we" checked={weekendLeisure} onCheckedChange={setWeekendLeisure} />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <div className="grid size-14 place-items-center rounded-full bg-sunset text-primary-foreground shadow-glow animate-pop">
                <Sparkles className="size-7" />
              </div>
              <h1 className="mt-5 text-3xl font-extrabold">Estamos começando a descobrir o seu jeito de aproveitar a vida.</h1>
              <p className="mt-2 text-muted-foreground">Seu primeiro perfil de lazer. Toque em qualquer parte para ajustar.</p>
              <div className="mt-6 space-y-3">
                <Summary title="Interesses" onEdit={() => setStep(1)}>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCats.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                        <span className={cn("size-2 rounded-full", GROUP_DOT[c.group_key])} /> {c.name}
                      </span>
                    ))}
                  </div>
                </Summary>
                <Summary title="Estilo" onEdit={() => setStep(2)}>
                  {[
                    style.pace.includes("calm") && "tranquilo",
                    style.pace.includes("lively") && "movimentado",
                    style.company.includes("solo") && "sai sozinho",
                    style.company.includes("group") && "curte grupo",
                    style.planning.includes("spontaneous") && "decide na hora",
                    style.planning.includes("ahead") && "planeja antes",
                    style.novelty === "love" && "adora novidade",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem preferência marcada"}
                </Summary>
                <Summary title="Distância" onEdit={() => setStep(3)}>Até {distance} km</Summary>
                <Summary title="Orçamento por rolê" onEdit={() => setStep(4)}>{BUDGET_OPTIONS.find((b) => b.value === budget)?.label}</Summary>
                <Summary title="Rotina" onEdit={() => setStep(5)}>
                  {commitments.length} compromisso(s) · {availability.length} intervalo(s) livre(s)
                </Summary>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4 pb-safe">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            <ArrowLeft /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="hero" size="lg" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              {step === 1 && interests.length === 0 ? "Escolha pelo menos um" : step === 0 && !me.terms ? "Aceite os termos" : "Continuar"} <ArrowRight />
            </Button>
          ) : (
            <Button variant="hero" size="lg" onClick={finish} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Ver meu painel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Summary({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <button type="button" onClick={onEdit} className="block w-full rounded-2xl bg-card p-4 text-left shadow-card transition hover:shadow-float">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</p>
      <div className="mt-1 text-sm">{children}</div>
    </button>
  );
}

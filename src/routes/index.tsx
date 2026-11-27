import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarHeart, Clock, Compass, Gift, Heart, MapPin, Sparkles, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/rulis/Logo";
import hero from "@/assets/hero-floripa.jpg";
import natureza from "@/assets/cat-natureza.jpg";
import gastronomia from "@/assets/cat-gastronomia.jpg";
import cultura from "@/assets/cat-cultura.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RULIS — Seu tempo livre, bem aproveitado" },
      {
        name: "description",
        content:
          "A RULIS cruza seu tempo disponível, seus interesses e o que está perto para sugerir rolês que cabem na sua vida. Comece por Florianópolis.",
      },
      { property: "og:title", content: "RULIS — Seu tempo livre, bem aproveitado" },
      { property: "og:description", content: "Tempo, interesse e possibilidade: sugestões de lazer que cabem na sua rotina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

/** Fades and lifts its children into place the first time they scroll into view. */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Tracks scroll position: drives the sticky header style and the hero parallax. */
function useScrollEffects() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (imgRef.current && !reduce && y < 1200) {
          imgRef.current.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(1.12)`;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return { imgRef, scrolled };
}

const pillars = [
  { n: "01", icon: Clock, t: "Tempo", d: "Quando você pode? Sua rotina vira intervalos livres de verdade." },
  { n: "02", icon: Heart, t: "Interesse", d: "O que você curte? Natureza, comida, cultura, movimento, gente." },
  { n: "03", icon: Compass, t: "Possibilidade", d: "O que é viável agora? Distância, duração, orçamento e clima." },
];

function Landing() {
  const signedIn = useSignedIn();
  const { imgRef, scrolled } = useScrollEffects();

  const features = [
    { icon: Sparkles, t: "RULIS Agora", d: "Tenho 2 horas. O que dá pra fazer?", img: natureza },
    { icon: Gift, t: "Surpreenda-me", d: "Um rolê revelado só depois do sorteio.", img: gastronomia },
    { icon: Sun, t: "Meu fim de semana", d: "Monte, reordene, deixe espaço livre.", img: cultura },
    { icon: CalendarHeart, t: "Meus rolês", d: "Uma memória do que valeu a pena.", img: hero },
  ];

  return (
    <div className="min-h-dvh overflow-x-clip bg-background bg-canvas">
      <header
        className={`sticky top-0 z-40 transition duration-300 ${
          scrolled ? "border-b bg-background/80 backdrop-blur-md" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          {signedIn ? (
            <Button asChild variant="ink" size="sm">
              <Link to="/inicio">Abrir o app</Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "entrar" }}>Entrar</Link>
              </Button>
              <Button asChild variant="ink" size="sm">
                <Link to="/auth" search={{ mode: "criar" }}>Criar conta</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* HERO — imersivo, imagem em tela larga com parallax */}
      <section className="mx-auto max-w-6xl px-3 pt-2 sm:px-5">
        <div className="relative isolate flex min-h-[36rem] items-end overflow-hidden rounded-[2rem] shadow-float sm:min-h-[42rem] sm:rounded-[2.5rem]">
          <img
            ref={imgRef}
            src={hero}
            alt="Duas amigas caminhando nas dunas com vista para a Lagoa da Conceição ao pôr do sol"
            className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover will-change-transform"
          />
          <div className="absolute inset-0 -z-10 bg-ink/25" />
          <div className="absolute inset-0 -z-10 bg-scrim" />

          <div className="relative w-full p-6 text-ink-foreground sm:p-12 lg:max-w-3xl">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full bg-background/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <MapPin className="size-3.5" /> Começando por Florianópolis
              </span>
              <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
                Você organiza tudo. <span className="text-sun">Quem organiza o seu tempo livre?</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-foreground/85">
                A RULIS cruza quando você pode, o que você curte e o que está por perto para sugerir rolês que cabem na sua vida — sem
                transformar lazer em obrigação.
              </p>
              <div className="mt-8">
                <Button asChild variant="hero" size="lg">
                  <Link to={signedIn ? "/inicio" : "/auth"} search={signedIn ? undefined : { mode: "criar" }}>
                    {signedIn ? "Ver meus rolês" : "Descobrir meu jeito de aproveitar"} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute right-6 top-6 hidden w-72 animate-pop rounded-3xl bg-card/90 p-4 text-card-foreground shadow-float backdrop-blur lg:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Seu próximo intervalo</p>
            <p className="mt-1 font-display text-xl font-bold">Quarta · 19h às 22h</p>
            <p className="text-sm text-muted-foreground">Você tem três horas. A gente tem algumas ideias.</p>
          </div>
        </div>

        <div className="mx-3 -mt-5 rounded-3xl bg-card p-4 shadow-float sm:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Seu próximo intervalo</p>
          <p className="mt-1 font-display text-xl font-bold">Quarta · 19h às 22h</p>
          <p className="text-sm text-muted-foreground">Você tem três horas. A gente tem algumas ideias.</p>
        </div>
      </section>

      {/* PILARES */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
            Três coisas que a RULIS cruza para <span className="text-sunset">caber na sua vida.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map((c, i) => (
            <Reveal key={c.t} delay={i * 120}>
              <div className="group relative h-full overflow-hidden rounded-3xl bg-card p-7 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-float">
                <span className="font-display text-6xl font-extrabold text-primary/15 transition duration-300 group-hover:text-primary/30">
                  {c.n}
                </span>
                <div className="mt-4 grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary transition duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                  <c.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-2xl font-extrabold">{c.t}</h3>
                <p className="mt-1 text-muted-foreground">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:pb-28">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-extrabold sm:text-5xl">Menos tempo pensando no que fazer. Mais tempo vivendo.</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.t} delay={i * 100}>
              <div className="group relative overflow-hidden rounded-3xl shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-float">
                <img
                  src={f.img}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-scrim" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-ink-foreground sm:p-5">
                  <f.icon className="size-5 transition duration-300 group-hover:-translate-y-0.5 group-hover:text-sun" />
                  <p className="mt-2 font-display text-lg font-bold sm:text-xl">{f.t}</p>
                  <p className="text-sm opacity-90">{f.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-3 pb-10 sm:px-5">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center text-ink-foreground sm:rounded-[2.5rem] sm:py-24">
            <div className="absolute -left-24 -top-24 -z-10 size-72 rounded-full bg-primary/40 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 -z-10 size-72 rounded-full bg-lagoon/40 blur-3xl" />
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
              Sua vida não acontece apenas quando você está <span className="text-sun">trabalhando.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-ink-foreground/80">Crie sua conta e descubra o que cabe no seu próximo intervalo livre.</p>
            <div className="mt-8">
              <Button asChild variant="hero" size="lg">
                <Link to={signedIn ? "/inicio" : "/auth"} search={signedIn ? undefined : { mode: "criar" }}>
                  {signedIn ? "Ver meus rolês" : "Criar minha conta"} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm text-muted-foreground">
        <p>RULIS — Sua vida não acontece apenas quando você está trabalhando.</p>
        <div className="flex gap-4">
          <Link to="/termos" className="hover:text-foreground">Termos</Link>
          <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}

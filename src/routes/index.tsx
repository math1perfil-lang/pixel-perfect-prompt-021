import { useEffect, useState } from "react";
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

function Landing() {
  const signedIn = useSignedIn();
  return (
    <div className="min-h-dvh bg-background bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
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
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1.05fr_1fr] lg:pt-12">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <MapPin className="size-3.5" /> Começando por Florianópolis
          </span>
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
            Você organiza tudo. <span className="text-sunset">Quem organiza o seu tempo livre?</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            A RULIS cruza quando você pode, o que você curte e o que está por perto para sugerir rolês que cabem na sua vida — sem
            transformar lazer em obrigação.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to={signedIn ? "/inicio" : "/auth"} search={signedIn ? undefined : { mode: "criar" }}>
                {signedIn ? "Ver meus rolês" : "Descobrir meu jeito de aproveitar"} <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative animate-pop">
          <div className="overflow-hidden rounded-[2.5rem] shadow-float">
            <img src={hero} alt="Duas amigas caminhando nas dunas com vista para a Lagoa da Conceição ao pôr do sol" className="aspect-[4/5] w-full object-cover sm:aspect-[5/5]" />
          </div>
          <div className="absolute -bottom-6 left-4 right-4 rounded-3xl bg-card/95 p-4 shadow-float backdrop-blur sm:left-auto sm:right-[-1rem] sm:w-72">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Seu próximo intervalo</p>
            <p className="mt-1 font-display text-xl font-bold">Quarta · 19h às 22h</p>
            <p className="text-sm text-muted-foreground">Você tem três horas. A gente tem algumas ideias.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Clock, t: "Tempo", d: "Quando você pode? Sua rotina vira intervalos livres de verdade." },
            { icon: Heart, t: "Interesse", d: "O que você curte? Natureza, comida, cultura, movimento, gente." },
            { icon: Compass, t: "Possibilidade", d: "O que é viável agora? Distância, duração, orçamento e clima." },
          ].map((c) => (
            <div key={c.t} className="rounded-3xl bg-card p-6 shadow-card">
              <div className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <c.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-2xl font-extrabold">{c.t}</h3>
              <p className="mt-1 text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <h2 className="max-w-2xl text-3xl font-extrabold sm:text-4xl">Menos tempo pensando no que fazer. Mais tempo vivendo.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Sparkles, t: "RULIS Agora", d: "Tenho 2 horas. O que dá pra fazer?", img: natureza },
            { icon: Gift, t: "Surpreenda-me", d: "Um rolê revelado só depois do sorteio.", img: gastronomia },
            { icon: Sun, t: "Meu fim de semana", d: "Monte, reordene, deixe espaço livre.", img: cultura },
            { icon: CalendarHeart, t: "Meus rolês", d: "Uma memória do que valeu a pena.", img: hero },
          ].map((f) => (
            <div key={f.t} className="group relative overflow-hidden rounded-3xl shadow-card">
              <img src={f.img} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-scrim" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-ink-foreground">
                <f.icon className="size-5" />
                <p className="mt-2 font-display text-xl font-bold">{f.t}</p>
                <p className="text-sm opacity-90">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-12 text-sm text-muted-foreground">
        <p>RULIS — Sua vida não acontece apenas quando você está trabalhando.</p>
        <div className="flex gap-4">
          <Link to="/termos" className="hover:text-foreground">Termos</Link>
          <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}

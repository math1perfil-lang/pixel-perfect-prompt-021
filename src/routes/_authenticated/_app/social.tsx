import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarHeart, Link2, Lock, Share2, Users, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/rulis/common";
import social from "@/assets/cat-social.jpg";

export const Route = createFileRoute("/_authenticated/_app/social")({
  head: () => ({
    meta: [
      { title: "Social — RULIS" },
      { name: "description", content: "Compartilhe roteiros e experiências com quem você gosta." },
      { property: "og:title", content: "Social — RULIS" },
      { property: "og:description", content: "Compartilhe roteiros e experiências com quem você gosta." },
    ],
  }),
  component: Social,
});

function Social() {
  return (
    <div>
      <PageHeader eyebrow="RULIS Social" title="Lazer também é pra compartilhar." />
      <div className="relative overflow-hidden rounded-[2rem] shadow-float">
        <img src={social} alt="Grupo de amigos rindo ao redor de uma mesa com jogos ao ar livre" className="aspect-[16/9] w-full object-cover md:aspect-[21/8]" />
        <div className="absolute inset-0 bg-scrim" />
        <p className="absolute bottom-5 left-5 right-5 font-display text-2xl font-extrabold text-ink-foreground md:text-3xl">Você está livre sábado à tarde. E seus amigos?</p>
      </div>

      <h2 className="mt-10 text-xl font-extrabold">Já dá pra fazer</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-card p-5 shadow-card">
          <Link2 className="size-6 text-primary" />
          <p className="mt-3 font-display text-lg font-bold">Compartilhar roteiros por link</p>
          <p className="text-sm text-muted-foreground">Monte seu fim de semana e ligue “Compartilhar por link”. Quem receber vê o roteiro, sem seus dados pessoais.</p>
          <Button asChild variant="soft" size="sm" className="mt-4"><Link to="/fim-de-semana">Abrir meus fins de semana</Link></Button>
        </div>
        <div className="rounded-3xl bg-card p-5 shadow-card">
          <Share2 className="size-6 text-primary" />
          <p className="mt-3 font-display text-lg font-bold">Mandar uma ideia de rolê</p>
          <p className="text-sm text-muted-foreground">Em qualquer experiência, toque no botão de compartilhar para enviar pelo app que você já usa.</p>
          <Button asChild variant="soft" size="sm" className="mt-4"><Link to="/explorar">Explorar</Link></Button>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-extrabold">Chegando na próxima fase</h2>
      <p className="text-sm text-muted-foreground">Ainda não estão disponíveis — por isso não há botões para eles aqui.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, t: "Amigos e grupos", d: "Adicionar amigos, criar grupos e convites para um rolê." },
          { icon: CalendarHeart, t: "Disponibilidade em comum", d: "Descobrir quando vocês estão livres ao mesmo tempo — só com autorização de cada um." },
          { icon: Vote, t: "Planejamento coletivo", d: "Votar em atividades, sugerir lugares e confirmar presença." },
          { icon: Lock, t: "Privacidade primeiro", d: "Nada de rastreamento de localização entre amigos. Nunca." },
        ].map((c) => (
          <div key={c.t} className="rounded-3xl border border-dashed bg-card/60 p-5">
            <c.icon className="size-5 text-muted-foreground" />
            <p className="mt-2 font-semibold">{c.t}</p>
            <p className="text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Suas opções de compartilhamento já podem ser ajustadas em <Link to="/perfil" className="font-semibold text-primary">Perfil → Privacidade</Link>.
      </p>
    </div>
  );
}

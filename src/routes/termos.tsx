import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/rulis/Logo";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — RULIS" },
      { name: "description", content: "Regras de uso da plataforma RULIS de gestão do tempo livre." },
      { property: "og:title", content: "Termos de uso — RULIS" },
      { property: "og:description", content: "Regras de uso da plataforma RULIS." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-extrabold">Termos de uso</h1>
      <p className="mt-1 text-sm text-muted-foreground">Versão MVP · 2026</p>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
        <p>A RULIS é uma plataforma para descobrir e organizar experiências de lazer. Ao criar uma conta, você concorda com estas regras.</p>
        <h2 className="text-xl font-bold">Sobre as sugestões</h2>
        <p>As sugestões são calculadas por regras a partir do que você informa (interesses, rotina, distância e orçamento). Elas não são garantias. Horários, preços e disponibilidade de lugares e eventos podem mudar: confirme diretamente com o local antes de sair. Conteúdos marcados como “Demonstração” são lugares públicos cadastrados para teste, sem verificação de horários ou preços.</p>
        <h2 className="text-xl font-bold">Estimativas</h2>
        <p>Tempos de deslocamento, custos de transporte e custos de roteiros são estimativas baseadas em parâmetros configuráveis, não em dados em tempo real. A RULIS não possui parceria com empresas de transporte e não realiza pagamentos.</p>
        <h2 className="text-xl font-bold">Sua conta</h2>
        <p>Você é responsável pelas informações que cadastra. Você pode excluir sua conta a qualquer momento em Perfil.</p>
        <h2 className="text-xl font-bold">Conteúdo patrocinado</h2>
        <p>Se houver conteúdo patrocinado no futuro, ele será identificado de forma clara. As recomendações orgânicas não dependem de pagamento.</p>
      </div>
    </div>
  );
}

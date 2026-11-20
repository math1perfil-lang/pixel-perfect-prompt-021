import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/rulis/Logo";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — RULIS" },
      { name: "description", content: "Como a RULIS trata seus dados pessoais, de acordo com a LGPD." },
      { property: "og:title", content: "Política de privacidade — RULIS" },
      { property: "og:description", content: "Como a RULIS trata seus dados pessoais, de acordo com a LGPD." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-extrabold">Política de privacidade</h1>
      <p className="mt-1 text-sm text-muted-foreground">Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018)</p>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
        <h2 className="text-xl font-bold">O que coletamos</h2>
        <p>Nome, e-mail, data de nascimento, cidade e estado, foto opcional, interesses, preferências, rotina e disponibilidade que você informa, agenda, roteiros, experiências registradas e interações com sugestões (visualizar, salvar, agendar, ignorar).</p>
        <h2 className="text-xl font-bold">Para que usamos</h2>
        <p>Exclusivamente para gerar e explicar sugestões de lazer para você. Não usamos seus dados para publicidade direcionada e não vendemos dados.</p>
        <h2 className="text-xl font-bold">Localização</h2>
        <p>Sua localização é pedida apenas quando você toca em “Usar minha localização”. Ela fica somente no seu navegador durante a sessão e não é armazenada em histórico nos nossos servidores. Sem ela, usamos o centro da cidade como referência.</p>
        <h2 className="text-xl font-bold">Rotina e disponibilidade</h2>
        <p>Sua rotina é privada. Ela nunca é compartilhada automaticamente com outras pessoas e não é usada para cobrar ou pressionar você. Você tem o direito de simplesmente não fazer nada.</p>
        <h2 className="text-xl font-bold">Seus direitos</h2>
        <p>Em Perfil você pode exportar seus dados (arquivo JSON), corrigir informações, ajustar a privacidade e excluir sua conta, o que apaga seus dados pessoais.</p>
        <h2 className="text-xl font-bold">Segurança</h2>
        <p>Os dados ficam em banco com controle de acesso por usuário: ninguém consulta suas informações privadas sem autorização. Administradores veem apenas dados básicos e métricas agregadas, sem e-mail.</p>
      </div>
    </div>
  );
}

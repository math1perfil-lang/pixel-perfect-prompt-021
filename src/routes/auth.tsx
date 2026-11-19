import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/rulis/Logo";
import { SocialButtons } from "@/components/rulis/SocialButtons";
import hero from "@/assets/hero-floripa.jpg";

const searchSchema = z.object({ redirect: z.string().optional(), mode: z.enum(["entrar", "criar"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — RULIS" },
      { name: "description", content: "Crie sua conta na RULIS e comece a organizar seu tempo livre." },
      { property: "og:title", content: "Entrar ou criar conta — RULIS" },
      { property: "og:description", content: "Crie sua conta na RULIS e comece a organizar seu tempo livre." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Conta pra gente seu nome").max(80),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres").max(72),
  birth_date: z.string().optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
  terms: z.literal(true, { errorMap: () => ({ message: "Aceite os termos para continuar" }) }),
});

function safeRedirect(r?: string) {
  if (!r) return "/inicio";
  try {
    const u = new URL(r, window.location.origin);
    if (u.origin !== window.location.origin) return "/inicio";
    return u.pathname + u.search;
  } catch {
    return "/inicio";
  }
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar" | "esqueci">(search.mode ?? "entrar");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    birth_date: "",
    city: "Florianópolis",
    state: "SC",
    terms: false,
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const goIn = () => navigate({ to: safeRedirect(search.redirect), replace: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goIn();
    });
    const { data } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === "SIGNED_IN" && session) goIn();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
        goIn();
      } else if (mode === "criar") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin + "/onboarding",
            data: {
              full_name: parsed.data.full_name,
              birth_date: parsed.data.birth_date || "",
              city: parsed.data.city || "",
              state: (parsed.data.state || "").toUpperCase(),
              terms_accepted: "true",
            },
          },
        });
        if (error) throw error;
        if (data.session) goIn();
        else setSent(parsed.data.email);
      } else {
        const email = z.string().email("E-mail inválido").safeParse(form.email.trim());
        if (!email.success) throw new Error(email.error.issues[0].message);
        const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent(email.data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo deu errado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={hero} alt="Duas amigas caminhando nas dunas com vista para a Lagoa da Conceição ao pôr do sol" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-scrim" />
        <div className="absolute bottom-10 left-10 right-10 text-ink-foreground">
          <p className="font-display text-4xl font-extrabold leading-tight">Menos tempo pensando no que fazer. Mais tempo vivendo.</p>
        </div>
      </div>
      <div className="flex flex-col justify-center bg-canvas px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-block">
            <Logo />
          </Link>
          {sent ? (
            <div className="rounded-3xl bg-card p-8 text-center shadow-card animate-pop">
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
                <MailCheck className="size-7" />
              </div>
              <h1 className="text-2xl font-extrabold">Confira seu e-mail</h1>
              <p className="mt-2 text-muted-foreground">
                {mode === "esqueci"
                  ? `Enviamos um link para redefinir sua senha para ${sent}.`
                  : `Enviamos um link de confirmação para ${sent}. Depois de confirmar, é só entrar.`}
              </p>
              <Button variant="ghost" className="mt-4" onClick={() => { setSent(null); setMode("entrar"); }}>
                Voltar para entrar
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold">
                {mode === "entrar" ? "Bora de novo?" : mode === "criar" ? "Seu tempo livre está pedindo um rolê." : "Esqueceu a senha?"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {mode === "entrar"
                  ? "Entre para ver o que combina com você hoje."
                  : mode === "criar"
                    ? "Crie sua conta. Leva um minuto."
                    : "Mandamos um link para você criar uma nova."}
              </p>

              {mode !== "esqueci" && (
                <div className="mt-6">
                  <SocialButtons onSignedIn={goIn} />
                  <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> ou com e-mail <span className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="mt-2 space-y-4" noValidate>
                {mode === "criar" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Nome</Label>
                    <Input id="full_name" autoComplete="name" value={form.full_name} onChange={set("full_name")} required />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
                </div>
                {mode !== "esqueci" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      {mode === "entrar" && (
                        <button type="button" className="text-xs font-semibold text-primary" onClick={() => setMode("esqueci")}>
                          Esqueci a senha
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "criar" ? "new-password" : "current-password"}
                      value={form.password}
                      onChange={set("password")}
                      required
                    />
                  </div>
                )}
                {mode === "criar" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="birth_date">Data de nascimento</Label>
                      <Input id="birth_date" type="date" value={form.birth_date} onChange={set("birth_date")} />
                    </div>
                    <div className="grid grid-cols-[1fr_88px] gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" autoComplete="address-level2" value={form.city} onChange={set("city")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="state">UF</Label>
                        <Input id="state" maxLength={2} value={form.state} onChange={set("state")} />
                      </div>
                    </div>
                    <label className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Checkbox checked={form.terms} onCheckedChange={(v) => setForm({ ...form, terms: v === true })} className="mt-0.5" />
                      <span>
                        Li e aceito os{" "}
                        <Link to="/termos" className="font-semibold text-foreground underline" target="_blank">
                          termos de uso
                        </Link>{" "}
                        e a{" "}
                        <Link to="/privacidade" className="font-semibold text-foreground underline" target="_blank">
                          política de privacidade
                        </Link>
                        .
                      </span>
                    </label>
                  </>
                )}
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar minha conta" : "Enviar link"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "entrar" ? (
                  <>
                    Ainda não tem conta?{" "}
                    <button className="font-semibold text-primary" onClick={() => setMode("criar")}>
                      Criar agora
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <button className="font-semibold text-primary" onClick={() => setMode("entrar")}>
                      Entrar
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

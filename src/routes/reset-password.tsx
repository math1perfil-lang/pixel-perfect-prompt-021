import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/rulis/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — RULIS" },
      { name: "description", content: "Defina uma nova senha para sua conta RULIS." },
      { property: "og:title", content: "Nova senha — RULIS" },
      { property: "og:description", content: "Defina uma nova senha para sua conta RULIS." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setReady(true);
      else if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("A senha precisa de pelo menos 8 caracteres");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    navigate({ to: "/inicio", replace: true });
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl bg-card p-8 shadow-card">
        <Logo />
        <h1 className="text-2xl font-extrabold">Crie uma nova senha</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Abra esta página pelo link que enviamos para o seu e-mail.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Nova senha</Label>
              <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Salvar senha
            </Button>
          </>
        )}
      </form>
    </div>
  );
}

import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,

  Gift,
  Home,
  LogOut,
  Map,
  PiggyBank,
  Shield,
  Sparkles,
  Sun,
  User,
  Users,
  BookHeart,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminQuery } from "@/lib/queries";
import { Logo } from "./Logo";

const MAIN = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/explorar", label: "Explorar", icon: Map },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/social", label: "Social", icon: Users },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const EXTRA = [
  { to: "/agora", label: "RULIS Agora", icon: Sparkles },
  { to: "/surpresa", label: "Surpreenda-me", icon: Gift },
  { to: "/tempo-livre", label: "Meu tempo livre", icon: Clock },
  { to: "/fim-de-semana", label: "Meu fim de semana", icon: Sun },
  { to: "/meus-roles", label: "Meus rolês", icon: BookHeart },
  { to: "/orcamento", label: "Orçamento de lazer", icon: PiggyBank },
] as const;

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: isAdmin } = useQuery(isAdminQuery);
  const signOut = useSignOut();
  const linkBase =
    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground";
  const linkActive = "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary";

  return (
    <div className="min-h-dvh bg-background bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background/80 px-4 py-6 backdrop-blur lg:flex">
        <Link to="/inicio" className="mb-8 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {MAIN.map((i) => (
            <Link key={i.to} to={i.to} className={linkBase} activeProps={{ className: linkActive }}>
              <i.icon className="size-5" /> {i.label}
            </Link>
          ))}
        </nav>
        <p className="mb-2 mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recursos</p>
        <nav className="flex flex-col gap-1" aria-label="Recursos">
          {EXTRA.map((i) => (
            <Link key={i.to} to={i.to} className={linkBase} activeProps={{ className: linkActive }}>
              <i.icon className="size-5" /> {i.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className={linkBase} activeProps={{ className: linkActive }}>
              <Shield className="size-5" /> Administração
            </Link>
          )}
        </nav>
        <button onClick={signOut} className={`${linkBase} mt-auto`}>
          <LogOut className="size-5" /> Sair
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/inicio">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/agora" aria-label="RULIS Agora" className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
            <Sparkles className="size-5" />
          </Link>
          <Link to="/surpresa" aria-label="Surpreenda-me" className="grid size-10 place-items-center rounded-full bg-secondary">
            <Gift className="size-5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:pl-72 lg:pr-8 lg:pb-12 lg:pt-10 xl:max-w-7xl">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-full border border-border/70 bg-card/90 px-2 py-1.5 shadow-float backdrop-blur pb-safe lg:hidden"
      >
        {MAIN.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-8 w-12 place-items-center rounded-full transition ${isActive ? "bg-primary-soft" : ""}`}>
                  <i.icon className="size-5" />
                </span>
                {i.label}
              </>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}


import type { ReactNode } from "react";
import { Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Lugar público cadastrado para demonstração. Confirme horários e preços antes de sair."
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur",
        className,
      )}
    >
      <Info className="size-3" /> Demonstração
    </span>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed bg-card/60 px-6 py-10 text-center animate-pop">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-full bg-primary-soft text-primary">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" /> {label}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center" role="alert">
      <p className="font-semibold">{offline ? "Parece que você está sem conexão." : "Não conseguimos carregar isso agora."}</p>
      <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-glow"
          : "border-border bg-card text-foreground hover:border-primary/50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-10 animate-rise">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold md:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function HScroll({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:px-0">
      {children}
    </div>
  );
}

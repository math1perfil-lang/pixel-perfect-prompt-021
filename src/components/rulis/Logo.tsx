import { cn } from "@/lib/utils";

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-extrabold tracking-tight", className)}>
      <span className="relative grid size-8 place-items-center rounded-full bg-sunset shadow-glow">
        <span className="size-3 rounded-full bg-primary-foreground" />
      </span>
      {!mark && <span className="text-xl leading-none">rulis</span>}
    </span>
  );
}

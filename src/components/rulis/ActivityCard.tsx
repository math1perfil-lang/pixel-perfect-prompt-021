import { Link } from "@tanstack/react-router";
import { Car, Clock, MapPin, Sparkles } from "lucide-react";
import type { ActivityWithRefs } from "@/lib/queries";
import { GROUP_DOT, GROUP_IMAGE, GROUP_LABEL } from "@/lib/constants";
import { durationRange, km, priceLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./common";
import { AddToAgendaButton, SaveButton } from "./ActivityActions";

export function ActivityCard({
  activity: a,
  reasons,
  distanceKm,
  travelMinutes,
  defaultStart,
  variant = "rail",
}: {
  activity: ActivityWithRefs;
  reasons?: string[];
  distanceKm?: number | null;
  travelMinutes?: number | null;
  defaultStart?: Date;
  variant?: "rail" | "grid";
}) {
  const img = a.cover_image_url || GROUP_IMAGE[a.group_key];
  return (
    <Link
      to="/atividade/$id"
      params={{ id: a.id }}
      className={cn(
        "group flex snap-start flex-col overflow-hidden rounded-3xl bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-float",
        variant === "rail" ? "w-[78vw] max-w-[320px] shrink-0" : "w-full",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={img} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-col items-start gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              <span className={cn("size-2 rounded-full", GROUP_DOT[a.group_key])} />
              {a.activity_categories?.name ?? GROUP_LABEL[a.group_key]}
            </span>
            {a.is_demo && <DemoBadge />}
          </div>
          <SaveButton activity={a} />
        </div>
        {!a.cover_image_url && (
          <span className="absolute bottom-2 right-3 text-[10px] font-medium text-ink-foreground/80">Imagem ilustrativa</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-lg font-bold leading-snug">{a.title}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {a.neighborhood ?? a.city}
            {distanceKm != null && ` · ${km(distanceKm)}`}
          </span>
          {travelMinutes != null && (
            <span className="inline-flex items-center gap-1" title="Estimativa por carro, sem trânsito em tempo real">
              <Car className="size-3.5" />~{travelMinutes} min
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {durationRange(a.duration_min_minutes, a.duration_max_minutes)}
          </span>
        </div>
        <p className="text-sm font-semibold">{priceLabel(a.price_level, a.price_is_estimate)}</p>
        {reasons && reasons.length > 0 && (
          <p className="flex gap-1.5 rounded-2xl bg-primary-soft p-2.5 text-xs leading-relaxed text-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
            {reasons[0]}
          </p>
        )}
        <div className="mt-auto pt-1">
          <AddToAgendaButton activity={a} defaultStart={defaultStart} variant="soft" />
        </div>
      </div>
    </Link>
  );
}

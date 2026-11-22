import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/rulis/Logo";
import { EmptyState, LoadingBlock } from "@/components/rulis/common";
import { WEEKDAYS } from "@/lib/constants";
import { brl } from "@/lib/format";
import { parseIsoDate } from "@/lib/time";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/roteiro/$id")({
  head: () => ({
    meta: [
      { title: "Roteiro compartilhado — RULIS" },
      { name: "description", content: "Um roteiro de fim de semana montado na RULIS." },
      { property: "og:title", content: "Roteiro compartilhado — RULIS" },
      { property: "og:description", content: "Um roteiro de fim de semana montado na RULIS." },
    ],
  }),
  component: SharedItinerary,
});

function SharedItinerary() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["shared-itinerary", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_itineraries")
        .select("id, title, start_date, end_date, free_days, people_count, itinerary_items(id, day_date, start_time, label, estimated_cost, sort_order)")
        .eq("id", id)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="mx-auto min-h-dvh max-w-xl bg-canvas px-5 py-10">
      <Link to="/"><Logo /></Link>
      {q.isLoading ? (
        <LoadingBlock />
      ) : !q.data ? (
        <div className="mt-10"><EmptyState title="Roteiro indisponível">Ele pode ter deixado de ser compartilhado.</EmptyState></div>
      ) : (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Roteiro compartilhado</p>
          <h1 className="text-3xl font-extrabold">{q.data.title}</h1>
          {[q.data.start_date, q.data.end_date].map((day) => {
            const d = parseIsoDate(day);
            const items = q.data!.itinerary_items.filter((i) => i.day_date === day).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div key={day} className="mt-6 rounded-3xl bg-card p-5 shadow-card">
                <p className="font-display text-lg font-bold">{WEEKDAYS[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}</p>
                {q.data!.free_days.includes(day) ? (
                  <p className="mt-1 text-sm text-muted-foreground">Dia sem planos.</p>
                ) : items.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">Livre.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {items.map((i) => (
                      <li key={i.id} className="flex justify-between gap-3">
                        <span><strong>{i.start_time?.slice(0, 5) ?? "—"}</strong> {i.label}</span>
                        {i.estimated_cost != null && <span className="text-muted-foreground">~{brl(Number(i.estimated_cost))}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <Button asChild variant="hero" className="mt-8"><Link to="/auth" search={{ mode: "criar" }}>Montar o meu na RULIS</Link></Button>
        </div>
      )}
    </div>
  );
}

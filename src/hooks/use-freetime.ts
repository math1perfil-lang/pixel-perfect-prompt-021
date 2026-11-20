import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { availabilityQuery, calendarQuery, commitmentsQuery } from "@/lib/queries";
import { computeFreeWindows } from "@/lib/freetime";

export function useFreeWindows(days = 7, from?: Date) {
  const a = useQuery(availabilityQuery);
  const c = useQuery(commitmentsQuery);
  const e = useQuery(calendarQuery);
  const fromKey = from?.getTime();
  const windows = useMemo(() => {
    if (!a.data || !c.data || !e.data) return [];
    return computeFreeWindows({
      availability: a.data,
      commitments: c.data,
      events: e.data,
      from: from ?? new Date(),
      days,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.data, c.data, e.data, days, fromKey]);
  return {
    windows,
    isLoading: a.isLoading || c.isLoading || e.isLoading,
    hasAvailability: (a.data?.length ?? 0) > 0,
    error: a.error || c.error || e.error,
  };
}

export type LatLng = { lat: number; lng: number };

/** Straight-line distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type TravelMode = "car" | "bus" | "bike" | "walk";

/**
 * Configurable parameters for travel estimates. These are NOT real-time data:
 * every value derived from them is labelled "estimativa" in the UI.
 */
export const TRAVEL_PARAMS = {
  roadFactor: 1.35,
  car: { kmh: 30, overheadMin: 5, costPerKm: 0.85 },
  bus: { kmh: 16, overheadMin: 12, fare: null as number | null },
  bike: { kmh: 14, overheadMin: 2 },
  walk: { kmh: 4.5, overheadMin: 0 },
};

export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
  car: "Carro",
  bus: "Ônibus",
  bike: "Bicicleta",
  walk: "A pé",
};

export function roadKm(a: LatLng, b: LatLng) {
  return haversineKm(a, b) * TRAVEL_PARAMS.roadFactor;
}

export function estimateTravelMinutes(distanceKm: number, mode: TravelMode = "car"): number {
  const p = TRAVEL_PARAMS[mode];
  return Math.round((distanceKm * TRAVEL_PARAMS.roadFactor * 60) / p.kmh + p.overheadMin);
}

/** Returns null when there is no configured basis for the estimate. */
export function estimateTravelCost(distanceKm: number, mode: TravelMode): number | null {
  const road = distanceKm * TRAVEL_PARAMS.roadFactor;
  if (mode === "car") return Math.round(road * TRAVEL_PARAMS.car.costPerKm * 100) / 100;
  if (mode === "bus") return TRAVEL_PARAMS.bus.fare;
  return 0;
}

export function mapsDirectionsUrl(dest: LatLng, origin?: LatLng) {
  const o = origin ? `&origin=${origin.lat},${origin.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}${o}`;
}

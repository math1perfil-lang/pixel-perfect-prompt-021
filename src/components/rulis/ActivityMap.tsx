import { useEffect, useRef } from "react";
import L from "leaflet";
import type { LatLng } from "@/lib/geo";

export type MapItem = { id: string; title: string; lat: number; lng: number; group_key: string; subtitle?: string };

/** Browser-only. Import lazily (React.lazy) behind <ClientOnly>. Tiles: OpenStreetMap, no key. */
export default function ActivityMap({
  items,
  origin,
  radiusKm,
  onSelect,
  selectedId,
}: {
  items: MapItem[];
  origin: LatLng;
  radiusKm?: number;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([origin.lat, origin.lng], 12);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    L.marker([origin.lat, origin.lng], {
      icon: L.divIcon({ className: "", html: '<div class="rulis-me"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
      title: "Ponto de partida",
    }).addTo(g);
    if (radiusKm) {
      L.circle([origin.lat, origin.lng], {
        radius: radiusKm * 1000,
        color: "var(--primary)",
        weight: 1.5,
        fillOpacity: 0.05,
        dashArray: "6 6",
      }).addTo(g);
    }
    for (const it of items) {
      const mk = L.marker([it.lat, it.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="rulis-pin" data-group="${it.group_key}" style="${it.id === selectedId ? "transform:rotate(-45deg) scale(1.25)" : ""}"><span></span></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        }),
        title: it.title,
        keyboard: true,
      });
      mk.on("click", () => onSelect?.(it.id));
      mk.addTo(g);
    }
  }, [items, origin, radiusKm, selectedId, onSelect]);

  useEffect(() => {
    map.current?.setView([origin.lat, origin.lng], map.current.getZoom());
  }, [origin]);

  return <div ref={el} className="size-full" role="application" aria-label="Mapa de atividades" />;
}

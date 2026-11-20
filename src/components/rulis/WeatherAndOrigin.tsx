import { useQuery } from "@tanstack/react-query";
import { CloudRain, Crosshair, Loader2, MapPin, Sun } from "lucide-react";
import { useOrigin } from "@/hooks/use-origin";
import { weatherQuery, WEATHER_LABEL } from "@/lib/weather";
import { CITY_CENTER } from "@/lib/constants";

export function WeatherChip() {
  const w = useQuery(weatherQuery(CITY_CENTER.lat, CITY_CENTER.lng));
  if (w.isLoading) return <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-card"><Loader2 className="size-3.5 animate-spin" /> clima…</span>;
  if (!w.data)
    return <span className="rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-card">Previsão do tempo indisponível agora</span>;
  const rainy = (w.data.rainProbability ?? 0) >= 60;
  const t = new Date(w.data.forecastTime);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-card"
      title={`Fonte: Open-Meteo · previsão das ${t.getHours()}h`}
    >
      {rainy ? <CloudRain className="size-4 text-lagoon" /> : <Sun className="size-4 text-sun" />}
      {w.data.temperature}° · {WEATHER_LABEL(w.data.code)}
      {w.data.rainProbability != null && <span className="text-muted-foreground">· chuva {w.data.rainProbability}%</span>}
    </span>
  );
}

export function OriginControl() {
  const { label, isDevice, locate, reset, status } = useOrigin();
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <MapPin className="size-3.5" /> Distâncias a partir de {label}
      {isDevice ? (
        <button className="font-semibold text-primary" onClick={reset}>usar o centro</button>
      ) : (
        <button className="inline-flex items-center gap-1 font-semibold text-primary" onClick={locate} disabled={status === "locating"}>
          {status === "locating" ? <Loader2 className="size-3 animate-spin" /> : <Crosshair className="size-3" />} usar minha localização
        </button>
      )}
      {status === "denied" && <span className="text-destructive">Permissão negada — seguimos com o centro.</span>}
      {status === "unavailable" && <span className="text-destructive">Localização indisponível.</span>}
    </div>
  );
}

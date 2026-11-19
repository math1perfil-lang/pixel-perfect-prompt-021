import { queryOptions } from "@tanstack/react-query";

/** Open-Meteo: public forecast API, no key required. Real data only — never simulated. */
export type Weather = {
  temperature: number;
  code: number;
  rainProbability: number | null;
  forecastTime: string;
  fetchedAt: string;
};

export const WEATHER_LABEL = (code: number): string => {
  if (code === 0) return "Céu limpo";
  if ([1, 2].includes(code)) return "Poucas nuvens";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if (code >= 51 && code <= 57) return "Garoa";
  if (code >= 61 && code <= 67) return "Chuva";
  if (code >= 80 && code <= 82) return "Pancadas de chuva";
  if (code >= 95) return "Tempestade";
  return "Tempo variável";
};

export const weatherQuery = (lat: number, lng: number) =>
  queryOptions({
    queryKey: ["weather", lat.toFixed(2), lng.toFixed(2)],
    staleTime: 1000 * 60 * 20,
    retry: 1,
    queryFn: async (): Promise<Weather> => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_hours=6&timezone=America%2FSao_Paulo`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Previsão indisponível");
      const j = await res.json();
      const probs: number[] = j.hourly?.precipitation_probability ?? [];
      return {
        temperature: Math.round(j.current.temperature_2m),
        code: j.current.weather_code,
        rainProbability: probs.length ? Math.max(...probs.slice(0, 4)) : null,
        forecastTime: j.current.time,
        fetchedAt: new Date().toISOString(),
      };
    },
  });

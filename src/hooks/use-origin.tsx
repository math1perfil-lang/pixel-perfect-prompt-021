import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CITY_CENTER } from "@/lib/constants";
import type { LatLng } from "@/lib/geo";

type OriginState = {
  origin: LatLng;
  label: string;
  isDevice: boolean;
  status: "idle" | "locating" | "denied" | "unavailable";
  locate: () => void;
  reset: () => void;
};

const OriginContext = createContext<OriginState | null>(null);
const KEY = "rulis:session-origin";

/**
 * Location is asked only on demand and kept for this browser session only.
 * Nothing is sent to the server or stored as history.
 */
export function OriginProvider({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState<LatLng>({ lat: CITY_CENTER.lat, lng: CITY_CENTER.lng });
  const [isDevice, setIsDevice] = useState(false);
  const [status, setStatus] = useState<OriginState["status"]>("idle");

  useEffect(() => {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      try {
        setOrigin(JSON.parse(raw));
        setIsDevice(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const o = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(o);
        setIsDevice(true);
        setStatus("idle");
        sessionStorage.setItem(KEY, JSON.stringify(o));
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setOrigin({ lat: CITY_CENTER.lat, lng: CITY_CENTER.lng });
    setIsDevice(false);
  }, []);

  return (
    <OriginContext.Provider
      value={{ origin, isDevice, status, locate, reset, label: isDevice ? "sua localização" : CITY_CENTER.label }}
    >
      {children}
    </OriginContext.Provider>
  );
}

export function useOrigin() {
  const ctx = useContext(OriginContext);
  if (!ctx) throw new Error("useOrigin must be used inside OriginProvider");
  return ctx;
}

"use client";

import { useEffect, useState } from "react";
import { getOrFetchTles } from "@/services/celestrak/satelliteService";
import { predictIssPasses, SatellitePass } from "@/services/celestrak/passPredictionService";
import { ObserverLocation } from "@/types/observer";

interface UsePassPredictionResult {
  passes: SatellitePass[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Computes upcoming ISS passes for the observer's location. Recomputes only
 * when location changes or every 30 minutes — pass geometry barely shifts
 * faster than that, and the scan itself (72h @ 15s steps) is a few thousand
 * SGP4 propagations, cheap but not worth re-running every render.
 */
export function usePassPrediction(location: ObserverLocation | null): UsePassPredictionResult {
  const [passes, setPasses] = useState<SatellitePass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) { setIsLoading(false); return; }
    const loc = location;
    let cancelled = false;

    async function compute() {
      setIsLoading(true);
      try {
        const tles = await getOrFetchTles();
        if (cancelled) return;
        const result = predictIssPasses(tles, loc, new Date(), 72);
        if (!cancelled) {
          setPasses(result);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Pass prediction unavailable.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    compute();
    const interval = setInterval(compute, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [location]);

  return { passes, isLoading, error };
}

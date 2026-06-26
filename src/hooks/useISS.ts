"use client";

import { useEffect, useState } from "react";
import { fetchIssTelemetry } from "@/services/openNotify/issService";
import { IssTelemetry } from "@/types/celestial";
import { ObserverLocation } from "@/types/observer";
import { UPDATE_INTERVALS } from "@/constants/config";

interface UseIssResult {
  telemetry: IssTelemetry | null;
  isLoading: boolean;
  error: string | null;
}

export function useIss(location: ObserverLocation | null): UseIssResult {
  const [telemetry, setTelemetry] = useState<IssTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const result = await fetchIssTelemetry(location as ObserverLocation);
        if (!cancelled) {
          setTelemetry(result);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Orbital telemetry unavailable.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, UPDATE_INTERVALS.iss);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location]);

  return { telemetry, isLoading, error };
}

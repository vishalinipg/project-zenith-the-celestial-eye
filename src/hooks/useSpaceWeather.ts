"use client";

import { useEffect, useState } from "react";
import {
  fetchSpaceWeather,
  SpaceWeatherEvent,
} from "@/services/spaceWeather/spaceWeatherService";

interface UseSpaceWeatherResult {
  events: SpaceWeatherEvent[];
  usingDemoKey: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const POLL_MS = 30 * 60 * 1000; // DONKI data is updated hourly at most — no need to poll faster

export function useSpaceWeather(): UseSpaceWeatherResult {
  const [events, setEvents] = useState<SpaceWeatherEvent[]>([]);
  const [usingDemoKey, setUsingDemoKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchSpaceWeather();
        if (cancelled) return;
        setEvents(data.events);
        setUsingDemoKey(data.usingDemoKey);
        setLastUpdated(new Date());
        setError(null);
      } catch {
        if (!cancelled) setError("Space weather unavailable.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { events, usingDemoKey, isLoading, error, lastUpdated };
}

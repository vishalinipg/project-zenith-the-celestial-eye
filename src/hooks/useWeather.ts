"use client";

import { useEffect, useState } from "react";
import { fetchWeather, WeatherData, WeatherUnavailableError } from "@/services/weather/weatherService";
import { ObserverLocation } from "@/types/observer";

const WEATHER_POLL_MS = 60 * 60 * 1000; // hourly, per Round-1 data strategy table

interface UseWeatherResult {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
}

export function useWeather(location: ObserverLocation | null): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
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
        const data = await fetchWeather(location as ObserverLocation);
        if (!cancelled) {
          setWeather(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof WeatherUnavailableError
              ? err.message
              : "Weather data temporarily unavailable."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, WEATHER_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location]);

  return { weather, isLoading, error };
}

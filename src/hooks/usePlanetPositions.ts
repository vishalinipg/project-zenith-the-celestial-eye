"use client";
import { useEffect, useState, useRef } from "react";
import { getSolarSystemSnapshot } from "@/services/astronomy/astronomyService";
import { CelestialObject } from "@/types/celestial";
import { ObserverLocation } from "@/types/observer";

export function usePlanetPositions(location: ObserverLocation | null, currentTime: Date) {
  const [objects, setObjects] = useState<CelestialObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastCompute = useRef<number>(0);

  useEffect(() => {
    if (!location) { setIsLoading(false); return; }

    const now = Date.now();
    // Throttle: recompute at most every 250ms to avoid thrashing during fast-forward
    if (now - lastCompute.current < 250) return;
    lastCompute.current = now;

    try {
      const snapshot = getSolarSystemSnapshot(location, currentTime);
      setObjects(snapshot);
    } catch {
      // silently keep previous values
    } finally {
      setIsLoading(false);
    }
  }, [location, currentTime]); // reactive to time — enables the time machine

  return { objects, isLoading };
}

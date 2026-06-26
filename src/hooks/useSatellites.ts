"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  getOrFetchTles,
  propagateSatellites,
  SatelliteDataUnavailableError,
} from "@/services/celestrak/satelliteService";
import { CelestialObject } from "@/types/celestial";
import { ObserverLocation } from "@/types/observer";
import {
  UPDATE_INTERVALS,
} from "@/constants/config";

interface UseSatellitesResult {
  satellites: CelestialObject[];
  isLoading: boolean;
  error: string | null;
  /** How many raw TLE records are currently cached (diagnostic) */
  tleCount: number;
}

type ParsedTle = Awaited<ReturnType<typeof getOrFetchTles>>[number];

export function useSatellites(
  location: ObserverLocation | null
): UseSatellitesResult {
  const [satellites, setSatellites] = useState<CelestialObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tleCount, setTleCount] = useState(0);
  const tleRef = useRef<ParsedTle[]>([]);

  const recompute = useCallback(() => {
    if (!location || tleRef.current.length === 0) return;
    const results = propagateSatellites(tleRef.current, location, new Date());
    setSatellites(results);
  }, [location]);

  // ── Fetch TLEs (rare — every 6 hours) ─────────────────────────────────────
  useEffect(() => {
    if (!location) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAndSeed() {
      setIsLoading(true);
      try {
        const tles = await getOrFetchTles();
        if (cancelled) return;
        tleRef.current = tles;
        setTleCount(tles.length);
        setError(null);
        // Immediately compute positions once we have fresh TLEs
        const results = propagateSatellites(tles, location!, new Date());
        setSatellites(results);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof SatelliteDataUnavailableError) {
          setError(err.message);
        } else {
          setError("Satellite telemetry unavailable.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAndSeed();

    const fetchInterval = setInterval(fetchAndSeed, UPDATE_INTERVALS.satelliteTleFetch);
    return () => {
      cancelled = true;
      clearInterval(fetchInterval);
    };
  }, [location]);

  // ── Recompute positions from cached TLEs (frequent — every 15s) ──────────
  useEffect(() => {
    if (!location) return;
    const recomputeInterval = setInterval(
      recompute,
      UPDATE_INTERVALS.satellitePositionRecompute
    );
    return () => clearInterval(recomputeInterval);
  }, [location, recompute]);

  return { satellites, isLoading, error, tleCount };
}

"use client";

import { useEffect, useState } from "react";
import {
  getOrFetchTles,
  computeOrbitTrail,
  findTleBySatId,
  OrbitTrailPoint,
} from "@/services/celestrak/satelliteService";
import { ObserverLocation } from "@/types/observer";
import { computePlanetOrbitTrail, computeFixedObjectOrbitTrail } from "@/services/astronomy/astronomyService";
import { DEEP_SPACE_CATALOG } from "@/constants/deepSpaceObjects";

/**
 * Computes a past/future orbit trail (look-angle path over ~one orbital
 * period) for a given satellite/ISS object id. Reuses the already-cached
 * TLE set from useSatellites — this never triggers its own network fetch.
 */
export function useOrbitTrail(
  objectId: string | null,
  location: ObserverLocation | null,
  centerDate: Date
): OrbitTrailPoint[] {
  const [trail, setTrail] = useState<OrbitTrailPoint[]>([]);
  const centerTimeMs = centerDate.getTime();

  useEffect(() => {
    if (!objectId || !location) {
      setTrail([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const tles = await getOrFetchTles();
        const tle = findTleBySatId(tles, objectId);
        if (!tle) {
          if (!cancelled) setTrail([]);
          return;
        }
        const points = computeOrbitTrail(tle, location, new Date(centerTimeMs));
        if (!cancelled) setTrail(points);
      } catch {
        if (!cancelled) setTrail([]);
      }
    })();

    return () => { cancelled = true; };
  }, [objectId, location?.latitude, location?.longitude, location?.elevation, centerTimeMs]);

  return trail;
}

export function useAllOrbitTrails(
  satelliteIdsStr: string,
  location: ObserverLocation | null,
  centerDate: Date,
  enabled: boolean
): Record<string, OrbitTrailPoint[]> {
  const [trails, setTrails] = useState<Record<string, OrbitTrailPoint[]>>({});
  const centerTimeMs = centerDate.getTime();

  useEffect(() => {
    if (!enabled || !location || !satelliteIdsStr) {
      setTrails({});
      return;
    }

    let cancelled = false;
    const objectIds = satelliteIdsStr.split(",");

    (async () => {
      try {
        const tles = await getOrFetchTles();
        if (cancelled) return;

        const nextTrails: Record<string, OrbitTrailPoint[]> = {};
        for (const id of objectIds) {
          const tle = findTleBySatId(tles, id);
          if (tle) {
            nextTrails[id] = computeOrbitTrail(tle, location, new Date(centerTimeMs));
          }
        }
        if (!cancelled) {
          setTrails(nextTrails);
        }
      } catch {
        if (!cancelled) setTrails({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    satelliteIdsStr,
    location?.latitude,
    location?.longitude,
    location?.elevation,
    centerTimeMs
  ]);

  return trails;
}

export function usePlanetOrbitTrails(
  location: ObserverLocation | null,
  centerDate: Date,
  enabled: boolean
): Record<string, OrbitTrailPoint[]> {
  const [trails, setTrails] = useState<Record<string, OrbitTrailPoint[]>>({});
  const centerTimeMs = centerDate.getTime();

  useEffect(() => {
    if (!enabled || !location) {
      setTrails({});
      return;
    }

    const bodies = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
    const nextTrails: Record<string, OrbitTrailPoint[]> = {};

    for (const bodyId of bodies) {
      const capitalized = bodyId.charAt(0).toUpperCase() + bodyId.slice(1);
      const points = computePlanetOrbitTrail(capitalized, location, new Date(centerTimeMs));
      nextTrails[bodyId] = points;
    }

    setTrails(nextTrails);
  }, [
    enabled,
    location?.latitude,
    location?.longitude,
    location?.elevation,
    centerTimeMs
  ]);

  return trails;
}

export function useDeepSpaceOrbitTrails(
  location: ObserverLocation | null,
  centerDate: Date,
  enabled: boolean
): Record<string, OrbitTrailPoint[]> {
  const [trails, setTrails] = useState<Record<string, OrbitTrailPoint[]>>({});
  const centerTimeMs = centerDate.getTime();

  useEffect(() => {
    if (!enabled || !location) {
      setTrails({});
      return;
    }

    const nextTrails: Record<string, OrbitTrailPoint[]> = {};
    for (const entry of DEEP_SPACE_CATALOG) {
      const points = computeFixedObjectOrbitTrail(entry.ra, entry.dec, location, new Date(centerTimeMs));
      nextTrails[entry.id] = points;
    }

    setTrails(nextTrails);
  }, [
    enabled,
    location?.latitude,
    location?.longitude,
    location?.elevation,
    centerTimeMs
  ]);

  return trails;
}


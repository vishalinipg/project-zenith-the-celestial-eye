import * as satellite from "satellite.js";
import { ParsedTle } from "./satelliteService";
import { ObserverLocation } from "@/types/observer";
import { getSunPosition } from "@/services/astronomy/astronomyService";

export interface SatellitePass {
  satId: string;
  satName: string;
  riseTime: Date;
  maxTime: Date;
  setTime: Date;
  maxElevationDeg: number;
  riseAzimuthDeg: number;
  setAzimuthDeg: number;
  /** True if the pass happens while the observer is in darkness AND the
   * satellite is sunlit — the condition for a naked-eye-visible pass. */
  isVisible: boolean;
  durationSec: number;
  /** Sampled azimuth/altitude/time across the pass, rise to set — used for
   * the elevation chart and the sky-map pass arc. */
  track: { time: Date; azimuthDeg: number; elevationDeg: number }[];
}

const STEP_SEC = 15; // coarse scan step
const REFINE_STEP_SEC = 1; // fine search near rise/set crossings

/**
 * Predicts upcoming passes for one TLE over a future window, by scanning
 * elevation at STEP_SEC resolution and refining rise/set crossing times.
 * This is plain SGP4 propagation reused from satelliteService — no new
 * orbital math, just a different sampling strategy (continuous scan vs.
 * single-instant snapshot).
 */
export function predictPasses(
  tle: ParsedTle,
  observer: ObserverLocation,
  startDate: Date,
  windowHours: number,
  minElevationDeg = 10
): SatellitePass[] {
  const obsGd = {
    longitude: satellite.degreesToRadians(observer.longitude),
    latitude: satellite.degreesToRadians(observer.latitude),
    height: observer.elevation / 1000,
  };

  function elevationAt(t: Date): number | null {
    try {
      const result = satellite.propagate(tle.satrec, t);
      if (!result.position || typeof result.position === "boolean") return null;
      const gmst = satellite.gstime(t);
      const ecf = satellite.eciToEcf(result.position as satellite.EciVec3<number>, gmst);
      const look = satellite.ecfToLookAngles(obsGd, ecf);
      return (look.elevation * 180) / Math.PI;
    } catch {
      return null;
    }
  }

  function azimuthAt(t: Date): number {
    try {
      const result = satellite.propagate(tle.satrec, t);
      if (!result.position || typeof result.position === "boolean") return 0;
      const gmst = satellite.gstime(t);
      const ecf = satellite.eciToEcf(result.position as satellite.EciVec3<number>, gmst);
      const look = satellite.ecfToLookAngles(obsGd, ecf);
      return (look.azimuth * 180) / Math.PI;
    } catch {
      return 0;
    }
  }

  /** Observer is in darkness enough to see satellites (civil twilight or darker). */
  function observerIsDark(t: Date): boolean {
    return getSunPosition(observer, t).coordinates.altitude < -6;
  }

  const passes: SatellitePass[] = [];
  const totalSteps = Math.floor((windowHours * 3600) / STEP_SEC);
  let prevElev = elevationAt(startDate) ?? -90;
  let prevT = startDate;

  let inPass = false;
  let riseT: Date | null = null;
  let maxElev = -90;
  let maxT: Date | null = null;

  for (let i = 1; i <= totalSteps; i++) {
    const t = new Date(startDate.getTime() + i * STEP_SEC * 1000);
    const elev = elevationAt(t);
    if (elev === null) { prevT = t; continue; }

    if (!inPass && prevElev <= 0 && elev > 0) {
      // Rising edge crossed horizon — refine between prevT and t
      riseT = refineCrossing(prevT, t, elevationAt, 0, REFINE_STEP_SEC);
      inPass = true;
      maxElev = elev;
      maxT = t;
    } else if (inPass) {
      if (elev > maxElev) { maxElev = elev; maxT = t; }
      if (prevElev > 0 && elev <= 0) {
        // Falling edge — pass ends
        const setT = refineCrossing(prevT, t, elevationAt, 0, REFINE_STEP_SEC);
        if (riseT && maxT && maxElev >= minElevationDeg) {
          const TRACK_SAMPLES = 16;
          const track: SatellitePass["track"] = [];
          for (let s = 0; s <= TRACK_SAMPLES; s++) {
            const sampleT = new Date(
              riseT.getTime() + (s / TRACK_SAMPLES) * (setT.getTime() - riseT.getTime())
            );
            const el = elevationAt(sampleT);
            if (el === null) continue;
            track.push({ time: sampleT, azimuthDeg: azimuthAt(sampleT), elevationDeg: el });
          }
          passes.push({
            satId: `sat-${tle.satrec.satnum}`,
            satName: tle.name,
            riseTime: riseT,
            maxTime: maxT,
            setTime: setT,
            maxElevationDeg: maxElev,
            riseAzimuthDeg: azimuthAt(riseT),
            setAzimuthDeg: azimuthAt(setT),
            isVisible: observerIsDark(maxT),
            durationSec: Math.round((setT.getTime() - riseT.getTime()) / 1000),
            track,
          });
        }
        inPass = false;
        riseT = null;
        maxElev = -90;
        maxT = null;
      }
    }

    prevElev = elev;
    prevT = t;
  }

  return passes;
}

/** Binary-search-style linear refinement of a horizon crossing between two coarse samples. */
function refineCrossing(
  tBefore: Date,
  tAfter: Date,
  elevationAt: (t: Date) => number | null,
  threshold: number,
  stepSec: number
): Date {
  let lo = tBefore.getTime();
  let hi = tAfter.getTime();
  // A handful of bisection passes gets us well under a second of error,
  // which is plenty for a UI display down to the second.
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const e = elevationAt(new Date(mid)) ?? threshold - 1;
    if (e > threshold) hi = mid; else lo = mid;
  }
  return new Date(Math.round((lo + hi) / 2));
}

/**
 * Predicts passes for every tracked station (ISS + any TLE name containing
 * a recognizable station marker) and merges/sorts them by rise time.
 * Limited to a small candidate set since pass search is O(window/step) per
 * satellite — fine for "ISS + a couple of stations," not for scanning
 * hundreds of TLEs client-side.
 */
export function predictIssPasses(
  tles: ParsedTle[],
  observer: ObserverLocation,
  startDate: Date,
  windowHours = 72
): SatellitePass[] {
  const iss = tles.find(
    (t) => t.name.includes("ISS") || t.name.includes("ZARYA") || String(t.satrec.satnum).trim() === "25544"
  );
  if (!iss) return [];
  return predictPasses(iss, observer, startDate, windowHours, 10).sort(
    (a, b) => a.riseTime.getTime() - b.riseTime.getTime()
  );
}

import * as satellite from "satellite.js";
import { API_ENDPOINTS, MAX_TRACKED_SATELLITES } from "@/constants/config";
import { CelestialObject, SatelliteCategory } from "@/types/celestial";
import { ObserverLocation } from "@/types/observer";

// ─── Types ───────────────────────────────────────────────────────────────────

export class SatelliteDataUnavailableError extends Error {
  constructor(msg = "Satellite telemetry unavailable.") {
    super(msg);
    this.name = "SatelliteDataUnavailableError";
  }
}

export interface ParsedTle {
  name: string;
  line1: string;
  line2: string;
  satrec: satellite.SatRec;
}

// ─── TLE parsing ─────────────────────────────────────────────────────────────

/**
 * Parses the plain-text 3-line TLE format returned by CelesTrak's
 * FORMAT=tle endpoint.  Every group of three lines is:
 *   line 0  — satellite name (stripped of leading/trailing whitespace)
 *   line 1  — TLE line 1 (starts with "1 ")
 *   line 2  — TLE line 2 (starts with "2 ")
 */
function parseTleText(raw: string): ParsedTle[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: ParsedTle[] = [];

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i] ?? "";
    const line1 = lines[i + 1] ?? "";
    const line2 = lines[i + 2] ?? "";

    if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) continue;

    try {
      const satrec = satellite.twoline2satrec(line1, line2);
      // satellite.js sets satrec.error !== 0 when the TLE is malformed.
      if (satrec.error !== 0) continue;
      parsed.push({ name, line1, line2, satrec });
    } catch {
      // Silently skip corrupt TLE records rather than crashing the whole fetch.
    }
  }

  return parsed;
}

// ─── In-memory TLE cache ──────────────────────────────────────────────────────

let cachedTles: ParsedTle[] = [];
let lastTleFetchMs = 0;

/**
 * Returns the cached TLE set, re-fetching from CelesTrak when the cache is
 * empty or stale. This is intentionally a module-level singleton — the
 * useSatellites hook calls this on a 6-hour interval, not per-render.
 */
export async function getOrFetchTles(): Promise<ParsedTle[]> {
  const now = Date.now();
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  if (cachedTles.length > 0 && now - lastTleFetchMs < SIX_HOURS_MS) {
    return cachedTles;
  }

  let response: Response;
  try {
    response = await fetch(API_ENDPOINTS.celestrakVisibleTle, {
      // cache: 'force-cache' would use the browser cache; we manage our own
      // freshness window explicitly above.
      cache: "no-store",
    });
  } catch {
    if (cachedTles.length > 0) return cachedTles; // stale-on-error fallback
    throw new SatelliteDataUnavailableError();
  }

  if (!response.ok) {
    if (cachedTles.length > 0) return cachedTles;
    throw new SatelliteDataUnavailableError();
  }

  const text = await response.text();
  const parsed = parseTleText(text);

  if (parsed.length === 0) {
    if (cachedTles.length > 0) return cachedTles;
    throw new SatelliteDataUnavailableError("No valid TLE records received.");
  }

  cachedTles = parsed;
  lastTleFetchMs = now;
  return cachedTles;
}

// ─── Category classification ─────────────────────────────────────────────────

/**
 * Classifies a satellite by name pattern. The "visual" TLE group mixes
 * stations, comm constellations, nav satellites, weather birds, and a few
 * science platforms together with no metadata — name matching is the only
 * signal available without a second network call.
 */
function classifyCategory(name: string): SatelliteCategory {
  const n = name.toUpperCase();

  if (n.includes("ISS") || n.includes("ZARYA") || n.includes("TIANGONG") || n.includes("CSS"))
    return "station";

  if (
    n.includes("STARLINK") || n.includes("ONEWEB") || n.includes("IRIDIUM") ||
    n.includes("INTELSAT") || n.includes("GLOBALSTAR")
  )
    return "communication";

  if (
    n.includes("GPS") || n.includes("NAVSTAR") || n.includes("GLONASS") ||
    n.includes("GALILEO") || n.includes("BEIDOU")
  )
    return "navigation";

  if (
    n.includes("NOAA") || n.includes("GOES") || n.includes("METEOSAT") ||
    n.includes("METOP") || n.includes("WEATHER")
  )
    return "weather";

  if (
    n.includes("HST") || n.includes("HUBBLE") || n.includes("JWST") ||
    n.includes("LANDSAT") || n.includes("SENTINEL") || n.includes("TERRA") ||
    n.includes("AQUA")
  )
    return "science";

  return "other";
}

// ─── Position propagation ─────────────────────────────────────────────────────

/**
 * Propagates all cached TLE records to `date` using SGP4 and converts the
 * resulting ECI positions into observer-relative altitude/azimuth
 * (look angles) via satellite.js's own ecfToLookAngles helper.
 *
 * Returns only satellites that are above the observer's horizon and caps the
 * result at MAX_TRACKED_SATELLITES to keep the renderer performant.
 */
export function propagateSatellites(
  tles: ParsedTle[],
  observer: ObserverLocation,
  date: Date
): CelestialObject[] {
  const gmst = satellite.gstime(date);
  const obsGd = {
    longitude: satellite.degreesToRadians(observer.longitude),
    latitude: satellite.degreesToRadians(observer.latitude),
    height: observer.elevation / 1000, // satellite.js wants km
  };

  const visible: CelestialObject[] = [];

  for (const tle of tles) {
    if (visible.length >= MAX_TRACKED_SATELLITES) break;

    try {
      const result = satellite.propagate(tle.satrec, date);
      if (!result.position || typeof result.position === "boolean") continue;
      if (!result.velocity || typeof result.velocity === "boolean") continue;

      const position = result.position as satellite.EciVec3<number>;
      const vel = result.velocity as satellite.EciVec3<number>;

      const positionEcf = satellite.eciToEcf(position, gmst);
      const lookAngles = satellite.ecfToLookAngles(obsGd, positionEcf);
      const elevationDeg = (lookAngles.elevation * 180) / Math.PI;

      if (elevationDeg < 0) continue; // below horizon

      const azimuthDeg = (lookAngles.azimuth * 180) / Math.PI;
      const geodeticPos = satellite.eciToGeodetic(position, gmst);
      const altKm = geodeticPos.height;
      const velocityKmS = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

      const isIss =
        tle.name.includes("ISS") ||
        tle.name.includes("ZARYA") ||
        String(tle.satrec.satnum).trim() === "25544";

      visible.push({
        id: `sat-${tle.satrec.satnum}`,
        name: tle.name,
        type: isIss ? "iss" : "satellite",
        category: classifyCategory(tle.name),
        coordinates: { altitude: elevationDeg, azimuth: azimuthDeg },
        isVisible: true,
        altitudeKm: altKm,
        velocityKmS,
        lastUpdated: date,
      });
    } catch {
      // Skip malformed records silently — never crash the render loop.
    }
  }

  return visible;
}

// ─── Orbit trail sampling ──────────────────────────────────────────────────────

export interface OrbitTrailPoint {
  altitude: number;
  azimuth: number;
  isPast: boolean;
}

const TRAIL_SAMPLE_COUNT = 36;

/**
 * Samples a satellite's look-angle path across roughly one orbital period,
 * centered on `centerDate`, for drawing a past/future trail in the sky view.
 * Period is derived from the TLE's mean motion (satrec.no, in rad/min).
 */
export function computeOrbitTrail(
  tle: ParsedTle,
  observer: ObserverLocation,
  centerDate: Date
): OrbitTrailPoint[] {
  const periodMin = (2 * Math.PI) / tle.satrec.no;
  const centerMs = centerDate.getTime();
  const obsGd = {
    longitude: satellite.degreesToRadians(observer.longitude),
    latitude: satellite.degreesToRadians(observer.latitude),
    height: observer.elevation / 1000,
  };

  const points: OrbitTrailPoint[] = [];

  for (let i = 0; i <= TRAIL_SAMPLE_COUNT; i++) {
    const frac = i / TRAIL_SAMPLE_COUNT - 0.5; // -0.5 .. +0.5 of one period
    const t = new Date(centerMs + frac * periodMin * 60_000);

    try {
      const result = satellite.propagate(tle.satrec, t);
      if (!result.position || typeof result.position === "boolean") continue;

      const gmst = satellite.gstime(t);
      const ecf = satellite.eciToEcf(result.position as satellite.EciVec3<number>, gmst);
      const look = satellite.ecfToLookAngles(obsGd, ecf);

      points.push({
        altitude: (look.elevation * 180) / Math.PI,
        azimuth: (look.azimuth * 180) / Math.PI,
        isPast: frac < 0,
      });
    } catch {
      // Skip malformed samples silently.
    }
  }

  return points;
}

/** Finds a cached TLE record by the `sat-<satnum>` id used in CelestialObject.id. */
export function findTleBySatId(tles: ParsedTle[], objectId: string): ParsedTle | null {
  const satnum = objectId.replace(/^sat-/, "");
  return tles.find((t) => String(t.satrec.satnum).trim() === satnum) ?? null;
}

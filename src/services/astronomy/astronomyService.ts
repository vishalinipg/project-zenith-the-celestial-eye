import * as Astronomy from "astronomy-engine";
import { CelestialObject } from "@/types/celestial";
import { ObserverLocation } from "@/types/observer";
import { TRACKED_PLANETS, HORIZON_ALTITUDE_DEG } from "@/constants/config";
import { OrbitTrailPoint } from "@/services/celestrak/satelliteService";


function toObs(loc: ObserverLocation): Astronomy.Observer {
  return new Astronomy.Observer(loc.latitude, loc.longitude, loc.elevation);
}

function bodyAltAz(body: Astronomy.Body, date: Date, observer: Astronomy.Observer) {
  const eq = Astronomy.Equator(body, date, observer, true, true);
  return Astronomy.Horizon(date, observer, eq.ra, eq.dec, "normal");
}

export function getSunPosition(loc: ObserverLocation, date: Date): CelestialObject {
  const h = bodyAltAz(Astronomy.Body.Sun, date, toObs(loc));
  return { id: "sun", name: "Sun", type: "sun",
    coordinates: { altitude: h.altitude, azimuth: h.azimuth },
    magnitude: -26.7, isVisible: h.altitude > HORIZON_ALTITUDE_DEG, lastUpdated: date };
}

export function getMoonPosition(loc: ObserverLocation, date: Date): CelestialObject {
  const h = bodyAltAz(Astronomy.Body.Moon, date, toObs(loc));
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  return {
    id: "moon", name: "Moon", type: "moon",
    coordinates: { altitude: h.altitude, azimuth: h.azimuth },
    magnitude: illum.mag,
    illumination: illum.phase_fraction,
    isVisible: h.altitude > HORIZON_ALTITUDE_DEG,
    description: `${(illum.phase_fraction * 100).toFixed(0)}% illuminated`,
    lastUpdated: date,
  };
}

export function getPlanetPositions(loc: ObserverLocation, date: Date): CelestialObject[] {
  const obs = toObs(loc);
  return TRACKED_PLANETS.map((name) => {
    const body = Astronomy.Body[name];
    const h = bodyAltAz(body, date, obs);
    let mag: number | undefined;
    try { mag = Astronomy.Illumination(body, date).mag; } catch {}
    return {
      id: name.toLowerCase(), name, type: "planet" as const,
      coordinates: { altitude: h.altitude, azimuth: h.azimuth },
      magnitude: mag, isVisible: h.altitude > HORIZON_ALTITUDE_DEG,
      lastUpdated: date,
    };
  });
}

export function getSolarSystemSnapshot(loc: ObserverLocation, date: Date): CelestialObject[] {
  return [getSunPosition(loc, date), getMoonPosition(loc, date), ...getPlanetPositions(loc, date)];
}

export function equatorialToHorizontal(raHours: number, decDeg: number, loc: ObserverLocation, date: Date) {
  return Astronomy.Horizon(date, toObs(loc), raHours, decDeg, "normal");
}

export function computePlanetOrbitTrail(
  bodyName: string,
  loc: ObserverLocation,
  centerDate: Date
): OrbitTrailPoint[] {
  const obs = toObs(loc);
  const body = bodyName.toLowerCase() === "sun"
    ? Astronomy.Body.Sun
    : bodyName.toLowerCase() === "moon"
    ? Astronomy.Body.Moon
    : Astronomy.Body[bodyName as keyof typeof Astronomy.Body];

  if (!body) return [];

  const points: OrbitTrailPoint[] = [];
  const SAMPLE_COUNT = 36;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const centerMs = centerDate.getTime();

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const frac = i / SAMPLE_COUNT - 0.5; // -0.5 to +0.5 of a day (-12 to +12 hours)
    const t = new Date(centerMs + frac * DAY_MS);
    const h = bodyAltAz(body, t, obs);
    points.push({
      altitude: h.altitude,
      azimuth: h.azimuth,
      isPast: frac < 0,
    });
  }

  return points;
}

export function computeFixedObjectOrbitTrail(
  ra: number,
  dec: number,
  loc: ObserverLocation,
  centerDate: Date
): OrbitTrailPoint[] {
  const points: OrbitTrailPoint[] = [];
  const SAMPLE_COUNT = 36;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const centerMs = centerDate.getTime();

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const frac = i / SAMPLE_COUNT - 0.5; // -0.5 to +0.5 of a day
    const t = new Date(centerMs + frac * DAY_MS);
    const h = equatorialToHorizontal(ra, dec, loc, t);
    points.push({
      altitude: h.altitude,
      azimuth: h.azimuth,
      isPast: frac < 0,
    });
  }

  return points;
}


import { describe, it, expect } from "vitest";
import { getSunPosition, getMoonPosition, getPlanetPositions, computePlanetOrbitTrail, computeFixedObjectOrbitTrail } from "@/services/astronomy/astronomyService";
import { ObserverLocation } from "@/types/observer";

const CHENNAI: ObserverLocation = {
  latitude: 13.0827,
  longitude: 80.2707,
  elevation: 0,
  label: "Chennai, India",
  timezone: "Asia/Kolkata",
};

const GREENWICH: ObserverLocation = {
  latitude: 51.4769,
  longitude: -0.0005,
  elevation: 0,
  label: "Greenwich, UK",
  timezone: "Europe/London",
};

describe("astronomyService — getSunPosition", () => {
  it("returns alt/az within valid physical ranges", () => {
    const sun = getSunPosition(CHENNAI, new Date("2026-06-21T12:00:00Z"));
    expect(sun.coordinates.altitude).toBeGreaterThanOrEqual(-90);
    expect(sun.coordinates.altitude).toBeLessThanOrEqual(90);
    expect(sun.coordinates.azimuth).toBeGreaterThanOrEqual(0);
    expect(sun.coordinates.azimuth).toBeLessThan(360);
  });

  it("places the sun roughly overhead at local solar noon near the equator", () => {
    // Chennai (~13°N) at the June solstice, local solar noon ≈ 06:30 UTC (UTC+5:30 minus ~12:00 local).
    const sun = getSunPosition(CHENNAI, new Date("2026-06-21T06:42:00Z"));
    // At solar noon the sun should be high in the sky (not exhaustively precise,
    // but should clear a generous "high in the sky" bar near the solstice).
    expect(sun.coordinates.altitude).toBeGreaterThan(60);
  });

  it("places the sun below the horizon at local midnight", () => {
    const sun = getSunPosition(CHENNAI, new Date("2026-06-21T18:42:00Z")); // ~midnight IST
    expect(sun.coordinates.altitude).toBeLessThan(0);
  });

  it("marks isVisible consistently with the horizon threshold", () => {
    const day = getSunPosition(CHENNAI, new Date("2026-06-21T06:42:00Z"));
    const night = getSunPosition(CHENNAI, new Date("2026-06-21T18:42:00Z"));
    expect(day.isVisible).toBe(true);
    expect(night.isVisible).toBe(false);
  });

  it("produces a stable, deterministic result for a fixed time and place", () => {
    const t = new Date("2026-03-15T09:00:00Z");
    const a = getSunPosition(GREENWICH, t);
    const b = getSunPosition(GREENWICH, t);
    expect(a.coordinates.altitude).toBeCloseTo(b.coordinates.altitude, 10);
    expect(a.coordinates.azimuth).toBeCloseTo(b.coordinates.azimuth, 10);
  });
});

describe("astronomyService — getMoonPosition", () => {
  it("returns an illumination fraction between 0 and 1", () => {
    const moon = getMoonPosition(CHENNAI, new Date("2026-06-21T12:00:00Z"));
    expect(moon.illumination).toBeGreaterThanOrEqual(0);
    expect(moon.illumination).toBeLessThanOrEqual(1);
  });

  it("includes a human-readable description mentioning illumination percentage", () => {
    const moon = getMoonPosition(CHENNAI, new Date("2026-06-21T12:00:00Z"));
    expect(moon.description).toMatch(/\d+% illuminated/);
  });

  it("the phase fraction in the description matches the numeric illumination field", () => {
    const moon = getMoonPosition(CHENNAI, new Date("2026-06-21T12:00:00Z"));
    const match = moon.description?.match(/^(\d+)/);
    const described = parseInt(match ? match[1] ?? "0" : "0", 10);
    const fromField = Math.round((moon.illumination ?? 0) * 100);
    expect(described).toBe(fromField);
  });
});

describe("astronomyService — getPlanetPositions", () => {
  it("returns exactly the five tracked planets", () => {
    const planets = getPlanetPositions(CHENNAI, new Date("2026-06-21T12:00:00Z"));
    expect(planets).toHaveLength(5);
    const names = planets.map((p) => p.name);
    expect(names).toEqual(["Mercury", "Venus", "Mars", "Jupiter", "Saturn"]);
  });

  it("every planet has a valid alt/az and a defined id", () => {
    const planets = getPlanetPositions(CHENNAI, new Date("2026-06-21T12:00:00Z"));
    for (const p of planets) {
      expect(p.coordinates.altitude).toBeGreaterThanOrEqual(-90);
      expect(p.coordinates.altitude).toBeLessThanOrEqual(90);
      expect(p.id).toBe(p.name.toLowerCase());
      expect(p.type).toBe("planet");
    }
  });
});

describe("astronomyService — computePlanetOrbitTrail", () => {
  it("returns a 37-point diurnal trail for the Sun", () => {
    const points = computePlanetOrbitTrail("Sun", CHENNAI, new Date("2026-06-21T12:00:00Z"));
    expect(points).toHaveLength(37);
    for (const p of points) {
      expect(p.altitude).toBeGreaterThanOrEqual(-90);
      expect(p.altitude).toBeLessThanOrEqual(90);
      expect(p.azimuth).toBeGreaterThanOrEqual(0);
      expect(p.azimuth).toBeLessThan(360);
      expect(typeof p.isPast).toBe("boolean");
    }
  });

  it("returns a 37-point diurnal trail for a tracked planet like Jupiter", () => {
    const points = computePlanetOrbitTrail("Jupiter", CHENNAI, new Date("2026-06-21T12:00:00Z"));
    expect(points).toHaveLength(37);
    for (const p of points) {
      expect(p.altitude).toBeGreaterThanOrEqual(-90);
      expect(p.altitude).toBeLessThanOrEqual(90);
      expect(p.azimuth).toBeGreaterThanOrEqual(0);
      expect(p.azimuth).toBeLessThan(360);
    }
  });

  it("returns empty array for an invalid body name", () => {
    const points = computePlanetOrbitTrail("InvalidBody", CHENNAI, new Date("2026-06-21T12:00:00Z"));
    expect(points).toHaveLength(0);
  });
});

describe("astronomyService — computeFixedObjectOrbitTrail", () => {
  it("returns a 37-point diurnal trail for static coordinates (RA/Dec)", () => {
    // Polaris RA=2.53h, Dec=89.26°
    const points = computeFixedObjectOrbitTrail(2.53, 89.26, CHENNAI, new Date("2026-06-21T12:00:00Z"));
    expect(points).toHaveLength(37);
    for (const p of points) {
      expect(p.altitude).toBeGreaterThanOrEqual(-90);
      expect(p.altitude).toBeLessThanOrEqual(90);
      expect(p.azimuth).toBeGreaterThanOrEqual(0);
      expect(p.azimuth).toBeLessThan(360);
    }
  });
});

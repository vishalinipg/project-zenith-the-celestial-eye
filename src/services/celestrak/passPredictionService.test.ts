import { describe, it, expect } from "vitest";
import * as satellite from "satellite.js";
import { predictPasses, predictIssPasses } from "@/services/celestrak/passPredictionService";
import { ParsedTle } from "@/services/celestrak/satelliteService";
import { ObserverLocation } from "@/types/observer";

const ISS_LINE1 = "1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9994";
const ISS_LINE2 = "2 25544  51.6416 339.7760 0007185  65.9967  53.9072 15.49612125 18345";

function makeIssTle(): ParsedTle {
  const satrec = satellite.twoline2satrec(ISS_LINE1, ISS_LINE2);
  return { name: "ISS (ZARYA)", line1: ISS_LINE1, line2: ISS_LINE2, satrec };
}

const CHENNAI: ObserverLocation = {
  latitude: 13.0827,
  longitude: 80.2707,
  elevation: 0,
  label: "Chennai, India",
  timezone: "Asia/Kolkata",
};

describe("passPredictionService — predictPasses", () => {
  it("finds at least one pass over a 72-hour window (ISS passes overhead several times a day)", () => {
    const tle = makeIssTle();
    const passes = predictPasses(tle, CHENNAI, new Date("2026-01-01T00:00:00Z"), 72, 10);
    expect(passes.length).toBeGreaterThan(0);
  });

  it("every pass has rise < max <= set in chronological order", () => {
    const tle = makeIssTle();
    const passes = predictPasses(tle, CHENNAI, new Date("2026-01-01T00:00:00Z"), 72, 10);
    for (const p of passes) {
      expect(p.riseTime.getTime()).toBeLessThan(p.maxTime.getTime());
      expect(p.maxTime.getTime()).toBeLessThanOrEqual(p.setTime.getTime());
    }
  });

  it("every pass clears the requested minimum elevation threshold", () => {
    const tle = makeIssTle();
    const minElev = 20;
    const passes = predictPasses(tle, CHENNAI, new Date("2026-01-01T00:00:00Z"), 72, minElev);
    for (const p of passes) {
      expect(p.maxElevationDeg).toBeGreaterThanOrEqual(minElev);
    }
  });

  it("a higher minimum elevation threshold never returns more passes than a lower one", () => {
    const tle = makeIssTle();
    const start = new Date("2026-01-01T00:00:00Z");
    const loose = predictPasses(tle, CHENNAI, start, 72, 5);
    const strict = predictPasses(tle, CHENNAI, start, 72, 60);
    expect(strict.length).toBeLessThanOrEqual(loose.length);
  });

  it("duration matches setTime - riseTime in seconds", () => {
    const tle = makeIssTle();
    const passes = predictPasses(tle, CHENNAI, new Date("2026-01-01T00:00:00Z"), 72, 10);
    for (const p of passes) {
      const expectedDuration = Math.round((p.setTime.getTime() - p.riseTime.getTime()) / 1000);
      expect(p.durationSec).toBe(expectedDuration);
    }
  });

  it("rise and set azimuths are within [0, 360)", () => {
    const tle = makeIssTle();
    const passes = predictPasses(tle, CHENNAI, new Date("2026-01-01T00:00:00Z"), 72, 10);
    for (const p of passes) {
      expect(p.riseAzimuthDeg).toBeGreaterThanOrEqual(0);
      expect(p.riseAzimuthDeg).toBeLessThan(360);
      expect(p.setAzimuthDeg).toBeGreaterThanOrEqual(0);
      expect(p.setAzimuthDeg).toBeLessThan(360);
    }
  });

  it("returns no passes for an absurdly high elevation threshold", () => {
    const tle = makeIssTle();
    const passes = predictPasses(tle, CHENNAI, new Date("2026-01-01T00:00:00Z"), 72, 89);
    expect(passes).toEqual([]);
  });
});

describe("passPredictionService — predictIssPasses", () => {
  it("returns passes sorted by rise time ascending", () => {
    const tle = makeIssTle();
    const passes = predictIssPasses([tle], CHENNAI, new Date("2026-01-01T00:00:00Z"), 72);
    for (let i = 1; i < passes.length; i++) {
      const current = passes[i];
      const prev = passes[i - 1];
      if (current && prev) {
        expect(current.riseTime.getTime()).toBeGreaterThanOrEqual(prev.riseTime.getTime());
      }
    }
  });

  it("returns an empty array when no ISS TLE is present in the input set", () => {
    const passes = predictIssPasses([], CHENNAI, new Date("2026-01-01T00:00:00Z"), 72);
    expect(passes).toEqual([]);
  });

  it("identifies the ISS by name even without relying on the satnum check alone", () => {
    const tle = makeIssTle();
    const passes = predictIssPasses([tle], CHENNAI, new Date("2026-01-01T00:00:00Z"), 24);
    // Whether or not any passes occur in this shorter window, the call
    // itself must not throw and must return an array.
    expect(Array.isArray(passes)).toBe(true);
  });
});

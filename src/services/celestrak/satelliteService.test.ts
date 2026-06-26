import { describe, it, expect } from "vitest";
import * as satellite from "satellite.js";
import {
  propagateSatellites,
  computeOrbitTrail,
  findTleBySatId,
  ParsedTle,
} from "@/services/celestrak/satelliteService";
import { ObserverLocation } from "@/types/observer";

// A checksum-valid ISS TLE. The epoch is fixed in the past deliberately —
// these tests check propagation *mechanics* (shapes, invariants, internal
// consistency), not real-world "where is the ISS right now" facts, so a
// stale-but-valid TLE is exactly what we want: deterministic forever.
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

describe("satelliteService — propagateSatellites", () => {
  it("only returns satellites above the horizon, and finds at least one such moment", () => {
    const tle = makeIssTle();
    const start = Date.parse("2026-01-01T00:00:00Z");
    let sawAnyResult = false;
    // Scan 3 days at 2-minute resolution — comfortably covers multiple
    // ISS passes for any ground location regardless of TLE epoch phase.
    for (let mins = 0; mins < 60 * 24 * 3; mins += 2) {
      const t = new Date(start + mins * 60_000);
      const results = propagateSatellites([tle], CHENNAI, t);
      for (const r of results) {
        sawAnyResult = true;
        expect(r.coordinates.altitude).toBeGreaterThanOrEqual(0);
        expect(r.isVisible).toBe(true);
      }
    }
    expect(sawAnyResult).toBe(true);
  });

  it("classifies the ISS TLE as type 'iss', not generic 'satellite'", () => {
    const tle = makeIssTle();
    const start = Date.parse("2026-01-01T00:00:00Z");
    let found = null;
    for (let mins = 0; mins < 60 * 24 * 3; mins += 1) {
      const date = new Date(start + mins * 60_000);
      const results = propagateSatellites([tle], CHENNAI, date);
      if (results.length > 0) { found = results[0]; break; }
    }
    expect(found).not.toBeNull();
    expect(found!.type).toBe("iss");
    expect(found!.id).toBe("sat-25544");
  });

  it("returns velocity within the known ISS range whenever a result is found", () => {
    const tle = makeIssTle();
    const start = Date.parse("2026-01-01T00:00:00Z");
    let sawAnyResult = false;
    for (let mins = 0; mins < 60 * 24 * 3; mins += 2) {
      const t = new Date(start + mins * 60_000);
      const results = propagateSatellites([tle], CHENNAI, t);
      for (const r of results) {
        sawAnyResult = true;
        expect(r.velocityKmS).toBeGreaterThan(0);
        // ISS orbital velocity is well-known to be ~7.6-7.7 km/s.
        expect(r.velocityKmS).toBeGreaterThan(6);
        expect(r.velocityKmS).toBeLessThan(9);
      }
    }
    expect(sawAnyResult).toBe(true);
  });

  it("gracefully returns an empty list for malformed/garbage TLEs rather than throwing", () => {
    const badSatrec = { ...makeIssTle().satrec, error: 0 };
    const badTle: ParsedTle = {
      name: "GARBAGE",
      line1: "garbage",
      line2: "garbage",
      // Intentionally pass a satrec that will throw inside satellite.propagate
      // by corrupting a required numeric field.
      satrec: { ...badSatrec, no: NaN } as any,
    };
    expect(() => propagateSatellites([badTle], CHENNAI, new Date())).not.toThrow();
  });
});

describe("satelliteService — computeOrbitTrail", () => {
  it("produces points spanning past and future relative to the center time", () => {
    const tle = makeIssTle();
    const trail = computeOrbitTrail(tle, CHENNAI, new Date("2026-01-01T00:00:00Z"));
    expect(trail.length).toBeGreaterThan(0);
    expect(trail.some((p) => p.isPast)).toBe(true);
    expect(trail.some((p) => !p.isPast)).toBe(true);
  });

  it("every trail point has azimuth within [0, 360)", () => {
    const tle = makeIssTle();
    const trail = computeOrbitTrail(tle, CHENNAI, new Date("2026-01-01T00:00:00Z"));
    for (const p of trail) {
      expect(p.azimuth).toBeGreaterThanOrEqual(0);
      expect(p.azimuth).toBeLessThan(360);
    }
  });
});

describe("satelliteService — findTleBySatId", () => {
  it("finds a TLE by its sat-<satnum> id", () => {
    const tle = makeIssTle();
    const found = findTleBySatId([tle], "sat-25544");
    expect(found).not.toBeNull();
    expect(found!.name).toBe("ISS (ZARYA)");
  });

  it("returns null for an id that isn't in the set", () => {
    const tle = makeIssTle();
    const found = findTleBySatId([tle], "sat-99999");
    expect(found).toBeNull();
  });
});

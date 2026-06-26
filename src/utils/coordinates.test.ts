import { describe, it, expect } from "vitest";
import { geodeticToHorizontalApprox, horizontalToCartesian, clampMagnitudeToRenderSize } from "@/utils/coordinates";
import { ObserverLocation } from "@/types/observer";

const OBSERVER: ObserverLocation = {
  latitude: 13.0827, longitude: 80.2707, elevation: 0,
  label: "Chennai, India", timezone: "Asia/Kolkata",
};

describe("coordinates — geodeticToHorizontalApprox", () => {
  it("reports near-90° altitude when the target is directly overhead", () => {
    const result = geodeticToHorizontalApprox(OBSERVER, OBSERVER.latitude, OBSERVER.longitude, 408);
    expect(result.altitude).toBeGreaterThan(85);
  });

  it("reports a low/negative altitude for a target on the opposite side of the Earth", () => {
    const antipodeLat = -OBSERVER.latitude;
    const antipodeLon = OBSERVER.longitude > 0 ? OBSERVER.longitude - 180 : OBSERVER.longitude + 180;
    const result = geodeticToHorizontalApprox(OBSERVER, antipodeLat, antipodeLon, 408);
    expect(result.altitude).toBeLessThan(0);
  });

  it("returns azimuth within [0, 360)", () => {
    const result = geodeticToHorizontalApprox(OBSERVER, 20, 90, 408);
    expect(result.azimuth).toBeGreaterThanOrEqual(0);
    expect(result.azimuth).toBeLessThan(360);
  });

  it("returns a positive slant distance that grows with target altitude", () => {
    const low = geodeticToHorizontalApprox(OBSERVER, 20, 90, 408);
    const high = geodeticToHorizontalApprox(OBSERVER, 20, 90, 20000);
    expect(low.slantDistanceKm).toBeGreaterThan(0);
    expect(high.slantDistanceKm).toBeGreaterThan(low.slantDistanceKm);
  });
});

describe("coordinates — horizontalToCartesian", () => {
  it("places zenith (altitude 90°) directly on the +Y axis", () => {
    const [x, y, z] = horizontalToCartesian(90, 0, 1);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  it("places north horizon (altitude 0, azimuth 0) on -Z", () => {
    const [x, y, z] = horizontalToCartesian(0, 0, 1);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(-1, 5);
  });

  it("preserves vector magnitude equal to the requested radius", () => {
    const radius = 5;
    const [x, y, z] = horizontalToCartesian(33, 142, radius);
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    expect(magnitude).toBeCloseTo(radius, 5);
  });
});

describe("coordinates — clampMagnitudeToRenderSize", () => {
  it("renders brighter (lower magnitude) objects larger than dimmer ones", () => {
    const bright = clampMagnitudeToRenderSize(-1);
    const dim = clampMagnitudeToRenderSize(5);
    expect(bright).toBeGreaterThan(dim);
  });

  it("never returns a size outside [minSize, maxSize]", () => {
    const min = 0.5, max = 3;
    for (const mag of [-10, -1.5, 0, 3, 6, 100]) {
      const size = clampMagnitudeToRenderSize(mag, min, max);
      expect(size).toBeGreaterThanOrEqual(min);
      expect(size).toBeLessThanOrEqual(max);
    }
  });
});

import { describe, it, expect } from "vitest";
import { computeObservability } from "@/services/observability/observabilityService";
import { WeatherData } from "@/services/weather/weatherService";
import { CelestialObject } from "@/types/celestial";

function makeWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    cloudCoverPercent: 0,
    visibilityM: 20000,
    weatherCode: 0,
    temperatureC: 20,
    ...overrides,
  } as WeatherData;
}

function makeSun(altitude: number): CelestialObject {
  return {
    id: "sun", name: "Sun", type: "sun",
    coordinates: { altitude, azimuth: 180 },
    isVisible: altitude > 0, lastUpdated: new Date(),
  };
}

function makeMoon(illumination: number, isVisible: boolean): CelestialObject {
  return {
    id: "moon", name: "Moon", type: "moon",
    coordinates: { altitude: isVisible ? 30 : -30, azimuth: 90 },
    illumination, isVisible,
    description: `${Math.round(illumination * 100)}% illuminated`,
    lastUpdated: new Date(),
  };
}

describe("observabilityService — computeObservability", () => {
  it("scores best-case conditions (clear sky, new moon below horizon, deep night) near 100", () => {
    const weather = makeWeather({ cloudCoverPercent: 0, visibilityM: 20000, weatherCode: 0 });
    const objects = [makeSun(-30), makeMoon(0, false)];
    const result = computeObservability(weather, objects);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe("Excellent");
  });

  it("scores worst-case conditions (full daylight, full moon, storm) very low — near the bottom of the scale", () => {
    const weather = makeWeather({ cloudCoverPercent: 100, visibilityM: 0, weatherCode: 95 });
    const objects = [makeSun(45), makeMoon(1, true)];
    const result = computeObservability(weather, objects);
    // moonScore has a built-in floor (30 - 28 = 2 at full illumination), so the
    // true worst case isn't exactly 0 — but it should still land in "Unsuitable".
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.label).toBe("Unsuitable");
    expect(result.weatherScore).toBe(0);
    expect(result.darknessScore).toBe(0);
  });

  it("penalizes a full moon above the horizon relative to a new moon, all else equal", () => {
    const weather = makeWeather();
    const withFullMoon = computeObservability(weather, [makeSun(-30), makeMoon(1, true)]);
    const withNewMoon = computeObservability(weather, [makeSun(-30), makeMoon(0, true)]);
    expect(withFullMoon.score).toBeLessThan(withNewMoon.score);
  });

  it("does not penalize moon illumination when the moon is below the horizon", () => {
    const weather = makeWeather();
    const fullMoonBelowHorizon = computeObservability(weather, [makeSun(-30), makeMoon(1, false)]);
    const newMoonBelowHorizon = computeObservability(weather, [makeSun(-30), makeMoon(0, false)]);
    expect(fullMoonBelowHorizon.moonScore).toBe(newMoonBelowHorizon.moonScore);
  });

  it("penalizes cloud cover monotonically", () => {
    const objects = [makeSun(-30), makeMoon(0, false)];
    const clear = computeObservability(makeWeather({ cloudCoverPercent: 0 }), objects);
    const cloudy = computeObservability(makeWeather({ cloudCoverPercent: 50 }), objects);
    const overcast = computeObservability(makeWeather({ cloudCoverPercent: 100 }), objects);
    expect(clear.weatherScore).toBeGreaterThan(cloudy.weatherScore);
    expect(cloudy.weatherScore).toBeGreaterThan(overcast.weatherScore);
  });

  it("gives a strictly better darkness score for deeper night", () => {
    const weather = makeWeather();
    const objects = (sunAlt: number) => [makeSun(sunAlt), makeMoon(0, false)];
    const twilight = computeObservability(weather, objects(-3));
    const nauticalTwilight = computeObservability(weather, objects(-9));
    const trueDark = computeObservability(weather, objects(-20));
    expect(twilight.darknessScore).toBeLessThan(nauticalTwilight.darknessScore);
    expect(nauticalTwilight.darknessScore).toBeLessThan(trueDark.darknessScore);
  });

  it("always returns a score clamped to [0, 100]", () => {
    const weather = makeWeather({ cloudCoverPercent: 0, visibilityM: 50000, weatherCode: 0 });
    const objects = [makeSun(-90), makeMoon(0, false)];
    const result = computeObservability(weather, objects);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("gracefully handles a missing moon object (treats as no moon penalty)", () => {
    const weather = makeWeather();
    const result = computeObservability(weather, [makeSun(-30)]);
    expect(result.moonScore).toBe(30);
  });

  it("gracefully handles a missing sun object (treats as fully dark)", () => {
    const weather = makeWeather();
    const result = computeObservability(weather, [makeMoon(0, false)]);
    expect(result.darknessScore).toBe(30);
  });
});

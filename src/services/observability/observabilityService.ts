import { WeatherData } from "@/services/weather/weatherService";
import { CelestialObject } from "@/types/celestial";

export interface ObservabilityBreakdown {
  /** Final composite score 0–100. Higher is better. */
  score: number;
  /** 0–40: weather/cloud contribution */
  weatherScore: number;
  /** 0–30: moon illumination contribution */
  moonScore: number;
  /** 0–30: sky darkness / time-of-night contribution */
  darknessScore: number;
  label: "Excellent" | "Good" | "Fair" | "Poor" | "Unsuitable";
  description: string;
}

/**
 * Computes an observability score that matches the Round-1 blueprint's
 * "0–100 single score from weather + moon illumination + visibility" concept.
 *
 * Inputs are deliberately kept to what we already have (weather service + the
 * celestial objects we compute for free) so no extra API call is needed.
 *
 * Weighting:
 *   40 pts — weather clarity (cloud cover + visibility + weather code)
 *   30 pts — moon brightness (illumination fraction)
 *   30 pts — sky darkness (sun altitude proxy for Bortle-like light pollution)
 *
 * A proper Bortle-scale lookup requires a spatial light-pollution dataset
 * (e.g. the Falchi atlas) — not available as a real-time keyless API. The
 * sun altitude proxy is a good-enough substitute for an educational score:
 * it correctly penalizes twilight, rewards deep night.
 */
export function computeObservability(
  weather: WeatherData,
  celestialObjects: CelestialObject[]
): ObservabilityBreakdown {
  // ── Weather score (0–40) ─────────────────────────────────────────────────
  const cloudPenalty = (weather.cloudCoverPercent / 100) * 30;
  const visibilityBonus =
    Math.min(weather.visibilityM / 20_000, 1) * 10; // maxes out at 20 km
  const badWeatherCodes = new Set([45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
  const badWeatherPenalty = badWeatherCodes.has(weather.weatherCode) ? 10 : 0;
  const weatherScore = Math.max(
    0,
    Math.round(40 - cloudPenalty + visibilityBonus - badWeatherPenalty)
  );

  // ── Moon score (0–30) ────────────────────────────────────────────────────
  const moon = celestialObjects.find((o) => o.id === "moon");
  let moonIllumFraction = 0;
  if (moon?.description) {
    const match = moon.description.match(/^(\d+)/);
    if (match?.[1]) moonIllumFraction = parseInt(match[1], 10) / 100;
  }
  // Penalise only if the moon is actually above the horizon
  const moonAbove = moon?.isVisible ?? false;
  const moonPenalty = moonAbove ? moonIllumFraction * 28 : 0;
  const moonScore = Math.round(30 - moonPenalty);

  // ── Darkness score (0–30) ────────────────────────────────────────────────
  const sun = celestialObjects.find((o) => o.id === "sun");
  const sunAlt = sun?.coordinates.altitude ?? -90;
  let darknessScore: number;
  if (sunAlt > 0) {
    darknessScore = 0; // daylight — no observing
  } else if (sunAlt > -6) {
    darknessScore = 6; // civil twilight
  } else if (sunAlt > -12) {
    darknessScore = 14; // nautical twilight
  } else if (sunAlt > -18) {
    darknessScore = 22; // astronomical twilight
  } else {
    darknessScore = 30; // true dark sky
  }

  const score = Math.min(100, Math.max(0, weatherScore + moonScore + darknessScore));

  let label: ObservabilityBreakdown["label"];
  let description: string;

  if (score >= 80) {
    label = "Excellent";
    description = "Outstanding viewing conditions. Ideal for observation.";
  } else if (score >= 60) {
    label = "Good";
    description = "Favorable conditions. Most objects clearly visible.";
  } else if (score >= 40) {
    label = "Fair";
    description = "Partial cloud cover or moonlight may reduce visibility.";
  } else if (score >= 20) {
    label = "Poor";
    description = "Significant interference. Only bright objects visible.";
  } else {
    label = "Unsuitable";
    description = "Daylight or heavy cloud cover prevents observation.";
  }

  return { score, weatherScore, moonScore, darknessScore, label, description };
}

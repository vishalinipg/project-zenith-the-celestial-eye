/** Polling intervals, in milliseconds, per the spec's "real-time updates" rules. */
export const UPDATE_INTERVALS = {
  iss: 5_000,
  /** How often we recompute satellite alt/az from the cached TLE set. Orbital
   * mechanics, not a network call — cheap to run often. */
  satellitePositionRecompute: 15_000,
  /** How often we re-fetch TLE data from Celestrak. TLEs are only reissued
   * every few hours by NORAD, so this matches the Round-1 blueprint's
   * "every 6 hours" commitment. */
  satelliteTleFetch: 6 * 60 * 60 * 1000,
  planets: 60_000,
  constellations: Infinity, // static, computed once per session
} as const;

export const API_ENDPOINTS = {
  /** Open Notify: current ISS position. No key required. Proxying via Next.js to bypass mixed-content checks on HTTPS deployment. */
  issPosition: "/api/iss-position",
  /**
   * CelesTrak: the curated "visual" group — roughly the 100-180 brightest
   * satellites, which is exactly the set relevant to "what can I currently
   * see in the sky," as opposed to the full ~10,000-object active catalog.
   * FORMAT=tle returns plain 3-line TLE records (name + 2 element lines),
   * which feeds directly into satellite.js's twoline2satrec — no JSON
   * reshaping needed. No key required.
   */
  celestrakVisibleTle:
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle",
} as const;

/** Bodies tracked via astronomy-engine, in display order. */
export const TRACKED_PLANETS = [
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
] as const;

export const HORIZON_ALTITUDE_DEG = 0;

/** Visual magnitude cutoff — fainter stars than this are not rendered. */
export const MAGNITUDE_RENDER_LIMIT = 5.5;

export const DEFAULT_OBSERVER_ELEVATION_M = 0;

/** Hard cap on how many non-ISS satellites we render at once, to keep the
 * starfield performant per the spec's "never render excessive particles"
 * rule. The "visual" Celestrak group is already small (~150), but this
 * keeps things bounded if that group ever grows. */
export const MAX_TRACKED_SATELLITES = 60;

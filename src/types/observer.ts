/**
 * The Observer is the single source of truth for "where and when" the user
 * is looking at the sky from. Every astronomical calculation in the app
 * derives from this state — never from hardcoded coordinates.
 */

export type ApplicationMode = "selection" | "transition" | "observatory";

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  /** Meters above sea level. Defaults to 0 when unknown. */
  elevation: number;
  /** Human-readable label, e.g. "Chennai, India" */
  label: string;
  /** IANA timezone identifier, e.g. "Asia/Kolkata" */
  timezone: string;
}

export interface ObserverState {
  location: ObserverLocation | null;
  /** Always real wall-clock time unless the user enters time-control mode. */
  currentTime: Date;
  /** True while the user is scrubbing time manually instead of live mode. */
  isLiveMode: boolean;
  mode: ApplicationMode;
}

export interface HorizontalCoordinates {
  /** Degrees above (+) or below (-) the horizon. */
  altitude: number;
  /** Degrees clockwise from true north, 0-360. */
  azimuth: number;
}

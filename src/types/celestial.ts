import { HorizontalCoordinates } from "./observer";

export type CelestialObjectType =
  | "star" | "planet" | "moon" | "sun"
  | "satellite" | "iss"
  | "constellation"
  | "nebula" | "galaxy" | "comet" | "asteroid";

export type SatelliteCategory =
  | "station" | "communication" | "navigation" | "weather" | "science" | "other";

export interface CelestialObject {
  id: string;
  name: string;
  type: CelestialObjectType;
  coordinates: HorizontalCoordinates;
  magnitude?: number;
  isVisible: boolean;
  velocityKmS?: number;
  altitudeKm?: number;
  description?: string;
  /** Illuminated fraction 0-1 for the Moon */
  illumination?: number;
  /** Satellite classification, only set for type "satellite" | "iss" */
  category?: SatelliteCategory;
  lastUpdated: Date;
}

export interface StarCatalogEntry {
  id: string;
  ra: number;
  dec: number;
  magnitude: number;
  name?: string;
  colorIndex?: number;
  constellationId?: string;
}

export interface ConstellationDefinition {
  id: string;
  name: string;
  lines: Array<[string, string]>;
}

export interface IssTelemetry {
  name: "ISS";
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmS: number;
  horizontal: HorizontalCoordinates;
  isVisible: boolean;
  direction: number;
  lastUpdated: Date;
}

export interface DeepSpaceCatalogEntry {
  id: string;
  name: string;
  type: CelestialObjectType;
  /** Right ascension in hours */
  ra: number;
  /** Declination in degrees */
  dec: number;
  magnitude: number;
  description: string;
  color?: string;
}

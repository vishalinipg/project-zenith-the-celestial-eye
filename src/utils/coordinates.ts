import { ObserverLocation } from "@/types/observer";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;

/**
 * Approximates the altitude/azimuth of a point above Earth's surface
 * (given as ground lat/long + altitude in km) as seen from an observer's
 * ground position. Uses spherical trigonometry — accurate enough for
 * satellite-overhead display, not for precision orbital mechanics.
 */
export function geodeticToHorizontalApprox(
  observer: ObserverLocation,
  targetLat: number,
  targetLon: number,
  targetAltitudeKm: number
): {
  altitude: number;
  azimuth: number;
  direction: number;
  slantDistanceKm: number;
} {
  const obsLatRad = observer.latitude * DEG2RAD;
  const obsLonRad = observer.longitude * DEG2RAD;
  const tgtLatRad = targetLat * DEG2RAD;
  const tgtLonRad = targetLon * DEG2RAD;

  // Great-circle central angle between observer and target ground points.
  const deltaLon = tgtLonRad - obsLonRad;
  const centralAngle = Math.acos(
    Math.sin(obsLatRad) * Math.sin(tgtLatRad) +
      Math.cos(obsLatRad) * Math.cos(tgtLatRad) * Math.cos(deltaLon)
  );

  // Law of cosines on the triangle: Earth's center, observer, target.
  const targetRadiusKm = EARTH_RADIUS_KM + targetAltitudeKm;
  const slantDistanceKm = Math.sqrt(
    EARTH_RADIUS_KM ** 2 +
      targetRadiusKm ** 2 -
      2 * EARTH_RADIUS_KM * targetRadiusKm * Math.cos(centralAngle)
  );

  // Elevation angle above observer's local horizon.
  const altitudeRad = Math.atan2(
    (EARTH_RADIUS_KM + targetAltitudeKm) * Math.cos(centralAngle) -
      EARTH_RADIUS_KM,
    (EARTH_RADIUS_KM + targetAltitudeKm) * Math.sin(centralAngle)
  );

  // Bearing from observer to target ground point (= azimuth approximation).
  const y = Math.sin(deltaLon) * Math.cos(tgtLatRad);
  const x =
    Math.cos(obsLatRad) * Math.sin(tgtLatRad) -
    Math.sin(obsLatRad) * Math.cos(tgtLatRad) * Math.cos(deltaLon);
  const bearingRad = Math.atan2(y, x);
  const azimuth = ((bearingRad * RAD2DEG) + 360) % 360;

  return {
    altitude: altitudeRad * RAD2DEG,
    azimuth,
    direction: azimuth, // ground track bearing, reused as a direction label
    slantDistanceKm,
  };
}

/** Converts horizontal (alt/az) coordinates to a unit vector on a sky-dome,
 * for placing objects in the Three.js scene. Observer sits at the origin,
 * +Y is up (zenith), -Z is north.
 */
export function horizontalToCartesian(
  altitudeDeg: number,
  azimuthDeg: number,
  radius = 1
): [number, number, number] {
  const altRad = altitudeDeg * DEG2RAD;
  const azRad = azimuthDeg * DEG2RAD;

  const x = radius * Math.cos(altRad) * Math.sin(azRad);
  const y = radius * Math.sin(altRad);
  const z = -radius * Math.cos(altRad) * Math.cos(azRad);

  return [x, y, z];
}

export function clampMagnitudeToRenderSize(
  magnitude: number,
  minSize = 0.5,
  maxSize = 3
): number {
  // Brighter (lower/negative magnitude) stars render larger.
  const clamped = Math.max(-1.5, Math.min(6, magnitude));
  const t = 1 - (clamped + 1.5) / 7.5;
  return minSize + t * (maxSize - minSize);
}

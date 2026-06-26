import { API_ENDPOINTS } from "@/constants/config";
import { IssTelemetry } from "@/types/celestial";
import { ObserverLocation } from "@/types/observer";
import { geodeticToHorizontalApprox } from "@/utils/coordinates";

interface OpenNotifyResponse {
  message: string;
  timestamp: number;
  iss_position: {
    latitude: string;
    longitude: string;
  };
}

export class IssDataUnavailableError extends Error {
  constructor() {
    super("Orbital telemetry unavailable.");
    this.name = "IssDataUnavailableError";
  }
}

/**
 * Fetches the ISS's current ground position and converts it into
 * observer-relative horizontal coordinates.
 *
 * Open Notify only returns ground lat/long, not true orbital alt/az —
 * this is an approximation (great-circle bearing + a fixed ~408km
 * altitude assumption), good enough for "is it currently overhead /
 * roughly which direction." For a physically accurate orbital track and
 * rise/set predictions, this should be swapped for SGP4 propagation via
 * satellite.js against a fetched TLE (see celestrak/satelliteService.ts
 * for the pattern this would follow).
 */
export async function fetchIssTelemetry(
  observerLocation: ObserverLocation
): Promise<IssTelemetry> {
  let response: Response;

  try {
    response = await fetch(API_ENDPOINTS.issPosition, {
      cache: "no-store",
    });
  } catch {
    throw new IssDataUnavailableError();
  }

  if (!response.ok) {
    throw new IssDataUnavailableError();
  }

  let data: OpenNotifyResponse;
  try {
    data = (await response.json()) as OpenNotifyResponse;
  } catch {
    throw new IssDataUnavailableError();
  }

  const issLat = parseFloat(data.iss_position.latitude);
  const issLon = parseFloat(data.iss_position.longitude);

  if (Number.isNaN(issLat) || Number.isNaN(issLon)) {
    throw new IssDataUnavailableError();
  }

  const ALTITUDE_KM = 408; // typical ISS orbital altitude
  const VELOCITY_KM_S = 7.66; // typical ISS orbital velocity

  const { altitude, azimuth, direction } = geodeticToHorizontalApprox(
    observerLocation,
    issLat,
    issLon,
    ALTITUDE_KM
  );

  return {
    name: "ISS",
    latitude: issLat,
    longitude: issLon,
    altitudeKm: ALTITUDE_KM,
    velocityKmS: VELOCITY_KM_S,
    horizontal: { altitude, azimuth },
    isVisible: altitude > 0,
    direction,
    lastUpdated: new Date(data.timestamp * 1000),
  };
}

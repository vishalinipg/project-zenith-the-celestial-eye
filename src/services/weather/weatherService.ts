import { ObserverLocation } from "@/types/observer";

export interface WeatherData {
  cloudCoverPercent: number;
  visibilityM: number;
  /** WMO weather interpretation code (0 = clear sky, 1-3 = mainly clear,
   * 45/48 = fog, 51-67 = drizzle/rain, 71-77 = snow, 80-99 = showers/storm) */
  weatherCode: number;
  /** Dewpoint temperature in °C — used as a proxy for atmospheric clarity */
  dewpointC: number;
  lastUpdated: Date;
}

export class WeatherUnavailableError extends Error {
  constructor() {
    super("Weather data temporarily unavailable.");
    this.name = "WeatherUnavailableError";
  }
}

/**
 * Fetches current weather conditions from Open-Meteo's free, key-less API.
 * We request only the four variables used by the observability score —
 * this keeps the payload tiny and the request fast.
 */
export async function fetchWeather(
  location: ObserverLocation
): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", location.latitude.toFixed(4));
  url.searchParams.set("longitude", location.longitude.toFixed(4));
  url.searchParams.set(
    "current",
    "cloud_cover,visibility,weather_code,dew_point_2m"
  );
  url.searchParams.set("forecast_days", "1");

  let response: Response;
  try {
    response = await fetch(url.toString(), { cache: "no-store" });
  } catch {
    throw new WeatherUnavailableError();
  }

  if (!response.ok) throw new WeatherUnavailableError();

  let data: {
    current: {
      cloud_cover: number;
      visibility: number;
      weather_code: number;
      dew_point_2m: number;
    };
  };

  try {
    data = await response.json();
  } catch {
    throw new WeatherUnavailableError();
  }

  const c = data.current;
  if (c.cloud_cover === undefined) throw new WeatherUnavailableError();

  return {
    cloudCoverPercent: c.cloud_cover,
    visibilityM: c.visibility,
    weatherCode: c.weather_code,
    dewpointC: c.dew_point_2m,
    lastUpdated: new Date(),
  };
}

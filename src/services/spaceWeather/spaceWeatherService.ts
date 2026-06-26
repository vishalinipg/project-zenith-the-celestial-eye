export interface SpaceWeatherEvent {
  id: string;
  kind: "flare" | "cme" | "storm";
  time: string;
  headline: string;
  plainEnglish: string;
  severity: "low" | "moderate" | "high";
}

export interface SpaceWeatherResponse {
  events: SpaceWeatherEvent[];
  usingDemoKey: boolean;
  fetchedAt: string;
}

export class SpaceWeatherUnavailableError extends Error {
  constructor() {
    super("Space weather data temporarily unavailable.");
    this.name = "SpaceWeatherUnavailableError";
  }
}

export async function fetchSpaceWeather(days = 7): Promise<SpaceWeatherResponse> {
  const res = await fetch(`/api/space-weather?days=${days}`, { cache: "no-store" });
  if (!res.ok) throw new SpaceWeatherUnavailableError();
  return res.json();
}

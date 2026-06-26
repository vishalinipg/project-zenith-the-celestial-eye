import { ObserverLocation } from "@/types/observer";

export interface ShareParams {
  location: ObserverLocation;
  time: Date | null;
  satId: string | null;
}

/** Builds a shareable URL that restores the exact observatory view: location,
 * the moment in time (or "now" if live), and the currently selected object. */
export function buildShareUrl(location: ObserverLocation, time: Date, isLiveMode: boolean, selectedId: string | null): string {
  const params = new URLSearchParams();
  params.set("lat", location.latitude.toFixed(5));
  params.set("lon", location.longitude.toFixed(5));
  params.set("elev", String(location.elevation));
  params.set("label", location.label);
  params.set("tz", location.timezone);
  if (!isLiveMode) params.set("time", time.toISOString());
  if (selectedId) params.set("sat", selectedId);

  const base = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "/";
  return `${base}?${params.toString()}`;
}

/** Parses a shared deep link's query params back into a restorable view state.
 * Returns null if the URL doesn't contain a valid location (i.e. normal visit). */
export function parseShareParams(search: string): ShareParams | null {
  const params = new URLSearchParams(search);
  const lat = params.get("lat");
  const lon = params.get("lon");
  if (lat === null || lon === null) return null;

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const elevation = parseFloat(params.get("elev") ?? "0") || 0;
  const label = params.get("label") ?? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  const timezone = params.get("tz") ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const timeParam = params.get("time");
  let time: Date | null = null;
  if (timeParam) {
    const parsed = new Date(timeParam);
    if (!Number.isNaN(parsed.getTime())) time = parsed;
  }

  return {
    location: { latitude, longitude, elevation, label, timezone },
    time,
    satId: params.get("sat"),
  };
}

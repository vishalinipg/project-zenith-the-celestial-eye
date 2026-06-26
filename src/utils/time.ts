export function formatLocalTime(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toUTCString();
  }
}

export function formatLocalDate(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

export function describeSkyState(
  sunAltitudeDeg: number
): "day" | "sunset" | "twilight" | "night" {
  if (sunAltitudeDeg > 0) return "day";
  if (sunAltitudeDeg > -6) return "sunset";
  if (sunAltitudeDeg > -18) return "twilight";
  return "night";
}

"use client";

import { ObserverLocation } from "@/types/observer";
import { formatLocalDate, formatLocalTime, describeSkyState } from "@/utils/time";

interface ObserverPanelProps {
  location: ObserverLocation;
  currentTime: Date;
  sunAltitude: number;
}

const SKY_STATE_LABEL: Record<ReturnType<typeof describeSkyState>, string> = {
  day: "DAY",
  sunset: "SUNSET",
  twilight: "TWILIGHT",
  night: "NIGHT",
};

const SKY_STATE_COLOR: Record<ReturnType<typeof describeSkyState>, string> = {
  day: "#fff4d6",
  sunset: "#ffd9a0",
  twilight: "#9bb8ff",
  night: "#78c8ff",
};

/** Formats a signed decimal degree as a DMS-style cardinal string, e.g. 13.09°N */
function fmtDeg(val: number, posLabel: string, negLabel: string) {
  return `${Math.abs(val).toFixed(4)}° ${val >= 0 ? posLabel : negLabel}`;
}

/** Maps sun altitude (−90…+90) to a 0–100 progress value for the bar. */
function sunAltToProgress(alt: number) {
  return Math.round(Math.max(0, Math.min(100, ((alt + 90) / 180) * 100)));
}

export default function ObserverPanel({
  location,
  currentTime,
  sunAltitude,
}: ObserverPanelProps) {
  const skyState = describeSkyState(sunAltitude);
  const stateColor = SKY_STATE_COLOR[skyState];
  const sunPct = sunAltToProgress(sunAltitude);

  // UTC time string
  const utcTime = currentTime.toUTCString().slice(17, 25); // "HH:MM:SS"

  return (
    <div className="pointer-events-auto inline-flex flex-col px-3 py-2.5 md:px-4 md:py-3 rounded-sm bg-deep-navy/65 backdrop-blur-sm border border-soft-white/10 max-w-[200px] md:max-w-xs">
      {/* ── Section label ── */}
      <p className="text-[9px] md:text-[10px] tracking-[0.2em] text-cyan-accent/70 font-mono mb-1.5">
        OBSERVER
      </p>

      {/* ── Location name ── */}
      <p className="text-xs md:text-sm text-soft-white font-medium truncate">
        {location.label}
      </p>

      {/* ── Coordinates ── */}
      <div className="mt-1 space-y-0.5">
        <p className="text-[10px] font-mono text-soft-white/45">
          {fmtDeg(location.latitude, "N", "S")}
        </p>
        <p className="text-[10px] font-mono text-soft-white/45">
          {fmtDeg(location.longitude, "E", "W")}
        </p>
      </div>

      {/* ── Elevation ── */}
      <p className="text-[9px] font-mono text-soft-white/30 mt-0.5 tracking-wide">
        {location.elevation > 0
          ? `${location.elevation.toFixed(0)} m elev.`
          : "sea level"}
      </p>

      {/* ── Divider ── */}
      <div className="mt-2 pt-2 border-t border-soft-white/10 space-y-1">
        {/* Local time + date */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] md:text-xs font-mono text-soft-white/80">
            {formatLocalTime(currentTime, location.timezone)}
          </p>
          <p className="text-[9px] font-mono text-soft-white/30 shrink-0">
            LOCAL
          </p>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-mono text-soft-white/40">
            {utcTime}
          </p>
          <p className="text-[9px] font-mono text-soft-white/25 shrink-0">
            UTC
          </p>
        </div>

        <p className="text-[9px] font-mono text-soft-white/30 truncate hidden sm:block">
          {formatLocalDate(currentTime, location.timezone)}
        </p>
      </div>

      {/* ── Divider ── */}
      <div className="mt-2 pt-2 border-t border-soft-white/10 space-y-1.5">
        {/* Sky state badge */}
        <div className="flex items-center justify-between">
          <p className="text-[9px] md:text-[10px] font-mono uppercase tracking-wide" style={{ color: stateColor }}>
            {SKY_STATE_LABEL[skyState]}
          </p>
          <p className="text-[9px] font-mono text-soft-white/30">
            sun {sunAltitude >= 0 ? "+" : ""}{sunAltitude.toFixed(1)}°
          </p>
        </div>

        {/* Sun altitude progress bar */}
        <div className="w-full h-0.5 bg-soft-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${sunPct}%`,
              background: stateColor,
              opacity: 0.6,
            }}
          />
        </div>

        {/* Timezone */}
        <p className="text-[9px] font-mono text-soft-white/25 tracking-wide">
          {location.timezone}
        </p>
      </div>
    </div>
  );
}

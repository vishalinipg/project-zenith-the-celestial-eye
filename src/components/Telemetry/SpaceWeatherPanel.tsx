"use client";

import { useState } from "react";
import { SpaceWeatherEvent } from "@/services/spaceWeather/spaceWeatherService";

const SEVERITY_COLOR: Record<SpaceWeatherEvent["severity"], string> = {
  low: "rgba(232,237,245,0.4)",
  moderate: "#ffd9a0",
  high: "#ffb38a",
};

const KIND_LABEL: Record<SpaceWeatherEvent["kind"], string> = {
  flare: "FLARE",
  cme: "CME",
  storm: "STORM",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 1) return "<1h ago";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface SpaceWeatherPanelProps {
  events: SpaceWeatherEvent[];
  usingDemoKey: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export default function SpaceWeatherPanel({ events, usingDemoKey, isLoading, error, lastUpdated, isOpen: controlledOpen, onOpenChange, inline = false }: SpaceWeatherPanelProps & {
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
  inline?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  const highest = events.find((e) => e.severity === "high") ?? events.find((e) => e.severity === "moderate") ?? null;

  if (inline) {
    return (
      <div className="flex flex-col gap-2 px-3 py-3 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 w-full max-w-[280px]">
        <div className="flex items-center justify-between">
          <p className="text-[8px] tracking-[0.2em] text-cyan-accent/65 font-mono">LAST 7 DAYS &middot; NASA DONKI</p>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[140px] pr-1.5 scrollbar-thin">
          {isLoading && (
            <p className="text-[10px] font-mono text-soft-white/30 animate-pulse">Fetching solar activity…</p>
          )}

          {!isLoading && error && (
            <p className="text-[10px] font-mono text-soft-white/30">{error}</p>
          )}

          {!isLoading && !error && events.length === 0 && (
            <p className="text-[10px] font-mono text-soft-white/30">No notable solar activity in the last 7 days.</p>
          )}

          {!isLoading && events.map((e) => (
            <div key={e.id} className="border-t border-soft-white/8 pt-2 first:border-t-0 first:pt-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider" style={{ color: SEVERITY_COLOR[e.severity] }}>
                  {KIND_LABEL[e.kind]}
                </span>
                <span className="text-[9px] font-mono text-soft-white/30">{timeAgo(e.time)}</span>
              </div>
              <p className="text-[11px] font-mono text-soft-white/80">{e.headline}</p>
              <p className="text-[10px] text-soft-white/55 leading-snug">{e.plainEnglish}</p>
            </div>
          ))}
        </div>

        <p className="text-[8px] font-mono text-soft-white/20 pt-1 border-t border-soft-white/8">
          {usingDemoKey ? "Using NASA DEMO_KEY (rate-limited) · " : ""}
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1.5 rounded-sm border text-[9px] font-mono tracking-wider transition-all duration-200 w-full text-center bg-deep-navy/70 backdrop-blur-sm focus:outline-none text-soft-white hover:text-white ${open || highest
          ? "border-cyan-accent/50 bg-cyan-accent/10"
          : "border-soft-white/10 hover:border-soft-white/25"
          }`}
        title="Recent solar / geomagnetic activity"
      >
        SPACE WEATHER{highest ? ` · ${KIND_LABEL[highest.kind]}` : ""}
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-3 py-3 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 w-[260px]">
          <div className="flex items-center justify-between">
            <p className="text-[8px] tracking-[0.2em] text-cyan-accent/65 font-mono">LAST 7 DAYS &middot; NASA DONKI</p>
            <button onClick={() => setOpen(false)} className="text-soft-white/30 hover:text-soft-white text-xs">✕</button>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[100px] pr-1.5 scrollbar-thin">
            {isLoading && (
              <p className="text-[10px] font-mono text-soft-white/30 animate-pulse">Fetching solar activity…</p>
            )}

            {!isLoading && error && (
              <p className="text-[10px] font-mono text-soft-white/30">{error}</p>
            )}

            {!isLoading && !error && events.length === 0 && (
              <p className="text-[10px] font-mono text-soft-white/30">No notable solar activity in the last 7 days.</p>
            )}

            {!isLoading && events.map((e) => (
              <div key={e.id} className="border-t border-soft-white/8 pt-2 first:border-t-0 first:pt-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-wider" style={{ color: SEVERITY_COLOR[e.severity] }}>
                    {KIND_LABEL[e.kind]}
                  </span>
                  <span className="text-[9px] font-mono text-soft-white/30">{timeAgo(e.time)}</span>
                </div>
                <p className="text-[11px] font-mono text-soft-white/80">{e.headline}</p>
                <p className="text-[10px] text-soft-white/55 leading-snug">{e.plainEnglish}</p>
              </div>
            ))}
          </div>

          <p className="text-[8px] font-mono text-soft-white/20 pt-1 border-t border-soft-white/8">
            {usingDemoKey ? "Using NASA DEMO_KEY (rate-limited) · " : ""}
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

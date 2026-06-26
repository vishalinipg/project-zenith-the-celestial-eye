"use client";
import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { useObserverStore } from "@/stores/observerStore";
import { getSunPosition } from "@/services/astronomy/astronomyService";
import { ObserverLocation } from "@/types/observer";
import { formatLocalTime } from "@/utils/time";

const WINDOW_HOURS = 24; // the slider always spans "now - 12h .. now + 12h" around the scrub anchor
const SAMPLE_COUNT = 96; // every 15 minutes across the window

interface TimeScrubberProps {
  location: ObserverLocation;
}

/**
 * Samples sun altitude across a 24h window centered on `anchor` to build a
 * day/night gradient strip for the slider track. Pure + synchronous —
 * astronomy-engine has no network dependency, so this is cheap to recompute.
 */
function useDayNightStops(location: ObserverLocation, anchorMs: number) {
  return useMemo(() => {
    const stops: { pct: number; isDay: boolean }[] = [];
    const startMs = anchorMs - (WINDOW_HOURS / 2) * 3_600_000;
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const t = new Date(startMs + (i / SAMPLE_COUNT) * WINDOW_HOURS * 3_600_000);
      const alt = getSunPosition(location, t).coordinates.altitude;
      stops.push({ pct: (i / SAMPLE_COUNT) * 100, isDay: alt > -6 });
    }
    return stops;
  }, [location, anchorMs]);
}

function buildGradient(stops: { pct: number; isDay: boolean }[]): string {
  const segs = stops.map(
    (s) => `${s.isDay ? "rgba(120,200,255,0.28)" : "rgba(20,28,46,0.55)"} ${s.pct}%`
  );
  return `linear-gradient(90deg, ${segs.join(", ")})`;
}

export default function TimeScrubber({ location }: TimeScrubberProps) {
  const { currentTime, isLiveMode, setTime, resumeLiveMode } = useObserverStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  // Anchor stays fixed once the user starts dragging, so the window doesn't
  // shift under the cursor while live mode would otherwise march it forward.
  const [anchorMs, setAnchorMs] = useState(() => currentTime.getTime());

  useEffect(() => {
    if (isLiveMode) setAnchorMs(currentTime.getTime());
  }, [isLiveMode, currentTime]);

  const startMs = anchorMs - (WINDOW_HOURS / 2) * 3_600_000;
  const endMs = anchorMs + (WINDOW_HOURS / 2) * 3_600_000;
  const clampedTimeMs = Math.min(endMs, Math.max(startMs, currentTime.getTime()));
  const handlePct = ((clampedTimeMs - startMs) / (endMs - startMs)) * 100;

  const dayNightStops = useDayNightStops(location, anchorMs);
  const gradient = useMemo(() => buildGradient(dayNightStops), [dayNightStops]);

  const pctToDate = useCallback(
    (pct: number) => new Date(startMs + (pct / 100) * (endMs - startMs)),
    [startMs, endMs]
  );

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      setTime(pctToDate(pct));
    },
    [pctToDate, setTime]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setAnchorMs(currentTime.getTime()); // freeze window at drag start
      setDragging(true);
      updateFromClientX(e.clientX);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [currentTime, updateFromClientX]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      updateFromClientX(e.clientX);
    },
    [dragging, updateFromClientX]
  );

  const onPointerUp = useCallback(() => setDragging(false), []);

  // Hour tick labels at -12h, -6h, now/anchor, +6h, +12h
  const tickHours = [-12, -6, 0, 6, 12];

  return (
    <div className="flex flex-col gap-1 w-[280px] sm:w-[340px]">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[8px] font-mono text-soft-white/30 tracking-widest">
          {formatLocalTime(new Date(startMs), location.timezone)}
        </span>
        <span className={`text-[10px] font-mono tabular-nums transition-colors ${dragging ? "text-cyan-accent" : "text-soft-white/60"}`}>
          {formatLocalTime(currentTime, location.timezone)}
        </span>
        <span className="text-[8px] font-mono text-soft-white/30 tracking-widest">
          {formatLocalTime(new Date(endMs), location.timezone)}
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => dragging && onPointerUp()}
        className="relative h-6 rounded-sm cursor-pointer touch-none select-none border border-soft-white/10"
        style={{ background: gradient }}
      >
        {/* Hour ticks */}
        {tickHours.map((h) => {
          const pct = ((h + 12) / 24) * 100;
          return (
            <div
              key={h}
              className="absolute top-0 bottom-0 w-px bg-soft-white/15"
              style={{ left: `${pct}%` }}
            />
          );
        })}

        {/* "Now" marker (anchor) if scrubbed away from it */}
        {!isLiveMode && (
          <div
            className="absolute top-0 bottom-0 w-px bg-amber-400/50"
            style={{ left: "50%" }}
            title="Live moment"
          />
        )}

        {/* Draggable handle — visual dot stays small, but the invisible hit-area is thumb-sized */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center"
          style={{ left: `${handlePct}%` }}
        >
          <div
            className={`w-3 h-3 rounded-full border-2 transition-transform pointer-events-none ${
              dragging ? "scale-125 border-cyan-accent bg-cyan-accent" : "border-cyan-accent bg-deep-navy"
            }`}
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <p className="text-[8px] font-mono text-soft-white/20 tracking-widest">DRAG TO SCRUB ±12H</p>
        {!isLiveMode && (
          <button
            onClick={resumeLiveMode}
            className="text-[9px] font-mono text-cyan-accent/60 hover:text-cyan-accent transition-colors tracking-widest"
          >
            ↺ RETURN TO LIVE
          </button>
        )}
      </div>
    </div>
  );
}

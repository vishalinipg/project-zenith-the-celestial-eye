"use client";
import { useObserverStore, TimeRate } from "@/stores/observerStore";
import { ObserverLocation } from "@/types/observer";
import TimeScrubber from "./TimeScrubber";

type SpeedDef = { label: string; rate: TimeRate; rewind?: boolean };

const SPEEDS: SpeedDef[] = [
  { label: "◀◀ 1h", rate: -3600, rewind: true },
  { label: "◀ 1m", rate: -60, rewind: true },
  { label: "▶ 1m", rate: 60 },
  { label: "▶▶ 1h", rate: 3600 },
];

function formatTimeDelta(rate: TimeRate, isPaused: boolean): string {
  if (isPaused || rate === 0) return "PAUSED";
  if (rate === 1) return "LIVE";
  const abs = Math.abs(rate);
  const dir = rate < 0 ? "◀ " : "▶ ";
  if (abs >= 3600) return `${dir}${abs / 3600}h/s`;
  if (abs >= 60) return `${dir}${abs / 60}m/s`;
  return `${dir}${abs}×`;
}

export default function TimeControls({ location }: { location: ObserverLocation }) {
  const { isPaused, timeRate, isLiveMode, setTimeRate, resumeLiveMode } = useObserverStore();

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 px-3 py-2.5 rounded-sm
                    bg-deep-navy/85 backdrop-blur-md border border-soft-white/10">
      {/* Status */}
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isLiveMode && !isPaused ? "bg-cyan-accent animate-pulse" : "bg-soft-white/20"}`} />
        <span className="text-[9px] font-mono text-soft-white/50 tracking-widest min-w-[80px] text-center">
          {formatTimeDelta(timeRate, isPaused)}
        </span>
      </div>

      {/* Scrub slider */}
      <TimeScrubber location={location} />

      {/* Controls row */}
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-sm bg-soft-white/[0.03] border border-soft-white/8">
        {/* Rewind speeds */}
        {SPEEDS.filter((s) => s.rewind).map((s) => (
          <button key={s.rate} onClick={() => setTimeRate(s.rate)}
            className={`px-2 py-1 text-[10px] font-mono rounded-sm border transition-colors duration-150 ${
              timeRate === s.rate && !isPaused
                ? "border-amber-400/60 text-amber-400 bg-amber-400/10"
                : "border-soft-white/10 text-soft-white/35 hover:border-soft-white/25 hover:text-soft-white/60"
            }`}>
            {s.label}
          </button>
        ))}

        {/* Pause / Play */}
        <button
          onClick={() => setTimeRate(isPaused ? 1 : 0)}
          className="mx-1 w-7 h-7 flex items-center justify-center rounded-sm border border-soft-white/15
                     text-soft-white/60 hover:text-soft-white hover:border-cyan-accent/40 transition-colors">
          {isPaused ? (
            <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor"><polygon points="2,1 9,5 2,9" /></svg>
          ) : (
            <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor">
              <rect x="1.5" y="1" width="2.5" height="8" /><rect x="6" y="1" width="2.5" height="8" />
            </svg>
          )}
        </button>

        {/* Forward speeds */}
        {SPEEDS.filter((s) => !s.rewind).map((s) => (
          <button key={s.rate} onClick={() => setTimeRate(s.rate)}
            className={`px-2 py-1 text-[10px] font-mono rounded-sm border transition-colors duration-150 ${
              timeRate === s.rate && !isPaused
                ? "border-cyan-accent/60 text-cyan-accent bg-cyan-accent/10"
                : "border-soft-white/10 text-soft-white/35 hover:border-soft-white/25 hover:text-soft-white/60"
            }`}>
            {s.label}
          </button>
        ))}

        {/* LIVE reset */}
        <button onClick={resumeLiveMode}
          className={`ml-1 px-2 py-1 text-[10px] font-mono rounded-sm border transition-colors duration-150 ${
            isLiveMode && !isPaused
              ? "border-cyan-accent/40 text-cyan-accent/70"
              : "border-soft-white/10 text-soft-white/30 hover:border-cyan-accent/30 hover:text-cyan-accent/50"
          }`}>
          LIVE
        </button>
      </div>

      <p className="text-[8px] font-mono text-soft-white/20 tracking-widest">SKY TIME MACHINE</p>
    </div>
  );
}

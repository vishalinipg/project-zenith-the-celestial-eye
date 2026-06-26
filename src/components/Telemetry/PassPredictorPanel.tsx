"use client";

import { useState, useEffect, useMemo } from "react";
import { SatellitePass } from "@/services/celestrak/passPredictionService";
import { ObserverLocation } from "@/types/observer";
import { downloadPassIcs } from "@/utils/icsExport";

const CARDINAL = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N"];
function cardinal(az: number): string {
  return CARDINAL[Math.round(az / 22.5)] ?? "N";
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `in ${days}d ${hrs % 24}h`;
  if (hrs > 0) return `in ${hrs}h ${totalMin % 60}m`;
  return `in ${totalMin}m`;
}

function qualityLabel(pass: SatellitePass): { label: string; color: string } {
  if (!pass.isVisible) return { label: "Daylight — not visible", color: "rgba(232,237,245,0.3)" };
  if (pass.maxElevationDeg >= 60) return { label: "Excellent pass", color: "#78C8FF" };
  if (pass.maxElevationDeg >= 30) return { label: "Good pass", color: "#9bb8ff" };
  return { label: "Low pass", color: "#ffd9a0" };
}

const CHART_W = 232;
const CHART_H = 56;

function ElevationChart({ pass }: { pass: SatellitePass }) {
  if (pass.track.length < 2) return null;
  const points = pass.track.map((p, i) => {
    const x = (i / (pass.track.length - 1)) * CHART_W;
    const y = CHART_H - (Math.max(0, p.elevationDeg) / 90) * CHART_H;
    return { x, y, p };
  });
  const linePath = points.map((pt) => `${pt.x},${pt.y}`).join(" ");
  const areaPath = `0,${CHART_H} ${linePath} ${CHART_W},${CHART_H}`;
  const maxPt = points.reduce((a, b) => (b.p.elevationDeg > a.p.elevationDeg ? b : a));

  return (
    <svg width={CHART_W} height={CHART_H + 14} viewBox={`0 0 ${CHART_W} ${CHART_H + 14}`} className="block">
      {/* Horizon baseline */}
      <line x1="0" y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="rgba(232,237,245,0.15)" strokeWidth="1" />
      <polygon points={areaPath} fill="rgba(120,200,255,0.12)" />
      <polyline points={linePath} fill="none" stroke="#78c8ff" strokeWidth="1.5" />
      <circle cx={maxPt.x} cy={maxPt.y} r="2.5" fill="#78c8ff" />
      <text x={maxPt.x} y={Math.max(9, maxPt.y - 5)} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#78c8ff">
        {maxPt.p.elevationDeg.toFixed(0)}°
      </text>
      <text x="2" y={CHART_H + 11} fontSize="8" fontFamily="monospace" fill="rgba(232,237,245,0.3)">rise</text>
      <text x={CHART_W - 2} y={CHART_H + 11} textAnchor="end" fontSize="8" fontFamily="monospace" fill="rgba(232,237,245,0.3)">set</text>
    </svg>
  );
}

interface PassPredictorPanelProps {
  passes: SatellitePass[];
  isLoading: boolean;
  error: string | null;
  location: ObserverLocation;
}

export default function PassPredictorPanel({ passes, isLoading, error, location, isOpen: controlledOpen, onOpenChange, inline = false }: PassPredictorPanelProps & {
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
  const [now, setNow] = useState(() => new Date());
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, [open]);

  const upcoming = useMemo(
    () => passes.filter((p) => p.setTime.getTime() > now.getTime()).slice(0, 6),
    [passes, now]
  );
  const nextVisible = upcoming.find((p) => p.isVisible);

  if (inline) {
    return (
      <div className="flex flex-col gap-2 px-3 py-3 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 w-full max-w-[280px]">
        <div className="flex items-center justify-between">
          <p className="text-[8px] tracking-[0.2em] text-cyan-accent/65 font-mono">NEXT 72H · {location.label.toUpperCase()}</p>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[140px] pr-1.5 scrollbar-thin">
          {isLoading && (
            <p className="text-[10px] font-mono text-soft-white/30 animate-pulse">Calculating orbital passes…</p>
          )}

          {!isLoading && error && (
            <p className="text-[10px] font-mono text-soft-white/30">{error}</p>
          )}

          {!isLoading && !error && upcoming.length === 0 && (
            <p className="text-[10px] font-mono text-soft-white/30">No ISS passes above 10° in the next 72 hours.</p>
          )}

          {!isLoading && upcoming.map((pass, i) => {
            const q = qualityLabel(pass);
            const isExpanded = expandedIdx === i;
            return (
              <div key={i} className="border-t border-soft-white/8 pt-2 first:border-t-0 first:pt-0 space-y-1">
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedIdx((cur) => (cur === i ? null : i))}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-soft-white/80">
                      {pass.riseTime.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: q.color }}>{q.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono text-soft-white/50">
                    <span>Rise {pass.riseTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })} {cardinal(pass.riseAzimuthDeg)}</span>
                    <span>Set {pass.setTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })} {cardinal(pass.setAzimuthDeg)}</span>
                    <span>Max alt {pass.maxElevationDeg.toFixed(0)}°</span>
                    <span>{pass.durationSec}s duration</span>
                  </div>
                  <p className="text-[9px] font-mono text-cyan-accent/50">{formatCountdown(pass.riseTime.getTime() - now.getTime())}</p>
                </button>

                {isExpanded && (
                  <div className="pt-1 space-y-1.5">
                    <ElevationChart pass={pass} />
                    <button
                      onClick={() => downloadPassIcs(pass, location.label)}
                      className="px-2 py-1 rounded-sm border border-cyan-accent/30 text-cyan-accent/80 text-[9px] font-mono tracking-wider hover:bg-cyan-accent/10 transition-colors w-full text-center"
                    >
                      ADD TO CALENDAR (.ics)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[8px] font-mono text-soft-white/20 pt-1 border-t border-soft-white/8">
          SGP4 propagation · visible passes require observer darkness + sunlit station
        </p>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1.5 rounded-sm border text-[9px] font-mono tracking-wider transition-all duration-200 w-full text-center bg-deep-navy/70 backdrop-blur-sm focus:outline-none text-soft-white hover:text-white ${open || nextVisible
          ? "border-cyan-accent/50 bg-cyan-accent/10"
          : "border-soft-white/10 hover:border-soft-white/25"
          }`}
        title="Upcoming ISS passes"
      >
        ISS PASSES{nextVisible ? ` · ${formatCountdown(nextVisible.riseTime.getTime() - now.getTime())}` : ""}
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-3 py-3 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 w-[260px]">
          <div className="flex items-center justify-between">
            <p className="text-[8px] tracking-[0.2em] text-cyan-accent/65 font-mono">NEXT 72H · {location.label.toUpperCase()}</p>
            <button onClick={() => setOpen(false)} className="text-soft-white/30 hover:text-soft-white text-xs">✕</button>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[100px] pr-1.5 scrollbar-thin">
            {isLoading && (
              <p className="text-[10px] font-mono text-soft-white/30 animate-pulse">Calculating orbital passes…</p>
            )}

            {!isLoading && error && (
              <p className="text-[10px] font-mono text-soft-white/30">{error}</p>
            )}

            {!isLoading && !error && upcoming.length === 0 && (
              <p className="text-[10px] font-mono text-soft-white/30">No ISS passes above 10° in the next 72 hours.</p>
            )}

            {!isLoading && upcoming.map((pass, i) => {
              const q = qualityLabel(pass);
              const isExpanded = expandedIdx === i;
              return (
                <div key={i} className="border-t border-soft-white/8 pt-2 first:border-t-0 first:pt-0 space-y-1">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedIdx((cur) => (cur === i ? null : i))}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-soft-white/80">
                        {pass.riseTime.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: q.color }}>{q.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono text-soft-white/50">
                      <span>Rise {pass.riseTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })} {cardinal(pass.riseAzimuthDeg)}</span>
                      <span>Set {pass.setTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })} {cardinal(pass.setAzimuthDeg)}</span>
                      <span>Max alt {pass.maxElevationDeg.toFixed(0)}°</span>
                      <span>{pass.durationSec}s duration</span>
                    </div>
                    <p className="text-[9px] font-mono text-cyan-accent/50">{formatCountdown(pass.riseTime.getTime() - now.getTime())}</p>
                  </button>

                  {isExpanded && (
                    <div className="pt-1 space-y-1.5">
                      <ElevationChart pass={pass} />
                      <button
                        onClick={() => downloadPassIcs(pass, location.label)}
                        className="px-2 py-1 rounded-sm border border-cyan-accent/30 text-cyan-accent/80 text-[9px] font-mono tracking-wider hover:bg-cyan-accent/10 transition-colors w-full text-center"
                      >
                        ADD TO CALENDAR (.ics)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[8px] font-mono text-soft-white/20 pt-1 border-t border-soft-white/8">
            SGP4 propagation · visible passes require observer darkness + sunlit station
          </p>
        </div>
      )}
    </div>
  );
}

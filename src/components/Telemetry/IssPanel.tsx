"use client";

import { IssTelemetry } from "@/types/celestial";

interface IssPanelProps {
  telemetry: IssTelemetry | null;
  error: string | null;
}

export default function IssPanel({ telemetry, error }: IssPanelProps) {
  if (error && !telemetry) {
    return (
      <div className="pointer-events-auto px-3 py-2 rounded-sm bg-deep-navy/60 backdrop-blur-sm border border-soft-white/10">
        <p className="text-[10px] font-mono text-soft-white/40">{error}</p>
      </div>
    );
  }

  if (!telemetry) return null;

  return (
    <div className="pointer-events-auto px-3 py-2.5 md:px-4 md:py-2.5 rounded-sm bg-deep-navy/65 backdrop-blur-sm border border-soft-white/10 max-w-[300px] md:max-w-none">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${telemetry.isVisible ? "bg-cyan-accent" : "bg-soft-white/20"}`} />
        <p className="text-[9px] md:text-[10px] tracking-[0.15em] text-cyan-accent/70 font-mono">
          ISS
        </p>
        {telemetry.isVisible && (
          <span className="text-[9px] font-mono text-cyan-accent/50">OVERHEAD</span>
        )}
      </div>
      {/* On mobile: 2 columns; on desktop: single row */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-x-4 gap-y-1 text-[10px] md:text-[11px] font-mono text-soft-white/70">
        <span>ALT {telemetry.altitudeKm.toFixed(0)} km</span>
        <span>VEL {telemetry.velocityKmS.toFixed(2)} km/s</span>
        <span>LAT {telemetry.latitude.toFixed(2)}°</span>
        <span>LON {telemetry.longitude.toFixed(2)}°</span>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { CelestialObject } from "@/types/celestial";
import { WeatherData } from "@/services/weather/weatherService";
import {
  computeObservability,
  ObservabilityBreakdown,
} from "@/services/observability/observabilityService";

interface ObservabilityPanelProps {
  weather: WeatherData | null;
  celestialObjects: CelestialObject[];
  weatherError: string | null;
}

const SCORE_COLOR: Record<ObservabilityBreakdown["label"], string> = {
  Excellent: "#78c8ff",
  Good: "#9bb8ff",
  Fair: "#fff4d6",
  Poor: "#ffd9a0",
  Unsuitable: "#ffb38a",
};

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Slight rain", 63: "Rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Snow", 75: "Heavy snow",
  80: "Showers", 81: "Heavy showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Heavy thunderstorm",
};

export default function ObservabilityPanel({
  weather,
  celestialObjects,
  weatherError,
}: ObservabilityPanelProps) {
  const breakdown = useMemo(() => {
    if (!weather) return null;
    return computeObservability(weather, celestialObjects);
  }, [weather, celestialObjects]);

  if (weatherError && !weather) {
    return (
      <div className="pointer-events-auto px-4 py-2.5 rounded-sm bg-deep-navy/60 backdrop-blur-sm border border-soft-white/10">
        <p className="text-[11px] font-mono text-soft-white/40">{weatherError}</p>
      </div>
    );
  }

  if (!breakdown) return null;

  const scoreColor = SCORE_COLOR[breakdown.label];
  const weatherDesc = WMO_DESCRIPTIONS[weather!.weatherCode] ?? "Unknown";
  const circumference = 2 * Math.PI * 20;
  const offset = circumference * (1 - breakdown.score / 100);

  return (
    <div className="pointer-events-auto px-3 py-2.5 md:px-4 md:py-3 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 w-44 md:w-56">
      <p className="text-[10px] tracking-[0.2em] text-cyan-accent/70 font-mono mb-2">
        OBSERVABILITY
      </p>

      {/* Score ring */}
      <div className="flex items-center gap-3 mb-2.5">
        <svg width="52" height="52" className="shrink-0">
          {/* Track */}
          <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(232,237,245,0.08)" strokeWidth="3.5" />
          {/* Progress */}
          <circle
            cx="26"
            cy="26"
            r="20"
            fill="none"
            stroke={scoreColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 26 26)"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
          <text x="26" y="26" dominantBaseline="middle" textAnchor="middle"
            fill={scoreColor} fontSize="13" fontFamily="monospace" fontWeight="600">
            {breakdown.score}
          </text>
        </svg>
        <div>
          <p className="text-sm font-medium" style={{ color: scoreColor }}>
            {breakdown.label}
          </p>
          <p className="text-[10px] font-mono text-soft-white/40 mt-0.5">
            {weatherDesc}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-soft-white/60 mb-2">{breakdown.description}</p>

      {/* Score breakdown — hidden on mobile to save space */}
      <div className="hidden md:block space-y-1 border-t border-soft-white/10 pt-2">
        <ScoreRow label="Weather" score={breakdown.weatherScore} max={40} />
        <ScoreRow label="Moon" score={breakdown.moonScore} max={30} />
        <ScoreRow label="Darkness" score={breakdown.darknessScore} max={30} />
      </div>

      {/* Compact weather stats */}
      <div className="mt-2 pt-2 border-t border-soft-white/10 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-mono text-soft-white/40">
        <span>Cloud {weather!.cloudCoverPercent}%</span>
        <span>Vis {(weather!.visibilityM / 1000).toFixed(0)} km</span>
      </div>
    </div>
  );
}

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-soft-white/40 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-0.5 bg-soft-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-accent/50 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-soft-white/40 w-8 text-right">
        {score}/{max}
      </span>
    </div>
  );
}

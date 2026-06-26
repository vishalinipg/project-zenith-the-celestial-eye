"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { CelestialObject } from "@/types/celestial";
import { useAppStore } from "@/stores/appStore";

interface SkyMapPanelProps {
  celestialObjects: CelestialObject[];
  passArc?: { azimuth: number; altitude: number }[] | null;
}

// ── Layout constants ──────────────────────────────────────────────────────────
const SIZE = 200;          // SVG canvas size px
const CX = SIZE / 2;       // 100
const CY = SIZE / 2;       // 100
const RADIUS = 86;         // disc radius — leaves 14px margin inside SVG on each side

// ── Color palette matching the rest of the UI ─────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  sun: "#fff4d6",
  moon: "#e8edf5",
  planet: "#9bb8ff",
  iss: "#78c8ff",
  satellite: "#ffd9a0",
  star: "#e8edf5",
  comet: "#ffb38a",
  asteroid: "#ffb38a",
  constellation: "#78c8ff",
  nebula: "#9bb8ff",
  galaxy: "#9bb8ff",
};

/**
 * Projects altitude + azimuth onto the 2D horizon disc.
 * - Zenith (alt = 90°) → center
 * - Horizon (alt = 0°) → outer ring
 * - azimuth 0° (N) → top of disc
 */
function project(altitude: number, azimuth: number) {
  const r = RADIUS * Math.max(0, 1 - Math.max(0, altitude) / 90);
  const theta = (azimuth - 90) * (Math.PI / 180); // 0° N = top = -π/2
  return {
    x: CX + r * Math.cos(theta),
    y: CY + r * Math.sin(theta),
  };
}

/**
 * Builds the SVG path for the view-cone footprint drawn on the horizon disc.
 * The observer is at altitude 0 looking at (heading, cameraAlt).
 * We approximate the FOV footprint as an ellipse/sector on the disc.
 *
 * Strategy: sample a ring of points around the view direction at angular
 * distance = half-FOV, project each onto the disc, and draw a closed polygon.
 */
function buildViewCone(
  headingDeg: number,
  cameraAltDeg: number,
  fovDeg: number
): string {
  const halfFov = fovDeg / 2;
  const points: string[] = [];
  const STEPS = 36;
  for (let i = 0; i <= STEPS; i++) {
    const phi = (i / STEPS) * 2 * Math.PI; // angle around the cone rim

    // Rotate a vector (halfFov away from the view direction) around the view axis
    // using a simple spherical approximation
    const az = headingDeg + halfFov * Math.cos(phi);
    const alt = cameraAltDeg + halfFov * Math.sin(phi);

    // Clamp to valid sky range
    const clampedAlt = Math.max(-15, Math.min(90, alt));
    const { x, y } = project(clampedAlt, az);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SkyMapPanel({ celestialObjects, passArc }: SkyMapPanelProps) {
  const selectedId = useAppStore((s) => s.selectedObjectId);
  const selectObject = useAppStore((s) => s.selectObject);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Live camera state from zenith-heading event
  const [camHeading, setCamHeading] = useState(0);
  const [camAltitude, setCamAltitude] = useState(0);
  const [camFov, setCamFov] = useState(70);
  const animHeading = useRef(0);
  const animAlt = useRef(0);
  const targetHeading = useRef(0);
  const targetAlt = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ heading: number; altitude: number; fov: number }>).detail;
      targetHeading.current = d.heading;
      targetAlt.current = d.altitude ?? 0;
      setCamFov(d.fov ?? 70);
    };
    document.addEventListener("zenith-heading", handler);
    return () => document.removeEventListener("zenith-heading", handler);
  }, []);

  // Smooth lerp on heading + altitude
  useEffect(() => {
    function tick() {
      // Shortest-path lerp for heading (across 0/360 boundary)
      const dh = ((targetHeading.current - animHeading.current + 540) % 360) - 180;
      animHeading.current = (animHeading.current + dh * 0.12 + 360) % 360;

      const da = targetAlt.current - animAlt.current;
      animAlt.current += da * 0.12;

      setCamHeading(animHeading.current);
      setCamAltitude(animAlt.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Plot everything above (or just below for context) the horizon.
  // Constellations are centre-point only (they have az/alt coords from DeepSpaceObjects).
  const plottable = useMemo(
    () =>
      celestialObjects.filter(
        (o) => o.coordinates.altitude > -5
      ),
    [celestialObjects]
  );

  const hovered = plottable.find((o) => o.id === hoverId) ?? null;
  const headingRounded = Math.round(camHeading);

  // View cone polygon points
  const conePath = buildViewCone(camHeading, camAltitude, camFov);

  // Cardinal label positions — strictly inside the disc with tight padding
  const labelR = RADIUS - 9; // keeps labels inside the circle
  const cardinals = [
    { label: "N", angle: 0, color: "#78c8ff" },
    { label: "E", angle: 90, color: "rgba(232,237,245,0.45)" },
    { label: "S", angle: 180, color: "rgba(232,237,245,0.45)" },
    { label: "W", angle: 270, color: "rgba(232,237,245,0.45)" },
  ].map(({ label, angle, color }) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      label,
      color,
      x: CX + labelR * Math.cos(rad),
      y: CY + labelR * Math.sin(rad),
    };
  });

  return (
    <div className="pointer-events-auto px-3 py-2.5 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] tracking-[0.2em] text-cyan-accent/70 font-mono">SKY MAP</p>
        <p className="text-[9px] font-mono text-soft-white/30">
          {hovered ? hovered.name : `${String(headingRounded).padStart(3, "0")}° · ${Math.round(camAltitude)}° alt`}
        </p>
      </div>

      {/* SVG disc — all labels are inside the viewBox, clipped to disc */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block"
        style={{ overflow: "visible" }}  // allow nothing to escape
      >
        <defs>
          {/* Clip everything to the disc */}
          <clipPath id="discClip">
            <circle cx={CX} cy={CY} r={RADIUS} />
          </clipPath>
          {/* Radial gradient for disc fill */}
          <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#78C8FF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#78C8FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Disc background */}
        <circle cx={CX} cy={CY} r={RADIUS} fill="url(#discGrad)" />
        <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="rgba(232,237,245,0.12)" strokeWidth="1" />

        {/* Altitude rings: 30° and 60° */}
        {[30, 60].map((alt) => (
          <circle key={alt}
            cx={CX} cy={CY}
            r={RADIUS * (1 - alt / 90)}
            fill="none" stroke="rgba(232,237,245,0.07)" strokeWidth="0.8" strokeDasharray="3 4"
          />
        ))}

        {/* Cardinal cross-hair lines — clipped inside disc */}
        <g clipPath="url(#discClip)">
          <line x1={CX} y1={CY - RADIUS} x2={CX} y2={CY + RADIUS} stroke="rgba(232,237,245,0.06)" />
          <line x1={CX - RADIUS} y1={CY} x2={CX + RADIUS} y2={CY} stroke="rgba(232,237,245,0.06)" />
        </g>

        {/* ── View cone — shows what the observer is currently looking at ── */}
        <polygon
          clipPath="url(#discClip)"
          points={conePath}
          fill="rgba(120,200,255,0.07)"
          stroke="rgba(120,200,255,0.25)"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* View-direction center cross */}
        {(() => {
          const { x, y } = project(camAltitude, camHeading);
          return (
            <g>
              <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke="#78c8ff" strokeWidth="1" opacity="0.6" />
              <line x1={x} y1={y - 5} x2={x} y2={y + 5} stroke="#78c8ff" strokeWidth="1" opacity="0.6" />
              <circle cx={x} cy={y} r="2.5" fill="none" stroke="#78c8ff" strokeWidth="0.8" opacity="0.5" />
            </g>
          );
        })()}

        {/* Pass arc */}
        {passArc && passArc.length > 1 && (
          <polyline
            clipPath="url(#discClip)"
            points={passArc
              .filter((p) => p.altitude >= 0)
              .map((p) => {
                const { x, y } = project(p.altitude, p.azimuth);
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#78c8ff"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.6"
          />
        )}

        {/* ── Celestial objects ── */}
        {plottable.map((o) => {
          const { x, y } = project(o.coordinates.altitude, o.coordinates.azimuth);
          const isSelected = o.id === selectedId;
          const isBelow = o.coordinates.altitude < 0;
          const baseColor = TYPE_COLOR[o.type] ?? "#e8edf5";

          // Visual weight by type
          const isDeepSky = ["nebula", "galaxy", "constellation", "star"].includes(o.type);
          const isPrimary = ["sun", "moon", "planet", "iss"].includes(o.type);
          const r = o.type === "sun" ? 6
            : o.type === "moon" ? 5
            : o.type === "iss" ? 4
            : o.type === "planet" ? 3.5
            : o.type === "satellite" ? 2.5
            : isDeepSky ? 2
            : 2.5;
          const baseOpacity = isPrimary ? 1 : isDeepSky ? 0.55 : 0.75;

          return (
            <g
              key={o.id}
              onClick={() => selectObject(o)}
              onMouseEnter={() => setHoverId(o.id)}
              onMouseLeave={() => setHoverId((id) => (id === o.id ? null : id))}
              className="cursor-pointer"
              opacity={isBelow ? 0.2 : baseOpacity}
            >
              {isSelected && (
                <circle cx={x} cy={y} r={r + 5} fill="none" stroke={baseColor} strokeWidth="1" opacity="0.5" />
              )}
              {/* Deep sky objects rendered as a small diamond ◇ shape */}
              {isDeepSky && !isSelected ? (
                <polygon
                  points={`${x},${y - r * 1.4} ${x + r},${y} ${x},${y + r * 1.4} ${x - r},${y}`}
                  fill={baseColor}
                  opacity="0.7"
                />
              ) : (
                <circle
                  cx={x} cy={y} r={isSelected ? r + 2 : r}
                  fill={isSelected ? "transparent" : baseColor}
                  stroke={isSelected ? baseColor : "none"}
                  strokeWidth={isSelected ? 1.5 : 0}
                />
              )}
              {isSelected && <circle cx={x} cy={y} r={r} fill={baseColor} />}
            </g>
          );
        })}

        {/* ── Cardinal labels — INSIDE the disc, never clipped ── */}
        {cardinals.map(({ label, x, y, color }) => (
          <text
            key={label}
            x={x} y={y}
            dominantBaseline="middle" textAnchor="middle"
            fontFamily="monospace" fontSize="9" fontWeight="700"
            fill={color}
            letterSpacing="0.05em"
          >
            {label}
          </text>
        ))}

        {/* Zenith dot */}
        <circle cx={CX} cy={CY} r="1.5" fill="rgba(232,237,245,0.35)" />
      </svg>

      {/* Footer */}
      <p className="text-[9px] font-mono text-soft-white/20 text-center mt-1.5">
        center = zenith · edge = horizon · <span style={{ color: "rgba(120,200,255,0.5)" }}>◈ view</span>
      </p>
    </div>
  );
}

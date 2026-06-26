"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sky Compass — top-right corner.
 * - Outer ring with cardinal (N/E/S/W) and inter-cardinal labels, no tick marks
 *   overlapping letters.
 * - Inner rotating needle arrow that responds to the camera heading broadcast
 *   by SkyScene via the "zenith-heading" custom event.
 * - Matches the observatory UI card style.
 */
export default function CompassWidget() {
  const [heading, setHeading] = useState(0);            // degrees camera is facing
  const animRef = useRef(0);                            // current animated heading
  const targetRef = useRef(0);                          // target heading
  const rafRef = useRef<number | null>(null);

  // Subscribe to SkyScene's heading broadcast
  useEffect(() => {
    const handler = (e: Event) => {
      const deg = (e as CustomEvent<{ heading: number }>).detail.heading;
      targetRef.current = deg;
    };
    document.addEventListener("zenith-heading", handler);
    return () => document.removeEventListener("zenith-heading", handler);
  }, []);

  // Smooth lerp animation loop
  useEffect(() => {
    function tick() {
      const current = animRef.current;
      let target = targetRef.current;

      // Shortest-path interpolation across 0/360 boundary
      let delta = ((target - current + 540) % 360) - 180;
      const next = current + delta * 0.12;
      animRef.current = (next + 360) % 360;

      setHeading(animRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const SIZE = 104;
  const CX = SIZE / 2;   // 52
  const CY = SIZE / 2;   // 52
  const RING_R = 46;     // outer ring radius
  const LABEL_R = 36;    // cardinal label radius — inside the ring, clear of ticks
  const TICK_OUTER = 46; // tick starts at the ring
  const TICK_INNER_CARD = 40;   // cardinal tick length
  const TICK_INNER_INTER = 43;  // inter-cardinal tick length

  const cardinals = [
    { label: "N", angle: 0 },
    { label: "E", angle: 90 },
    { label: "S", angle: 180 },
    { label: "W", angle: 270 },
  ];

  const intercardinals = [
    { label: "NE", angle: 45 },
    { label: "SE", angle: 135 },
    { label: "SW", angle: 225 },
    { label: "NW", angle: 315 },
  ];

  // Degree display: round to nearest 5° and show cardinal name if close
  const headingRounded = Math.round(heading);
  const cardinalName =
    headingRounded < 23 || headingRounded >= 338 ? "N" :
    headingRounded < 68 ? "NE" :
    headingRounded < 113 ? "E" :
    headingRounded < 158 ? "SE" :
    headingRounded < 203 ? "S" :
    headingRounded < 248 ? "SW" :
    headingRounded < 293 ? "W" : "NW";

  // The rose ring rotates opposite to heading so fixed labels face correct direction
  const roseRotation = -heading;

  return (
    <div className="pointer-events-none select-none inline-block">
      {/* Card shell — matches ObserverPanel / ObservabilityPanel */}
      <div className="px-2.5 py-2 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10">

        {/* Section label */}
        <p className="text-[9px] tracking-[0.2em] text-cyan-accent/70 font-mono mb-2">
          SKY COMPASS
        </p>

        {/* Rose wrapper — fixed size */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: SIZE, height: SIZE }}
        >
          {/* ── Rotating rose ring (labels + ticks spin with camera inverse) ── */}
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute inset-0"
            style={{
              transform: `rotate(${roseRotation}deg)`,
              transition: "transform 0ms linear",
              transformOrigin: "center",
            }}
          >
            {/* Outer ring */}
            <circle cx={CX} cy={CY} r={RING_R}
              fill="none" stroke="rgba(232,237,245,0.12)" strokeWidth="1" />

            {/* Cardinal tick marks — short, at the rim, NOT overlapping labels */}
            {cardinals.map(({ angle }) => {
              const rad = (angle - 90) * (Math.PI / 180);
              return (
                <line key={angle}
                  x1={CX + TICK_OUTER * Math.cos(rad)} y1={CY + TICK_OUTER * Math.sin(rad)}
                  x2={CX + TICK_INNER_CARD * Math.cos(rad)} y2={CY + TICK_INNER_CARD * Math.sin(rad)}
                  stroke={angle === 0 ? "#78C8FF" : "rgba(232,237,245,0.45)"}
                  strokeWidth={angle === 0 ? 1.8 : 1.2}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Inter-cardinal tick marks */}
            {intercardinals.map(({ angle }) => {
              const rad = (angle - 90) * (Math.PI / 180);
              return (
                <line key={angle}
                  x1={CX + TICK_OUTER * Math.cos(rad)} y1={CY + TICK_OUTER * Math.sin(rad)}
                  x2={CX + TICK_INNER_INTER * Math.cos(rad)} y2={CY + TICK_INNER_INTER * Math.sin(rad)}
                  stroke="rgba(232,237,245,0.22)" strokeWidth="0.8" strokeLinecap="round"
                />
              );
            })}

            {/* Cardinal labels — placed INSIDE the ring so ticks never hide them */}
            {cardinals.map(({ label, angle }) => {
              const rad = (angle - 90) * (Math.PI / 180);
              return (
                <text key={label}
                  x={CX + LABEL_R * Math.cos(rad)}
                  y={CY + LABEL_R * Math.sin(rad)}
                  dominantBaseline="middle" textAnchor="middle"
                  fontFamily="monospace" fontSize="10" fontWeight="700"
                  fill={label === "N" ? "#78C8FF" : "rgba(232,237,245,0.65)"}
                  letterSpacing="0.05em"
                >
                  {label}
                </text>
              );
            })}

            {/* Inter-cardinal labels */}
            {intercardinals.map(({ label, angle }) => {
              const rad = (angle - 90) * (Math.PI / 180);
              return (
                <text key={label}
                  x={CX + (LABEL_R - 2) * Math.cos(rad)}
                  y={CY + (LABEL_R - 2) * Math.sin(rad)}
                  dominantBaseline="middle" textAnchor="middle"
                  fontFamily="monospace" fontSize="6.5"
                  fill="rgba(232,237,245,0.28)"
                >
                  {label}
                </text>
              );
            })}
          </svg>

          {/* ── Static needle arrow — always points toward current view heading ── */}
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute inset-0"
          >
            {/* Subtle glow behind needle */}
            <defs>
              <radialGradient id="needleGlow" cx="50%" cy="30%" r="40%">
                <stop offset="0%" stopColor="#78C8FF" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#78C8FF" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={CX} cy={CY} r="22" fill="url(#needleGlow)" />

            {/* North half of needle — cyan */}
            <polygon
              points={`${CX},${CY - 26} ${CX - 5},${CY + 4} ${CX + 5},${CY + 4}`}
              fill="#78C8FF"
              opacity="0.90"
            />
            {/* South half of needle — dimmed white */}
            <polygon
              points={`${CX},${CY + 26} ${CX - 5},${CY - 4} ${CX + 5},${CY - 4}`}
              fill="rgba(232,237,245,0.28)"
            />
            {/* Center cap */}
            <circle cx={CX} cy={CY} r="3.5"
              fill="#05070B" stroke="#78C8FF" strokeWidth="1.2" opacity="0.9" />
          </svg>
        </div>

        {/* Heading readout row */}
        <div className="mt-2 pt-1.5 border-t border-soft-white/10 flex items-center justify-between">
          <span className="text-[9px] font-mono text-soft-white/30 tracking-wider">
            {cardinalName}
          </span>
          <span className="text-[9px] font-mono text-cyan-accent/60 tracking-wider">
            {String(headingRounded).padStart(3, "0")}°
          </span>
        </div>
      </div>
    </div>
  );
}

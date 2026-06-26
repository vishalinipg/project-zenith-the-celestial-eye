"use client";
import { useMemo, useRef } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { CelestialObject } from "@/types/celestial";
import { OrbitTrailPoint } from "@/services/celestrak/satelliteService";
import { horizontalToCartesian } from "@/utils/coordinates";
import { useAppStore } from "@/stores/appStore";
import ObjectVisual from "./ObjectVisual";

const OBJECT_RADIUS = 95;
const TRAIL_MIN_ALTITUDE = -8; // render slightly below horizon for a smoother arc

/** Draws a satellite's orbit trail, split into past (dim) and future (bright)
 *  segments so direction of travel is visually obvious. Breaks the line at
 *  any gap where the path dips below TRAIL_MIN_ALTITUDE to avoid long jumps
 *  cutting across the sky. */
function OrbitTrailLine({
  points,
  color,
  lineWidth = 1.2,
  opacityPast = 0.22,
  opacityFuture = 0.5,
}: {
  points: OrbitTrailPoint[];
  color: string;
  lineWidth?: number;
  opacityPast?: number;
  opacityFuture?: number;
}) {
  const segments = useMemo(() => {
    const past: [number, number, number][] = [];
    const future: [number, number, number][] = [];
    let lastWasPast: boolean | null = null;

    for (const p of points) {
      if (p.altitude < TRAIL_MIN_ALTITUDE) { lastWasPast = null; continue; }
      const pos = horizontalToCartesian(p.altitude, p.azimuth, OBJECT_RADIUS);
      if (p.isPast) past.push(pos);
      else {
        // Bridge the gap so the future line connects to the last past point.
        if (lastWasPast === true && past.length > 0) future.push(past[past.length - 1]!);
        future.push(pos);
      }
      lastWasPast = p.isPast;
    }
    return { past, future };
  }, [points]);

  return (
    <>
      {segments.past.length > 1 && (
        <Line points={segments.past} color={color} transparent opacity={opacityPast} lineWidth={lineWidth} />
      )}
      {segments.future.length > 1 && (
        <Line points={segments.future} color={color} transparent opacity={opacityFuture} lineWidth={lineWidth * 1.2} />
      )}
    </>
  );
}

function ObjectMarker({ object }: { object: CelestialObject }) {
  const selectObject = useAppStore((s) => s.selectObject);
  const selectedId = useAppStore((s) => s.selectedObjectId);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  const position = useMemo(
    () => horizontalToCartesian(object.coordinates.altitude, object.coordinates.azimuth, OBJECT_RADIUS),
    [object.coordinates.altitude, object.coordinates.azimuth]
  );

  if (!object.isVisible) return null;
  const isSelected = selectedId === object.id;

  return (
    <group position={position}>
      <ObjectVisual
        type={object.type}
        objectName={object.name}
        illumination={object.illumination}
      />

      {/* Large invisible hit sphere for reliable clicking */}
      <mesh
        onPointerDown={(e) => { e.stopPropagation(); pointerDown.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (!pointerDown.current) return;
          const dx = e.clientX - pointerDown.current.x;
          const dy = e.clientY - pointerDown.current.y;
          pointerDown.current = null;
          if (Math.sqrt(dx * dx + dy * dy) < 10) selectObject(object);
        }}
      >
        <sphereGeometry args={[3.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[4, 5, 48]} />
          <meshBasicMaterial color="#78C8FF" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Object label */}
      <Html
        distanceFactor={45}
        center
        position={[0, object.type === "sun" ? 4.5 : object.type === "iss" ? 2.5 : 2, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className={`text-center whitespace-nowrap transition-all duration-200 ${isSelected ? "opacity-100" : "opacity-70"
          }`}>
          <div className={`px-1.5 py-0.5 rounded-sm text-[11px] font-mono tracking-wide
            ${isSelected
              ? "bg-deep-navy/90 border border-cyan-accent/50 text-cyan-accent"
              : "text-soft-white/70"
            }`}
            style={{ textShadow: "0 0 8px rgba(0,0,0,0.9)" }}>
            {object.name}
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function CelestialObjects({
  planets, satellites, showOrbitPaths, satelliteTrails, planetTrails, selectedId,
}: {
  planets: CelestialObject[];
  satellites: CelestialObject[];
  showOrbitPaths: boolean;
  satelliteTrails?: Record<string, OrbitTrailPoint[]>;
  planetTrails?: Record<string, OrbitTrailPoint[]>;
  selectedId?: string | null;
}) {
  return (
    <group>
      {planets.map((obj) => <ObjectMarker key={obj.id} object={obj} />)}
      {satellites.map((sat) => <ObjectMarker key={sat.id} object={sat} />)}

      {showOrbitPaths && planetTrails && planets.map((obj) => {
        const points = planetTrails[obj.id];
        if (!points || points.length <= 1) return null;
        const isSelected = selectedId === obj.id;

        let color = "rgba(180, 160, 230, 0.45)";
        if (obj.type === "sun") color = "#FFB300";
        else if (obj.type === "moon") color = "#E0E0E0";

        if (isSelected) {
          return (
            <OrbitTrailLine
              key={`trail-${obj.id}`}
              points={points}
              color="#FFD9A0"
              lineWidth={2.2}
              opacityPast={0.4}
              opacityFuture={0.9}
            />
          );
        }

        return (
          <OrbitTrailLine
            key={`trail-${obj.id}`}
            points={points}
            color={color}
            lineWidth={1.2}
            opacityPast={0.22}
            opacityFuture={0.45}
          />
        );
      })}

      {showOrbitPaths && satelliteTrails && satellites.map((sat) => {
        const points = satelliteTrails[sat.id];
        if (!points || points.length <= 1) return null;
        const isSelected = selectedId === sat.id;
        const isIss = sat.type === "iss";

        if (isSelected) {
          return (
            <OrbitTrailLine
              key={`trail-${sat.id}`}
              points={points}
              color="#FFD9A0"
              lineWidth={2.2}
              opacityPast={0.4}
              opacityFuture={0.9}
            />
          );
        }

        const color = isIss ? "#78C8FF" : "rgba(120, 200, 255, 0.35)";

        return (
          <OrbitTrailLine
            key={`trail-${sat.id}`}
            points={points}
            color={color}
            lineWidth={isIss ? 1.2 : 0.9}
            opacityPast={isIss ? 0.22 : 0.15}
            opacityFuture={isIss ? 0.5 : 0.3}
          />
        );
      })}
    </group>
  );
}

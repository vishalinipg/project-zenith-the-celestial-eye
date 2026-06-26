"use client";
import { useMemo, useRef } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { CelestialObject } from "@/types/celestial";
import { ObserverLocation } from "@/types/observer";
import { equatorialToHorizontal } from "@/services/astronomy/astronomyService";
import { horizontalToCartesian } from "@/utils/coordinates";
import { useAppStore } from "@/stores/appStore";
import { DEEP_SPACE_CATALOG } from "@/constants/deepSpaceObjects";
import { OrbitTrailPoint } from "@/services/celestrak/satelliteService";
import ObjectVisual from "./ObjectVisual";

const SKY_R = 96;
const TRAIL_MIN_ALTITUDE = -8;

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
      const pos = horizontalToCartesian(p.altitude, p.azimuth, SKY_R);
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

function useDeepSpacePositions(location: ObserverLocation | null, date: Date): CelestialObject[] {
  return useMemo(() => {
    if (!location) return [];
    return DEEP_SPACE_CATALOG.map((entry) => {
      const { altitude, azimuth } = equatorialToHorizontal(entry.ra, entry.dec, location, date);
      return {
        id: entry.id,
        name: entry.name,
        type: entry.type,
        coordinates: { altitude, azimuth },
        magnitude: entry.magnitude,
        isVisible: altitude > 0,
        description: entry.description,
        lastUpdated: date,
      } as CelestialObject & { _color?: string };
    }).map((obj) => {
      const entry = DEEP_SPACE_CATALOG.find((e) => e.id === obj.id);
      return { ...obj, _color: entry?.color } as CelestialObject & { _color?: string };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, Math.floor(date.getTime() / 60000)]);
}

function DeepSpaceMarker({ object, color }: { object: CelestialObject; color?: string }) {
  const selectObject = useAppStore((s) => s.selectObject);
  const selectedId = useAppStore((s) => s.selectedObjectId);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const isSelected = selectedId === object.id;

  const position = useMemo(
    () => horizontalToCartesian(object.coordinates.altitude, object.coordinates.azimuth, SKY_R),
    [object.coordinates.altitude, object.coordinates.azimuth]
  );

  if (!object.isVisible) return null;

  return (
    <group position={position}>
      <ObjectVisual type={object.type} objectName={object.name} deepSpaceColor={color} />

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
        <sphereGeometry args={[3, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.5, 4.5, 36]} />
          <meshBasicMaterial color={color ?? "#78C8FF"} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      <Html distanceFactor={50} center position={[0, 2.5, 0]} style={{ pointerEvents: "none" }}>
        <div className={`whitespace-nowrap text-[10px] font-mono tracking-wide ${isSelected ? "text-cyan-accent" : "text-soft-white/50"}`}
          style={{ textShadow: "0 0 6px rgba(0,0,0,0.9)" }}>
          {object.name}
        </div>
      </Html>
    </group>
  );
}

interface DeepSpaceObjectsProps {
  location: ObserverLocation;
  currentTime: Date;
  deepSpaceTrails?: Record<string, OrbitTrailPoint[]>;
  showOrbitPaths?: boolean;
}

export default function DeepSpaceObjects({ location, currentTime, deepSpaceTrails, showOrbitPaths }: DeepSpaceObjectsProps) {
  const objects = useDeepSpacePositions(location, currentTime);
  const selectedId = useAppStore((s) => s.selectedObjectId);

  return (
    <group>
      {objects.map((obj) => {
        const entry = DEEP_SPACE_CATALOG.find((e) => e.id === obj.id);
        return <DeepSpaceMarker key={obj.id} object={obj} color={entry?.color} />;
      })}

      {showOrbitPaths && deepSpaceTrails && objects.map((obj) => {
        const points = deepSpaceTrails[obj.id];
        if (!points || points.length <= 1) return null;
        const isSelected = selectedId === obj.id;
        const entry = DEEP_SPACE_CATALOG.find((e) => e.id === obj.id);
        const baseColor = entry?.color ?? "#b4a0e6";

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
            color={baseColor}
            lineWidth={0.9}
            opacityPast={0.12}
            opacityFuture={0.25}
          />
        );
      })}
    </group>
  );
}
export { useDeepSpacePositions };

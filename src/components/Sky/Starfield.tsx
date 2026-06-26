"use client";

import { useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { Line, Html } from "@react-three/drei";
import { BRIGHT_STAR_CATALOG, CONSTELLATIONS } from "@/constants/starCatalog";
import { equatorialToHorizontal } from "@/services/astronomy/astronomyService";
import { horizontalToCartesian, clampMagnitudeToRenderSize } from "@/utils/coordinates";
import { ObserverLocation } from "@/types/observer";
import { COLORS } from "@/constants/colors";
import { useAppStore } from "@/stores/appStore";
import { CelestialObject } from "@/types/celestial";

const SKY_RADIUS = 100;
const BG_STAR_COUNT = 3500;
const STAR_REFRESH_MS = 60_000;

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function BackgroundStars() {
  const geo = useMemo(() => {
    const rand = mulberry32(42);
    const positions = new Float32Array(BG_STAR_COUNT * 3);
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      const u = rand(), v = rand();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = SKY_RADIUS * 1.4;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial color={COLORS.softWhite} size={0.4} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
    </points>
  );
}

function colorForIndex(ci: number | undefined): string {
  if (ci === undefined) return COLORS.softWhite;
  if (ci < -0.3) return "#9bb8ff";
  if (ci < 0.3) return COLORS.softWhite;
  if (ci < 0.8) return "#fff4d6";
  if (ci < 1.4) return "#ffd9a0";
  return "#ffb38a";
}

interface StarPos { id: string; name?: string; pos: [number,number,number]; size: number; color: string; visible: boolean }

function useCatalogStars(loc: ObserverLocation, refreshKey: number): StarPos[] {
  return useMemo(() => {
    const now = new Date();
    return BRIGHT_STAR_CATALOG.map((star) => {
      const { altitude, azimuth } = equatorialToHorizontal(star.ra, star.dec, loc, now);
      return {
        id: star.id,
        name: star.name,
        pos: horizontalToCartesian(altitude, azimuth, SKY_RADIUS) as [number,number,number],
        size: clampMagnitudeToRenderSize(star.magnitude),
        color: colorForIndex(star.colorIndex),
        visible: altitude > -2,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.latitude, loc.longitude, refreshKey]);
}

/** Compute centroid of a constellation's visible stars for label placement */
function getConstellationCentroid(
  starById: Map<string, StarPos>,
  constId: string
): [number,number,number] | null {
  const stars = BRIGHT_STAR_CATALOG
    .filter((s) => s.constellationId === constId)
    .map((s) => starById.get(s.id))
    .filter((s): s is StarPos => !!s && s.visible);
  if (stars.length === 0) return null;
  const avg = stars.reduce<[number, number, number]>(
    (acc, s) => [acc[0]! + s.pos[0]!, acc[1]! + s.pos[1]!, acc[2]! + s.pos[2]!],
    [0, 0, 0]
  );
  const len = Math.sqrt(avg[0]**2 + avg[1]**2 + avg[2]**2);
  return len > 0
    ? [(avg[0] / len) * SKY_RADIUS * 0.95, (avg[1] / len) * SKY_RADIUS * 0.95, (avg[2] / len) * SKY_RADIUS * 0.95]
    : null;
}

interface StarfieldProps { location: ObserverLocation }

export default function Starfield({ location }: StarfieldProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setRefreshKey((k) => k + 1), STAR_REFRESH_MS);
    return () => clearInterval(i);
  }, []);

  const stars = useCatalogStars(location, refreshKey);
  const starById = useMemo(() => new Map(stars.map((s) => [s.id, s])), [stars]);

  const selectObject = useAppStore((s) => s.selectObject);
  const selectedId = useAppStore((s) => s.selectedObjectId);

  return (
    <group>
      <BackgroundStars />

      {/* Catalog stars */}
      {stars.filter((s) => s.visible).map((star) => (
        <mesh key={star.id} position={star.pos}>
          <sphereGeometry args={[star.size * 0.14, 8, 8]} />
          <meshBasicMaterial color={star.color} />
        </mesh>
      ))}

      {/* Constellation lines + labels */}
      {CONSTELLATIONS.map((con) => {
        const centroid = getConstellationCentroid(starById, con.id);
        const isSelected = selectedId === con.id;

        const lines = con.lines.map(([fromId, toId], i) => {
          const from = starById.get(fromId);
          const to = starById.get(toId);
          if (!from || !to || (!from.visible && !to.visible)) return null;
          return (
            <Line
              key={`${con.id}-${i}`}
              points={[from.pos, to.pos]}
              color={isSelected ? "#FFD9A0" : COLORS.cyanAccent}
              transparent
              opacity={isSelected ? 0.75 : 0.25}
              lineWidth={isSelected ? 1.4 : 0.5}
            />
          );
        }).filter(Boolean);

        if (lines.length === 0) return null;

        const handleSelect = () => {
          if (!centroid) return;

          const altRad = Math.asin(centroid[1] / SKY_RADIUS);
          const azRad = Math.atan2(centroid[0], -centroid[2]);
          const altitude = altRad * (180 / Math.PI);
          const azimuth = ((azRad * (180 / Math.PI)) + 360) % 360;

          const starNames = con.lines
            .flatMap(([f, t]) => [starById.get(f)?.name, starById.get(t)?.name])
            .filter((name): name is string => !!name);
          const uniqueStars = Array.from(new Set(starNames)).join(", ");

          const constellationObj: CelestialObject = {
            id: con.id,
            name: con.name,
            type: "constellation",
            coordinates: { altitude, azimuth },
            isVisible: altitude > 0,
            description: `A major constellation visible in the sky. Contains bright stars such as: ${uniqueStars}.`,
            lastUpdated: new Date()
          };

          selectObject(constellationObj);
        };

        return (
          <group key={con.id}>
            {lines}
            {centroid && (
              <Html position={centroid} center distanceFactor={60}>
                <button
                  onClick={handleSelect}
                  className={`pointer-events-auto cursor-pointer text-[9px] font-mono tracking-[0.15em] uppercase transition-all duration-200
                    ${isSelected
                      ? "text-cyan-accent font-semibold bg-deep-navy/90 border border-cyan-accent/50 rounded-sm px-1.5 py-0.5 shadow-[0_0_8px_rgba(120,200,255,0.35)]"
                      : "text-cyan-accent/40 hover:text-cyan-accent/80 hover:bg-deep-navy/40 rounded-sm px-1 py-0.5"
                    }`}
                  style={{ textShadow: "0 0 6px rgba(0,0,0,0.9)" }}
                >
                  {con.name}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

export { SKY_RADIUS };

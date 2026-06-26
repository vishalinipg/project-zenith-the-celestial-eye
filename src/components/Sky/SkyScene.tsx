"use client";
import { Suspense, useRef, useCallback, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import Starfield from "./Starfield";
import CelestialObjects from "./CelestialObjects";
import DeepSpaceObjects from "./DeepSpaceObjects";
import { CelestialObject } from "@/types/celestial";
import { OrbitTrailPoint } from "@/services/celestrak/satelliteService";
import { ObserverLocation } from "@/types/observer";
import { describeSkyState } from "@/utils/time";

const SKY_BG: Record<ReturnType<typeof describeSkyState>, string> = {
  day: "#1a3f80", sunset: "#281530", twilight: "#0c1320", night: "#05070B",
};

// Zoom controller inside Canvas (needs access to Three.js camera)
function ZoomController({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl> }) {
  const { camera } = useThree();
  const zoom = useCallback((dir: number) => {
    if (!controlsRef.current) return;

    // Range is 90 (zoomed out) to 15 (zoomed in). 
    // For exactly 10 discrete levels (10%, 20%, ... 100%), the step size is (90 - 15) / 10 = 7.5
    const step = 7.5;
    const cam = camera as THREE.PerspectiveCamera;

    // dir > 0 means zoom in (decrease FOV)
    let newFov = cam.fov - (dir * step);

    // Snap to the nearest exact step level
    newFov = Math.round(newFov / step) * step;

    cam.fov = Math.max(15, Math.min(90, newFov));
    cam.updateProjectionMatrix();
  }, [camera, controlsRef]);

  // Expose zoom via a custom event so the parent can call it
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const handler = (e: Event) => {
      const dir = (e as CustomEvent<{ dir: number }>).detail.dir;
      zoom(dir);
    };
    gl.domElement.addEventListener("zenith-zoom", handler);
    return () => gl.domElement.removeEventListener("zenith-zoom", handler);
  }, [gl, zoom]);

  return null;
}

// Broadcasts the camera's azimuth, altitude (pitch), and FOV each frame so
// CompassWidget and SkyMapPanel can react to view changes without Zustand coupling.
function HeadingBroadcaster() {
  const lastKey = useRef<string>("");
  const dir = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    camera.getWorldDirection(dir.current);
    const azimuthRad = Math.atan2(dir.current.x, -dir.current.z);
    const azimuthDeg = ((azimuthRad * 180) / Math.PI + 360) % 360;
    // altitude = asin of Y component (up = +Y in Three.js)
    const altitudeDeg = Math.asin(Math.max(-1, Math.min(1, dir.current.y))) * (180 / Math.PI);
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 70;

    const key = `${Math.round(azimuthDeg)},${Math.round(altitudeDeg)},${Math.round(fov)}`;
    if (key !== lastKey.current) {
      lastKey.current = key;
      document.dispatchEvent(
        new CustomEvent("zenith-heading", {
          detail: { heading: azimuthDeg, altitude: altitudeDeg, fov },
        })
      );
    }
  });

  return null;
}

interface SkySceneProps {
  location: ObserverLocation;
  planets: CelestialObject[];
  satellites: CelestialObject[];
  showOrbitPaths: boolean;
  satelliteTrails?: Record<string, OrbitTrailPoint[]>;
  planetTrails?: Record<string, OrbitTrailPoint[]>;
  deepSpaceTrails?: Record<string, OrbitTrailPoint[]>;
  selectedId?: string | null;
  currentTime: Date;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export default function SkyScene({
  location, planets, satellites, showOrbitPaths, satelliteTrails, planetTrails, deepSpaceTrails, selectedId, currentTime, canvasRef,
}: SkySceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const sun = planets.find((o) => o.id === "sun");
  const skyState = describeSkyState(sun?.coordinates.altitude ?? -90);
  const bgColor = SKY_BG[skyState];

  const visiblePlanets = skyState === "day"
    ? planets.filter((o) => o.type === "sun" || o.type === "moon")
    : planets;

  return (
    <div className="relative w-full h-full" style={{ background: bgColor, transition: "background 4s ease" }}>
      <Canvas
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={70} near={0.01} far={500} />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={false}
            rotateSpeed={0.4}
            target={[0, 0, -1]}
            enableDamping
            dampingFactor={0.07}
          />
          <ZoomController controlsRef={controlsRef} />
          <HeadingBroadcaster />
          {skyState !== "day" && <Starfield location={location} />}
          <CelestialObjects
            planets={visiblePlanets} satellites={satellites} showOrbitPaths={showOrbitPaths}
            satelliteTrails={satelliteTrails} planetTrails={planetTrails} selectedId={selectedId}
          />
          {skyState !== "day" && (
            <DeepSpaceObjects
              location={location}
              currentTime={currentTime}
              deepSpaceTrails={deepSpaceTrails}
              showOrbitPaths={showOrbitPaths}
            />
          )}
          <ambientLight intensity={0.1} />
        </Suspense>
      </Canvas>
    </div>
  );
}

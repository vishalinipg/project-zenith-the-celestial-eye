"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CelestialObjectType } from "@/types/celestial";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createJupiterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const bands = [
    "#C88B3A","#E8C87A","#C8A055","#F0D890","#B87830",
    "#E8C87A","#D49848","#F0E0A0","#C07828","#E8C87A",
    "#D08040","#ECD098","#B87030","#E0B860","#C89048",
  ];
  const bh = 256 / bands.length;
  bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * bh, 512, bh + 1); });
  // Great Red Spot
  ctx.fillStyle = "#C04428"; ctx.beginPath(); ctx.ellipse(130, 128, 28, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#D85530"; ctx.beginPath(); ctx.ellipse(128, 126, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function createMoonTexture(illumination: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const cx = 128, cy = 128, r = 118;
  // Base gray
  ctx.fillStyle = "#C0C0C8";
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Craters
  [[80,70,12],[150,100,8],[60,150,16],[170,160,6],[110,90,5],[140,50,9]].forEach((c) => {
    const [x,y,cr] = [c[0]!,c[1]!,c[2]!];
    ctx.fillStyle = "#A0A0A8"; ctx.beginPath(); ctx.arc(x, y, cr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#888890"; ctx.beginPath(); ctx.arc(x, y, cr * 0.6, 0, Math.PI * 2); ctx.fill();
  });
  // Phase shadow overlay
  const illum = Math.max(0, Math.min(1, illumination));
  if (illum < 0.99) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 1 - illum;
    ctx.fillStyle = "#08080F";
    const tx = cx + (1 - 2 * illum) * r;
    ctx.fillRect(illum < 0.5 ? 0 : tx, 0, illum < 0.5 ? tx : 256, 256);
    if (illum < 0.5 && illum > 0) {
      ctx.fillStyle = "#C0C0C8"; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.ellipse(tx, cy, Math.abs(tx - cx), r, 0, -Math.PI/2, Math.PI/2); ctx.fill();
    }
    ctx.restore();
  }
  return new THREE.CanvasTexture(canvas);
}

function createMarsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const cx = 128, cy = 128, r = 118;
  ctx.fillStyle = "#C1440E"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Surface variation
  const colors = ["#A33808","#D45820","#B84010","#E06030"];
  for (let i = 0; i < 20; i++) {
    const x = Math.random()*256, y = Math.random()*256, cr = 10+Math.random()*25;
    ctx.fillStyle = colors[Math.floor(Math.random()*4)]!;
    ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(x, y, cr, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Polar ice caps
  ctx.fillStyle = "#F0F0FF"; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.ellipse(cx, cy - r + 14, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy + r - 10, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

function createSaturnRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.05, "rgba(200,185,130,0.2)");
  grad.addColorStop(0.2, "rgba(210,195,140,0.8)");
  grad.addColorStop(0.35, "rgba(190,175,120,0.6)");
  grad.addColorStop(0.5, "rgba(220,205,150,0.9)");
  grad.addColorStop(0.65, "rgba(180,165,110,0.5)");
  grad.addColorStop(0.8, "rgba(200,185,130,0.7)");
  grad.addColorStop(0.95, "rgba(170,155,100,0.3)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 64);
  return new THREE.CanvasTexture(canvas);
}

// ─── Visual components ───────────────────────────────────────────────────────

export function SunVisual() {
  const coreRef = useRef<THREE.Mesh>(null);
  const glow1Ref = useRef<THREE.Mesh>(null);
  const glow2Ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + 0.03 * Math.sin(t * 1.8);
    if (coreRef.current) coreRef.current.scale.setScalar(pulse);
    if (glow1Ref.current) glow1Ref.current.scale.setScalar(1 + 0.05 * Math.sin(t * 1.2));
    if (glow2Ref.current) glow2Ref.current.scale.setScalar(1 + 0.08 * Math.sin(t * 0.7));
  });
  return (
    <group>
      <mesh ref={coreRef}><sphereGeometry args={[2.8, 32, 32]} /><meshBasicMaterial color="#FFF8E0" /></mesh>
      <mesh><sphereGeometry args={[3.2, 32, 32]} /><meshBasicMaterial color="#FFF0A0" transparent opacity={0.5} side={THREE.BackSide} /></mesh>
      <mesh ref={glow1Ref}><sphereGeometry args={[4.5, 24, 24]} /><meshBasicMaterial color="#FFD000" transparent opacity={0.2} side={THREE.BackSide} /></mesh>
      <mesh ref={glow2Ref}><sphereGeometry args={[6.5, 16, 16]} /><meshBasicMaterial color="#FF8800" transparent opacity={0.08} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function MoonVisual({ illumination = 0.5 }: { illumination?: number }) {
  const texture = useMemo(() => createMoonTexture(illumination), [illumination]);
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (glowRef.current) glowRef.current.scale.setScalar(1 + 0.015 * Math.sin(clock.getElapsedTime() * 0.8));
  });
  return (
    <group>
      <mesh><sphereGeometry args={[1.8, 32, 32]} /><meshBasicMaterial map={texture} /></mesh>
      <mesh ref={glowRef}><sphereGeometry args={[2.1, 16, 16]} /><meshBasicMaterial color="#DDEEFF" transparent opacity={0.12} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function JupiterVisual() {
  const texture = useMemo(() => createJupiterTexture(), []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.001; });
  return (
    <group>
      <mesh ref={ref}><sphereGeometry args={[1.2, 32, 32]} /><meshBasicMaterial map={texture} /></mesh>
      <mesh><sphereGeometry args={[1.35, 16, 16]} /><meshBasicMaterial color="#E8B860" transparent opacity={0.08} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function SaturnVisual() {
  const ringTex = useMemo(() => createSaturnRingTexture(), []);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.0008; });
  return (
    <group ref={ref}>
      <mesh><sphereGeometry args={[0.85, 32, 32]} /><meshBasicMaterial color="#E8D5A0" /></mesh>
      <mesh rotation={[0.45, 0, 0]}>
        <ringGeometry args={[1.2, 2.2, 80]} />
        <meshBasicMaterial map={ringTex} transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh><sphereGeometry args={[0.95, 16, 16]} /><meshBasicMaterial color="#E8D090" transparent opacity={0.07} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function MarsVisual() {
  const texture = useMemo(() => createMarsTexture(), []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.0009; });
  return (
    <group>
      <mesh ref={ref}><sphereGeometry args={[0.65, 32, 32]} /><meshBasicMaterial map={texture} /></mesh>
      <mesh><sphereGeometry args={[0.72, 16, 16]} /><meshBasicMaterial color="#D04010" transparent opacity={0.07} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function VenusVisual() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y += 0.0003; });
  return (
    <group>
      <mesh ref={ref}><sphereGeometry args={[0.75, 32, 32]} /><meshBasicMaterial color="#F0E0A0" /></mesh>
      <mesh><sphereGeometry args={[0.85, 16, 16]} /><meshBasicMaterial color="#FFE880" transparent opacity={0.2} side={THREE.BackSide} /></mesh>
      <mesh><sphereGeometry args={[1.05, 12, 12]} /><meshBasicMaterial color="#FFEE90" transparent opacity={0.07} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function MercuryVisual() {
  return (
    <group>
      <mesh><sphereGeometry args={[0.38, 24, 24]} /><meshBasicMaterial color="#A09080" /></mesh>
      <mesh><sphereGeometry args={[0.42, 12, 12]} /><meshBasicMaterial color="#C0B0A0" transparent opacity={0.06} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function IssVisual() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.1; });
  return (
    <group ref={ref}>
      {/* Main body */}
      <mesh><boxGeometry args={[0.9, 0.2, 0.2]} /><meshBasicMaterial color="#78C8FF" /></mesh>
      {/* Solar panels */}
      <mesh position={[0, 0, 0.7]}><boxGeometry args={[1.8, 0.08, 0.55]} /><meshBasicMaterial color="#5599DD" /></mesh>
      <mesh position={[0, 0, -0.7]}><boxGeometry args={[1.8, 0.08, 0.55]} /><meshBasicMaterial color="#5599DD" /></mesh>
      {/* Glow */}
      <mesh><sphereGeometry args={[1.2, 12, 12]} /><meshBasicMaterial color="#78C8FF" transparent opacity={0.1} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function SatelliteVisual() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z += 0.02; });
  return (
    <group ref={ref} scale={0.5}>
      <mesh><boxGeometry args={[0.3, 0.15, 0.15]} /><meshBasicMaterial color="#AACCFF" /></mesh>
      <mesh position={[0, 0, 0.3]}><boxGeometry args={[0.7, 0.04, 0.25]} /><meshBasicMaterial color="#4488CC" /></mesh>
      <mesh position={[0, 0, -0.3]}><boxGeometry args={[0.7, 0.04, 0.25]} /><meshBasicMaterial color="#4488CC" /></mesh>
    </group>
  );
}

export function NebulaVisual({ color = "#ff7722" }: { color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y += 0.0005; });
  const c = new THREE.Color(color);
  return (
    <group>
      <mesh ref={ref}><icosahedronGeometry args={[1.2, 1]} /><meshBasicMaterial color={c} transparent opacity={0.25} side={THREE.DoubleSide} wireframe={false} /></mesh>
      <mesh><sphereGeometry args={[1.6, 12, 12]} /><meshBasicMaterial color={c} transparent opacity={0.08} side={THREE.BackSide} /></mesh>
      <mesh><sphereGeometry args={[2.2, 8, 8]} /><meshBasicMaterial color={c} transparent opacity={0.04} side={THREE.BackSide} /></mesh>
    </group>
  );
}

export function GalaxyVisual() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y += 0.001; });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI * 0.1, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.05, 32]} />
        <meshBasicMaterial color="#DDEEFF" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh><sphereGeometry args={[0.3, 12, 12]} /><meshBasicMaterial color="#FFFFEE" transparent opacity={0.6} /></mesh>
      <mesh rotation={[Math.PI * 0.1, 0, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.02, 32]} />
        <meshBasicMaterial color="#AACCFF" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function CometVisual() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * 0.2; });
  return (
    <group ref={ref}>
      {/* Nucleus */}
      <mesh><sphereGeometry args={[0.3, 16, 16]} /><meshBasicMaterial color="#C0C8D0" /></mesh>
      {/* Coma */}
      <mesh><sphereGeometry args={[0.55, 12, 12]} /><meshBasicMaterial color="#AADDFF" transparent opacity={0.35} /></mesh>
      {/* Tail */}
      <mesh position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.4, 2.8, 16, 1, true]} />
        <meshBasicMaterial color="#88CCFF" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-1.0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.25, 2.4, 12, 1, true]} />
        <meshBasicMaterial color="#AADDFF" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function AsteroidVisual() {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.4, 0);
    const pos = g.attributes["position"]!;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) * (0.85 + Math.random() * 0.3),
        pos.getY(i) * (0.85 + Math.random() * 0.3),
        pos.getZ(i) * (0.85 + Math.random() * 0.3));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.x += 0.007; ref.current.rotation.y += 0.005; } });
  return (
    <mesh ref={ref} geometry={geo}>
      <meshBasicMaterial color="#887766" />
    </mesh>
  );
}

export function GenericPlanetVisual({ color }: { color: string }) {
  return (
    <group>
      <mesh><sphereGeometry args={[0.55, 24, 24]} /><meshBasicMaterial color={color} /></mesh>
      <mesh><sphereGeometry args={[0.65, 12, 12]} /><meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.BackSide} /></mesh>
    </group>
  );
}

// ─── Master router ───────────────────────────────────────────────────────────
export default function ObjectVisual({
  type, objectName, illumination, deepSpaceColor,
}: {
  type: CelestialObjectType;
  objectName: string;
  illumination?: number;
  deepSpaceColor?: string;
}) {
  const name = objectName.toLowerCase();
  if (type === "sun") return <SunVisual />;
  if (type === "moon") return <MoonVisual illumination={illumination ?? 0.5} />;
  if (type === "iss") return <IssVisual />;
  if (type === "satellite") return <SatelliteVisual />;
  if (type === "nebula") return <NebulaVisual color={deepSpaceColor} />;
  if (type === "galaxy") return <GalaxyVisual />;
  if (type === "comet") return <CometVisual />;
  if (type === "asteroid") return <AsteroidVisual />;
  if (type === "planet") {
    if (name.includes("jupiter")) return <JupiterVisual />;
    if (name.includes("saturn")) return <SaturnVisual />;
    if (name.includes("mars")) return <MarsVisual />;
    if (name.includes("venus")) return <VenusVisual />;
    if (name.includes("mercury")) return <MercuryVisual />;
    return <GenericPlanetVisual color="#AABBCC" />;
  }
  return <GenericPlanetVisual color="#8899AA" />;
}

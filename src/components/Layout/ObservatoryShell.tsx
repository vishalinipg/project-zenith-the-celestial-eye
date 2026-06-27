"use client";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { useObserverStore } from "@/stores/observerStore";
import { useObserverClock } from "@/hooks/useObserver";
import { usePlanetPositions } from "@/hooks/usePlanetPositions";
import { useIss } from "@/hooks/useISS";
import { useSatellites } from "@/hooks/useSatellites";
import { useAllOrbitTrails, usePlanetOrbitTrails, useDeepSpaceOrbitTrails } from "@/hooks/useOrbitTrail";
import { useWeather } from "@/hooks/useWeather";
import { usePassPrediction } from "@/hooks/usePassPrediction";
import { useAppStore } from "@/stores/appStore";
import { ObserverLocation } from "@/types/observer";
import { CelestialObject } from "@/types/celestial";
import { WeatherData } from "@/services/weather/weatherService";
import { SatellitePass } from "@/services/celestrak/passPredictionService";
import ObservabilityPanel from "@/components/Telemetry/ObservabilityPanel";
import SkyMapPanel from "@/components/Telemetry/SkyMapPanel";
import ShareButton from "@/components/Telemetry/ShareButton";
import { parseShareParams } from "@/utils/shareLink";
import ObjectPanel from "@/components/Telemetry/ObjectPanel";
import TimeControls from "@/components/Telemetry/TimeControls";
import CompassWidget from "@/components/Telemetry/CompassWidget";
import LandingPage from "@/components/Landing/LandingPage";
import NasaEyesPanel from "@/components/NasaEyes/NasaEyesPanel";
import SatelliteFilter from "@/components/Telemetry/SatelliteFilter";
import PassPredictorPanel from "@/components/Telemetry/PassPredictorPanel";
import ObserverPanel from "@/components/Telemetry/ObserverPanel";
import IssPanel from "@/components/Telemetry/IssPanel";
import SpaceWeatherPanel from "@/components/Telemetry/SpaceWeatherPanel";
import SourceInspectorPanel, { SourceEntry } from "@/components/Telemetry/SourceInspectorPanel";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";

const LocationSelector = dynamic(() => import("@/components/LocationSelector/LocationSelector"), { ssr: false });
const SkyScene = dynamic(() => import("@/components/Sky/SkyScene"), { ssr: false });
import { useDeepSpacePositions } from "@/components/Sky/DeepSpaceObjects";

// ── Transition screen ─────────────────────────────────────────────────────────
const MSGS = [
  "Initializing observatory...", "Synchronizing telemetry...",
  "Computing celestial positions...", "Building sky model...", "Loading orbital data...",
];

function TransitionScreen({ location }: { location: ObserverLocation }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setIdx((n) => Math.min(n + 1, MSGS.length - 1)), 620);
    return () => clearInterval(i);
  }, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-space-black px-6">
      <motion.div
        initial={{ scale: 2.2, opacity: 0.35 }} animate={{ scale: 0.12, opacity: 0 }}
        transition={{ duration: 3.2, ease: "easeInOut" }}
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(120,200,255,0.18) 0%, transparent 70%)" }}
      />
      <p className="text-[10px] sm:text-[11px] font-mono tracking-[0.3em] text-cyan-accent/60 mb-2 text-center">{location.label.toUpperCase()}</p>
      <p className="text-[10px] font-mono text-soft-white/30 mb-5 text-center">
        {Math.abs(location.latitude).toFixed(3)}°{location.latitude >= 0 ? "N" : "S"} &nbsp;
        {Math.abs(location.longitude).toFixed(3)}°{location.longitude >= 0 ? "E" : "W"}
      </p>
      <p className="text-sm font-mono text-soft-white/40">{MSGS[idx]}</p>
    </motion.div>
  );
}

// ── Zoom Widget ───────────────────────────────────────────────────────────────
function ZoomWidget({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  const [fov, setFov] = useState(70);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.fov === "number") {
        setFov(detail.fov);
      }
    };
    document.addEventListener("zenith-heading", handler);
    return () => document.removeEventListener("zenith-heading", handler);
  }, []);

  const stepIndex = Math.round((90 - fov) / 7.5);
  const displayPercent = Math.max(10, Math.min(100, 10 + stepIndex * 10));

  return (
    <div className="pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded-sm border border-soft-white/10 bg-deep-navy/70 backdrop-blur-sm transition-colors hover:border-soft-white/25">
      <div className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-soft-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        <span className="text-[11px] font-mono tracking-widest text-soft-white/90">ZOOM</span>
      </div>
      <div className="w-[1px] h-4 bg-soft-white/20"></div>
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="w-5 h-5 flex items-center justify-center rounded-sm bg-soft-white/5 hover:bg-soft-white/10 text-soft-white/70 transition-colors"
          title="Zoom out"
        >
          −
        </button>
        <span className="text-[11px] font-mono tracking-widest text-cyan-accent w-8 text-center">{displayPercent}%</span>
        <button
          onClick={onZoomIn}
          className="w-5 h-5 flex items-center justify-center rounded-sm bg-soft-white/5 hover:bg-soft-white/10 text-soft-white/70 transition-colors"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Orbit & TLE Widgets ────────────────────────────────────────────────────────
function MobileOrbitButton({ showOrbits, onOrbitToggle }: { showOrbits: boolean; onOrbitToggle: () => void }) {
  const btnCls = "pointer-events-auto px-2.5 py-1.5 rounded-sm border text-[9px] font-mono tracking-wider transition-all duration-200 text-center bg-deep-navy/75 backdrop-blur-sm text-soft-white hover:text-white";
  const activeCls = "border-cyan-accent/50 bg-cyan-accent/10";
  const inactiveCls = "border-soft-white/12 hover:border-soft-white/30";
  return (
    <button onClick={onOrbitToggle} className={`${btnCls} ${showOrbits ? activeCls : inactiveCls}`}>
      {showOrbits ? "ORBITS ON" : "ORBITS OFF"}
    </button>
  );
}

function TleCountWidget({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="pointer-events-auto px-2.5 py-1.5 rounded-sm border border-cyan-accent/50 bg-cyan-accent/10 w-[150px] text-center">
      <p className="text-[9px] font-mono tracking-wider text-soft-white uppercase">{count} SATELLITES VISIBLE</p>
    </div>
  );
}



// ── Main component ────────────────────────────────────────────────────────────
export default function ObservatoryShell() {
  const { location, mode, appMode, currentTime, isLiveMode, setLocation, setMode, setAppMode, setTime } = useObserverStore();
  const [showOrbits, setShowOrbits] = useState(true);
  const [showSkyMap, setShowSkyMap] = useState(false);
  const [nasaEyesOpen, setNasaEyesOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<"observation" | "navigation" | "satellites" | "environment" | null>(null);
  const [pendingSatId, setPendingSatId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useObserverClock();

  // ── Deep-link restore: /?lat=&lon=&time=&sat= ──────────────────────────────
  useEffect(() => {
    const shared = parseShareParams(window.location.search);
    if (!shared) return;
    setLocation(shared.location);
    if (shared.time) setTime(shared.time);
    if (shared.satId) setPendingSatId(shared.satId);
    // Clean the URL so refreshing/navigating doesn't keep re-applying it.
    window.history.replaceState(null, "", window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { objects: planets } = usePlanetPositions(location, currentTime);
  const { error: issError, isLoading: issLoading } = useIss(location);
  const { satellites, tleCount, error: satError, isLoading: satLoading } = useSatellites(location);
  const { weather, error: weatherError, isLoading: weatherLoading } = useWeather(location);
  const { passes, isLoading: passLoading, error: passError } = usePassPrediction(location);
  const spaceWeather = useSpaceWeather();
  const selectedObject = useAppStore((s) => s.selectedObject);
  const selectObject = useAppStore((s) => s.selectObject);
  const enabledCategories = useAppStore((s) => s.enabledSatelliteCategories);

  const [activeRightPanel, setActiveRightPanel] = useState<"satfilter" | "passes" | "weather" | "sources" | null>(null);

  const iss = satellites.find((s) => s.type === "iss") ?? null;
  const filteredSatellites = satellites.filter(
    (s) => s.type === "iss" || (s.category ? enabledCategories.has(s.category) : true)
  );
  const allObjects = [...planets, ...filteredSatellites];
  const deepSpaceObjects = useDeepSpacePositions(location, currentTime);
  // allMapObjects includes deep space catalog for SkyMapPanel; allObjects is kept
  // lean (no deep space) for the 3D scene which renders them separately.
  const allMapObjects = [...allObjects, ...deepSpaceObjects];
  const sun = planets.find((o) => o.id === "sun");
  const visibleCount = allObjects.filter((o) => o.isVisible).length;

  // Resolve a deep-linked object selection once its data has loaded.
  useEffect(() => {
    if (!pendingSatId) return;
    const match = allObjects.find((o) => o.id === pendingSatId);
    if (match) {
      selectObject(match);
      setPendingSatId(null);
    }
  }, [pendingSatId, allObjects, selectObject]);

  // Clear selection if the selected object is a satellite and gets filtered out by the filter
  useEffect(() => {
    if (selectedObject && (selectedObject.type === "satellite" || selectedObject.type === "iss")) {
      const stillExists = filteredSatellites.some((s) => s.id === selectedObject.id);
      if (!stillExists) {
        selectObject(null);
      }
    }
  }, [filteredSatellites, selectedObject, selectObject]);

  const sourceEntries: SourceEntry[] = [
    { label: "CelesTrak (TLEs)", status: satLoading ? "loading" : satError ? "error" : "live", detail: tleCount > 0 ? `${tleCount} sats` : undefined },
    { label: "Open-Notify (ISS)", status: issLoading ? "loading" : issError ? "error" : "live" },
    { label: "Open-Meteo (weather)", status: weatherLoading ? "loading" : weatherError ? "error" : "live" },
    { label: "NASA DONKI (space weather)", status: spaceWeather.isLoading ? "loading" : spaceWeather.error ? "error" : spaceWeather.usingDemoKey ? "demo" : "live" },
    { label: "Astronomy Engine", status: "live", detail: "client-side" },
  ];

  // Orbit trails are recomputed from cached TLEs (no network), but we throttle
  // the "center" timestamp to a 30s bucket so 250ms clock ticks don't trigger
  // 36-point re-propagation 4x/sec for no visible benefit.
  const TRAIL_BUCKET_MS = 30_000;
  const trailCenterTime = new Date(Math.floor(currentTime.getTime() / TRAIL_BUCKET_MS) * TRAIL_BUCKET_MS);

  const satelliteIdsStr = filteredSatellites.map((s) => s.id).join(",");
  const satelliteTrails = useAllOrbitTrails(satelliteIdsStr, location, trailCenterTime, showOrbits);
  const planetTrails = usePlanetOrbitTrails(location, trailCenterTime, showOrbits);
  const deepSpaceTrails = useDeepSpaceOrbitTrails(location, trailCenterTime, showOrbits);


  useEffect(() => {
    if (mode !== "transition") return;
    const t = setTimeout(() => { setMode("observatory"); setAppMode("observatory"); }, 3400);
    return () => clearTimeout(t);
  }, [mode, setMode, setAppMode]);

  // Switch to the selected object panel automatically once something is selected.
  useEffect(() => {
    if (selectedObject) {
      setActiveFeature("selected-object");
    } else {
      setActiveFeature((prev) => prev === "selected-object" ? null : prev);
    }
  }, [selectedObject?.id]);

  // Zoom — dispatch custom event to the Canvas ZoomController
  const triggerZoom = useCallback((dir: number) => {
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.dispatchEvent(new CustomEvent("zenith-zoom", { detail: { dir } }));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-space-black">
      <AnimatePresence mode="wait">

        {/* ── LANDING ─────────────────────────────────────────────────── */}
        {appMode === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }} className="absolute inset-0">
            <LandingPage />
          </motion.div>
        )}

        {/* ── SELECTION ───────────────────────────────────────────────── */}
        {appMode === "selection" && (
          <motion.div key="sel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }} className="absolute inset-0">
            <LocationSelector onConfirm={(loc) => { setLocation(loc); setAppMode("transition"); }} />
          </motion.div>
        )}

        {/* ── TRANSITION ──────────────────────────────────────────────── */}
        {appMode === "transition" && location && (
          <TransitionScreen key="tr" location={location} />
        )}

        {/* ── OBSERVATORY ─────────────────────────────────────────────── */}
        {appMode === "observatory" && location && (
          <motion.div key="obs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1.8, ease: "easeInOut" }} className="absolute inset-0">

            <div className={nasaEyesOpen ? "hidden" : "w-full h-full absolute inset-0 z-0"}>
              <SkyScene
                location={location} planets={planets} satellites={filteredSatellites}
                showOrbitPaths={showOrbits}
                satelliteTrails={satelliteTrails}
                planetTrails={planetTrails}
                deepSpaceTrails={deepSpaceTrails}
                selectedId={selectedObject?.id ?? null}
                currentTime={currentTime} canvasRef={canvasRef}
              />
            </div>

            {/* ══════════════════════════════════════════════════════════
                DESKTOP (sm and up) — absolute corner layout
            ══════════════════════════════════════════════════════════ */}
            <div className="hidden xl:block pointer-events-none absolute inset-0 z-10">

              {/* TOP-LEFT: Observer + Observability */}
              <div className="absolute top-4 left-4 flex items-start gap-2">
                <ObserverPanel location={location} currentTime={currentTime} sunAltitude={sun?.coordinates.altitude ?? -90} />
                <ObservabilityPanel weather={weather} celestialObjects={allObjects} weatherError={weatherError} />
              </div>

              {/* TOP-RIGHT: Compass */}
              <div className="absolute top-4 right-4">
                <CompassWidget />
              </div>

              {/* TOP-CENTER: Controls row */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAppMode("selection")}
                    className="pointer-events-auto px-3 py-1.5 rounded-sm border border-soft-white/10
                               bg-deep-navy/70 backdrop-blur-sm text-[9px] font-mono text-soft-white
                               hover:text-white hover:border-soft-white/25 transition-colors tracking-widest">
                    CHANGE LOCATION
                  </button>
                  <NasaEyesPanel isOpen={nasaEyesOpen} onOpenChange={setNasaEyesOpen} />
                  <button
                    onClick={() => setShowSkyMap((v) => !v)}
                    className={`pointer-events-auto px-3 py-1.5 rounded-sm border text-[9px] font-mono tracking-widest transition-colors text-soft-white hover:text-white ${showSkyMap
                      ? "border-cyan-accent/50 bg-cyan-accent/10"
                      : "border-soft-white/10 bg-deep-navy/70 backdrop-blur-sm hover:border-soft-white/25"
                      }`}>
                    SKY MAP
                  </button>
                  <button
                    onClick={() => setShowOrbits((v) => !v)}
                    className={`pointer-events-auto px-3 py-1.5 rounded-sm border text-[9px] font-mono tracking-widest transition-colors text-soft-white hover:text-white ${showOrbits
                      ? "border-cyan-accent/50 bg-cyan-accent/10"
                      : "border-soft-white/10 bg-deep-navy/70 backdrop-blur-sm hover:border-soft-white/25"
                      }`}>
                    {showOrbits ? "ORBITS ON" : "ORBITS OFF"}
                  </button>
                  <ShareButton location={location} time={currentTime} isLiveMode={isLiveMode} selectedId={selectedObject?.id ?? null} />
                </div>
              </div>

              {/* RIGHT-MIDDLE: TLE count + satellite filter + passes */}
              <div className="absolute right-4 top-[40%] flex flex-col items-end gap-2">
                <TleCountWidget count={filteredSatellites.length} />
                <SatelliteFilter
                  isOpen={activeRightPanel === "satfilter"}
                  onOpenChange={(v) => setActiveRightPanel(v ? "satfilter" : null)}
                />
                <PassPredictorPanel
                  passes={passes} isLoading={passLoading} error={passError} location={location}
                  isOpen={activeRightPanel === "passes"}
                  onOpenChange={(v) => setActiveRightPanel(v ? "passes" : null)}
                />
                <SpaceWeatherPanel
                  {...spaceWeather}
                  isOpen={activeRightPanel === "weather"}
                  onOpenChange={(v) => setActiveRightPanel(v ? "weather" : null)}
                />
                <SourceInspectorPanel
                  sources={sourceEntries}
                  isOpen={activeRightPanel === "sources"}
                  onOpenChange={(v) => setActiveRightPanel(v ? "sources" : null)}
                />
              </div>

              {/* BOTTOM-LEFT: Selected object info + Sky Map (inline) */}
              <div className="absolute bottom-4 left-4 flex items-end gap-2 pointer-events-auto">
                <ObjectPanel />
                {showSkyMap && (
                  <SkyMapPanel celestialObjects={allMapObjects} />
                )}
              </div>

              {/* BOTTOM-CENTER: Time machine */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
                <TimeControls location={location} />
              </div>

              {/* BOTTOM-RIGHT: Zoom Widget + ISS */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 items-end pointer-events-auto">
                <ZoomWidget onZoomIn={() => triggerZoom(1)} onZoomOut={() => triggerZoom(-1)} />
                <IssPanel telemetry={null} error={issError} />
              </div>

              {/* Empty sky state */}
              {visibleCount === 0 && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                  <p className="text-[10px] font-mono text-soft-white/20 tracking-wide text-center">
                    No significant celestial objects currently overhead
                  </p>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════
                UNIFIED MOBILE/TABLET LAYOUT (<1280px)
            ══════════════════════════════════════════════════════════ */}
            <div className="xl:hidden absolute inset-0 flex flex-col pointer-events-none bg-transparent h-[100dvh] w-screen overflow-hidden z-10">

              {/* Header (Fixed height, pointer-events-auto, single row) */}
              <div className="pointer-events-auto flex flex-col bg-deep-navy/90 backdrop-blur-md border-b border-soft-white/10 flex-none z-10">
                {/* Row 1: CHANGE LOCATION | NASA EYES & ORBITS | SHARE */}
                <div className="flex items-center justify-center gap-1.5 px-4 py-2.5">
                  <button
                    onClick={() => setAppMode("selection")}
                    className="px-2.5 py-1.5 rounded-sm border border-soft-white/10 bg-deep-navy/70 text-[9px] font-mono text-soft-white hover:text-white hover:border-soft-white/25 transition-colors tracking-widest"
                  >
                    CHANGE LOCATION
                  </button>
                  <NasaEyesPanel isOpen={nasaEyesOpen} onOpenChange={setNasaEyesOpen} />
                  <button
                    onClick={() => setShowOrbits((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-sm border text-[9px] font-mono tracking-widest transition-colors text-soft-white hover:text-white ${showOrbits
                      ? "border-cyan-accent/50 bg-cyan-accent/10"
                      : "border-soft-white/10 bg-deep-navy/70 backdrop-blur-sm hover:border-soft-white/25"
                      }`}
                  >
                    {showOrbits ? "ORBITS ON" : "ORBITS OFF"}
                  </button>
                  <ShareButton location={location} time={currentTime} isLiveMode={isLiveMode} selectedId={selectedObject?.id ?? null} />
                </div>
              </div>

              {/* Sky View Spacer (Relative container, floating absolute overlays) */}
              <div className="h-[40dvh] pointer-events-none w-full bg-transparent flex-none relative">

                {/* Floating Zoom Widget in Bottom-Right Corner */}
                <div className="absolute bottom-4 right-4 pointer-events-auto z-20">
                  <ZoomWidget onZoomIn={() => triggerZoom(1)} onZoomOut={() => triggerZoom(-1)} />
                </div>
              </div>

              {/* Menu, Active Panel and Drawer Container (Below the Sky View, occupies remaining height) */}
              <div className="pointer-events-auto w-full flex flex-col bg-deep-navy border-t border-soft-white/10 flex-1 min-h-0 relative z-10">

                {/* ☰ MENU Button Bar (flex-none) */}
                <div className="w-full flex-none">
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono font-medium text-cyan-accent hover:text-white transition-colors"
                  >
                    <span>☰ MENU</span>
                  </button>
                </div>

                {/* ACTIVE PANEL CONTENT (Scrollable, flex-1 min-h-0 uses remaining space) */}
                {activeFeature && (
                  <div className="w-full flex-1 min-h-0 px-4 py-4 overflow-y-auto border-t border-soft-white/5 scrollbar-thin">
                    <div className="flex justify-center w-full">
                      {/* Observer Panel */}
                      <div className={activeFeature === "observer" ? "w-full flex justify-center" : "hidden"}>
                        <ObserverPanel location={location} currentTime={currentTime} sunAltitude={sun?.coordinates.altitude ?? -90} />
                      </div>

                      {/* Observability Panel */}
                      <div className={activeFeature === "observability" ? "w-full flex justify-center" : "hidden"}>
                        <ObservabilityPanel weather={weather} celestialObjects={allObjects} weatherError={weatherError} />
                      </div>

                      {/* Selected Object Panel */}
                      <div className={activeFeature === "selected-object" ? "w-full flex justify-center" : "hidden"}>
                        <ObjectPanel />
                      </div>

                      {/* Sky Map Panel */}
                      <div className={activeFeature === "skymap" ? "w-full flex justify-center" : "hidden"}>
                        <SkyMapPanel celestialObjects={allMapObjects} />
                      </div>

                      {/* Sky Compass */}
                      <div className={activeFeature === "compass" ? "w-full flex justify-center" : "hidden"}>
                        <CompassWidget />
                      </div>

                      {/* Sky Time Machine */}
                      <div className={activeFeature === "time-machine" ? "w-full flex justify-center" : "hidden"}>
                        <TimeControls location={location} />
                      </div>

                      {/* Satellites Visible */}
                      <div className={activeFeature === "satellites-visible" ? "w-full flex justify-center" : "hidden"}>
                        <TleCountWidget count={filteredSatellites.length} />
                      </div>

                      {/* Satellite Filter */}
                      <div className={activeFeature === "satellite-filter" ? "w-full flex justify-center" : "hidden"}>
                        <SatelliteFilter inline={true} />
                      </div>

                      {/* ISS Passes */}
                      <div className={activeFeature === "iss-passes" ? "w-full flex justify-center" : "hidden"}>
                        <PassPredictorPanel passes={passes} isLoading={passLoading} error={passError} location={location} inline={true} />
                      </div>

                      {/* Space Weather */}
                      <div className={activeFeature === "space-weather" ? "w-full flex justify-center" : "hidden"}>
                        <SpaceWeatherPanel {...spaceWeather} inline={true} />
                      </div>

                      {/* Sources */}
                      <div className={activeFeature === "sources" ? "w-full flex justify-center" : "hidden"}>
                        <SourceInspectorPanel sources={sourceEntries} inline={true} />
                      </div>
                    </div>
                  </div>
                )}

                {/* LEFT SLIDE-OUT DRAWER OVERLAY (Rendered absolute inside the container below Sky View) */}
                <AnimatePresence>
                  {drawerOpen && (
                    <div className="absolute inset-0 z-50 flex">
                      {/* Backdrop (Tapping closes the drawer) */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => setDrawerOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                      />

                      {/* Drawer Content Box (Slides in from the left) */}
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative w-[280px] max-w-[85vw] h-full bg-deep-navy border-r border-soft-white/10 flex flex-col z-10 shadow-2xl"
                      >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-soft-white/10 flex-none">
                          <span className="text-xs font-mono font-semibold tracking-wider text-cyan-accent">☰ MENU</span>
                          <button
                            onClick={() => setDrawerOpen(false)}
                            className="text-soft-white/40 hover:text-soft-white text-sm font-mono p-1"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Drawer Accordion Category List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-soft-white/5 scrollbar-thin">

                          {/* Category: Observation */}
                          <div className="flex flex-col">
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === "observation" ? null : "observation")}
                              className="flex items-center justify-between px-4 py-3 text-left text-xs font-mono font-semibold text-soft-white bg-soft-white/[0.01] hover:bg-soft-white/[0.03]"
                            >
                              <span>Observation</span>
                              <span className="text-[9px] text-soft-white/40">{expandedCategory === "observation" ? "▼" : "▶"}</span>
                            </button>
                            {expandedCategory === "observation" && (
                              <div className="flex flex-col pl-6 bg-black/20 divide-y divide-soft-white/5">
                                <button
                                  onClick={() => { setActiveFeature("observer"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "observer" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Observer
                                </button>
                                <button
                                  onClick={() => { setActiveFeature("observability"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "observability" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Observability
                                </button>
                                <button
                                  onClick={() => {
                                    if (selectedObject) {
                                      setActiveFeature("selected-object");
                                      setDrawerOpen(false);
                                    } else {
                                      alert("Please select a celestial object on the sky first.");
                                    }
                                  }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${!selectedObject ? "opacity-35 cursor-not-allowed" : ""} ${activeFeature === "selected-object" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Selected Object {selectedObject ? `(${selectedObject.name})` : ""}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Category: Navigation */}
                          <div className="flex flex-col">
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === "navigation" ? null : "navigation")}
                              className="flex items-center justify-between px-4 py-3 text-left text-xs font-mono font-semibold text-soft-white bg-soft-white/[0.01] hover:bg-soft-white/[0.03]"
                            >
                              <span>Navigation</span>
                              <span className="text-[9px] text-soft-white/40">{expandedCategory === "navigation" ? "▼" : "▶"}</span>
                            </button>
                            {expandedCategory === "navigation" && (
                              <div className="flex flex-col pl-6 bg-black/20 divide-y divide-soft-white/5">
                                <button
                                  onClick={() => { setActiveFeature("skymap"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "skymap" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Sky Map
                                </button>
                                <button
                                  onClick={() => { setActiveFeature("compass"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "compass" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Sky Compass
                                </button>
                                <button
                                  onClick={() => { setActiveFeature("time-machine"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "time-machine" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Sky Time Machine
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Category: Satellites */}
                          <div className="flex flex-col">
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === "satellites" ? null : "satellites")}
                              className="flex items-center justify-between px-4 py-3 text-left text-xs font-mono font-semibold text-soft-white bg-soft-white/[0.01] hover:bg-soft-white/[0.03]"
                            >
                              <span>Satellites</span>
                              <span className="text-[9px] text-soft-white/40">{expandedCategory === "satellites" ? "▼" : "▶"}</span>
                            </button>
                            {expandedCategory === "satellites" && (
                              <div className="flex flex-col pl-6 bg-black/20 divide-y divide-soft-white/5">
                                <button
                                  onClick={() => { setActiveFeature("satellites-visible"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "satellites-visible" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Satellites Visible
                                </button>
                                <button
                                  onClick={() => { setActiveFeature("satellite-filter"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "satellite-filter" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Satellite Filter
                                </button>
                                <button
                                  onClick={() => { setActiveFeature("iss-passes"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "iss-passes" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  ISS Passes
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Category: Environment */}
                          <div className="flex flex-col">
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === "environment" ? null : "environment")}
                              className="flex items-center justify-between px-4 py-3 text-left text-xs font-mono font-semibold text-soft-white bg-soft-white/[0.01] hover:bg-soft-white/[0.03]"
                            >
                              <span>Environment</span>
                              <span className="text-[9px] text-soft-white/40">{expandedCategory === "environment" ? "▼" : "▶"}</span>
                            </button>
                            {expandedCategory === "environment" && (
                              <div className="flex flex-col pl-6 bg-black/20 divide-y divide-soft-white/5">
                                <button
                                  onClick={() => { setActiveFeature("space-weather"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "space-weather" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Space Weather
                                </button>
                                <button
                                  onClick={() => { setActiveFeature("sources"); setDrawerOpen(false); }}
                                  className={`py-2.5 text-left text-[11px] font-mono ${activeFeature === "sources" ? "text-cyan-accent" : "text-soft-white/70"}`}
                                >
                                  Sources
                                </button>
                              </div>
                            )}
                          </div>

                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

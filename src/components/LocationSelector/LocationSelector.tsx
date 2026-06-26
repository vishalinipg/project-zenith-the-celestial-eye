"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapContainer, TileLayer, useMapEvents, Marker } from "react-leaflet";
import L from "leaflet";
import { ObserverLocation } from "@/types/observer";

const GlobeSelector = dynamic(() => import("./GlobeSelector"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-space-black">
      <p className="text-xs font-mono text-soft-white/30 tracking-widest animate-pulse">INITIALIZING 3D GLOBE...</p>
    </div>
  ),
});

// Custom locator pin for Leaflet
const locatorPin = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <defs><radialGradient id="lg" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#78C8FF"/>
      <stop offset="100%" stop-color="#1a6090"/>
    </radialGradient></defs>
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26S32 28 32 16C32 7.16 24.84 0 16 0z" fill="url(#lg)" opacity="0.95"/>
    <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
    <circle cx="16" cy="16" r="3.5" fill="#78C8FF"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

function MapClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, { headers: { Accept: "application/json" } });
    const d = await r.json();
    return d?.address?.city || d?.address?.town || d?.address?.state || d?.display_name?.split(",")[0] || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  } catch { return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`; }
}

async function searchCity(q: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, { headers: { Accept: "application/json" } });
    const d = await r.json();
    return d[0] ? { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) } : null;
  } catch { return null; }
}

export default function LocationSelector({ onConfirm }: { onConfirm: (l: ObserverLocation) => void }) {
  const TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";
  const [view, setView] = useState<"globe" | "map">("globe");
  const [pending, setPending] = useState<{ lat: number; lon: number } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  const pick = useCallback((lat: number, lon: number) => { setPending({ lat, lon }); setSearchErr(null); setGeoErr(null); }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearchErr(null);
    const r = await searchCity(query);
    setSearching(false);
    if (!r) { setSearchErr("Location not found."); return; }
    setPending(r);
  };

  const handleGeo = () => {
    setGeoErr(null);
    if (!navigator.geolocation) { setGeoErr("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setPending({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setGeoErr("Location access denied.")
    );
  };

  const confirm = async () => {
    if (!pending) return;
    setResolving(true);
    const label = await reverseGeocode(pending.lat, pending.lon);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    onConfirm({ latitude: pending.lat, longitude: pending.lon, elevation: 0, label, timezone });
    setResolving(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-space-black overflow-hidden">
      {/* Top bar */}
      <div className="flex-none z-[1001] flex flex-col gap-2 px-4 pt-4 pb-3 bg-deep-navy/90 backdrop-blur-md border-b border-soft-white/10">
        <p className="text-center text-[10px] tracking-[0.28em] font-mono text-soft-white/40">
          PROJECT ZENITH — SELECT YOUR OBSERVING LOCATION
        </p>
        {/* Toggle */}
        <div className="flex justify-center gap-2">
          {(["globe","map"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-5 py-1.5 text-[11px] font-mono tracking-widest rounded-sm border transition-all ${
                view === v ? "border-cyan-accent/70 text-cyan-accent bg-cyan-accent/10" : "border-soft-white/15 text-soft-white/35 hover:border-soft-white/30"
              }`}>
              {v === "globe" ? "3D GLOBE" : "2D MAP"}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="flex gap-2 max-w-lg mx-auto w-full">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Search city or place..."
            className="flex-1 min-w-0 px-3 py-1.5 text-xs font-mono rounded-sm bg-space-black/70
                       border border-soft-white/15 text-soft-white placeholder-soft-white/25
                       focus:outline-none focus:border-cyan-accent/40" />
          <button onClick={handleSearch} disabled={searching || !query.trim()}
            className="px-3 py-1.5 text-[11px] font-mono rounded-sm border border-soft-white/15
                       text-soft-white/50 hover:border-cyan-accent/40 hover:text-cyan-accent
                       disabled:opacity-30 transition-colors whitespace-nowrap">
            {searching ? "..." : "SEARCH"}
          </button>
          <button onClick={handleGeo} title="Use my location"
            className="px-3 py-1.5 text-[11px] font-mono rounded-sm border border-soft-white/15
                       text-soft-white/50 hover:border-cyan-accent/40 hover:text-cyan-accent transition-colors">
            ⊕ ME
          </button>
        </div>
        {(searchErr || geoErr) && (
          <p className="text-center text-[10px] font-mono text-amber-400/70">{searchErr ?? geoErr}</p>
        )}
        {pending && (
          <p className="text-center text-[11px] font-mono text-cyan-accent/60">
            {Math.abs(pending.lat).toFixed(4)}°{pending.lat >= 0 ? "N" : "S"} &nbsp;
            {Math.abs(pending.lon).toFixed(4)}°{pending.lon >= 0 ? "E" : "W"}
          </p>
        )}
      </div>

      {/* Map/Globe */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        {view === "globe" ? (
          <GlobeSelector token={TOKEN} onPick={pick} selected={pending} />
        ) : (
          <MapContainer center={pending ? [pending.lat, pending.lon] : [20, 0]}
            zoom={pending ? 5 : 2} minZoom={2} scrollWheelZoom
            className="w-full h-full" style={{ background: "#05070B" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>' />
            <MapClickHandler onPick={pick} />
            {pending && <Marker position={[pending.lat, pending.lon]} icon={locatorPin} />}
          </MapContainer>
        )}
        {!pending && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <p className="text-[10px] font-mono text-soft-white/20 tracking-wide">
              {view === "globe" ? "Click anywhere on the globe" : "Click anywhere on the map"}
            </p>
          </div>
        )}
      </div>

      {/* Bottom confirm */}
      <div className="flex-none z-[1001] flex items-center justify-center px-4 py-4 bg-deep-navy/90 backdrop-blur-md border-t border-soft-white/10">
        {pending ? (
          <button onClick={confirm} disabled={resolving}
            className="px-10 py-2.5 rounded-sm border border-cyan-accent/50 bg-space-black
                       text-soft-white text-xs tracking-[0.2em] font-mono
                       hover:border-cyan-accent hover:bg-cyan-accent/8
                       active:scale-[0.98] transition-all duration-300 disabled:opacity-40">
            {resolving ? "RESOLVING POSITION..." : "BECOME THE OBSERVER"}
          </button>
        ) : (
          <p className="text-[10px] font-mono text-soft-white/25 tracking-widest">NO LOCATION SELECTED</p>
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useObserverStore } from "@/stores/observerStore";

interface Props {
  token: string;
  onPick: (lat: number, lon: number) => void;
  selected: { lat: number; lon: number } | null;
}

export default function GlobeSelector({ token, onPick, selected }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const handlerRef = useRef<unknown>(null);
  const onPickRef = useRef(onPick);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentTime = useObserverStore((s) => s.currentTime);

  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    let destroyed = false;

    async function init() {
      try {
        // Dynamic import so CESIUM_BASE_URL is already set from layout Script
        const Cesium = await import("cesium");
        // Inject Cesium widget CSS from the static /cesium/ assets we copied
        if (!document.querySelector('link[data-cesium-css]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet"; link.href = "/cesium/Widgets/widgets.css";
          link.setAttribute("data-cesium-css", "1");
          document.head.appendChild(link);
        }

        if (destroyed || !containerRef.current) return;

        Cesium.Ion.defaultAccessToken = token;

        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false, baseLayerPicker: false, fullscreenButton: false,
          geocoder: false, homeButton: false, infoBox: false,
          sceneModePicker: false, selectionIndicator: false,
          timeline: false, navigationHelpButton: false,
        });

        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.dynamicAtmosphereLighting = true;
        viewer.scene.globe.baseColor = Cesium.Color.BLUE;
        viewer.scene.backgroundColor = Cesium.Color.BLACK;

        // Drive day/night terminator from the app's own clock (respects
        // time-travel mode) instead of Cesium's own animated clock.
        viewer.clock.shouldAnimate = false;
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(currentTime);

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(78, 20, 18_000_000),
        });

        viewerRef.current = viewer;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler.setInputAction((e: any) => {
          const position = e.position as { x: number; y: number };
          const ray = viewer.camera.getPickRay(position as unknown as import("cesium").Cartesian2);
          if (!ray) return;
          const pos = viewer.scene.globe.pick(ray, viewer.scene);
          if (!pos) return;
          const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(pos);
          onPickRef.current(
            +(Cesium.Math.toDegrees(carto.latitude).toFixed(4)),
            +(Cesium.Math.toDegrees(carto.longitude).toFixed(4))
          );
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handlerRef.current = handler;
        setLoading(false);
        setError(null);
      } catch (err) {
        if (!destroyed) {
          console.error("Cesium init failed:", err);
          setError("Globe failed to load. Using 2D map mode.");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      try {
        if (handlerRef.current) {
          (handlerRef.current as { destroy(): void }).destroy();
          handlerRef.current = null;
        }
        if (viewerRef.current) {
          const v = viewerRef.current as { isDestroyed(): boolean; destroy(): void };
          if (!v.isDestroyed()) v.destroy();
          viewerRef.current = null;
        }
      } catch {}
    };
  }, [token]);

  // Keep the globe's day/night terminator in sync with the app's clock
  // (including time-travel fast-forward/rewind) without reinitializing Cesium.
  useEffect(() => {
    if (!viewerRef.current) return;
    (async () => {
      const Cesium = await import("cesium");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viewer = viewerRef.current as any;
      if (!viewer || viewer.isDestroyed()) return;
      viewer.clock.currentTime = Cesium.JulianDate.fromDate(currentTime);
    })();
  }, [currentTime]);

  // Update marker when selection changes
  useEffect(() => {
    if (!viewerRef.current) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Cesium = await import("cesium") as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viewer = viewerRef.current as any;
      if (!viewer || viewer.isDestroyed()) return;

      if (markerRef.current) {
        viewer.entities.remove(markerRef.current);
        markerRef.current = null;
      }
      if (!selected) return;

      markerRef.current = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(selected.lon, selected.lat),
        billboard: {
          image: createPinSvg(),
          width: 36, height: 48,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: `${Math.abs(selected.lat).toFixed(2)}°${selected.lat >= 0 ? "N" : "S"} ${Math.abs(selected.lon).toFixed(2)}°${selected.lon >= 0 ? "E" : "W"}`,
          font: "11px monospace",
          fillColor: Cesium.Color.fromCssColorString("#E8EDF5"),
          outlineColor: Cesium.Color.fromCssColorString("#05070B"),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -56),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(selected.lon, selected.lat, 6_000_000),
        duration: 1.4,
        easingFunction: Cesium.EasingFunction.QUARTIC_IN_OUT,
      });
    })();
  }, [selected]);

  return (
    <div className="relative w-full h-full">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-space-black">
          <p className="text-xs font-mono text-soft-white/40 tracking-widest animate-pulse">
            INITIALIZING 3D GLOBE...
          </p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-space-black">
          <p className="text-xs font-mono text-amber-400/70 text-center px-6">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

function createPinSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
    <defs>
      <radialGradient id="g" cx="40%" cy="35%">
        <stop offset="0%" stop-color="#78C8FF"/>
        <stop offset="100%" stop-color="#1a6090"/>
      </radialGradient>
    </defs>
    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="url(#g)" opacity="0.95"/>
    <circle cx="18" cy="18" r="7" fill="white" opacity="0.9"/>
    <circle cx="18" cy="18" r="4" fill="#78C8FF"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

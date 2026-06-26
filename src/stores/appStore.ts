import { create } from "zustand";
import { CelestialObject, SatelliteCategory } from "@/types/celestial";

type CameraMode = "free" | "locked-to-object";

const ALL_CATEGORIES: SatelliteCategory[] = [
  "station", "communication", "navigation", "weather", "science", "other",
];

interface AppStore {
  selectedObjectId: string | null;
  selectedObject: CelestialObject | null;
  cameraMode: CameraMode;
  selectObject: (object: CelestialObject | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  /** Categories currently shown in the sky/globe. Defaults to all enabled. */
  enabledSatelliteCategories: Set<SatelliteCategory>;
  toggleSatelliteCategory: (category: SatelliteCategory) => void;
  resetSatelliteCategories: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  selectedObjectId: null,
  selectedObject: null,
  cameraMode: "free",
  enabledSatelliteCategories: new Set(ALL_CATEGORIES),

  selectObject: (object) =>
    set({
      selectedObjectId: object?.id ?? null,
      selectedObject: object,
      cameraMode: object ? "locked-to-object" : "free",
    }),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  toggleSatelliteCategory: (category) => {
    const current = new Set(get().enabledSatelliteCategories);
    if (current.has(category)) current.delete(category);
    else current.add(category);
    set({ enabledSatelliteCategories: current });
  },

  resetSatelliteCategories: () => set({ enabledSatelliteCategories: new Set(ALL_CATEGORIES) }),
}));

export { ALL_CATEGORIES };

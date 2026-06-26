import { create } from "zustand";
import { ApplicationMode, ObserverLocation, ObserverState } from "@/types/observer";

export type AppMode = "landing" | "selection" | "transition" | "observatory";

/** Positive = forward, negative = rewind, 0 = paused */
export type TimeRate = -3600 | -600 | -60 | 0 | 1 | 60 | 600 | 3600;

interface ObserverStore extends ObserverState {
  appMode: AppMode;
  isPaused: boolean;
  timeRate: TimeRate;
  setLocation: (location: ObserverLocation) => void;
  setMode: (mode: ApplicationMode) => void;
  setAppMode: (mode: AppMode) => void;
  tick: (date: Date) => void;
  resumeLiveMode: () => void;
  setTimeRate: (rate: TimeRate) => void;
  stepTime: (deltaMs: number) => void;
  /** Jump directly to an absolute timestamp (used by the scrub slider). Always exits live mode. */
  setTime: (date: Date) => void;
}

export const useObserverStore = create<ObserverStore>((set) => ({
  location: null,
  currentTime: new Date(),
  isLiveMode: true,
  isPaused: false,
  timeRate: 1,
  mode: "selection",
  appMode: "landing",

  setLocation: (location) => set({ location, mode: "transition", appMode: "transition" }),
  setMode: (mode) => set({ mode }),
  setAppMode: (mode) => set({ appMode: mode }),

  tick: (date) => set((s) => (s.isLiveMode && s.timeRate === 1 ? { currentTime: date } : s)),

  resumeLiveMode: () => set({ currentTime: new Date(), isLiveMode: true, timeRate: 1, isPaused: false }),

  setTimeRate: (rate) => set({
    timeRate: rate,
    isPaused: rate === 0,
    isLiveMode: rate === 1,
  }),

  stepTime: (deltaMs) => set((s) => ({
    currentTime: new Date(s.currentTime.getTime() + deltaMs),
    isLiveMode: false,
  })),

  setTime: (date) => set({ currentTime: date, isLiveMode: false, isPaused: true, timeRate: 0 }),
}));

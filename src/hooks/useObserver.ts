"use client";
import { useEffect } from "react";
import { useObserverStore } from "@/stores/observerStore";

const TICK_MS = 250;

export function useObserverClock() {
  useEffect(() => {
    const interval = setInterval(() => {
      const { isPaused, timeRate, tick, stepTime } = useObserverStore.getState();
      if (isPaused || timeRate === 0) return;
      if (timeRate === 1) {
        tick(new Date());
      } else {
        stepTime(TICK_MS * timeRate);
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);
}

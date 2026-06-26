"use client";
import { useState } from "react";
import { useAppStore, ALL_CATEGORIES } from "@/stores/appStore";
import { SatelliteCategory } from "@/types/celestial";

const CATEGORY_LABEL: Record<SatelliteCategory, string> = {
  station: "Stations",
  communication: "Comms",
  navigation: "Navigation",
  weather: "Weather",
  science: "Science",
  other: "Other",
};

export default function SatelliteFilter({
  isOpen: controlledOpen,
  onOpenChange,
  inline = false,
}: {
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
  inline?: boolean;
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };
  const enabled = useAppStore((s) => s.enabledSatelliteCategories);
  const toggle = useAppStore((s) => s.toggleSatelliteCategory);

  const allOn = enabled.size === ALL_CATEGORIES.length;

  if (inline) {
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 w-full max-w-[280px]">
        <p className="text-[8px] tracking-[0.2em] text-cyan-accent/65 font-mono mb-1">CATEGORIES</p>
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
          {ALL_CATEGORIES.map((cat) => {
            const isOn = enabled.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggle(cat)}
                className={`flex items-center gap-1.5 px-1.5 py-1 rounded-sm text-[10px] font-mono transition-colors text-left ${isOn ? "text-cyan-accent" : "text-soft-white/30"
                  }`}
              >
                <span className={`w-2.5 h-2.5 rounded-sm border flex-none ${isOn ? "bg-cyan-accent/70 border-cyan-accent/70" : "border-soft-white/25"
                  }`} />
                {CATEGORY_LABEL[cat]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1.5 rounded-sm border text-[9px] font-mono tracking-wider transition-all duration-200 w-full text-center bg-deep-navy/70 backdrop-blur-sm focus:outline-none text-soft-white hover:text-white ${open || !allOn
          ? "border-cyan-accent/50 bg-cyan-accent/10"
          : "border-soft-white/10 hover:border-soft-white/25"
          }`}
        title="Filter satellites by category"
      >
        SAT FILTER{!allOn ? ` (${enabled.size})` : ""}
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 min-w-[130px]">
          <p className="text-[8px] tracking-[0.2em] text-cyan-accent/65 font-mono mb-1">CATEGORIES</p>
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[78px] pr-1 scrollbar-thin">
            {ALL_CATEGORIES.map((cat) => {
              const isOn = enabled.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded-sm text-[10px] font-mono transition-colors text-left ${isOn ? "text-cyan-accent" : "text-soft-white/30"
                    }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-sm border flex-none ${isOn ? "bg-cyan-accent/70 border-cyan-accent/70" : "border-soft-white/25"
                    }`} />
                  {CATEGORY_LABEL[cat]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

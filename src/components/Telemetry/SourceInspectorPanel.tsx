"use client";

import { useState } from "react";

export type SourceStatus = "live" | "loading" | "error" | "demo";

export interface SourceEntry {
  label: string;
  status: SourceStatus;
  detail?: string;
}

const STATUS_COLOR: Record<SourceStatus, string> = {
  live: "#78c8ff",
  loading: "#9bb8ff",
  error: "#ffb38a",
  demo: "#ffd9a0",
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  live: "LIVE",
  loading: "LOADING",
  error: "FALLBACK",
  demo: "DEMO KEY",
};

interface SourceInspectorPanelProps {
  sources: SourceEntry[];
}

export default function SourceInspectorPanel({ sources, isOpen: controlledOpen, onOpenChange, inline = false }: SourceInspectorPanelProps & {
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
  inline?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };
  const hasIssue = sources.some((s) => s.status === "error" || s.status === "demo");

  if (inline) {
    return (
      <div className="flex flex-col gap-1.5 px-3 py-3 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 w-full max-w-[280px]">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[8px] tracking-[0.2em] text-cyan-accent/65 font-mono">SOURCE INSPECTOR</p>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
          {sources.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-2 text-[10px] font-mono">
              <span className="text-soft-white/55 truncate">{s.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {s.detail && <span className="text-soft-white/25 text-[9px]">{s.detail}</span>}
                <span
                  className="px-1.5 py-0.5 rounded-sm text-[8px] tracking-wider"
                  style={{ color: STATUS_COLOR[s.status], border: `1px solid ${STATUS_COLOR[s.status]}40` }}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[8px] font-mono text-soft-white/20 pt-1.5 mt-1 border-t border-soft-white/8">
          FALLBACK = cached/last-known data &middot; DEMO KEY = NASA rate-limited key
        </p>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1.5 rounded-sm border text-[9px] font-mono tracking-wider transition-all duration-200 w-full text-center bg-deep-navy/70 backdrop-blur-sm focus:outline-none text-soft-white hover:text-white ${open
          ? "border-cyan-accent/50 bg-cyan-accent/10"
          : "border-soft-white/10 hover:border-soft-white/25"
          }`}
        title="Live data source status"
      >
        SOURCES{hasIssue ? " ⚠" : ""}
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 px-3 py-3 rounded-sm bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 w-[230px]">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[8px] tracking-[0.2em] text-cyan-accent/65 font-mono">SOURCE INSPECTOR</p>
            <button onClick={() => setOpen(false)} className="text-soft-white/30 hover:text-soft-white text-xs">✕</button>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[100px] pr-1 scrollbar-thin">
            {sources.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-2 text-[10px] font-mono">
                <span className="text-soft-white/55 truncate">{s.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.detail && <span className="text-soft-white/25 text-[9px]">{s.detail}</span>}
                  <span
                    className="px-1.5 py-0.5 rounded-sm text-[8px] tracking-wider"
                    style={{ color: STATUS_COLOR[s.status], border: `1px solid ${STATUS_COLOR[s.status]}40` }}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[8px] font-mono text-soft-white/20 pt-1.5 mt-1 border-t border-soft-white/8">
            FALLBACK = cached/last-known data &middot; DEMO KEY = NASA rate-limited key
          </p>
        </div>
      )}
    </div>
  );
}

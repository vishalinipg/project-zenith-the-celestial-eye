"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useAiExplanation } from "@/hooks/useAiExplanation";
import { useAiQuestion } from "@/hooks/useAiQuestion";
import { ExplanationLevel } from "@/services/ai/explanationService";
import { CelestialObjectType } from "@/types/celestial";

const TYPE_LABEL: Record<CelestialObjectType, string> = {
  sun: "Star — G-type Main Sequence",
  moon: "Natural Satellite",
  planet: "Solar System Planet",
  iss: "Space Station",
  satellite: "Artificial Satellite",
  star: "Star",
  constellation: "Constellation",
  nebula: "Nebula",
  galaxy: "Galaxy",
  comet: "Comet",
  asteroid: "Asteroid",
};

const LEVELS: { id: ExplanationLevel; label: string }[] = [
  { id: "beginner", label: "Simple" },
  { id: "enthusiast", label: "Enthusiast" },
  { id: "technical", label: "Technical" },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-soft-white/40 shrink-0 text-[11px]">{label}</span>
      <span className="text-right text-[11px] text-soft-white/75 break-all">{value}</span>
    </div>
  );
}

const CARDINAL = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N"];

export default function ObjectPanel() {
  const selected = useAppStore((s) => s.selectedObject);
  const selectObject = useAppStore((s) => s.selectObject);
  const { explanation, isLoading, error, fetch: fetchExplanation } = useAiExplanation();
  const { history: qaHistory, isLoading: isAsking, error: askError, ask, pendingRetry, clear: clearQa } = useAiQuestion();
  const [level, setLevel] = useState<ExplanationLevel>("enthusiast");
  const [expanded, setExpanded] = useState(true);
  const [question, setQuestion] = useState("");

  useEffect(() => { if (selected) { setExpanded(true); clearQa(); setQuestion(""); } }, [selected?.id]);

  if (!selected) return null;

  const az = selected.coordinates.azimuth;
  const dir = CARDINAL[Math.round(az / 22.5)] ?? "N";

  return (
    <div className="pointer-events-auto flex flex-col w-[260px] max-h-[55vh] rounded-sm
                    bg-deep-navy/75 backdrop-blur-sm border border-soft-white/10 shadow-2xl overflow-hidden">

      {/* Header — always visible */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-soft-white/8 flex-none">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] md:text-[10px] tracking-[0.2em] text-cyan-accent/70 font-mono mb-1.5">SELECTED OBJECT</p>
          <p className="text-sm font-semibold text-soft-white truncate">{selected.name}</p>
          <p className="text-[10px] text-soft-white/40 font-mono">{TYPE_LABEL[selected.type]}</p>
        </div>
        <div className="flex gap-1.5 ml-2">
          <button onClick={() => setExpanded((v) => !v)}
            className="w-5 h-5 flex items-center justify-center text-soft-white/30 hover:text-soft-white/60 text-xs">
            {expanded ? "−" : "+"}
          </button>
          <button onClick={() => selectObject(null)}
            className="w-5 h-5 flex items-center justify-center text-soft-white/30 hover:text-soft-white text-xs">
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 text-[11px] font-mono">

          {/* Description */}
          {selected.description && (
            <p className="text-soft-white/50 leading-relaxed text-[11px]">{selected.description}</p>
          )}

          {/* Position */}
          <div className="space-y-1.5">
            <p className="text-[8px] tracking-[0.2em] text-cyan-accent/55">POSITION</p>
            <Row label="Altitude" value={`${selected.coordinates.altitude.toFixed(2)}°`} />
            <Row label="Azimuth" value={`${selected.coordinates.azimuth.toFixed(2)}°`} />
            <Row label="Direction" value={dir} />
            <Row label="Visibility" value={selected.isVisible ? "Above horizon" : "Below horizon"} />
          </div>

          {/* Data */}
          <div className="space-y-1.5 border-t border-soft-white/8 pt-2.5">
            <p className="text-[8px] tracking-[0.2em] text-cyan-accent/55">DATA</p>
            {selected.magnitude !== undefined && <Row label="Magnitude" value={selected.magnitude.toFixed(2)} />}
            {selected.altitudeKm !== undefined && <Row label="Orbital alt" value={`${selected.altitudeKm.toFixed(0)} km`} />}
            {selected.velocityKmS !== undefined && <Row label="Velocity" value={`${selected.velocityKmS.toFixed(2)} km/s`} />}
            {selected.illumination !== undefined && (
              <Row label="Illumination" value={`${(selected.illumination * 100).toFixed(0)}%`} />
            )}
            <Row label="Type" value={selected.type.toUpperCase()} />
            <Row label="Last updated" value={selected.lastUpdated.toLocaleTimeString("en-GB", { hour12: false })} />
          </div>

          {/* AI explanation */}
          <div className="border-t border-soft-white/8 pt-2.5">
            <p className="text-[8px] tracking-[0.2em] text-cyan-accent/55 mb-2">AI EXPLANATION</p>
            <div className="flex gap-1 mb-2">
              {LEVELS.map((l) => (
                <button key={l.id}
                  onClick={() => { setLevel(l.id); fetchExplanation(selected, l.id); }}
                  className={`flex-1 py-0.5 text-[9px] font-mono rounded-sm border transition-colors ${level === l.id ? "border-cyan-accent/55 text-cyan-accent bg-cyan-accent/10" : "border-soft-white/12 text-soft-white/30 hover:border-soft-white/25"
                    }`}>
                  {l.label}
                </button>
              ))}
            </div>
            <div className="min-h-[3rem]">
              {isLoading && <p className="text-soft-white/25 animate-pulse text-[11px]">Generating...</p>}
              {!isLoading && error && (
                <div className="space-y-1">
                  <p className="text-soft-white/20 text-[11px]">{error}</p>
                  <button
                    onClick={() => fetchExplanation(selected, level)}
                    className="text-cyan-accent/40 hover:text-cyan-accent transition-colors text-[11px]"
                  >
                    Try again →
                  </button>
                </div>
              )}
              {!isLoading && !error && explanation?.objectId === selected.id && (
                <p className="text-soft-white/60 leading-relaxed text-[11px]">{explanation.text}</p>
              )}
              {!isLoading && !error && (!explanation || explanation.objectId !== selected.id) && (
                <button onClick={() => fetchExplanation(selected, level)}
                  className="text-cyan-accent/40 hover:text-cyan-accent transition-colors text-[11px]">
                  Explain this object →
                </button>
              )}
            </div>
          </div>

          {/* Ask your own question */}
          <div className="border-t border-soft-white/8 pt-2.5">
            <p className="text-[8px] tracking-[0.2em] text-cyan-accent/55 mb-2">ASK ABOUT THIS</p>

            {qaHistory.length > 0 && (
              <div className="space-y-2.5 mb-2.5 max-h-40 overflow-y-auto pr-1">
                {qaHistory.map((qa, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-soft-white/45 text-[11px] italic">"{qa.question}"</p>
                    <p className="text-soft-white/65 leading-relaxed text-[11px]">{qa.text}</p>
                  </div>
                ))}
              </div>
            )}

            {isAsking && <p className="text-soft-white/25 animate-pulse text-[11px] mb-2">Thinking...</p>}

            {!isAsking && askError && (
              <div className="space-y-1 mb-2">
                <p className="text-soft-white/20 text-[11px]">{askError}</p>
                {pendingRetry && (
                  <button
                    onClick={() => ask(selected, pendingRetry)}
                    className="text-cyan-accent/40 hover:text-cyan-accent transition-colors text-[11px]"
                  >
                    Try again →
                  </button>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!question.trim() || isAsking) return;
                ask(selected, question);
                setQuestion("");
              }}
              className="flex gap-1.5"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. why does it look fuzzy?"
                maxLength={300}
                disabled={isAsking}
                className="flex-1 bg-soft-white/5 border border-soft-white/12 rounded-sm px-2 py-1
                           text-[11px] text-soft-white/80 placeholder:text-soft-white/25
                           focus:outline-none focus:border-cyan-accent/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isAsking || !question.trim()}
                className="px-2.5 py-1 text-[10px] font-mono rounded-sm border border-cyan-accent/30
                           text-cyan-accent/70 hover:border-cyan-accent/60 hover:text-cyan-accent
                           transition-colors disabled:opacity-30 disabled:hover:border-cyan-accent/30"
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

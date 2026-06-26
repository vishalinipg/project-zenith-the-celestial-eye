"use client";
import { motion } from "framer-motion";
import { useObserverStore } from "@/stores/observerStore";

const FEATURES = [
  { icon: "🌍", label: "Any Location on Earth" },
  { icon: "🛸", label: "Live ISS + Satellite Tracking" },
  { icon: "🪐", label: "Real-Time Planet Positions" },
  { icon: "🌙", label: "Time Machine — Scrub Past & Future" },
  { icon: "📡", label: "Upcoming ISS Pass Predictions" },
  { icon: "🌤", label: "Weather & Observability Score" },
  { icon: "✨", label: "Star Constellations" },
  { icon: "🤖", label: "AI Object Explanations" },
];

export default function LandingPage() {
  const setAppMode = useObserverStore((s) => s.setAppMode);
  const setMode = useObserverStore((s) => s.setMode);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-space-black">
      {/* Animated starfield */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 120 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-soft-white"
            style={{
              width: Math.random() * 2 + 0.5,
              height: Math.random() * 2 + 0.5,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{
              duration: 2 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(120,200,255,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">
        {/* Logo / Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <p className="text-[10px] tracking-[0.5em] font-mono text-cyan-accent/50 mb-4 uppercase">
            Aaruush &apos;26 · AstralWeb Innovate
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-soft-white leading-tight mb-3">
            Project <span className="text-cyan-accent">Zenith</span>
          </h1>
          <p className="text-lg md:text-xl font-light text-soft-white/60 mb-2">
            The Celestial Eye
          </p>
          <p className="text-sm text-soft-white/35 font-mono tracking-wide max-w-md mx-auto">
            A real-time cosmic observatory. Select any location on Earth
            and observe the precise sky above you.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mt-8 sm:mt-10 mb-10 sm:mb-12 w-full"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.08 }}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-sm border border-soft-white/8
                         bg-deep-navy/40 backdrop-blur-sm text-left"
            >
              <span className="text-sm sm:text-base shrink-0">{f.icon}</span>
              <span className="text-[10px] sm:text-[11px] font-mono text-soft-white/60 leading-snug">{f.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          onClick={() => { setAppMode("selection"); setMode("selection"); }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="px-12 py-4 rounded-sm border border-cyan-accent/60
                     bg-cyan-accent/10 text-soft-white text-sm tracking-[0.2em]
                     font-mono hover:bg-cyan-accent/20 hover:border-cyan-accent
                     transition-all duration-300 relative overflow-hidden"
        >
          <span className="relative z-10">ENTER OBSERVATORY</span>
          <motion.div
            className="absolute inset-0 bg-cyan-accent/5"
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>

        <p className="mt-6 text-[10px] font-mono text-soft-white/20 tracking-widest">
          POWERED BY ASTRONOMY-ENGINE · CELESTRAK · OPEN-METEO · GEMINI AI
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface NasaEyesPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NasaEyesPanel({ isOpen, onOpenChange }: NasaEyesPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Launch Button */}
      <button
        onClick={() => onOpenChange(true)}
        className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border
                   border-soft-white/15 bg-deep-navy/70 backdrop-blur-sm text-[9px] font-mono
                   text-soft-white hover:text-white hover:border-cyan-accent/40
                   transition-colors duration-200 tracking-wide whitespace-nowrap"
      >
        <span>🌌</span>
        <span>NASA EYES</span>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[99999] bg-black"
              >
                {/* Close Button */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="fixed bottom-6 right-6 z-[100000]
                             px-4 py-2 rounded-md
                             bg-black/80 backdrop-blur-md
                             border border-cyan-accent/40
                             text-white text-xs font-mono"
                >
                  ✕ CLOSE
                </button>

                {/* NASA iframe */}
                <iframe
                  src="https://eyes.nasa.gov/apps/solar-system/#/home?interactPrompt=true&surfaceMapTiling=true&hd=true"
                  className="w-full h-full border-0"
                  allowFullScreen
                  title="NASA Eyes on the Solar System"
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
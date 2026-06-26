"use client";

import { useState } from "react";
import { ObserverLocation } from "@/types/observer";
import { buildShareUrl } from "@/utils/shareLink";

interface ShareButtonProps {
  location: ObserverLocation;
  time: Date;
  isLiveMode: boolean;
  selectedId: string | null;
}

export default function ShareButton({ location, time, isLiveMode, selectedId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = buildShareUrl(location, time, isLiveMode, selectedId);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API can fail in insecure contexts — fall back to a prompt.
      window.prompt("Copy this link:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={handleShare}
      className="pointer-events-auto px-3 py-1.5 rounded-sm border border-soft-white/10
                 bg-deep-navy/70 backdrop-blur-sm text-[9px] font-mono tracking-widest
                 hover:text-white hover:border-soft-white/25 transition-colors
                 text-soft-white"
      title="Copy a shareable link to this view"
    >
      {copied ? "LINK COPIED ✓" : "SHARE"}
    </button>
  );
}

"use client";

import { useState, useCallback } from "react";
import {
  requestAiAnswer,
  AiAnswer,
  ExplanationUnavailableError,
} from "@/services/ai/explanationService";
import { CelestialObject } from "@/types/celestial";

interface UseAiQuestionResult {
  history: AiAnswer[];
  isLoading: boolean;
  error: string | null;
  ask: (object: CelestialObject, question: string) => Promise<void>;
  /** Last question that failed, so the UI can offer a retry without retyping. */
  pendingRetry: string | null;
  clear: () => void;
}

export function useAiQuestion(): UseAiQuestionResult {
  const [history, setHistory] = useState<AiAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);

  const ask = useCallback(async (object: CelestialObject, question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await requestAiAnswer(object, trimmed);
      setHistory((prev) => [...prev, result]);
      setPendingRetry(null);
    } catch (err) {
      setError(
        err instanceof ExplanationUnavailableError
          ? err.message
          : "Couldn't get an answer right now."
      );
      setPendingRetry(trimmed);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    setError(null);
    setPendingRetry(null);
  }, []);

  return { history, isLoading, error, ask, pendingRetry, clear };
}

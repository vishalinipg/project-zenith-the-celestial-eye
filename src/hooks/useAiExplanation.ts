"use client";

import { useState, useCallback, useRef } from "react";
import {
  requestAiExplanation,
  ExplanationLevel,
  AiExplanation,
  ExplanationUnavailableError,
} from "@/services/ai/explanationService";
import { CelestialObject } from "@/types/celestial";

interface UseAiExplanationResult {
  explanation: AiExplanation | null;
  isLoading: boolean;
  error: string | null;
  fetch: (object: CelestialObject, level: ExplanationLevel) => Promise<void>;
}

export function useAiExplanation(): UseAiExplanationResult {
  const [explanation, setExplanation] = useState<AiExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-session cache: maps `${objectId}:${level}` to the explanation text.
  const cache = useRef<Map<string, AiExplanation>>(new Map());

  const fetch = useCallback(
    async (object: CelestialObject, level: ExplanationLevel) => {
      const key = `${object.id}:${level}`;
      const cached = cache.current.get(key);
      if (cached) {
        setExplanation(cached);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await requestAiExplanation(object, level);
        cache.current.set(key, result);
        setExplanation(result);
      } catch (err) {
        setError(
          err instanceof ExplanationUnavailableError
            ? err.message
            : "AI explanation temporarily unavailable."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { explanation, isLoading, error, fetch: fetch };
}

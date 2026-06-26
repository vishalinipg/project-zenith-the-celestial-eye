import { CelestialObject } from "@/types/celestial";

export type ExplanationLevel = "beginner" | "enthusiast" | "technical";

export interface AiExplanation {
  objectId: string;
  level: ExplanationLevel;
  text: string;
  generatedAt: Date;
}

export interface AiAnswer {
  objectId: string;
  question: string;
  text: string;
  generatedAt: Date;
}

export class ExplanationUnavailableError extends Error {
  constructor(message?: string) {
    super(message ?? "AI explanation temporarily unavailable.");
    this.name = "ExplanationUnavailableError";
  }
}

function buildFacts(object: CelestialObject): string {
  return [
    `Name: ${object.name}`,
    `Type: ${object.type}`,
    `Current altitude above horizon: ${object.coordinates.altitude.toFixed(1)}°`,
    `Current azimuth: ${object.coordinates.azimuth.toFixed(1)}°`,
    object.magnitude !== undefined
      ? `Apparent magnitude: ${object.magnitude.toFixed(2)}`
      : null,
    object.altitudeKm !== undefined
      ? `Orbital altitude: ${object.altitudeKm.toFixed(0)} km`
      : null,
    object.velocityKmS !== undefined
      ? `Velocity: ${object.velocityKmS.toFixed(2)} km/s`
      : null,
    object.description ?? null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPrompt(object: CelestialObject, level: ExplanationLevel): string {
  const levelGuide: Record<ExplanationLevel, string> = {
    beginner:
      "Use simple, everyday language a curious 12-year-old could understand. Avoid jargon. Focus on wonder and scale.",
    enthusiast:
      "Use correct astronomical terminology but keep it conversational. The reader knows basic astronomy.",
    technical:
      "Use precise scientific terminology. Include relevant quantities (magnitude, orbital mechanics, etc.).",
  };

  const facts = buildFacts(object);

  return (
    `You are an astronomy educator. Explain the following celestial object currently visible ` +
    `in the observer's sky. ${levelGuide[level]} ` +
    `Keep your response to 2–3 sentences. Do not start with "Sure" or "Certainly". ` +
    `Do not repeat the object's name as the first word.\n\n` +
    `Object data:\n${facts}`
  );
}

function buildQuestionPrompt(object: CelestialObject, question: string): string {
  const facts = buildFacts(object);
  return (
    `You are an astronomy educator answering a curious observer's question about something ` +
    `they're currently looking at in the sky. Answer ONLY using the object data below plus ` +
    `well-established astronomical knowledge about this object — do not invent specifics you're unsure of. ` +
    `If the question isn't really about this object or can't be answered from what's known, say so briefly ` +
    `and redirect to what you do know. Keep the answer to 2–4 sentences, conversational, no preamble like "Sure" or "Great question".\n\n` +
    `Object data:\n${facts}\n\n` +
    `Observer's question: ${question}`
  );
}

/**
 * Requests an AI-generated explanation for a celestial object from the
 * Anthropic API. This is intentionally called from a Next.js API route
 * (see app/api/explain/route.ts) rather than client-side, so the API
 * key never reaches the browser.
 *
 * The explanation cache keyed on `${objectId}:${level}` lives in the
 * calling hook (useAiExplanation) — we never re-request for the same
 * object+level pair in a session.
 */
export async function requestAiExplanation(
  object: CelestialObject,
  level: ExplanationLevel
): Promise<AiExplanation> {
  let response: Response;

  try {
    response = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object, level }),
    });
  } catch {
    throw new ExplanationUnavailableError();
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      const errData = await response.json();
      message = errData?.error;
    } catch {
      // fall through to default message
    }
    throw new ExplanationUnavailableError(message);
  }

  let data: { text: string };
  try {
    data = await response.json();
  } catch {
    throw new ExplanationUnavailableError();
  }

  return {
    objectId: object.id,
    level,
    text: data.text,
    generatedAt: new Date(),
  };
}

export async function requestAiAnswer(
  object: CelestialObject,
  question: string
): Promise<AiAnswer> {
  let response: Response;

  try {
    response = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object, question }),
    });
  } catch {
    throw new ExplanationUnavailableError();
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      const errData = await response.json();
      message = errData?.error;
    } catch {
      // fall through to default message
    }
    throw new ExplanationUnavailableError(message);
  }

  let data: { text: string };
  try {
    data = await response.json();
  } catch {
    throw new ExplanationUnavailableError();
  }

  return {
    objectId: object.id,
    question,
    text: data.text,
    generatedAt: new Date(),
  };
}

export { buildPrompt, buildQuestionPrompt };

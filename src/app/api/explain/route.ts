import { NextRequest, NextResponse } from "next/server";
import { buildPrompt, buildQuestionPrompt } from "@/services/ai/explanationService";
import { CelestialObject } from "@/types/celestial";
import { ExplanationLevel } from "@/services/ai/explanationService";

export const runtime = "edge";

const MAX_QUESTION_LENGTH = 300;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI explanations not configured." }, { status: 503 });
  }

  let body: { object: CelestialObject; level?: ExplanationLevel; question?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const { object, level, question } = body;
  if (!object || (!level && !question))
    return NextResponse.json({ error: "Missing object and level/question." }, { status: 400 });

  if (question && question.trim().length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Question is too long (max ${MAX_QUESTION_LENGTH} characters).` },
      { status: 400 }
    );
  }

  const prompt = question
    ? buildQuestionPrompt(object, question.trim())
    : buildPrompt(object, level as ExplanationLevel);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 300,
      temperature: 0.65,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const MAX_ATTEMPTS = 3;
  const RETRYABLE_STATUSES = new Set([500, 503]);

  let geminiRes: Response | null = null;
  let lastErrBody = "";
  let isDailyQuotaExhausted = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      geminiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
    } catch {
      geminiRes = null;
    }

    if (geminiRes?.ok) break;

    if (geminiRes) {
      lastErrBody = await geminiRes.text();
      isDailyQuotaExhausted = geminiRes.status === 429 && lastErrBody.includes("PerDay");
      console.error(`Gemini API error (${geminiRes.status}), attempt ${attempt}/${MAX_ATTEMPTS}:`, lastErrBody);
      if (isDailyQuotaExhausted || !RETRYABLE_STATUSES.has(geminiRes.status)) break;
    } else {
      console.error(`Gemini fetch failed (network error), attempt ${attempt}/${MAX_ATTEMPTS}`);
    }

    if (attempt < MAX_ATTEMPTS) {
      const delayMs = 500 * 2 ** (attempt - 1); // 500ms, 1000ms, ...
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  if (!geminiRes) {
    return NextResponse.json(
      { error: "Couldn't reach the AI service. Check your connection and try again." },
      { status: 502 }
    );
  }

  if (!geminiRes.ok) {
    let message = "AI explanation unavailable.";
    if (isDailyQuotaExhausted) {
      message = "Daily AI quota reached for today. Try again tomorrow, or enable billing on your Gemini API key for unlimited requests.";
    } else if (geminiRes.status === 503 || geminiRes.status === 429) {
      message = "The AI service is busy right now. Please try again in a few seconds.";
    }
    return NextResponse.json({ error: message, detail: lastErrBody }, { status: 502 });
  }

  const data = await geminiRes.json();
  const finishReason = data?.candidates?.[0]?.finishReason;
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (finishReason && finishReason !== "STOP") {
    console.warn(`Gemini finishReason: ${finishReason} (response may be truncated)`);
  }
  if (!text) {
    console.error("Gemini returned no text. Full response:", JSON.stringify(data));
    return NextResponse.json({ error: "Empty explanation received." }, { status: 502 });
  }

  return NextResponse.json({ text });
}

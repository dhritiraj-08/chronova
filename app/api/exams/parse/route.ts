import { NextRequest, NextResponse } from "next/server";
import { EXAM_PARSE_SYSTEM_PROMPT } from "@/lib/scheduling/prompts";

export const runtime = "edge";

const MODEL_TIMEOUT_MS = 25_000;

// Vision-capable free models only — an uploaded exam timetable is usually a
// photo or screenshot, so every candidate here must support image input
// (verified live against OpenRouter's /api/v1/models on 2026-09-10).
// Text-paste requests reuse the same list (they all handle plain text fine
// too) plus "openrouter/free" as one extra last-resort fallback.
const VISION_MODELS = ["nex-agi/nex-n2.5-mini:free", "google/gemma-4-31b-it:free", "nex-agi/nex-n2.5-pro:free"];
const TEXT_MODELS = [...VISION_MODELS, "openrouter/free"];

async function tryModel(model: string, apiKey: string, messages: any[]): Promise<string | null> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Chronova AI",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1500,
        temperature: 0.3,
        reasoning: { exclude: true },
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      console.warn(`[Exam Parse] Failed with model ${model}: ${response.status} - ${await response.text()}`);
      return null;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err: any) {
    console.warn(`[Exam Parse] Exception with model ${model}:`, err?.name === "AbortError" ? "timed out" : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Strips a ```json ... ``` (or bare ```) fence if the model wrapped the array
// in one despite being told not to — cheap insurance against an otherwise
// perfectly good response failing to parse.
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const { text, imageBase64, mimeType } = await req.json();
    const trimmedText = typeof text === "string" ? text.trim() : "";

    if (!trimmedText && !imageBase64) {
      return NextResponse.json({ error: "Provide an image or paste the exam schedule as text." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "The AI service isn't configured yet — ask your admin to set OPENROUTER_API_KEY." }, { status: 503 });
    }

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
    const systemPrompt = EXAM_PARSE_SYSTEM_PROMPT.replace("{{TODAY}}", today);

    const userContent = imageBase64
      ? [
          { type: "text", text: trimmedText ? `Additional context from the student: ${trimmedText}` : "Parse this exam timetable image." },
          { type: "image_url", image_url: { url: `data:${mimeType || "image/png"};base64,${imageBase64}` } },
        ]
      : trimmedText;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    const modelsToTry = imageBase64 ? VISION_MODELS : TEXT_MODELS;
    let lastRawAttempt = "";

    for (const model of modelsToTry) {
      const raw = await tryModel(model, apiKey, messages);
      if (raw === null) continue;
      lastRawAttempt = raw;
      const cleaned = stripCodeFence(raw);
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          return NextResponse.json({ exams: parsed });
        }
      } catch {
        // Not valid JSON from this model — try the next one.
      }
    }

    console.warn("[Exam Parse] All models failed or returned unparseable output. Last attempt:", lastRawAttempt.slice(0, 300));
    return NextResponse.json(
      { error: "Couldn't read exam details from that. Try a clearer image, or paste the schedule as plain text instead." },
      { status: 422 }
    );
  } catch (err: any) {
    console.error("Exam parse API error:", err);
    return NextResponse.json({ error: err.message || "Something went wrong while parsing." }, { status: 500 });
  }
}

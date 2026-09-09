import { NextRequest } from "next/server";
import { CHAT_SYSTEM_PROMPT } from "@/lib/scheduling/prompts";

export const runtime = "edge";

// Below this many trimmed characters, a completion is treated as unusable
// rather than a real answer. This is what actually catches the silent
// "Apply Changes does nothing" bug: OpenRouter's bare "openrouter/free"
// alias (an auto-router across whatever free models are up) returns HTTP 200
// even when it hands back an empty body or stray moderation output like
// "User Safety: safe" instead of a completion — there is no error to catch,
// just unusable content. The old code only advanced to the next fallback
// model on a network/HTTP failure, so a "successful" 200 full of garbage was
// accepted and streamed straight to the user, who saw a blank or nonsense
// reply with no <timetable_data> block — and Apply Changes had nothing to
// apply.
const MIN_USABLE_LENGTH = 20;

function isUsableCompletion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_USABLE_LENGTH) return false;
  // Guards against the exact garbage observed from "openrouter/free": bare
  // safety/moderation metadata standing in for an actual reply.
  if (/^user safety/i.test(trimmed)) return false;
  return true;
}

// Individual free-tier providers occasionally never finish a response (seen
// live: a 120B model that hung mid-stream for 90+ seconds with no [DONE]).
// Without a cap, one slow provider blocks the entire fallback chain — the
// request just hangs instead of moving on to the next model.
const MODEL_TIMEOUT_MS = 25_000;

// Fully reads one OpenRouter streaming completion and returns the
// concatenated content, or null if the request itself failed (network error,
// non-2xx, or it exceeded MODEL_TIMEOUT_MS). Content-quality
// (isUsableCompletion) is checked by the caller so it can move on to the
// next fallback model.
async function fetchModelCompletion(attemptModel: string, apiKey: string, formattedMessages: any[]): Promise<string | null> {
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
        model: attemptModel,
        messages: formattedMessages,
        stream: true,
        temperature: 0.7,
        // Raised from 1000: the system prompt requires the model to echo the
        // FULL updated weekly event array (existing + new/changed sessions)
        // whenever it proposes a schedule change, not just the delta. For
        // anything beyond a couple of events that JSON alone can approach or
        // exceed 1000 tokens, truncating the response mid-array before the
        // closing </timetable_data> tag — which silently fails to parse.
        max_tokens: 2048,
        // Most current OpenRouter free models are "reasoning" models that
        // spend completion tokens on a hidden chain-of-thought before the
        // visible answer (confirmed live: several burned the entire
        // max_tokens budget on reasoning alone, returning empty content).
        // exclude:true stops that reasoning text from being generated/
        // counted against the budget on models that honor it, leaving the
        // full token budget for the actual reply.
        reasoning: { exclude: true },
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      console.warn(`[Chat API] Failed with model ${attemptModel}: ${response.status} - ${await response.text()}`);
      return null;
    }

    const reader = response.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine || !cleanedLine.startsWith("data: ")) continue;
        const dataStr = cleanedLine.slice(6);
        if (dataStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) full += content;
        } catch {
          // Ignore JSON parse errors on partial/malformed stream lines.
        }
      }
    }

    return full;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn(`[Chat API] Model ${attemptModel} timed out after ${MODEL_TIMEOUT_MS}ms`);
    } else {
      console.warn(`[Chat API] Exception trying model ${attemptModel}:`, err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userContext } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    const configuredModel = process.env.OPENROUTER_MODEL || "openrouter/free";

    if (!apiKey) {
      // Fallback response if OPENROUTER_API_KEY is not configured
      const fallbackMsg = "Hi! I am Chronova, your AI Coach. I'm currently running in demo mode (the AI service isn't configured yet). " +
        "Keep sticking to your schedule, take regular breaks, and protect your sleep. You've got this!";
      return new Response(fallbackMsg, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const now = new Date();
    // JS getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    // But our index is 0 = Monday, ..., 6 = Sunday
    const jsDay = now.getDay();
    const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const todayName = daysOfWeek[todayIndex];
    const tomorrowIndex = (todayIndex + 1) % 7;
    const tomorrowName = daysOfWeek[tomorrowIndex];
    const yesterdayIndex = (todayIndex + 6) % 7;
    const yesterdayName = daysOfWeek[yesterdayIndex];

    const systemMessage = `${CHAT_SYSTEM_PROMPT}

USER CONTEXT:
${userContext ? JSON.stringify(userContext, null, 2) : "No context provided yet."}

Current date/time: ${now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })}
Today is: ${todayName} (day index ${todayIndex})
Tomorrow is: ${tomorrowName} (day index ${tomorrowIndex})
Yesterday is: ${yesterdayName} (day index ${yesterdayIndex})

CHATBOT PERSONALITY INSTRUCTIONS:
- Act as a calm, highly intelligent academic mentor (like an insightful and empathetic advisor or research professor).
- Be friendly, student-focused, concise, and highly motivational.
- Avoid long-winded essays; keep answers action-oriented and structured.
- Highlight burnout warnings, energy management advice, and cognitive focus tips where relevant.
- When the user refers to "today", "tomorrow", or "yesterday", map it to the correct day index provided above.
- CRITICAL: If you make or agree to make ANY change to the user's schedule (e.g., rescheduling, adding, or modifying a class/session), you MUST output the updated schedule JSON array inside a <timetable_data>...</timetable_data> block. Otherwise, the calendar will not update!
`;

    // Map messages: system + users/assistant history
    const formattedMessages = [
      { role: "system", content: systemMessage },
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      }))
    ];

    // Bare "openrouter/free" auto-routes across whatever free models are up
    // and is the flakiest option (see MIN_USABLE_LENGTH comment above) — it
    // stays in the list as a last resort, but a configured/explicit model,
    // then named specific free models, are tried first so a "successful"
    // 200-with-garbage response from it no longer eats every request.
    //
    // The previous fallback slugs (meta-llama/llama-3.3-70b-instruct:free,
    // openai/gpt-oss-120b:free, meta-llama/llama-3.2-3b-instruct:free,
    // nousresearch/hermes-3-llama-3.1-405b:free) all now 404 — OpenRouter
    // retired the free tier of those specific models — so they never
    // actually provided a working fallback; the app had zero real
    // redundancy behind "openrouter/free". Replaced with slugs verified
    // live (2026-09-10) against OpenRouter's /api/v1/models, each test-run
    // through this exact system prompt with a large schedule-generation
    // request to confirm they return complete, parseable <timetable_data>
    // within the token budget rather than truncating or reasoning-stalling:
    //   - nex-agi/nex-n2.5-mini:free — fast, clean, reliably completes
    //   - inclusionai/ling-3.0-flash-sante:free — solid secondary
    //   - google/gemma-4-31b-it:free — solid but often rate-limited upstream
    // Rejected after live testing: nvidia/nemotron-3-super-120b-a12b:free,
    // nex-agi/nex-n2.5-pro:free, liquid/lfm-2.5-2.6b:free, and nvidia's
    // "-reasoning" variant all burned the entire token budget on hidden
    // reasoning and returned empty content on this prompt.
    const modelsToTry = [
      configuredModel,
      "nex-agi/nex-n2.5-mini:free",
      "inclusionai/ling-3.0-flash-sante:free",
      "google/gemma-4-31b-it:free",
      "openrouter/free",
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let finalText = "";
    for (const attemptModel of modelsToTry) {
      console.log(`[Chat API] Attempting completion using model: ${attemptModel}`);
      const text = await fetchModelCompletion(attemptModel, apiKey, formattedMessages);
      if (text !== null && isUsableCompletion(text)) {
        console.log(`[Chat API] Successfully selected model: ${attemptModel}`);
        finalText = text;
        break;
      }
      if (text !== null) {
        console.warn(`[Chat API] Model ${attemptModel} returned unusable content (${text.trim().length} chars): ${JSON.stringify(text.slice(0, 80))}`);
      }
    }

    if (!finalText) {
      throw new Error("All fallback attempts failed or returned unusable content.");
    }

    return new Response(finalText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("OpenRouter Chat API error:", error);

    // Friendly fallback response on API call failure
    const fallbackText = "I'm having trouble connecting right now. But remember: 'Consistency is key. Focus on your upcoming study slot, respect your rest periods, and tackle one subject at a time. You've got this!'";
    return new Response(fallbackText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

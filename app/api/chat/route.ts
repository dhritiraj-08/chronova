import { NextRequest } from "next/server";
import { CHAT_SYSTEM_PROMPT } from "@/lib/scheduling/prompts";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { messages, userContext } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "openrouter/free";

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

    let openRouterResponse: Response | null = null;
    let selectedModel = model;
    let lastErrorText = "";

    const modelsToTry = [
      model,
      "openrouter/free",
      "openai/gpt-oss-120b:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "nousresearch/hermes-3-llama-3.1-405b:free",
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    for (const attemptModel of modelsToTry) {
      try {
        console.log(`[Chat API] Attempting completion using model: ${attemptModel}`);
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
            max_tokens: 1000,
          }),
        });

        if (response.ok) {
          openRouterResponse = response;
          selectedModel = attemptModel;
          console.log(`[Chat API] Successfully selected model: ${selectedModel}`);
          break;
        } else {
          lastErrorText = await response.text();
          console.warn(`[Chat API] Failed with model ${attemptModel}: ${response.status} - ${lastErrorText}`);
        }
      } catch (err: any) {
        lastErrorText = err?.message || String(err);
        console.warn(`[Chat API] Exception trying model ${attemptModel}:`, err);
      }
    }

    if (!openRouterResponse) {
      throw new Error(`OpenRouter API error: All fallback attempts failed. Last error: ${lastErrorText}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openRouterResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            
            // Keep the last partial line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleanedLine = line.trim();
              if (!cleanedLine) continue;

              if (cleanedLine === "data: [DONE]") {
                continue;
              }

              if (cleanedLine.startsWith("data: ")) {
                try {
                  const dataStr = cleanedLine.slice(6);
                  if (dataStr === "[DONE]") continue;

                  const parsed = JSON.parse(dataStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  // Ignore JSON parse errors on partial/malformed stream outputs
                }
              }
            }
          }

          // Handle remainder in buffer if any
          if (buffer && buffer.startsWith("data: ")) {
            try {
              const dataStr = buffer.slice(6);
              if (dataStr !== "[DONE]") {
                const parsed = JSON.parse(dataStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              }
            } catch (e) {
              // Ignore
            }
          }
        } catch (e) {
          console.error("OpenRouter stream error:", e);
          const errorMsg = "\n\n(Connection interrupted. Remember to stay focused and keep up the great work!)";
          controller.enqueue(encoder.encode(errorMsg));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
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

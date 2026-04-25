/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  functionName?: string; // for logging
}

export interface AIResult {
  content: string;
  providerUsed: "lovable" | "openrouter";
  model: string;
  latencyMs: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIMARY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PRIMARY_MODEL = "google/gemini-3-flash-preview";

const FALLBACK_URL = "https://openrouter.ai/api/v1/chat/completions";
// Free models actively available on OpenRouter (verified Feb 2026)
const FALLBACK_MODELS = [
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "arcee-ai/trinity-large-preview:free",
];
const FALLBACK_MODEL = FALLBACK_MODELS[0];

const TIMEOUT_MS = 10_000; // 10 seconds

// ─── DB Logger ───────────────────────────────────────────────────────────────

async function logToAILogs(params: {
  providerUsed: string;
  model: string;
  functionName?: string;
  status: "success" | "error" | "fallback";
  errorMessage?: string;
  latencyMs?: number;
}): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    await supabase.from("ai_logs").insert({
      provider_used: params.providerUsed,
      model: params.model,
      function_name: params.functionName ?? null,
      status: params.status,
      error_message: params.errorMessage ?? null,
      latency_ms: params.latencyMs ?? null,
    });
  } catch (e) {
    // Never throw from logger
    console.warn("⚠️ ai_logs insert failed:", e);
  }
}

// ─── Primary AI (Lovable Gateway / Gemini) ────────────────────────────────────

export async function callPrimaryAI(options: AIOptions): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(PRIMARY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        messages: options.messages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (response.status === 429) {
      throw new Error(`PRIMARY_RATE_LIMIT:${response.status}`);
    }
    if (response.status === 401 || response.status === 402) {
      throw new Error(`PRIMARY_AUTH_FAIL:${response.status}`);
    }
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PRIMARY_HTTP_${response.status}:${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    await logToAILogs({
      providerUsed: "lovable",
      model: PRIMARY_MODEL,
      functionName: options.functionName,
      status: "success",
      latencyMs,
    });

    console.log(`✅ Primary AI OK (${latencyMs}ms)`);
    return content;

  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err?.name === "AbortError";
    const errorMsg = isTimeout ? "TIMEOUT_10s" : err?.message ?? String(err);

    await logToAILogs({
      providerUsed: "lovable",
      model: PRIMARY_MODEL,
      functionName: options.functionName,
      status: "error",
      errorMessage: errorMsg,
      latencyMs: Date.now() - start,
    });

    console.warn(`⚠️ Primary AI failed (${errorMsg}) — will fallback`);
    throw err; // re-throw so caller falls back
  }
}

// ─── Fallback AI (OpenRouter free models) ─────────────────────────────────────

export async function callFallbackAI(options: AIOptions): Promise<string> {
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured — fallback unavailable");

  let lastError: any;

  // Try each free model in order until one succeeds
  for (const model of FALLBACK_MODELS) {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS * 2); // 20s per model

    try {
      const response = await fetch(FALLBACK_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sao-mai-health.lovable.app",
          "X-Title": "SaoMai Health AI",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.1,
          max_tokens: options.maxTokens ?? 4000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`FALLBACK_HTTP_${response.status}:${errText.substring(0, 200)}`);
        console.warn(`⚠️ Model ${model} failed (${response.status}) — trying next...`);
        continue; // try next model
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? "";

      await logToAILogs({
        providerUsed: "openrouter",
        model,
        functionName: options.functionName,
        status: "fallback",
        latencyMs,
      });

      console.log(`✅ Fallback AI OK (${model}, ${latencyMs}ms)`);
      return content;

    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err?.name === "AbortError";
      const errorMsg = isTimeout ? `FALLBACK_TIMEOUT_20s_${model}` : err?.message ?? String(err);
      lastError = err;

      await logToAILogs({
        providerUsed: "openrouter",
        model,
        functionName: options.functionName,
        status: "error",
        errorMessage: errorMsg,
        latencyMs: Date.now() - start,
      });

      console.warn(`⚠️ Model ${model} exception: ${errorMsg} — trying next...`);
    }
  }

  // All models failed
  console.error(`❌ All fallback models failed`);
  throw lastError ?? new Error("All OpenRouter fallback models failed");
}

// ─── Main Entry: Auto-fallback ─────────────────────────────────────────────────

/**
 * Tries primary first; on 429/401/timeout automatically falls back.
 * Never throws if fallback succeeds.
 * Only throws if BOTH providers fail.
 */
export async function callAIWithFallback(options: AIOptions): Promise<AIResult> {
  let primaryError: unknown;

  // — Try primary —
  try {
    const start = Date.now();
    const content = await callPrimaryAI(options);
    return {
      content,
      providerUsed: "lovable",
      model: PRIMARY_MODEL,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    primaryError = err;
    const msg = (err as any)?.message ?? "";
    const shouldFallback =
      msg.includes("PRIMARY_RATE_LIMIT") ||
      msg.includes("PRIMARY_AUTH_FAIL") ||
      msg.includes("TIMEOUT");

    if (!shouldFallback) {
      // Non-retriable primary error — still try fallback
      console.warn("⚠️ Primary non-retriable error, attempting fallback anyway...");
    }
  }

  // — Try fallback (iterates free models, no infinite loop) —
  const fbStart = Date.now();
  const content = await callFallbackAI(options); // throws if all models fail
  return {
    content,
    providerUsed: "openrouter",
    model: FALLBACK_MODELS[0], // first attempted; actual model logged in callFallbackAI
    latencyMs: Date.now() - fbStart,
  };
}

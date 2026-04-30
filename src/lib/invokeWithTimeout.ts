import { supabase } from "@/integrations/supabase/client";

interface InvokeOptions {
  body?: Record<string, unknown>;
  timeoutMs?: number;   // default 25s — under Supabase's 30s hard limit
  retries?: number;     // default 1 retry on timeout
}

/**
 * Wrapper around supabase.functions.invoke that adds:
 * - AbortController timeout (kills the stream if idle too long)
 * - One automatic retry on timeout
 * - Typed error distinction: timeout vs network vs function error
 */
export async function invokeWithTimeout<T = unknown>(
  functionName: string,
  { body = {}, timeoutMs = 25_000, retries = 1 }: InvokeOptions = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (error) throw error;
      return data as T;
    } catch (err: unknown) {
      clearTimeout(timer);
      lastError = err;

      const isAbort =
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && (
          err.message.includes("timeout") ||
          err.message.includes("aborted") ||
          err.message.includes("Stream idle")
        ));

      // On last attempt, or non-timeout error, stop retrying
      if (attempt >= retries || !isAbort) break;

      // Brief pause before retry
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Re-throw with friendly message
  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);

  const isTimeout =
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("Stream idle");

  throw new Error(
    isTimeout
      ? "AI đang xử lý chậm. Vui lòng thử lại sau vài giây."
      : msg || "Lỗi kết nối với máy chủ."
  );
}

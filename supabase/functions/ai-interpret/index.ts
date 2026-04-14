import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AIMode = 'cloud' | 'local' | 'lightweight';

// ─── Keyword-based Parser (Tier 3) ────────────────────────────────────────────
function keywordParse(query: string): string {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const diseaseMap: Record<string, string> = {
    'sot xuat huyet': 'Dengue (1D2Z)',
    'dengue': 'Dengue (1D2Z)',
    'covid': 'COVID-19 (RA01)',
    'cum': 'Influenza (1E30)',
    'influenza': 'Influenza (1E30)',
    'soi': 'Measles (1F03)',
    'measles': 'Measles (1F03)',
    'tay chan mieng': 'Hand Foot Mouth (1F05.0)',
    'hand foot mouth': 'Hand Foot Mouth (1F05.0)',
    'malaria': 'Malaria (1F40)',
    'sot ret': 'Malaria (1F40)',
    'lao': 'Tuberculosis (1B10)',
    'tuberculosis': 'Tuberculosis (1B10)',
  };

  const regionMap: Record<string, string> = {
    'ho chi minh': 'TP.HCM',
    'hcm': 'TP.HCM',
    'ha noi': 'Hà Nội',
    'hanoi': 'Hà Nội',
    'da nang': 'Đà Nẵng',
    'can tho': 'Cần Thơ',
    'hai phong': 'Hải Phòng',
  };

  const actionMap: Record<string, string> = {
    'du bao': 'Dự báo',
    'forecast': 'Dự báo',
    'canh bao': 'Cảnh báo',
    'alert': 'Cảnh báo',
    'phan tich': 'Phân tích',
    'analyze': 'Phân tích',
    'nguy co': 'Đánh giá nguy cơ',
    'risk': 'Đánh giá nguy cơ',
  };

  let disease = 'Dịch bệnh chung';
  let region = 'Việt Nam';
  let action = 'Phân tích';

  for (const [kw, label] of Object.entries(diseaseMap)) {
    if (q.includes(kw)) { disease = label; break; }
  }
  for (const [kw, label] of Object.entries(regionMap)) {
    if (q.includes(kw)) { region = label; break; }
  }
  for (const [kw, label] of Object.entries(actionMap)) {
    if (q.includes(kw)) { action = label; break; }
  }

  return `📋 **${action}: ${disease}** tại **${region}**\n\n` +
    `🔍 Phân tích dựa trên từ khóa (chế độ nhẹ):\n` +
    `- Bệnh: ${disease}\n` +
    `- Khu vực: ${region}\n` +
    `- Hành động: ${action}\n\n` +
    `⚠️ Kết quả sơ bộ — hệ thống AI đang tạm thời không khả dụng.\n` +
    `Khuyến nghị: Kiểm tra dữ liệu giám sát trực tiếp trên Dashboard.`;
}

// ─── Cloud AI Call (Tier 1) ───────────────────────────────────────────────────
async function callCloudAI(messages: any[], maxTokens: number): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 429) throw new Error('CLOUD_RATE_LIMIT');
    if (response.status === 402) throw new Error('CLOUD_PAYMENT_REQUIRED');
    if (!response.ok) throw new Error(`CLOUD_HTTP_${response.status}`);

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') throw new Error('CLOUD_TIMEOUT');
    throw err;
  }
}

// ─── Local AI Call via OpenRouter free models (Tier 2) ────────────────────────
async function callLocalAI(messages: any[], maxTokens: number): Promise<string> {
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  if (!OPENROUTER_API_KEY) throw new Error('LOCAL_NOT_CONFIGURED');

  const models = [
    'google/gemma-3-4b-it:free',
    'meta-llama/llama-3.2-3b-instruct:free',
  ];

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sao-mai-health.lovable.app',
          'X-Title': 'SaoMai Health AI',
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!response.ok) { console.warn(`Local model ${model} failed: ${response.status}`); continue; }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`Local model ${model} error:`, err?.message);
    }
  }

  throw new Error('LOCAL_ALL_FAILED');
}

// ─── DB Logger ────────────────────────────────────────────────────────────────
async function logAI(mode: AIMode, status: string, latencyMs: number, errorMessage?: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    await supabase.from('ai_logs').insert({
      provider_used: mode === 'cloud' ? 'lovable' : mode === 'local' ? 'openrouter' : 'keyword',
      model: mode === 'cloud' ? 'gemini-3-flash' : mode === 'local' ? 'openrouter-free' : 'keyword-parser',
      function_name: 'ai-interpret',
      status,
      error_message: errorMessage ?? null,
      latency_ms: latencyMs,
    });
  } catch { /* never throw from logger */ }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const start = Date.now();

  try {
    const { query, system_prompt, image, max_tokens } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemMsg = system_prompt || 'Bạn là trợ lý AI chuyên về giám sát dịch bệnh. Trả lời bằng tiếng Việt, ngắn gọn, chính xác.';
    const tokenLimit = max_tokens || 1000;

    const messages: any[] = [{ role: 'system', content: systemMsg }];

    if (image) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: query },
          { type: 'image_url', image_url: { url: image } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: query });
    }

    let aiMode: AIMode = 'cloud';
    let response = '';
    let cloudError: string | undefined;
    let localError: string | undefined;

    // ── Tier 1: Cloud AI ──
    try {
      response = await callCloudAI(messages, tokenLimit);
      aiMode = 'cloud';
      await logAI('cloud', 'success', Date.now() - start);
      console.log(`✅ Cloud AI OK (${Date.now() - start}ms)`);
    } catch (err: any) {
      cloudError = err?.message ?? String(err);
      console.warn(`⚠️ Cloud AI failed: ${cloudError}`);

      // ── Tier 2: Local AI ──
      try {
        response = await callLocalAI(messages, tokenLimit);
        aiMode = 'local';
        await logAI('local', 'fallback', Date.now() - start);
        console.log(`✅ Local AI OK (${Date.now() - start}ms)`);
      } catch (err2: any) {
        localError = err2?.message ?? String(err2);
        console.warn(`⚠️ Local AI failed: ${localError}`);

        // ── Tier 3: Keyword Parser ──
        response = keywordParse(query);
        aiMode = 'lightweight';
        await logAI('lightweight', 'fallback', Date.now() - start, `cloud:${cloudError}|local:${localError}`);
        console.log(`⚡ Keyword parser used (${Date.now() - start}ms)`);
      }
    }

    return new Response(JSON.stringify({
      response,
      aiMode,
      aiModeLabel: aiMode === 'cloud' ? '☁️ Cloud AI' : aiMode === 'local' ? '🖥️ Local AI' : '⚡ Lightweight',
      latencyMs: Date.now() - start,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('ai-interpret error:', error);
    // Even on total failure, return keyword parse so forecast engine never blocks
    const fallbackResponse = keywordParse('error');
    await logAI('lightweight', 'error', Date.now() - start, error?.message);

    return new Response(JSON.stringify({
      response: fallbackResponse,
      aiMode: 'lightweight' as AIMode,
      aiModeLabel: '⚡ Lightweight',
      latencyMs: Date.now() - start,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

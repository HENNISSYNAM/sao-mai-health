import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ReqBody {
  mode: 'triage' | 'doctor';
  symptoms?: string;
  age?: number;
  gender?: string;
  patient_summary?: string;
  question?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as ReqBody;
    const mode = body.mode === 'doctor' ? 'doctor' : 'triage';

    const systemPrompt = mode === 'triage'
      ? `Bạn là AI phân loại bệnh nhân theo chuẩn ESI (Emergency Severity Index 1-5).
1 = cấp cứu tức thì (đe dọa tính mạng), 2 = khẩn cấp, 3 = trung bình, 4 = ít khẩn, 5 = không khẩn.
Trả về JSON: { "triage_level": 1-5, "specialty": string (chuyên khoa tiếng Việt), "estimated_wait_minutes": number, "reasoning": string ngắn gọn 1-2 câu, "red_flags": string[] }.
Chỉ trả JSON, không markdown.`
      : `Bạn là AI trợ lý bác sĩ. Dựa trên hồ sơ bệnh nhân, trả về JSON:
{ "differential_diagnosis": [{"name": string, "probability": "cao"|"trung bình"|"thấp", "icd10": string}], "drug_interactions": string[], "recommended_tests": string[], "notes": string }.
Chỉ trả JSON, không markdown. Luôn nhắc đây là gợi ý tham khảo.`;

    const userPrompt = mode === 'triage'
      ? `Triệu chứng: ${body.symptoms}\nTuổi: ${body.age ?? 'không rõ'}\nGiới tính: ${body.gender ?? 'không rõ'}`
      : `Hồ sơ: ${body.patient_summary}\nCâu hỏi của bác sĩ: ${body.question ?? 'Đề xuất chẩn đoán và xét nghiệm phù hợp.'}`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: txt.slice(0, 500) }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `Bạn là hệ thống NLP y khoa chuyên xử lý văn bản lâm sàng tiếng Việt (ghi chú bác sĩ, giấy xuất viện, kết quả xét nghiệm, tóm tắt EHR).

NHIỆM VỤ: Trích xuất TẤT CẢ các khái niệm y tế và chuẩn hoá.

Với mỗi khái niệm, xác định:
- text: nguyên văn xuất hiện trong tài liệu
- start, end: vị trí ký tự (0-indexed) trong văn bản đầu vào
- type: một trong "symptom" (triệu chứng), "lab" (xét nghiệm/chỉ số), "disease" (bệnh/chẩn đoán), "drug" (thuốc), "patient_info" (thông tin BN: tuổi/giới/nghề nghiệp/tiền sử gia đình)
- normalized: tên chuẩn tiếng Việt
- code: mã ICD-10 (cho disease), RxNorm CUI hoặc tên INN chuẩn (cho drug), LOINC nếu biết (cho lab), null nếu không áp dụng
- code_system: "ICD-10" | "RxNorm" | "LOINC" | null
- context: object { negated: bool (phủ định "không sốt"), family: bool (thuộc về người nhà), historical: bool (tiền sử/đã từng), hypothetical: bool (nghi ngờ/loại trừ), subject: "patient"|"family"|"other" }
- value, unit: chỉ với lab (VD "7.2", "%")
- confidence: 0..1

Ngoài ra trả về:
- relations: array các quan hệ giữa entities theo index, dạng { source: int, target: int, type: "treats"|"causes"|"indicates"|"measures"|"contraindicates" }
- summary: 1-2 câu tóm tắt lâm sàng
- primary_diagnoses: array {icd10, name} — chẩn đoán chính
- primary_medications: array {name, rxnorm, dose, frequency}

QUY TẮC:
- Tuyệt đối trả JSON hợp lệ, không markdown, không giải thích ngoài JSON.
- Phủ định tiếng Việt: "không", "chưa", "phủ nhận", "không có" → negated=true.
- Tiền sử: "tiền sử", "đã từng", "trước đây" → historical=true.
- Người nhà: "mẹ bị", "bố có tiền sử", "gia đình" → family=true, subject="family".
- Với thuốc VN phổ biến, gán tên INN chuẩn (Paracetamol, Amoxicillin, Metformin, Amlodipine, Salbutamol, Losartan, Atorvastatin, ...).
- ICD-10 phải là mã hợp lệ (VD J45.9, E11.9, I10, K29.7).
`;

interface Body {
  text: string;
  source?: string; // "biovault_doc" | "chain_emr" | "manual"
  doc_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    const text = (body.text || '').trim();
    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (text.length > 20_000) {
      return new Response(JSON.stringify({ error: 'Text too long (max 20k chars)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Văn bản y khoa cần xử lý:\n\n"""\n${text}\n"""\n\nTrả JSON theo schema { entities: [...], relations: [...], summary, primary_diagnoses, primary_medications }.` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({
        error: status === 429 ? 'Rate limit — thử lại sau' : status === 402 ? 'Hết credit AI Gateway' : 'AI gateway error',
        detail: txt.slice(0, 400),
      }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { error: 'parse_failed', raw: content }; }

    // Safety: normalize entities
    if (Array.isArray(parsed?.entities)) {
      parsed.entities = parsed.entities.map((e: any, i: number) => ({
        idx: i,
        text: String(e.text ?? ''),
        start: Number.isFinite(e.start) ? e.start : -1,
        end: Number.isFinite(e.end) ? e.end : -1,
        type: e.type ?? 'symptom',
        normalized: e.normalized ?? e.text,
        code: e.code ?? null,
        code_system: e.code_system ?? null,
        context: {
          negated: !!e?.context?.negated,
          family: !!e?.context?.family,
          historical: !!e?.context?.historical,
          hypothetical: !!e?.context?.hypothetical,
          subject: e?.context?.subject ?? 'patient',
        },
        value: e.value ?? null,
        unit: e.unit ?? null,
        confidence: typeof e.confidence === 'number' ? e.confidence : 0.8,
      }));
    }

    return new Response(JSON.stringify({ result: parsed, source: body.source ?? 'manual', doc_id: body.doc_id ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

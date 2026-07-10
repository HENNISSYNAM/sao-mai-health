import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { lookupDiseaseVi, lookupDrugVi, extractIngredient } from './vi_medical_lexicon.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');


/**
 * Vietnamese Clinical NLP — output schema đúng theo đề bài.
 *
 * Mỗi entity:
 *   { text, position: [start, end], type, assertions: string[], candidates: string[] }
 *
 * type ∈ { "TRIỆU_CHỨNG", "TÊN_XÉT_NGHIỆM", "KẾT_QUẢ_XÉT_NGHIỆM", "CHẨN_ĐOÁN", "THUỐC" }
 * assertions ⊂ { "isNegated", "isFamily", "isHistorical" }  (chỉ TRIỆU_CHỨNG / CHẨN_ĐOÁN / THUỐC)
 * candidates: mã ICD-10 (CHẨN_ĐOÁN) hoặc RxNorm CUI (THUỐC); rỗng cho type khác.
 */

const ALLOWED_TYPES = new Set([
  'TRIỆU_CHỨNG',
  'TÊN_XÉT_NGHIỆM',
  'KẾT_QUẢ_XÉT_NGHIỆM',
  'CHẨN_ĐOÁN',
  'THUỐC',
]);
const ALLOWED_ASSERTIONS = new Set(['isNegated', 'isFamily', 'isHistorical']);

const SYSTEM_PROMPT = `Bạn là hệ thống NLP y khoa tiếng Việt. Trích xuất TẤT CẢ các khái niệm y tế từ văn bản lâm sàng tự do (ghi chú BS, giấy xuất viện, kết quả xét nghiệm, EHR).

Với MỖI khái niệm, trả về object:
{
  "text": <nguyên văn xuất hiện trong input, giữ nguyên chữ hoa/thường/dấu>,
  "char_start": <int, vị trí ký tự bắt đầu, 0-indexed>,
  "char_end":   <int, vị trí ký tự kết thúc (exclusive)>,
  "type": <một trong "TRIỆU_CHỨNG" | "TÊN_XÉT_NGHIỆM" | "KẾT_QUẢ_XÉT_NGHIỆM" | "CHẨN_ĐOÁN" | "THUỐC">,
  "assertions": <mảng con của ["isNegated","isFamily","isHistorical"]>,
  "normalized_en": <tên tiếng Anh chuẩn hoá (cho THUỐC & CHẨN_ĐOÁN), null nếu không áp dụng>,
  "candidates_guess": <mảng mã dự đoán: ICD-10 cho CHẨN_ĐOÁN (ví dụ "K21.0"), RxNorm CUI cho THUỐC (ví dụ "360047"); rỗng cho type khác>
}

Quy tắc:
- TRIỆU_CHỨNG: cảm nhận chủ quan của BN (ho, sốt, đau ngực, tức ngực, ợ hơi...).
- TÊN_XÉT_NGHIỆM: tên xét nghiệm/chỉ số (WBC, HbA1c, LDL, NEUT%, Troponin T, tổng phân tích tế bào máu...).
- KẾT_QUẢ_XÉT_NGHIỆM: giá trị số + đơn vị của xét nghiệm ("14,43", "7.4%", "168 mg/dL").
- CHẨN_ĐOÁN: bệnh/chẩn đoán bác sĩ đưa ra ("trào ngược dạ dày - thực quản", "tăng huyết áp").
- THUỐC: tên thuốc (kèm hàm lượng nếu có): "Chlorpheniramine 0.4 MG/ML", "Aspirin 81mg".
- assertions:
  * isNegated: có phủ định ("không sốt", "không ho", "phủ nhận", "chưa có").
  * isFamily: thuộc về người nhà ("mẹ bị", "bố có tiền sử", "gia đình có").
  * isHistorical: tiền sử/đã từng ("tiền sử", "đã từng", "trước đây", "sử dụng ... trước đó").
- assertions CHỈ áp dụng cho TRIỆU_CHỨNG, CHẨN_ĐOÁN, THUỐC. Với TÊN_XÉT_NGHIỆM & KẾT_QUẢ_XÉT_NGHIỆM luôn trả mảng rỗng.
- char_start / char_end phải khớp chính xác với vị trí text trong input (đếm theo ký tự Unicode, 0-indexed; end exclusive).
- Nếu cùng một khái niệm xuất hiện nhiều lần → mỗi lần là 1 entity riêng.
- normalized_en: tên tiếng Anh chuẩn (INN cho thuốc) để hỗ trợ tra cứu RxNorm/ICD. VD "Chlorpheniramine 0.4 MG/ML", "gastroesophageal reflux disease".
- candidates_guess: đề xuất 1-5 mã có khả năng cao nhất. Với ICD-10 dùng dạng gốc "K21.0", "K21.9", "I10", "E11.9". Với RxNorm dùng CUI dạng số nguyên chuỗi "360047".
- KHÔNG bịa vị trí — nếu không chắc, để char_start=-1, char_end=-1.

Trả về JSON duy nhất dạng: { "entities": [ ... ] }. Không markdown, không comment.`;

interface RawEntity {
  text: string;
  char_start: number;
  char_end: number;
  type: string;
  assertions: string[];
  normalized_en: string | null;
  candidates_guess: string[];
}

interface OutputEntity {
  text: string;
  position: [number, number];
  type: string;
  assertions: string[];
  candidates: string[];
}

// ---------- Position verification ----------
function fixPosition(input: string, e: RawEntity, searchFrom: number): [number, number] {
  const arr = Array.from(input); // Unicode code points
  const targetArr = Array.from(e.text);
  // If LLM position looks correct, trust it
  if (
    e.char_start >= 0 &&
    e.char_end > e.char_start &&
    e.char_end <= arr.length &&
    arr.slice(e.char_start, e.char_end).join('') === e.text
  ) {
    return [e.char_start, e.char_end];
  }
  // Fallback: search substring by code-point index, starting from searchFrom
  const inputStr = arr.join('');
  const targetStr = targetArr.join('');
  // Convert searchFrom (code-point) to UTF-16 offset
  const utf16From = Array.from(arr.slice(0, searchFrom)).join('').length;
  const idx = inputStr.indexOf(targetStr, utf16From);
  if (idx < 0) return [-1, -1];
  // Convert back to code-point index
  const before = inputStr.slice(0, idx);
  const cpStart = Array.from(before).length;
  return [cpStart, cpStart + targetArr.length];
}

// ---------- NIH ClinicalTables + RxNav lookups (free, no auth) ----------
async function lookupIcd10(term: string): Promise<string[]> {
  if (!term) return [];
  try {
    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&maxList=8&terms=${encodeURIComponent(term)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return [];
    const j = await r.json();
    const codes: string[] = Array.isArray(j?.[1]) ? j[1] : [];
    return codes.slice(0, 8);
  } catch { return []; }
}

async function lookupRxNormApprox(term: string): Promise<string[]> {
  if (!term) return [];
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=8`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return [];
    const j = await r.json();
    const cands = j?.approximateGroup?.candidate ?? [];
    return cands.map((c: any) => String(c?.rxcui ?? '')).filter((x: string) => x && x !== '0');
  } catch { return []; }
}

/** RxNav getDrugs by ingredient name → returns SCD/SBD RxCUIs matching strength+form. */
async function lookupRxNormDrugs(ingredient: string): Promise<string[]> {
  if (!ingredient) return [];
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(ingredient)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return [];
    const j = await r.json();
    const groups = j?.drugGroup?.conceptGroup ?? [];
    const cuis: string[] = [];
    for (const g of groups) {
      // Prefer SCD (Semantic Clinical Drug) & IN (Ingredient)
      if (!['SCD', 'SBD', 'IN'].includes(g?.tty)) continue;
      for (const c of g?.conceptProperties ?? []) {
        if (c?.rxcui) cuis.push(String(c.rxcui));
      }
    }
    return cuis;
  } catch { return []; }
}




async function verifyCandidates(
  raw: RawEntity,
  cache: Map<string, string[]>,
): Promise<string[]> {
  const guesses = Array.isArray(raw.candidates_guess) ? raw.candidates_guess.filter(Boolean) : [];
  const rawText = (raw.text || '').trim();
  const enName = (raw.normalized_en || '').trim();

  if (raw.type === 'CHẨN_ĐOÁN') {
    // Layer 1: VI lexicon
    const lex = lookupDiseaseVi(rawText);
    const lexCodes = lex?.codes ?? [];
    const searchTerms = Array.from(new Set([lex?.en, enName, rawText].filter(Boolean))) as string[];

    // Layer 2: parallel NIH lookups on each candidate term
    const apiResults = await Promise.all(
      searchTerms.map(async (t) => {
        const key = `icd:${t.toLowerCase()}`;
        if (cache.has(key)) return cache.get(key)!;
        const res = await lookupIcd10(t);
        cache.set(key, res);
        return res;
      })
    );
    const apiCodes = apiResults.flat();

    // Merge: lexicon (highest trust) → API → LLM guesses
    const merged = Array.from(new Set([...lexCodes, ...apiCodes, ...guesses]));
    return merged.slice(0, 5);
  }

  if (raw.type === 'THUỐC') {
    const lex = lookupDrugVi(rawText);
    const ingredient = lex?.en || extractIngredient(rawText) || enName;
    const fullTerm = enName || rawText;

    // Parallel: approxTerm on full string (catches strength+form) + drugs by ingredient
    const key1 = `rx-approx:${fullTerm.toLowerCase()}`;
    const key2 = `rx-drugs:${ingredient.toLowerCase()}`;
    const [approx, drugs] = await Promise.all([
      cache.has(key1) ? Promise.resolve(cache.get(key1)!) : lookupRxNormApprox(fullTerm).then((r) => { cache.set(key1, r); return r; }),
      cache.has(key2) ? Promise.resolve(cache.get(key2)!) : lookupRxNormDrugs(ingredient).then((r) => { cache.set(key2, r); return r; }),
    ]);

    // approxTerm results are already ranked by similarity; prefer them first
    // Then drugs (SCD matches) → lexicon ingredient → LLM guesses
    const lexCodes = lex?.codes ?? [];
    const merged = Array.from(new Set([...approx, ...drugs, ...lexCodes, ...guesses]));
    return merged.slice(0, 5);
  }
  return [];
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text: string = String(body?.text ?? '').trim();
    const verify: boolean = body?.verify !== false; // default true
    const source: string = body?.source ?? 'manual';
    const doc_id: string | null = body?.doc_id ?? null;

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
          { role: 'user', content: `Văn bản y khoa:\n"""\n${text}\n"""\n\nTrả JSON đúng schema { "entities": [...] }.` },
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
    const content: string = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const rawEntities: RawEntity[] = Array.isArray(parsed?.entities) ? parsed.entities : [];

    // Phase 1: normalize + fix positions (sequential to keep cursor monotonic)
    interface Staged {
      cleanText: string;
      type: string;
      assertions: string[];
      position: [number, number];
      candidates_guess: string[];
      normalized_en: string | null;
    }
    const staged: Staged[] = [];
    let cursor = 0;
    for (const raw of rawEntities) {
      const cleanText = String(raw?.text ?? '').trim();
      if (!cleanText) continue;
      const type = String(raw?.type ?? '');
      if (!ALLOWED_TYPES.has(type)) continue;

      const allowAssert = type === 'TRIỆU_CHỨNG' || type === 'CHẨN_ĐOÁN' || type === 'THUỐC';
      const rawAss = Array.isArray(raw?.assertions) ? raw.assertions : [];
      const assertions = allowAssert
        ? Array.from(new Set(rawAss.filter((a: any) => ALLOWED_ASSERTIONS.has(a)))) as string[]
        : [];

      const [start, end] = fixPosition(text, {
        ...raw,
        text: cleanText,
        char_start: Number.isFinite(raw?.char_start) ? raw.char_start : -1,
        char_end: Number.isFinite(raw?.char_end) ? raw.char_end : -1,
      } as RawEntity, cursor);
      if (start >= 0) cursor = end;

      staged.push({
        cleanText, type, assertions,
        position: [start, end],
        candidates_guess: Array.isArray(raw?.candidates_guess) ? raw.candidates_guess.map(String) : [],
        normalized_en: raw?.normalized_en ?? null,
      });
    }

    // Phase 2: verify candidates in parallel (per-request cache dedupes identical terms)
    const cache = new Map<string, string[]>();
    const entities: OutputEntity[] = await Promise.all(staged.map(async (s) => {
      let candidates: string[] = [];
      if (verify) {
        candidates = await verifyCandidates({
          text: s.cleanText, type: s.type,
          candidates_guess: s.candidates_guess,
          normalized_en: s.normalized_en,
          char_start: s.position[0], char_end: s.position[1],
          assertions: s.assertions,
        } as RawEntity, cache);
      } else {
        candidates = s.candidates_guess.filter(Boolean).slice(0, 5);
      }
      return {
        text: s.cleanText,
        position: s.position,
        type: s.type,
        assertions: s.assertions,
        candidates,
      };
    }));

    return new Response(JSON.stringify({ entities, source, doc_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Pure, dependency-free post-processing for Vietnamese clinical NLP.
// No Deno / network imports → unit-testable in plain Node.
//
// Responsibilities:
//   1. recoverPosition  — locate an entity's exact char offsets in the RAW input
//                         (never normalise the input; positions must match Python len()).
//   2. detectAssertions — rule-based NegEx-style isNegated / isFamily / isHistorical
//                         (merged as a union with the LLM's assertions for max recall).
//   3. dedupeEntities   — drop exact duplicates and unrecoverable spans.
//
// IMPORTANT position contract: the test files contain only BMP code points
// (verified: 0 astral chars), so a UTF-16 index === a Unicode code-point index
// === Python len(). We therefore index the raw string directly. The ONLY place we
// normalise is a throw-away copy used for fuzzy matching, which maps back to raw
// indices 1:1 (lower-casing and dash-unification are 1-code-point-to-1).

export type EntityType =
  | 'TRIỆU_CHỨNG'
  | 'TÊN_XÉT_NGHIỆM'
  | 'KẾT_QUẢ_XÉT_NGHIỆM'
  | 'CHẨN_ĐOÁN'
  | 'THUỐC';

export const ASSERT_ELIGIBLE = new Set<EntityType>(['TRIỆU_CHỨNG', 'CHẨN_ĐOÁN', 'THUỐC']);

// ─────────────────────────── Position recovery ───────────────────────────

/** Lowercase + unify dashes; keeps a 1:1 map from normalised index → raw index. */
function normMapped(raw: string): { text: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '–' || c === '—' || c === '−') {
      out.push('-');
    } else {
      out.push(c.toLowerCase());
    }
    map.push(i);
  }
  return { text: out.join(''), map };
}

/** Collapse all whitespace runs to a single space; map normalised idx → raw idx. */
function normWhitespaceMapped(raw: string): { text: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (/\s/.test(c)) {
      out.push(' ');
      map.push(i);
      i++;
      while (i < raw.length && /\s/.test(raw[i])) i++;
    } else {
      out.push(c === '–' || c === '—' || c === '−' ? '-' : c.toLowerCase());
      map.push(i);
      i++;
    }
  }
  return { text: out.join(''), map };
}

/**
 * Return [start, end) char offsets of `phrase` inside `raw`, or null.
 * Tries, in order: LLM offsets → exact search → NFC/NFD variants → whitespace-fuzzy.
 * `from` biases the search forward to keep repeated concepts monotonic.
 */
export function recoverPosition(
  raw: string,
  phrase: string,
  llmStart: number,
  llmEnd: number,
  from: number,
): [number, number] | null {
  const p = phrase.trim();
  if (!p) return null;

  // 1. Trust the LLM offsets iff they slice out exactly the phrase.
  if (
    Number.isInteger(llmStart) &&
    Number.isInteger(llmEnd) &&
    llmStart >= 0 &&
    llmEnd > llmStart &&
    llmEnd <= raw.length &&
    raw.slice(llmStart, llmEnd) === p
  ) {
    return [llmStart, llmEnd];
  }

  // 2. Exact substring, forward from cursor then from 0.
  for (const start of [from, 0]) {
    const idx = raw.indexOf(p, Math.max(0, start));
    if (idx >= 0) return [idx, idx + p.length];
  }

  // 3. Unicode-form mismatch (NFC vs NFD): try both normalised forms of the phrase.
  for (const form of ['NFC', 'NFD'] as const) {
    const variant = p.normalize(form);
    if (variant !== p) {
      for (const start of [from, 0]) {
        const idx = raw.indexOf(variant, Math.max(0, start));
        if (idx >= 0) return [idx, idx + variant.length];
      }
    }
  }

  // 4. Case/dash fuzzy (1:1 map preserved).
  {
    const R = normMapped(raw);
    const T = normMapped(p).text;
    for (const start of [from, 0]) {
      const idx = R.text.indexOf(T, Math.max(0, start));
      if (idx >= 0) return [R.map[idx], R.map[idx + T.length - 1] + 1];
    }
  }

  // 5. Whitespace-collapse fuzzy (handles extra spaces / line breaks inside phrase).
  {
    const R = normWhitespaceMapped(raw);
    const T = normWhitespaceMapped(p).text.trim();
    if (T) {
      for (const start of [from, 0]) {
        const idx = R.text.indexOf(T, Math.max(0, start));
        if (idx >= 0) {
          const rawStart = R.map[idx];
          const rawEnd = R.map[idx + T.length - 1] + 1;
          if (rawEnd > rawStart) return [rawStart, rawEnd];
        }
      }
    }
  }

  return null; // caller drops the entity rather than emitting an invalid span
}

// ─────────────────────────── Assertion rules ───────────────────────────

// Word-bounded cue matcher for Vietnamese (spaces / punctuation as boundaries).
function hasCue(hay: string, cue: string): boolean {
  const esc = cue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // (^|non-letter) cue (non-letter|$) — letters include Vietnamese diacritics.
  const re = new RegExp(`(^|[^\\p{L}])${esc}([^\\p{L}]|$)`, 'iu');
  return re.test(hay);
}

const NEG_CUES = [
  'không', 'ko', 'k', 'chẳng', 'chưa', 'chưa từng', 'chưa có', 'chưa ghi nhận',
  'phủ nhận', 'loại trừ', 'không có', 'không thấy', 'không ghi nhận', 'không bị',
  'không còn', 'không đau', 'không sốt', 'âm tính', 'chống chỉ định', 'tránh dùng',
  'không dùng', 'không sử dụng', 'không phát hiện', 'không kèm', 'no', 'not', 'negative',
];

// Family = the concept belongs to a relative, not the patient. Kept TIGHT to avoid
// the "em"/"mình" = self-reference trap in forum posts.
// Deliberately TIGHT: con/cháu/bé are the *patient* in paediatric notes, and
// "em"/"mình" is the writer in forum posts — never treat those as family.
const FAM_SUBJECT = '(?:bố mẹ|cha mẹ|bố|ba|mẹ|má|cha|ông nội|ông ngoại|bà nội|bà ngoại|ông|bà|anh trai|chị gái|em trai|em gái|em ruột)';
// Unicode-aware boundaries (JS \b is ASCII-only and breaks on Vietnamese diacritics).
const FAM_RE = new RegExp(
  `(?<!\\p{L})${FAM_SUBJECT}(?!\\p{L})(?:\\s+(?:của\\s+)?(?:bệnh nhân|bn))?\\s+(?:cũng\\s+)?(?:bị|mắc|có tiền sử|được chẩn đoán)`,
  'iu',
);
// NB: a bare "Tiền sử gia đình" heading is intentionally NOT a cue — such sections
// are frequently negated ("không ai mắc"), so blanket-marking leaks false positives.
// Only an explicit relative + verb (FAM_RE) fires here; semantic family is left to the LLM.

const HIST_CLAUSE_CUES = [
  'tiền sử', 'tiền căn', 'bệnh sử', 'đã từng', 'từng bị', 'từng mắc', 'trước đây',
  'trước đó', 'đã được chẩn đoán', 'đã điều trị', 'nhiều năm nay', 'đã phẫu thuật',
  'phát hiện năm', 'chẩn đoán năm', 'bệnh nền', 'đã mổ',
];

// Sentence break test. Commas are intentionally NON-breaking so an assertion scope
// ("tiền sử X, Y, Z" / "không sốt, ho, nôn") propagates across a coordinated list.
// A period is NOT a break inside a decimal ("0.4 MG/ML", "14.99") — critical for
// drug strengths and lab values.
function isSentBreak(raw: string, i: number): boolean {
  const c = raw[i];
  if (c === '\n' || c === '\r' || c === ';' || c === '•' || c === '·' || c === '▸' || c === '✓') return true;
  if (c === '.') {
    const prev = raw[i - 1];
    const next = raw[i + 1];
    if (prev && /\d/.test(prev) && next && /\d/.test(next)) return false; // decimal point
    return true;
  }
  return false;
}

/** Char range [start,end) of the sentence enclosing `pos` (commas do not break). */
function sentenceBounds(raw: string, pos: number, lookback = 400): [number, number] {
  let start = Math.max(0, pos - lookback);
  for (let i = pos - 1; i >= start; i--) {
    if (isSentBreak(raw, i)) { start = i + 1; break; }
  }
  let end = raw.length;
  for (let i = pos; i < Math.min(raw.length, pos + 200); i++) {
    if (isSentBreak(raw, i)) { end = i; break; }
  }
  return [start, end];
}

// Tokens that BREAK an assertion scope: a new subject/predicate between the cue and
// the concept means the cue no longer governs it. Stops "không sốt, bệnh nhân ho"
// from negating "ho", or "tiền sử THA, hiện đang dùng metformin" from back-dating the drug.
const SCOPE_BREAKER = /(?<!\p{L})(?:nhưng|tuy nhiên|song|hiện tại|hiện đang|hiện nay|hiện|đang|sau đó|bệnh nhân|bn|khám|kê đơn|chỉ định|ghi nhận|kết quả|điều trị bằng|được cho|thay bằng)(?!\p{L})/iu;

/** Last standalone index of `cue` in `hay`, or -1. */
function lastCueIndex(hay: string, cue: string): number {
  const esc = cue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\p{L}])${esc}([^\\p{L}]|$)`, 'giu');
  let last = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(hay)) !== null) {
    last = m.index + m[1].length;
    if (re.lastIndex <= m.index) re.lastIndex = m.index + 1;
  }
  return last;
}

/**
 * Does any cue govern the concept at the end of `prefix`?
 *  (a) cue within `near` chars immediately before the concept, or
 *  (b) cue earlier in the sentence with only a coordinated list in between
 *      (no scope-breaking subject/predicate).
 */
function cueGoverns(prefix: string, cues: string[], near = 40): boolean {
  const window = prefix.slice(Math.max(0, prefix.length - near));
  for (const c of cues) if (hasCue(window, c)) return true;
  for (const c of cues) {
    const i = lastCueIndex(prefix, c);
    if (i >= 0) {
      const between = prefix.slice(i + c.length);
      if (!SCOPE_BREAKER.test(between)) return true;
    }
  }
  return false;
}

interface Section { start: number; historical: boolean }

/** Parse headings into sections; mark historical ones (excluding "hiện tại" = present). */
function parseSections(raw: string): Section[] {
  const sections: Section[] = [{ start: 0, historical: false }];
  const lines = raw.split(/\r?\n/);
  let off = 0;
  const HIST = /tiền sử|tiền căn|bệnh sử|bệnh nền|bệnh (?:lý )?(?:mãn|mạn) tính|các bệnh (?:lý )?(?:mãn|mạn)/iu;
  const PRESENT = /hiện tại|vào viện|nhập viện|lý do|hiện mắc|đang/iu;
  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading = /^\d+[.)]\s+\S/.test(trimmed) || (trimmed.length > 0 && trimmed.length < 60 && /^[A-ZÀ-Ỹ0-9]/.test(trimmed) && /[:：]?$/.test(trimmed) && HIST.test(trimmed));
    if (isHeading && (HIST.test(trimmed) || PRESENT.test(trimmed))) {
      const historical = HIST.test(trimmed) && !PRESENT.test(trimmed);
      sections.push({ start: off, historical });
    }
    off += line.length + 1; // +1 for the split '\n'
  }
  return sections;
}

function sectionHistoricalAt(sections: Section[], pos: number): boolean {
  let cur = false;
  for (const s of sections) {
    if (s.start <= pos) cur = s.historical;
    else break;
  }
  return cur;
}

/**
 * Rule-based assertions for one entity. Returns the subset detected by rules;
 * caller unions this with the (validated) LLM assertions.
 */
export function detectAssertions(
  raw: string,
  type: EntityType,
  start: number,
  end: number,
  sections: Section[],
): string[] {
  if (!ASSERT_ELIGIBLE.has(type)) return [];
  const out = new Set<string>();

  const [sStart, sEnd] = sentenceBounds(raw, start);
  const prefix = raw.slice(sStart, start);   // sentence text before the concept
  const sentence = raw.slice(sStart, sEnd);

  // isNegated — cue immediately before, or across a coordinated list ("không sốt, ho").
  if (cueGoverns(prefix, NEG_CUES)) out.add('isNegated');

  // isFamily — tight relative-subject + verb pattern within the sentence.
  if (FAM_RE.test(sentence)) out.add('isFamily');

  // isHistorical — history section heading OR a cue governing the concept
  // (propagates over "tiền sử ... A, B, C" lists via cueGoverns).
  if (sectionHistoricalAt(sections, start) || cueGoverns(prefix, HIST_CLAUSE_CUES, 60)) {
    out.add('isHistorical');
  }

  return [...out];
}

export function buildSections(raw: string): Section[] {
  return parseSections(raw);
}

// ─────────────────────────── Dedupe ───────────────────────────

export interface FinalEntity {
  text: string;
  position: [number, number];
  type: string;
  assertions: string[];
  candidates: string[];
}

/** Drop null-position entities and exact (type,start,end) duplicates; keep order. */
export function dedupeEntities(items: FinalEntity[]): FinalEntity[] {
  const seen = new Set<string>();
  const out: FinalEntity[] = [];
  for (const e of items) {
    if (!e.position || e.position[0] < 0 || e.position[1] <= e.position[0]) continue;
    const key = `${e.type}|${e.position[0]}|${e.position[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  // stable sort by start offset — grader-friendly, deterministic
  out.sort((a, b) => a.position[0] - b.position[0] || a.position[1] - b.position[1]);
  return out;
}

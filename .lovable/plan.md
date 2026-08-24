
# Kế hoạch: Tăng độ chính xác candidates ICD-10 & RxNorm

## Mục tiêu
Giảm sai/thiếu mã ICD-10 (bệnh) và RxNorm (thuốc) trong output `clinical-nlp` bằng cách chuẩn hoá thuật ngữ VI→EN trước khi tra cứu, mở rộng nguồn tra cứu, và thêm bước re-rank bằng Gemini pass 2.

## Chiến lược 3 lớp

### Lớp 1 — Chuẩn hoá thuật ngữ VI→EN (deterministic)
- Thêm `supabase/functions/clinical-nlp/vi_medical_lexicon.ts`: bảng ánh xạ ~200 thuật ngữ VI phổ biến → tên EN chuẩn (WHO/UMLS).
  - VD: "trào ngược dạ dày - thực quản" → "gastroesophageal reflux disease", "tăng huyết áp" → "essential hypertension", "tiểu đường type 2" → "type 2 diabetes mellitus".
  - Thuốc: xử lý dạng "Tên hoạt chất + hàm lượng + đơn vị" (`Chlorpheniramine 0.4 MG/ML`) — tách hoạt chất, chuẩn hoá dose form.
- Fallback: nếu không có trong lexicon → dùng Gemini pass 1 dịch/chuẩn hoá thành tên EN chính thức (đã có `english_name` field).

### Lớp 2 — Mở rộng & song song hoá candidate lookup
Cho mỗi CHẨN_ĐOÁN: gọi **song song** 3 nguồn, gộp + dedupe theo mã:
1. **NIH ClinicalTables ICD-10-CM** (đang có) — `sf=code,name&terms=<EN>`
2. **BioPortal ICD-10** search — cover các mã ICD-10 quốc tế WHO không có trong CM
3. **UMLS Metathesaurus** via `rxnav.nlm.nih.gov/REST/umlsconcept` — cross-walk khi 2 nguồn trên miss

Cho mỗi THUỐC: gọi **song song**:
1. **RxNav `approximateTerm`** (đang có) — `term=<name+strength>&maxEntries=10`
2. **RxNav `getDrugs`** — theo tên hoạt chất (bỏ liều) để lấy ingredient RxCUI
3. **RxNav `getAllRelatedInfo`** — lấy cả SCD (Semantic Clinical Drug) và IN (Ingredient) RxCUI

Kết quả: `candidates` trả về top-5 đã re-rank theo độ trùng tên (Levenshtein trên tên chuẩn hoá).

### Lớp 3 — Re-rank pass 2 bằng Gemini (chỉ khi cần)
- Sau khi có candidate pool từ Lớp 2, nếu pool > 3 hoặc score max < 0.8 → gửi 1 batch call Gemini với:
  - Toàn bộ context văn bản gốc
  - Entity + candidate pool (mã + tên EN + tên VN)
  - Yêu cầu chọn top-3 phù hợp nhất với ngữ cảnh (ví dụ K21.0 vs K21.9 phụ thuộc có esophagitis hay không)
- Model: `google/gemini-3-flash-preview` (đã dùng), JSON mode, chỉ trả `{ entity_id: string, ranked_codes: string[] }[]`.
- Batch toàn bộ entities cần re-rank trong 1 request → giảm chi phí.

## Files thay đổi

**Created**
- `supabase/functions/clinical-nlp/vi_medical_lexicon.ts` — ~200 thuật ngữ VI→EN cho bệnh & thuốc thường gặp.
- `supabase/functions/clinical-nlp/candidate_lookup.ts` — helper song song hoá + dedupe + Levenshtein scoring.

**Edited**
- `supabase/functions/clinical-nlp/index.ts`:
  - Import lexicon + candidate_lookup.
  - Sau pass 1 (extract): normalize từng CHẨN_ĐOÁN/THUỐC qua lexicon.
  - Chạy candidate lookup song song (dùng `Promise.all` với concurrency limit 8).
  - Nếu cần → gọi pass 2 Gemini re-rank.
  - Giữ nguyên schema output (không breaking change).

**Không đổi**
- `src/components/shared/ClinicalNlpPanel.tsx`, `src/lib/nlpBatch.ts`, `src/pages/ClinicalNlpBatch.tsx` — schema output ổn định.

## Đo lường
- Trên ví dụ mẫu ("trào ngược dạ dày - thực quản" + "Chlorpheniramine 0.4 MG/ML" + "Capsaicin 0.38 MG/ML"), kỳ vọng output:
  - `K21.0`, `K21.9` (đúng như đề bài)
  - `360047` cho Chlorpheniramine 0.4 MG/ML
  - `1660761` cho Capsaicin 0.38 MG/ML

## Verify sau khi build
1. Curl `clinical-nlp` với text mẫu đề bài → check candidates khớp `K21.0/K21.9`, `360047`, `1660761`.
2. Kiểm log edge function xem pass 2 chỉ trigger khi candidates ambiguous.
3. Chạy batch runner với 3-5 file .txt đa dạng → verify không tăng đáng kể latency (< 1.5× so với hiện tại).

## Không làm trong scope này
- Fine-tune model local NER.
- Thay đổi UI panel/batch runner.
- Relation extraction pass 2 (đã liệt kê ở lựa chọn khác — giữ cho vòng sau).

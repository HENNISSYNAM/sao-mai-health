
# Kế hoạch: Vietnamese Clinical NLP theo chuẩn đề bài

## Mục tiêu
Nâng cấp module clinical-nlp hiện có để output đúng schema đề bài (nhãn Vietnamese uppercase, position char-offset, assertions, candidates ICD-10/RxNorm chuẩn), và thêm **batch runner** để chạy 100 file test.zip → xuất folder .json nộp bài.

## Kiến trúc

```text
┌─ UI ────────────────────────────────────────────────────────────┐
│ /clinical-nlp-batch  ──► upload test.zip / nhiều .txt           │
│   │                                                              │
│   ├─ ClinicalNlpPanel (single)  ── nâng cấp schema mới          │
│   └─ Bảng tiến độ + tải kết quả .zip (100 file .json)           │
└──────────────────┬───────────────────────────────────────────────┘
                   │ supabase.functions.invoke
                   ▼
┌─ Edge Function: clinical-nlp (nâng cấp) ────────────────────────┐
│ 1. Gemini 2.5 Flash extract entities theo schema đề bài          │
│    (TRIỆU_CHỨNG / TÊN_XÉT_NGHIỆM / KẾT_QUẢ_XÉT_NGHIỆM /          │
│     CHẨN_ĐOÁN / THUỐC) + position + assertions                   │
│ 2. Verify candidates:                                            │
│    - THUỐC → RxNav /approximateTerm.json (NIH, không cần key)   │
│    - CHẨN_ĐOÁN → WHO ICD-10 API /icd/release/10 (public)         │
│ 3. Trả JSON đúng schema đề bài                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Schema output (khớp đề bài)

```json
[
  {
    "text": "bệnh trào ngược dạ dày - thực quản",
    "position": [88, 122],
    "type": "CHẨN_ĐOÁN",
    "assertions": [],
    "candidates": ["K21.0", "K21.9"]
  },
  {
    "text": "Chlorpheniramine 0.4 MG/ML",
    "position": [150, 176],
    "type": "THUỐC",
    "assertions": ["isHistorical"],
    "candidates": ["360047"]
  },
  { "text": "ho đờm xanh", "position": [45, 56], "type": "TRIỆU_CHỨNG", "assertions": [], "candidates": [] },
  { "text": "WBC", "position": [200, 203], "type": "TÊN_XÉT_NGHIỆM", "assertions": [], "candidates": [] },
  { "text": "14,43", "position": [204, 209], "type": "KẾT_QUẢ_XÉT_NGHIỆM", "assertions": [], "candidates": [] }
]
```

## Thay đổi cụ thể

### 1. Edge function `clinical-nlp` — rewrite output contract
- System prompt Gemini yêu cầu output theo đúng nhãn Vietnamese uppercase với dấu gạch dưới.
- Prompt yêu cầu trả `char_start`, `char_end` cho mỗi entity; server verify bằng `text.indexOf` để fix drift.
- Tách logic verify 2 pha:
  - **Pha 1 (LLM)**: Gemini đề xuất `candidates_raw` (tên tiếng Anh chuẩn hoá + mã dự đoán).
  - **Pha 2 (API)**:
    - Drug: `GET https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=<tên EN>&maxEntries=5` → lấy `rxcui`.
    - Disease: `GET https://icd.who.int/browse10/2019/en/JsonGetChildrenConcepts?ConceptId=<code>` hoặc search endpoint để confirm mã tồn tại; fallback giữ mã Gemini nếu API down.
- Fallback: nếu verify fail, giữ candidates từ LLM (không để rỗng).
- Trả về `{ entities: [...] }` đúng shape trên (bỏ `relations`, `summary` cho endpoint scoring; giữ optional trong response cho UI).

### 2. Component `ClinicalNlpPanel.tsx` — cập nhật render
- Bảng entities dùng nhãn mới, hiển thị `position`, `assertions` (badge: Phủ định / Người nhà / Tiền sử), `candidates`.
- Highlight inline dùng `position` char-offset thay vì regex match text.

### 3. Trang mới `/clinical-nlp-batch` (`src/pages/ClinicalNlpBatch.tsx`)
- Dropzone nhận `.zip` (dùng `jszip` đã có trong deps? nếu chưa → `bun add jszip file-saver`) HOẶC multi-select `.txt`.
- Với mỗi file: đọc text → invoke `clinical-nlp` → lưu vào Map `{ "1.json": [...] }`.
- Concurrency limit 4 (tránh rate-limit Gemini 429).
- Bảng tiến độ: pending / running / done / error, có retry per-file.
- Nút **"Tải xuống submission.zip"** đóng gói tất cả `.json` (giữ tên `<n>.json` theo file input).
- Thêm route trong `App.tsx` + link trong sidebar (mục "Clinical NLP" trong nhóm hiện có).

### 4. Đồng bộ tích hợp cũ
- `BioVault.tsx` + `ChainEMR.tsx` đang gọi `clinical-nlp` — cập nhật render dùng schema mới (nhãn Vietnamese, assertions badges). Vẫn giữ nút "Trích xuất khái niệm" như cũ.

## Files thay đổi

**Created**
- `src/pages/ClinicalNlpBatch.tsx` — batch runner UI
- `src/lib/nlpBatch.ts` — helper concurrency + zip pack/unpack

**Edited**
- `supabase/functions/clinical-nlp/index.ts` — schema đề bài + RxNav/WHO verify
- `src/components/shared/ClinicalNlpPanel.tsx` — render schema mới
- `src/App.tsx` — thêm route `/clinical-nlp-batch`
- `src/components/AppSidebar.tsx` — thêm link
- `src/pages/BioVault.tsx`, `src/pages/ChainEMR.tsx` — adapt schema mới

**Dependencies**: `bun add jszip file-saver @types/file-saver` (nếu chưa có).

## Verify trước khi bàn giao
1. Test 1 văn bản ví dụ trong đề bài → output JSON đúng nhãn, đúng position, có ICD K21.x và RxNorm 360047/1660761.
2. Test batch với 3 file .txt giả → nhận zip 3 file .json.
3. Kiểm console không lỗi CORS/429.

## Không làm trong scope này
- Fine-tune model hoặc train local NER (đề bài cho phép nhưng vượt scope Lovable).
- Lưu DB `clinical_notes` (user đã chốt "tích hợp vào BioVault/EMR sẵn có" — không cần bảng mới).
- Xử lý PDF/hình ảnh input (đề bài chỉ .txt).

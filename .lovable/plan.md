# Kế hoạch: Lồng các tính năng bị trùng

Mục tiêu: loại bỏ trùng lặp UI/logic, dùng chung 1 nguồn cho mỗi tính năng. Chỉ chỉnh frontend — không đụng schema, không đụng business logic backend.

---

## 1. QR Check-in (gộp Campaigns ↔ Smart Clinic)

**Trùng:** `src/components/QRCheckIn.tsx` (Campaigns: scan camera, manual, offline queue, generate QR) và khối "QR Check-in 60s" mock trong `src/pages/ChainSmartClinic.tsx` (chỉ animation giả).

**Cách gộp:**
- Trích phần lõi của `QRCheckIn.tsx` thành component dùng chung `src/components/shared/QRCheckInPanel.tsx` với prop `mode: "campaign" | "clinic"`.
  - `campaign`: giữ nguyên — chọn campaign, lưu vào `campaign_checkins`, offline queue.
  - `clinic`: chế độ mock — không cần chọn campaign, sau khi scan/manual sẽ tạo 1 "phiếu khám" hiển thị tại chỗ (mock token, không ghi DB), kèm `mockTxHash` để khớp narrative blockchain.
- `Campaigns` page: thay `<QRCheckIn />` cũ bằng `<QRCheckInPanel mode="campaign" />`.
- `ChainSmartClinic`: thay khối mock cũ bằng `<QRCheckInPanel mode="clinic" />`.
- Component cũ `QRCheckIn.tsx` xoá sau khi đã thay ở mọi nơi.

## 2. Trợ lý AI (gộp Smart Clinic ↔ GlobalAIAssistant)

**Trùng:** `GlobalAIAssistant` (nổi mọi trang, chat tổng quát) và 2 panel trong `ChainSmartClinic` ("AI Triage" + "AI Doctor Assistant" gọi edge `ai-triage`).

**Cách gộp:**
- Mở rộng `GlobalAIAssistant` để hỗ trợ "skills" (chế độ chuyên biệt): `general | triage | doctor`. Mỗi skill có system prompt + endpoint riêng (`ai-triage` cho triage/doctor, giữ flow hiện tại cho general).
- Trong `ChainSmartClinic`, bỏ 2 card chat dài; thay bằng 2 nút gọn "Khởi động AI Triage" / "Mở Doctor Assistant" — bấm sẽ mở `GlobalAIAssistant` với skill tương ứng (qua custom event hoặc Zustand store nhỏ `useAssistantSkill`).
- Giữ phần "Queue Board" và "QR Check-in" của Smart Clinic; chỉ phần chat AI là gộp.
- Lợi ích: 1 cửa sổ chat duy nhất, lịch sử thống nhất, đỡ tải trang.

## 3. EMR / Health Records (liên kết ChainEMR ↔ BioVault)

**Trùng:** `ChainEMR` (HR-NFT gallery — mock token mã hoá hồ sơ) và `BioVault HealthProfile/HealthRecords` (hồ sơ thật của user).

**Cách gộp (không trộn dữ liệu thật vs mock):**
- Trong `BioVault > HealthProfile`, mỗi health record thêm nút **"Mint as HR-NFT"** → mở modal mock (dùng `useMockChain` để tạo `tx_hash`, `ipfs_hash`) → ghi vào `hr_nfts` với `user_id` hiện tại.
- Trong `ChainEMR`, mỗi HR-NFT thêm liên kết **"Xem hồ sơ gốc"** → điều hướng về `BioVault` filter theo `record_id` (lưu trong `hr_nfts.metadata` hoặc cột mới nếu cần — nhưng kế hoạch này KHÔNG đổi schema, sẽ dùng `patient_name_hash` + `icd10` để khớp hiển thị).
- Thêm thẻ "EMR trên blockchain" tóm tắt (số HR-NFT đã mint) trong `BioVault` overview, click → `/chain/emr`.
- Không xoá trang nào — chỉ tạo 1 cây cầu 2 chiều để user hiểu cùng 1 dữ liệu, 2 góc nhìn.

---

## Files dự kiến chạm

**Tạo mới:**
- `src/components/shared/QRCheckInPanel.tsx`
- `src/store/useAssistantSkill.ts` (Zustand nhỏ)
- `src/components/biovault/MintHrNftModal.tsx`

**Sửa:**
- `src/pages/Campaigns.tsx` — đổi import QRCheckIn
- `src/pages/ChainSmartClinic.tsx` — bỏ panel chat AI, dùng QRCheckInPanel, thêm nút mở Assistant
- `src/components/GlobalAIAssistant.tsx` — thêm skill switching + đọc `useAssistantSkill`
- `src/components/biovault/HealthProfile.tsx` (hoặc HealthRecords) — thêm nút Mint HR-NFT + thẻ tóm tắt
- `src/pages/ChainEMR.tsx` — thêm link "Xem hồ sơ gốc"

**Xoá (sau khi thay xong):**
- `src/components/QRCheckIn.tsx`

## Ngoài phạm vi
- Không đổi schema Supabase (`hr_nfts`, `htc_transactions`, `campaign_checkins` giữ nguyên).
- Không sửa edge function `ai-triage`.
- Không đụng mobile bottom nav, sidebar, routing.
- Không gộp `FaceScanModal` lần này (user chưa chọn).

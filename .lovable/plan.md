# Kế hoạch: Demo Blockchain EMR + AI Smart Clinic + HealthCoin

Mục tiêu: tạo bộ giao diện trình diễn cho FHB 2026, mock toàn bộ blockchain (không deploy contract, không gas). Mọi "hash", "tx", "mint" chỉ là SHA-256 + UUID lưu Supabase, hiển thị như thật.

## Phạm vi

4 module, mỗi module 1 trang riêng + 1 entry point trong sidebar (gom dưới nhãn "Sao Mai Chain"):

```
/chain                  → Tổng quan kiến trúc (hero + 4 card module)
/chain/emr              → 4.2 Blockchain EMR + HR-NFT
/chain/smart-clinic     → 4.3 AI Smart Clinic (Triage, QR check-in, Doctor Assistant, Queue)
/chain/healthcoin       → 4.4 Ví HealthCoin (HTC)
```

## Module 1 — `/chain/emr` (HR-NFT + Blockchain EMR)

- **Network status bar**: badge "Hyperledger Fabric · Permissioned" + "Block height 184,392" (mock, tăng dần mỗi 6s).
- **HR-NFT Gallery**: grid card NFT bệnh án (5–8 mock). Mỗi card:
  - Token ID `#HRN-000142`, ngày khám, cơ sở, mã ICD-10, bác sĩ ký số.
  - Hash IPFS giả `Qm…` + tx hash `0x…` (rút gọn, click copy).
  - Trạng thái: Owned / Shared / Revoked.
- **NFT Detail Drawer**: mở từ card → full timeline khám, đơn thuốc, xét nghiệm, chữ ký số, nút "Chia sẻ qua QR" và "Thu hồi quyền truy cập".
- **QR Share Modal**: render QR (lib `qrcode.react` — kiểm tra package, nếu chưa có sẽ cài) chứa token ID + signed payload mock; countdown 5 phút.
- **Smart Contract Activity**: bảng log "Insurance auto-claim triggered → paid 2,400,000 VNĐ in 18s" cho 3–4 ca.

## Module 2 — `/chain/smart-clinic` (AI Smart Clinic)

Bố cục 2 cột, top tabs: **Pre-screening | Check-in | Doctor Assistant | Queue Board**.

- **Pre-screening & Triage**: form nhập triệu chứng → gọi edge function `ai-triage` (mới) dùng Lovable AI Gateway (Gemini Flash) trả về `{ triageLevel: 1-5, specialty, estimatedWait, reasoning }`. Hiển thị thẻ kết quả với màu theo level (1 đỏ → 5 xanh).
- **QR Check-in**: ô quét QR mô phỏng (nhập token ID hoặc bấm "Demo scan") → load mock patient + HR-NFT history → animation "Hoàn tất thủ tục trong 47 giây".
- **AI Doctor Assistant**: split view — trái: hồ sơ bệnh nhân (Digital Twin tóm tắt); phải: chat gợi ý chẩn đoán + cảnh báo tương tác thuốc (gọi cùng edge function với prompt khác). Nút "Kê đơn điện tử" tạo card đơn thuốc + QR pharmacy.
- **Queue Board**: dashboard realtime mock — bảng số thứ tự, ước tính phút chờ, badge "SMS/Zalo sent" tick xanh.

## Module 3 — `/chain/healthcoin` (HTC Wallet)

- **Wallet card** (gradient warm gold/teal): số dư `12,450 HTC ≈ 12.450.000 VNĐ`, địa chỉ ví rút gọn, nút **Nạp / Rút / Chuyển**.
- **Mint/Burn flow**: modal nạp 100.000 VNĐ → animation "Minting 100 HTC" → cập nhật số dư + thêm tx vào lịch sử (lưu bảng `htc_transactions` mock).
- **Transaction history**: list với icon (mint/burn/payment/claim/reward), trạng thái, hash tx.
- **Use cases panel**: 4 card — Viện phí, Bồi thường bảo hiểm (Smart Contract), Gói Plus/Pro -10%, Health Reward.
- **Compliance footer**: badge "KYC verified · NHNN compliant · HL7 FHIR".

## Module 4 — `/chain` (Tổng quan)

- Hero: tiêu đề "Sao Mai Chain — Blockchain · NFT · HealthCoin", subtitle vi/en (i18n).
- Sơ đồ kiến trúc ASCII/SVG: Permissioned Chain ↔ IPFS ↔ HR-NFT ↔ Smart Contract ↔ HTC.
- 4 card module với CTA "Khám phá".
- Stats strip: "184k blocks · 12k HR-NFTs · 2.4M HTC circulating · 24h claim payout" (mock).

## Chi tiết kỹ thuật

**Frontend**
- React Router: thêm 4 route trong `src/App.tsx`, lazy-load.
- Sidebar (`AppSidebar.tsx` + `MobileBottomNav.tsx`): thêm mục "Sao Mai Chain" — KHÔNG vi phạm rule 3 mobile items (đặt vào sidebar desktop, mobile vẫn 3 mục cốt lõi; trang `/chain` truy cập qua dashboard tile).
- Component mới dưới `src/components/chain/`:
  - `ChainStatusBar.tsx`, `HRNFTCard.tsx`, `HRNFTDetailDrawer.tsx`, `ShareQRModal.tsx`, `SmartContractLog.tsx`
  - `TriageForm.tsx`, `QRCheckInPanel.tsx`, `DoctorAssistantChat.tsx`, `QueueBoard.tsx`
  - `HealthCoinWallet.tsx`, `MintBurnModal.tsx`, `HTCTxList.tsx`
- Hook `src/hooks/useMockChain.ts`: tạo hash giả `sha256(JSON.stringify(payload)+nonce)` qua Web Crypto, sinh tx hash, block height.
- i18n: thêm namespace `chain` vào `vi.json` + `en.json`.
- Tuân thủ design tokens (không hardcode màu); dùng glassmorphism + warm gold accent cho HTC, teal cho EMR.

**Backend (Supabase)**
- 2 bảng mock (cần migration):
  - `hr_nfts` — token_id, owner_user_id, patient_name_hash, icd10, doctor_name, facility, ipfs_hash, tx_hash, minted_at, status
  - `htc_transactions` — user_id, type (mint/burn/payment/claim/reward), amount_htc, amount_vnd, counterparty, tx_hash, status, created_at
  - RLS: chỉ owner đọc/ghi (`auth.uid() = user_id`); `service_role` full.
  - GRANT đầy đủ cho `authenticated` + `service_role`, không cấp `anon`.
- Seed data: dùng `supabase--insert` sau migration để tạo ~8 HR-NFTs + 15 tx demo cho user hiện tại (lazy seed khi vào trang lần đầu nếu chưa có dữ liệu).
- 1 edge function mới: `ai-triage` (Lovable AI Gateway, model `google/gemini-2.5-flash`) trả JSON triage + doctor assistant suggestions tùy `mode`.

**Không động vào**
- Không thêm gì vào mobile bottom nav (giữ 3 mục).
- Không khôi phục Shopify/cart, Face scanner chẩn đoán.
- Không deploy smart contract thật, không thêm dependency web3/ethers.

## Disclaimer & pháp lý
- Banner mỗi trang `/chain/*`: *"Bản trình diễn FHB 2026 — Blockchain và HealthCoin chưa hoạt động trên mainnet. Dữ liệu hiển thị là mô phỏng."*
- HTC wallet: thêm dòng "Tuân thủ dự thảo NHNN về tài sản số" (tham chiếu, không khẳng định đã cấp phép).

## Trình tự thực hiện (sau khi duyệt)
1. Migration tạo `hr_nfts` + `htc_transactions` (chờ duyệt riêng).
2. Edge function `ai-triage`.
3. Hook `useMockChain` + i18n keys.
4. Trang `/chain` tổng quan + sidebar entry.
5. Module EMR → Smart Clinic → HealthCoin (3 PR nhỏ tuần tự trong cùng phiên).
6. Seed data demo.
7. Kiểm tra mobile/desktop, lint, build.

Bạn duyệt để mình bắt tay vào bước 1?
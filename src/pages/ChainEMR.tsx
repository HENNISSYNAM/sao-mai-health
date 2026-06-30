import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChainShell } from "@/components/chain/ChainShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileCheck2, QrCode, Share2, Copy, Hospital, Stethoscope, ScrollText, FlaskConical, ShieldCheck, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { mockIpfsHash, mockTxHash, shortHash } from "@/hooks/useMockChain";
import QRCode from "qrcode";

interface HRNFT {
  id: string;
  token_id: string;
  patient_name: string;
  visit_date: string;
  facility: string;
  doctor_name: string;
  icd10: string;
  diagnosis: string | null;
  prescription: any;
  lab_results: any;
  ipfs_hash: string;
  tx_hash: string;
  block_height: number;
  status: string;
  doctor_signature: string | null;
  minted_at: string;
}

const SEED: Omit<HRNFT, "id" | "ipfs_hash" | "tx_hash" | "block_height" | "doctor_signature" | "minted_at" | "patient_hash">[] = [
  { token_id: "HRN-000142", patient_name: "Nguyễn Văn A", visit_date: "2026-06-12", facility: "BV Chợ Rẫy", doctor_name: "BS. Trần Minh Hoàng", icd10: "J45.9", diagnosis: "Hen phế quản không xác định, cơn nhẹ", prescription: [{ drug: "Salbutamol MDI", dose: "100mcg x 2 nhát khi cần" }, { drug: "Budesonide", dose: "200mcg x 2 lần/ngày" }], lab_results: [{ test: "FEV1", value: "78%", ref: ">80%" }], status: "owned" },
  { token_id: "HRN-000148", patient_name: "Nguyễn Văn A", visit_date: "2026-05-30", facility: "BV ĐH Y Dược TP.HCM", doctor_name: "BS. Lê Thị Minh", icd10: "E11.9", diagnosis: "Tiểu đường type 2 không biến chứng", prescription: [{ drug: "Metformin 500mg", dose: "1v x 2 lần/ngày sau ăn" }], lab_results: [{ test: "HbA1c", value: "7.2%", ref: "<6.5%" }, { test: "Glucose đói", value: "142 mg/dL", ref: "70-99" }], status: "shared" },
  { token_id: "HRN-000156", patient_name: "Nguyễn Văn A", visit_date: "2026-05-18", facility: "Vinmec Central Park", doctor_name: "BS. Phạm Quốc Tuấn", icd10: "I10", diagnosis: "Tăng huyết áp vô căn", prescription: [{ drug: "Amlodipine 5mg", dose: "1v sáng" }], lab_results: [{ test: "HA", value: "148/92 mmHg", ref: "<140/90" }], status: "owned" },
  { token_id: "HRN-000163", patient_name: "Nguyễn Văn A", visit_date: "2026-04-22", facility: "BV Nhi Đồng 2", doctor_name: "BS. Đỗ Hữu Nam", icd10: "J06.9", diagnosis: "Nhiễm trùng đường hô hấp trên cấp", prescription: [{ drug: "Paracetamol 500mg", dose: "1v khi sốt" }], lab_results: [], status: "revoked" },
  { token_id: "HRN-000171", patient_name: "Nguyễn Văn A", visit_date: "2026-04-05", facility: "BV Chợ Rẫy", doctor_name: "BS. Trần Minh Hoàng", icd10: "M54.5", diagnosis: "Đau lưng dưới", prescription: [{ drug: "Diclofenac 50mg", dose: "1v x 2/ngày sau ăn" }], lab_results: [{ test: "MRI L4-L5", value: "Thoái hóa nhẹ", ref: "—" }], status: "owned" },
  { token_id: "HRN-000179", patient_name: "Nguyễn Văn A", visit_date: "2026-03-19", facility: "BV ĐH Y Dược TP.HCM", doctor_name: "BS. Lê Thị Minh", icd10: "Z00.0", diagnosis: "Khám sức khỏe định kỳ — bình thường", prescription: [], lab_results: [{ test: "Cholesterol TP", value: "192 mg/dL", ref: "<200" }, { test: "Triglyceride", value: "148 mg/dL", ref: "<150" }], status: "owned" },
];

const CLAIMS = [
  { case: "HRN-000148 · Tiểu đường", payout: 2_400_000, time: "18s", insurer: "Bảo Việt Health" },
  { case: "HRN-000156 · Tăng huyết áp", payout: 850_000, time: "22s", insurer: "Manulife" },
  { case: "HRN-000142 · Hen phế quản", payout: 1_120_000, time: "14s", insurer: "Bảo Việt Health" },
];

export default function ChainEMR() {
  const [nfts, setNfts] = useState<HRNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selected, setSelected] = useState<HRNFT | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // anonymous demo: use seed in-memory
      const local = await Promise.all(SEED.map(async (s, i) => ({
        ...s,
        id: `local-${i}`,
        ipfs_hash: await mockIpfsHash(s),
        tx_hash: await mockTxHash(s),
        block_height: 184_000 + i * 17,
        doctor_signature: `sig_${(await mockTxHash(s.doctor_name)).slice(2, 18)}`,
        minted_at: new Date(s.visit_date).toISOString(),
      } as HRNFT)));
      setNfts(local);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("hr_nfts")
      .select("*")
      .order("minted_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setNfts((data || []) as any);
    setLoading(false);
  }

  async function seedDemo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.info("Đăng nhập để lưu HR-NFT vào blockchain mô phỏng."); return; }
    setSeeding(true);
    const rows = await Promise.all(SEED.map(async (s) => ({
      user_id: user.id,
      token_id: s.token_id + "-" + Date.now().toString(36).slice(-4),
      patient_name: s.patient_name,
      patient_hash: (await mockTxHash(s.patient_name)).slice(2, 34),
      visit_date: s.visit_date,
      facility: s.facility,
      doctor_name: s.doctor_name,
      icd10: s.icd10,
      diagnosis: s.diagnosis,
      prescription: s.prescription,
      lab_results: s.lab_results,
      ipfs_hash: await mockIpfsHash(s),
      tx_hash: await mockTxHash(s),
      block_height: 184_000 + Math.floor(Math.random() * 500),
      status: s.status,
      doctor_signature: "sig_" + (await mockTxHash(s.doctor_name)).slice(2, 18),
      minted_at: new Date(s.visit_date).toISOString(),
    })));
    const { error } = await supabase.from("hr_nfts").insert(rows as any);
    setSeeding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã mint " + rows.length + " HR-NFT lên Sao Mai Chain mô phỏng");
    load();
  }

  useEffect(() => { load(); }, []);

  async function openShare(nft: HRNFT) {
    setSelected(nft);
    const payload = JSON.stringify({ tid: nft.token_id, tx: nft.tx_hash, exp: Date.now() + 5 * 60_000 });
    const url = await QRCode.toDataURL(payload, { width: 320, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
    setQrUrl(url);
    setShareOpen(true);
  }

  const statusColor = (s: string) =>
    s === "owned" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : s === "shared" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
    : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";

  return (
    <ChainShell>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><FileCheck2 className="w-6 h-6 text-primary" /> HR-NFT Bệnh án</h2>
          <p className="text-sm text-muted-foreground">Mỗi lần khám = 1 NFT bất biến. Bạn là chủ sở hữu thực sự.</p>
        </div>
        <Button onClick={seedDemo} disabled={seeding} variant="outline" size="sm">
          {seeding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Mint dữ liệu demo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : nfts.length === 0 ? (
        <Card className="p-8 text-center">
          <FileCheck2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-3">Chưa có HR-NFT nào trên ví của bạn.</p>
          <Button onClick={seedDemo} disabled={seeding}>Mint demo data</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {nfts.map((nft) => (
            <Card key={nft.id} className="p-4 hover:border-primary/40 transition-all hover:shadow-md cursor-pointer group" onClick={() => setSelected(nft)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs font-mono text-muted-foreground">#{nft.token_id}</div>
                  <div className="font-bold">{nft.icd10} · {nft.diagnosis?.slice(0, 30)}</div>
                </div>
                <Badge variant="outline" className={statusColor(nft.status)}>{nft.status}</Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Hospital className="w-3 h-3" /> {nft.facility}</div>
                <div className="flex items-center gap-1.5"><Stethoscope className="w-3 h-3" /> {nft.doctor_name}</div>
                <div className="flex items-center gap-1.5"><ScrollText className="w-3 h-3" /> {new Date(nft.visit_date).toLocaleDateString("vi-VN")}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-1 text-[10px] font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>IPFS</span>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(nft.ipfs_hash); toast.success("Đã copy"); }} className="hover:text-primary inline-flex items-center gap-1">
                    {shortHash(nft.ipfs_hash, 8, 6)} <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>tx</span>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(nft.tx_hash); toast.success("Đã copy"); }} className="hover:text-primary inline-flex items-center gap-1">
                    {shortHash(nft.tx_hash, 8, 6)} <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="w-full mt-3" onClick={(e) => { e.stopPropagation(); openShare(nft); }}>
                <QrCode className="w-4 h-4 mr-1" /> Chia sẻ QR
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Smart contract activity */}
      <Card className="mt-6 p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Smart Contract — Bồi thường bảo hiểm tự động</h3>
        <div className="space-y-2">
          {CLAIMS.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm">
              <div>
                <div className="font-medium">{c.case}</div>
                <div className="text-xs text-muted-foreground">{c.insurer} · Smart Contract trigger</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">+{c.payout.toLocaleString("vi-VN")} ₫</div>
                <div className="text-[10px] text-muted-foreground">payout in {c.time}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!selected && !shareOpen} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><FileCheck2 className="w-5 h-5 text-primary" /> HR-NFT #{selected.token_id}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4 text-sm">
                <Card className="p-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><div className="text-muted-foreground">Bệnh nhân</div><div className="font-medium">{selected.patient_name}</div></div>
                    <div><div className="text-muted-foreground">Ngày khám</div><div className="font-medium">{new Date(selected.visit_date).toLocaleDateString("vi-VN")}</div></div>
                    <div><div className="text-muted-foreground">Cơ sở</div><div className="font-medium">{selected.facility}</div></div>
                    <div><div className="text-muted-foreground">Bác sĩ</div><div className="font-medium">{selected.doctor_name}</div></div>
                    <div className="col-span-2"><div className="text-muted-foreground">Chẩn đoán</div><div className="font-medium">{selected.icd10} — {selected.diagnosis}</div></div>
                  </div>
                </Card>

                {Array.isArray(selected.prescription) && selected.prescription.length > 0 && (
                  <div>
                    <div className="font-semibold mb-2 flex items-center gap-1.5"><ScrollText className="w-4 h-4" /> Đơn thuốc</div>
                    <div className="space-y-1">
                      {selected.prescription.map((p: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/50 text-xs flex justify-between">
                          <span className="font-medium">{p.drug}</span><span className="text-muted-foreground">{p.dose}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(selected.lab_results) && selected.lab_results.length > 0 && (
                  <div>
                    <div className="font-semibold mb-2 flex items-center gap-1.5"><FlaskConical className="w-4 h-4" /> Xét nghiệm</div>
                    <div className="space-y-1">
                      {selected.lab_results.map((l: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/50 text-xs flex justify-between">
                          <span className="font-medium">{l.test}</span>
                          <span>{l.value} <span className="text-muted-foreground">(ref {l.ref})</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Card className="p-3 bg-muted/30">
                  <div className="text-[10px] uppercase text-muted-foreground mb-1">On-chain proof</div>
                  <div className="font-mono text-xs space-y-1">
                    <div>tx: {selected.tx_hash}</div>
                    <div>ipfs: {selected.ipfs_hash}</div>
                    <div>block: #{selected.block_height.toLocaleString("vi-VN")}</div>
                    <div>signature: {selected.doctor_signature}</div>
                  </div>
                </Card>

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => openShare(selected)} className="flex-1 min-w-[140px]"><Share2 className="w-4 h-4 mr-1" /> Chia sẻ QR</Button>
                  <Button variant="outline" asChild className="flex-1 min-w-[140px]">
                    <Link to="/biovault"><ExternalLink className="w-4 h-4 mr-1" /> Mở trong BioVault</Link>
                  </Button>
                  <Button variant="destructive" className="flex-1 min-w-[140px]">Thu hồi quyền</Button>
                </div>

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Share QR */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Chia sẻ HR-NFT khẩn cấp</DialogTitle></DialogHeader>
          {qrUrl && <img src={qrUrl} alt="QR" className="w-full rounded-lg border" />}
          <p className="text-xs text-muted-foreground text-center">
            Bác sĩ tại cơ sở y tế bất kỳ quét QR để truy cập hồ sơ. Token hết hạn sau 5 phút.
          </p>
        </DialogContent>
      </Dialog>
    </ChainShell>
  );
}

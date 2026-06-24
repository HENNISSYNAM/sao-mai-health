import { useEffect, useState } from "react";
import { ChainShell } from "@/components/chain/ChainShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, Wallet, ArrowUpRight, ArrowDownLeft, Send, Sparkles, ShieldCheck, Hospital, FileCheck2, Gift, Tag, Loader2, Copy } from "lucide-react";
import { formatHTC, formatVND, mockTxHash, shortHash } from "@/hooks/useMockChain";

interface HtcTx {
  id: string;
  tx_type: string;
  amount_htc: number;
  amount_vnd: number;
  counterparty: string | null;
  description: string | null;
  tx_hash: string;
  block_height: number;
  status: string;
  created_at: string;
}

const SEED_TX: Omit<HtcTx, "id" | "tx_hash" | "block_height" | "created_at">[] = [
  { tx_type: "mint", amount_htc: 500, amount_vnd: 500_000, counterparty: "MoMo Wallet", description: "Nạp tiền VNĐ → đúc HTC", status: "confirmed" },
  { tx_type: "claim", amount_htc: 2400, amount_vnd: 2_400_000, counterparty: "Bảo Việt Health", description: "Bồi thường BH · HR-NFT #HRN-000148", status: "confirmed" },
  { tx_type: "payment", amount_htc: -350, amount_vnd: -350_000, counterparty: "BV Chợ Rẫy", description: "Thanh toán viện phí", status: "confirmed" },
  { tx_type: "reward", amount_htc: 80, amount_vnd: 80_000, counterparty: "Manulife", description: "Health Reward · 30 ngày tập đều", status: "confirmed" },
  { tx_type: "payment", amount_htc: -120, amount_vnd: -120_000, counterparty: "Nhà thuốc Long Châu", description: "Mua thuốc theo đơn", status: "confirmed" },
  { tx_type: "mint", amount_htc: 1000, amount_vnd: 1_000_000, counterparty: "VNPay", description: "Nạp HTC", status: "confirmed" },
];

export default function ChainHealthCoin() {
  const [txs, setTxs] = useState<HtcTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintOpen, setMintOpen] = useState(false);
  const [mintAmount, setMintAmount] = useState("100000");
  const [minting, setMinting] = useState(false);
  const [walletAddr, setWalletAddr] = useState("0x" + "a".repeat(40));

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const local = await Promise.all(SEED_TX.map(async (t, i) => ({
        ...t, id: `local-${i}`,
        tx_hash: await mockTxHash(t),
        block_height: 184_000 + i * 11,
        created_at: new Date(Date.now() - i * 86400_000).toISOString(),
      })));
      setTxs(local);
      setLoading(false);
      return;
    }
    setWalletAddr("0x" + user.id.replace(/-/g, "").slice(0, 40));
    const { data, error } = await supabase
      .from("htc_transactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (!data || data.length === 0) {
      // seed
      const rows = await Promise.all(SEED_TX.map(async (t, i) => ({
        user_id: user.id,
        tx_type: t.tx_type,
        amount_htc: t.amount_htc,
        amount_vnd: t.amount_vnd,
        counterparty: t.counterparty,
        description: t.description,
        tx_hash: await mockTxHash(t),
        block_height: 184_000 + i * 11,
        status: t.status,
        created_at: new Date(Date.now() - i * 86400_000).toISOString(),
      })));
      await supabase.from("htc_transactions").insert(rows as any);
      const { data: d2 } = await supabase.from("htc_transactions").select("*").order("created_at", { ascending: false });
      setTxs((d2 || []) as any);
    } else {
      setTxs(data as any);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const balanceHtc = txs.reduce((s, t) => s + Number(t.amount_htc), 0);
  const balanceVnd = balanceHtc * 1000;

  async function doMint() {
    const vnd = Number(mintAmount);
    if (!vnd || vnd < 10000) { toast.error("Tối thiểu 10.000 VNĐ"); return; }
    setMinting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const newTx = {
      tx_type: "mint",
      amount_htc: vnd / 1000,
      amount_vnd: vnd,
      counterparty: "MoMo Wallet",
      description: "Nạp tiền VNĐ → đúc HTC",
      tx_hash: await mockTxHash({ vnd, ts: Date.now() }),
      block_height: 184_000 + Math.floor(Math.random() * 1000),
      status: "confirmed",
    };
    await new Promise((r) => setTimeout(r, 1500)); // mint animation
    if (user) {
      const { data, error } = await supabase
        .from("htc_transactions")
        .insert({ ...newTx, user_id: user.id } as any)
        .select()
        .single();
      if (error) { toast.error(error.message); setMinting(false); return; }
      setTxs((prev) => [data as any, ...prev]);
    } else {
      setTxs((prev) => [{ ...newTx, id: "local-new-" + Date.now(), created_at: new Date().toISOString() } as any, ...prev]);
    }
    toast.success(`Đã mint ${vnd / 1000} HTC`);
    setMinting(false);
    setMintOpen(false);
  }

  const txIcon = (t: string) => {
    if (t === "mint") return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
    if (t === "burn") return <ArrowUpRight className="w-4 h-4 text-rose-600" />;
    if (t === "payment") return <Hospital className="w-4 h-4 text-blue-600" />;
    if (t === "claim") return <ShieldCheck className="w-4 h-4 text-violet-600" />;
    if (t === "reward") return <Gift className="w-4 h-4 text-amber-600" />;
    return <Coins className="w-4 h-4" />;
  };

  const useCases = [
    { icon: Hospital, title: "Viện phí · xét nghiệm · thuốc", desc: "Một chạm, không tiền mặt." },
    { icon: ShieldCheck, title: "Bồi thường bảo hiểm", desc: "Smart Contract giải ngân < 24h." },
    { icon: Tag, title: "Gói Plus/Pro -10%", desc: "Thanh toán SAO MAI HEALTH bằng HTC." },
    { icon: Gift, title: "Health Reward", desc: "Duy trì chỉ số tốt → nhận HTC thưởng." },
  ];

  return (
    <ChainShell>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Coins className="w-6 h-6 text-amber-500" /> HealthCoin (HTC)</h2>
        <p className="text-sm text-muted-foreground">Stablecoin Y tế Quốc gia · neo giá 1 HTC = 1.000 VNĐ · collateral 100%.</p>
      </div>

      {/* Wallet card */}
      <Card className="p-6 mb-4 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-rose-500/10 border-amber-500/30">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Ví HealthCoin</div>
            <div className="text-4xl md:text-5xl font-bold mt-1">{formatHTC(balanceHtc)}</div>
            <div className="text-sm text-muted-foreground">≈ {formatVND(balanceVnd)}</div>
            <button
              onClick={() => { navigator.clipboard.writeText(walletAddr); toast.success("Đã copy địa chỉ ví"); }}
              className="mt-3 text-xs font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              {shortHash(walletAddr, 10, 8)} <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setMintOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
              <ArrowDownLeft className="w-4 h-4 mr-1" /> Nạp
            </Button>
            <Button variant="outline"><ArrowUpRight className="w-4 h-4 mr-1" /> Rút</Button>
            <Button variant="outline"><Send className="w-4 h-4 mr-1" /> Chuyển</Button>
          </div>
        </div>
      </Card>

      {/* Use cases */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {useCases.map((u, i) => (
          <Card key={i} className="p-4">
            <u.icon className="w-5 h-5 text-primary mb-2" />
            <div className="font-semibold text-sm">{u.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{u.desc}</div>
          </Card>
        ))}
      </div>

      {/* Tx history */}
      <Card className="p-5">
        <h3 className="font-bold mb-3">Lịch sử giao dịch on-chain</h3>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-2">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center flex-shrink-0">{txIcon(t.tx_type)}</div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.description || t.tx_type}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t.counterparty} · {new Date(t.created_at).toLocaleDateString("vi-VN")} · tx {shortHash(t.tx_hash, 6, 4)}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-bold ${Number(t.amount_htc) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {Number(t.amount_htc) >= 0 ? "+" : ""}{formatHTC(Number(t.amount_htc))}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Compliance footer */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="gap-1"><ShieldCheck className="w-3 h-3" /> KYC verified</Badge>
        <Badge variant="outline">NHNN compliant (dự thảo)</Badge>
        <Badge variant="outline">HL7 FHIR</Badge>
        <Badge variant="outline">Collateral 100% VNĐ</Badge>
      </div>

      {/* Mint dialog */}
      <Dialog open={mintOpen} onOpenChange={setMintOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nạp tiền · Đúc HTC</DialogTitle></DialogHeader>
          {!minting ? (
            <>
              <div className="space-y-3 py-2">
                <div>
                  <label className="text-xs text-muted-foreground">Số tiền VNĐ</label>
                  <Input type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} />
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  Bạn sẽ nhận <span className="font-bold text-amber-600">{(Number(mintAmount) / 1000).toLocaleString("vi-VN")} HTC</span>
                </div>
                <div className="flex gap-2">
                  {[50_000, 100_000, 500_000, 1_000_000].map((v) => (
                    <Button key={v} size="sm" variant="outline" onClick={() => setMintAmount(String(v))} className="flex-1 text-xs">
                      {(v / 1000).toLocaleString("vi-VN")}k
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={doMint} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                <Sparkles className="w-4 h-4 mr-1" /> Mint HTC
              </Button>
            </>
          ) : (
            <div className="py-8 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-amber-500" />
              <div className="font-bold">Đang đúc HTC trên Sao Mai Chain…</div>
              <div className="text-xs text-muted-foreground mt-1">Đang ghi block và xác nhận collateral.</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ChainShell>
  );
}

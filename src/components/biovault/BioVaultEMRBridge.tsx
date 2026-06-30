import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck2, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { mockIpfsHash, mockTxHash, shortHash } from "@/hooks/useMockChain";

/**
 * Bridge between BioVault (real health records) and ChainEMR (HR-NFT view).
 * Shows the user's HR-NFT count + a 1-click "Mint snapshot as HR-NFT" action
 * that turns the current health profile snapshot into a mock on-chain record.
 */
export function BioVaultEMRBridge() {
  const [count, setCount] = useState<number | null>(null);
  const [latestTx, setLatestTx] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCount(0); return; }
    const { data, error } = await supabase
      .from("hr_nfts")
      .select("tx_hash, minted_at")
      .order("minted_at", { ascending: false })
      .limit(50);
    if (error) { setCount(0); return; }
    setCount(data?.length || 0);
    setLatestTx(data?.[0]?.tx_hash || null);
  }

  useEffect(() => { load(); }, []);

  async function mintSnapshot() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.info("Đăng nhập để mint HR-NFT."); return; }
    setMinting(true);
    try {
      const snapshot = { kind: "biovault-snapshot", at: new Date().toISOString() };
      const tx = await mockTxHash(snapshot);
      const ipfs = await mockIpfsHash(snapshot);
      const { error } = await supabase.from("hr_nfts").insert({
        user_id: user.id,
        token_id: "HRN-SNAP-" + Date.now().toString(36).toUpperCase(),
        patient_name: user.email?.split("@")[0] || "BioVault User",
        patient_hash: (await mockTxHash(user.id)).slice(2, 34),
        visit_date: new Date().toISOString().slice(0, 10),
        facility: "Sao Mai BioVault",
        doctor_name: "Self-attested snapshot",
        icd10: "Z00.0",
        diagnosis: "BioVault snapshot — hồ sơ sức khỏe tự khai báo",
        prescription: [],
        lab_results: [],
        ipfs_hash: ipfs,
        tx_hash: tx,
        block_height: 184_000 + Math.floor(Math.random() * 500),
        status: "owned",
        doctor_signature: "sig_self_" + tx.slice(2, 14),
        minted_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast.success("Đã mint snapshot lên Sao Mai Chain mô phỏng");
      load();
    } catch (e: any) {
      toast.error(e.message || "Mint thất bại");
    } finally {
      setMinting(false);
    }
  }

  return (
    <Card className="p-4 space-y-3 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-primary" /> EMR trên blockchain</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Hồ sơ BioVault có thể mint thành HR-NFT bất biến trên Sao Mai Chain.</p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {count === null ? "…" : `${count} HR-NFT`}
        </Badge>
      </div>

      {latestTx && (
        <div className="text-[10px] font-mono text-muted-foreground">
          tx mới nhất: {shortHash(latestTx, 10, 8)}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={mintSnapshot} disabled={minting}>
          {minting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          Mint snapshot
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/chain/emr"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Xem HR-NFT</Link>
        </Button>
      </div>
    </Card>
  );
}

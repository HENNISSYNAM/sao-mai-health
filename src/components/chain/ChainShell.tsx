import { NavLink, useLocation } from "react-router-dom";
import { Boxes, FileCheck2, Stethoscope, Coins, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockHeight, shortHash } from "@/hooks/useMockChain";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { to: "/chain", label: "Tổng quan", icon: Boxes, end: true },
  { to: "/chain/emr", label: "HR-NFT EMR", icon: FileCheck2 },
  { to: "/chain/smart-clinic", label: "AI Smart Clinic", icon: Stethoscope },
  { to: "/chain/healthcoin", label: "HealthCoin", icon: Coins },
];

export function ChainShell({ children }: { children: React.ReactNode }) {
  const height = useBlockHeight();
  const loc = useLocation();
  return (
    <div className="min-h-screen">
      {/* Status strip */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-background to-accent/10 px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1.5 border-primary/40">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Sao Mai Chain · Hyperledger Fabric (Permissioned)
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">
          Block #{height.toLocaleString("vi-VN")} · {shortHash("0x" + height.toString(16).padStart(64, "f"))}
        </span>
        <Badge variant="secondary" className="ml-auto text-[10px]">IPFS · VNPT Cloud IDC</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-4 border-b border-border">
        {tabs.map((t) => {
          const active = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm rounded-t-lg whitespace-nowrap border-b-2 transition-colors",
                active
                  ? "border-primary text-primary font-semibold bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </NavLink>
          );
        })}
      </div>

      {children}

      {/* Disclaimer */}
      <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
        <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Bản trình diễn FHB 2026.</strong> Blockchain và HealthCoin đang ở giai đoạn proof-of-concept;
          dữ liệu hiển thị là mô phỏng phục vụ pitching, chưa hoạt động trên mainnet. Tuân thủ dự thảo
          NHNN về tài sản số và Luật An ninh mạng 2018.
        </span>
      </div>
    </div>
  );
}

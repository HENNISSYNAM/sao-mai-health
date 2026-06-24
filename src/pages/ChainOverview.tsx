import { ChainShell } from "@/components/chain/ChainShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { FileCheck2, Stethoscope, Coins, ArrowRight, Database, Lock, Cpu, Wallet } from "lucide-react";

const modules = [
  {
    to: "/chain/emr",
    title: "Blockchain EMR + HR-NFT",
    desc: "Mỗi lần khám, xét nghiệm, kê đơn tạo một NFT bệnh án bất biến. Bệnh nhân là chủ sở hữu thực sự.",
    icon: FileCheck2,
    accent: "from-teal-500/20 to-cyan-500/10",
  },
  {
    to: "/chain/smart-clinic",
    title: "AI Smart Clinic",
    desc: "Triage AI · QR check-in · Doctor Assistant · Queue Board. Giảm 30-40% thời gian chờ.",
    icon: Stethoscope,
    accent: "from-violet-500/20 to-indigo-500/10",
  },
  {
    to: "/chain/healthcoin",
    title: "HealthCoin (HTC) — Stablecoin Y tế",
    desc: "1 HTC = 1.000 VNĐ, neo giá, collateral 100%. Bồi thường bảo hiểm < 24h qua Smart Contract.",
    icon: Coins,
    accent: "from-amber-500/20 to-orange-500/10",
  },
];

const stats = [
  { label: "Blocks", value: "184,392", icon: Database },
  { label: "HR-NFTs đã mint", value: "12,847", icon: FileCheck2 },
  { label: "HTC lưu hành", value: "2,4M", icon: Coins },
  { label: "Bồi thường < 24h", value: "98,2%", icon: Wallet },
];

export default function ChainOverview() {
  return (
    <ChainShell>
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-background to-accent/10 border border-border p-6 md:p-10 mb-6">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">FHB 2026 · Sao Mai Fighter Team</div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Sao Mai Chain
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-1">
            Blockchain · NFT Bệnh án · HealthCoin
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mt-3">
            Mạng permissioned trên Hyperledger Fabric, dữ liệu y tế mã hóa trên IPFS,
            chỉ có hash và metadata được ghi on-chain — đảm bảo quyền riêng tư tuyệt đối
            và tuân thủ Luật An ninh mạng 2018.
          </p>
        </div>

        {/* Architecture flow */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {[
            { icon: Lock, label: "Permissioned\nChain" },
            { icon: Database, label: "IPFS\nEncrypted Storage" },
            { icon: FileCheck2, label: "HR-NFT\nERC-721" },
            { icon: Cpu, label: "Smart\nContracts" },
            { icon: Coins, label: "HealthCoin\nHTC Stablecoin" },
          ].map((n, i) => (
            <div key={i} className="relative">
              <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-3 text-center h-full flex flex-col items-center gap-2">
                <n.icon className="w-5 h-5 text-primary" />
                <span className="whitespace-pre-line leading-tight">{n.label}</span>
              </div>
              {i < 4 && (
                <ArrowRight className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <s.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Card key={m.to} className={`p-6 bg-gradient-to-br ${m.accent} border-border hover:border-primary/40 transition-all hover:-translate-y-1 hover:shadow-lg`}>
            <m.icon className="w-8 h-8 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-2">{m.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 min-h-[60px]">{m.desc}</p>
            <Button asChild variant="default" size="sm" className="w-full">
              <NavLink to={m.to}>Khám phá <ArrowRight className="w-4 h-4 ml-1" /></NavLink>
            </Button>
          </Card>
        ))}
      </div>
    </ChainShell>
  );
}

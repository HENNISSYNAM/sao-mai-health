import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VitalsTrace } from "@/components/sensing/VitalsTrace";
import { useRuViewSensing } from "@/hooks/useRuViewSensing";
import { classifyHeart, classifyBreathing } from "@/services/ruview";
import { Wifi, HeartPulse, Wind, TrendingUp } from "lucide-react";

/**
 * Physiological half of the stroke-risk picture.
 *
 * The environmental engine (AQI, pressure, temperature) says when conditions are
 * hostile; this panel says how the person is actually responding right now —
 * measured contactlessly from WiFi CSI. Elevated resting HR, irregular breathing
 * and low mobility are the modifiable signals that turn ambient risk into
 * personal risk, so we surface them alongside the environmental score.
 */
export function PhysiologicalRiskPanel({ environmentalRisk }: { environmentalRisk?: number }) {
  const { nodes, source, summary } = useRuViewSensing();
  const primary = nodes.find((n) => n.latest?.presence) ?? nodes[0];
  const v = primary?.latest;

  const hrStatus = classifyHeart(v?.heartrate_bpm ?? null);
  const brStatus = classifyBreathing(v?.breathing_rate_bpm ?? null);

  // Physiological contribution 0..100
  let physio = 0;
  if (hrStatus === "critical") physio += 40;
  else if (hrStatus === "warning") physio += 20;
  if (brStatus === "critical") physio += 30;
  else if (brStatus === "warning") physio += 15;
  if (v && v.presence && v.motion * 100 < 2) physio += 15; // sedentary
  physio = Math.min(100, physio);

  const combined =
    environmentalRisk != null
      ? Math.round(environmentalRisk * 0.6 + physio * 0.4)
      : physio;

  const tone = (s: number) =>
    s >= 70 ? "text-rose-400" : s >= 40 ? "text-amber-400" : "text-emerald-400";

  return (
    <Card className="bg-background/60 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary" />
          Sinh hiệu không tiếp xúc (WiFi CSI)
          <Badge variant="outline" className="ml-auto text-[10px]">
            {source === "live" ? "trực tiếp" : "mô phỏng"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <HeartPulse className="w-3 h-3" /> Nhịp tim
            </div>
            <div className="text-xl font-bold tabular-nums">
              {v?.heartrate_bpm?.toFixed(0) ?? "—"}
            </div>
            <VitalsTrace history={primary?.history ?? []} field="heartrate_bpm" className="text-rose-500" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <Wind className="w-3 h-3" /> Nhịp thở
            </div>
            <div className="text-xl font-bold tabular-nums">
              {v?.breathing_rate_bpm?.toFixed(0) ?? "—"}
            </div>
            <VitalsTrace history={primary?.history ?? []} field="breathing_rate_bpm" className="text-sky-500" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Vận động
            </div>
            <div className="text-xl font-bold tabular-nums">
              {v ? (v.motion * 100).toFixed(0) : 0}%
            </div>
            <VitalsTrace history={primary?.history ?? []} field="motion" className="text-violet-500" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
          <div>
            <div className="text-[11px] text-muted-foreground">Môi trường</div>
            <div className={`text-lg font-bold ${environmentalRisk != null ? tone(environmentalRisk) : ""}`}>
              {environmentalRisk != null ? Math.round(environmentalRisk) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Sinh lý</div>
            <div className={`text-lg font-bold ${tone(physio)}`}>{physio}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Tổng hợp</div>
            <div className={`text-lg font-bold ${tone(combined)}`}>{combined}</div>
          </div>
        </div>

        {summary.maxFallRisk >= 70 && (
          <p className="text-[11px] text-rose-400">
            Nguy cơ té ngã cao ({summary.maxFallRisk}/100) — cần chú ý khi di chuyển.
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Công cụ hỗ trợ tham khảo. Không thay thế tư vấn và chẩn đoán của bác sĩ.
        </p>
      </CardContent>
    </Card>
  );
}

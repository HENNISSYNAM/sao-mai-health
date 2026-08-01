import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRuViewSensing } from "@/hooks/useRuViewSensing";
import { classifyBreathing, classifyHeart } from "@/services/ruview";
import { VitalsTrace } from "@/components/sensing/VitalsTrace";
import {
  HeartHandshake, Moon, AlertTriangle, Activity, Bed, ShieldAlert, Info, TrendingDown,
} from "lucide-react";

/**
 * Elderly / at-home care view. Everything here is derived from the same
 * contactless WiFi-CSI stream — the person wears nothing and no camera is used,
 * which is what makes overnight bedroom monitoring acceptable at all.
 */
export default function CareMonitor() {
  const { nodes, source, summary } = useRuViewSensing();

  const bedroom = useMemo(
    () => nodes.find((n) => n.node.zone === "bedroom") ?? nodes[0],
    [nodes],
  );

  const sleeping = bedroom?.semantics.find((s) => s.primitive === "someone_sleeping")?.active;
  const inactivity = bedroom?.semantics.find((s) => s.primitive === "elderly_inactivity_anomaly")?.active;
  const noMovement = bedroom?.semantics.find((s) => s.primitive === "no_movement")?.active;
  const distress = nodes.some((n) => n.semantics.find((s) => s.primitive === "possible_distress")?.active);
  const fell = nodes.some((n) => n.latest?.fall_detected);

  const v = bedroom?.latest;
  const brStatus = classifyBreathing(v?.breathing_rate_bpm ?? null);
  const hrStatus = classifyHeart(v?.heartrate_bpm ?? null);
  const vitalsConcern = brStatus === "critical" || hrStatus === "critical";

  const escalations = [
    fell && { level: "critical", label: "Phát hiện té ngã", detail: "Cần kiểm tra ngay lập tức" },
    distress && { level: "critical", label: "Nghi ngờ nguy cấp", detail: "Nhịp tim tăng bất thường kèm cử động mạnh" },
    vitalsConcern && { level: "critical", label: "Sinh hiệu bất thường", detail: "Nhịp thở hoặc nhịp tim ngoài ngưỡng an toàn" },
    noMovement && { level: "warning", label: "Không chuyển động kéo dài", detail: "Có người trong phòng nhưng gần như bất động" },
    inactivity && { level: "warning", label: "Ít vận động bất thường", detail: "Thấp hơn nhiều so với mức nền của người này" },
  ].filter(Boolean) as { level: string; label: string; detail: string }[];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-primary" /> Chăm sóc tại nhà
        </h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi người cao tuổi sống một mình — giấc ngủ, vận động và nguy cơ té ngã,
          không cần đeo thiết bị, không camera trong phòng ngủ.
        </p>
      </div>

      {source === "simulated" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Dữ liệu mô phỏng — chưa kết nối bộ thu RuView.
          </AlertDescription>
        </Alert>
      )}

      {escalations.length > 0 ? (
        <div className="space-y-2">
          {escalations.map((e) => (
            <Alert
              key={e.label}
              className={
                e.level === "critical"
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }
            >
              <AlertTriangle className={`h-4 w-4 ${e.level === "critical" ? "text-rose-600" : "text-amber-600"}`} />
              <AlertDescription>
                <span className="font-semibold">{e.label}</span>
                <span className="text-muted-foreground"> — {e.detail}</span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      ) : (
        <Alert className="border-emerald-500/40 bg-emerald-500/10">
          <Activity className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-sm">
            Mọi chỉ số trong ngưỡng bình thường. Không có cảnh báo nào đang mở.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Moon className="w-4 h-4" /> Trạng thái nghỉ ngơi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sleeping ? "Đang ngủ" : v?.presence ? "Đang thức" : "Không có người"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {sleeping
                ? `Nhịp thở đều ${v?.breathing_rate_bpm?.toFixed(0)} bpm, cử động tối thiểu`
                : "Suy ra từ chuyển động + nhịp thở"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Nguy cơ té ngã
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.maxFallRisk >= 70 ? "text-rose-600" : summary.maxFallRisk >= 40 ? "text-amber-600" : "text-emerald-600"}`}>
              {summary.maxFallRisk}<span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tổng hợp từ độ dao động vận động và sinh hiệu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Mức vận động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{v ? (v.motion * 100).toFixed(0) : 0}%</div>
            <VitalsTrace history={bedroom?.history ?? []} field="motion" className="text-violet-500 mt-1" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bed className="w-4 h-4" /> Sinh hiệu ban đêm — {bedroom?.node.label ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Nhịp thở (bpm)</div>
            <div className="text-3xl font-bold tabular-nums">
              {v?.breathing_rate_bpm?.toFixed(0) ?? "—"}
            </div>
            <VitalsTrace history={bedroom?.history ?? []} field="breathing_rate_bpm" className="text-sky-500" />
            <p className="text-[11px] text-muted-foreground mt-1">Bình thường khi ngủ: 12–20 bpm</p>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Nhịp tim (bpm)</div>
            <div className="text-3xl font-bold tabular-nums">
              {v?.heartrate_bpm?.toFixed(0) ?? "—"}
            </div>
            <VitalsTrace history={bedroom?.history ?? []} field="heartrate_bpm" className="text-rose-500" />
            <p className="text-[11px] text-muted-foreground mt-1">Bình thường khi nghỉ: 60–100 bpm</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground border-t pt-3">
        Công cụ hỗ trợ tham khảo. Không thay thế tư vấn và chẩn đoán của bác sĩ.
        Sinh hiệu đo bằng sóng WiFi có sai số; khi có dấu hiệu cấp cứu phải gọi y tế ngay.
      </p>
    </div>
  );
}

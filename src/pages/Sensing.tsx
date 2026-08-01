import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VitalsTrace } from "@/components/sensing/VitalsTrace";
import { SpatialTwin } from "@/components/sensing/SpatialTwin";
import { useRuViewSensing, type NodeSensing } from "@/hooks/useRuViewSensing";
import { classifyBreathing, classifyHeart, type VitalStatus } from "@/services/ruview";
import {
  Wifi, WifiOff, Activity, HeartPulse, Wind, Users, ShieldAlert, Radio, Info, Boxes,
} from "lucide-react";

const STATUS_CLS: Record<VitalStatus, string> = {
  normal: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-rose-600 dark:text-rose-400",
  unknown: "text-muted-foreground",
};

const PRIMITIVE_LABEL: Record<string, string> = {
  someone_sleeping: "Đang ngủ",
  possible_distress: "Nghi ngờ nguy cấp",
  room_active: "Phòng có hoạt động",
  elderly_inactivity_anomaly: "Bất thường: ít vận động",
  no_movement: "Không chuyển động",
  fall_risk_elevated: "Nguy cơ té ngã cao",
  bathroom_occupied: "Nhà vệ sinh có người",
  bed_exit: "Rời giường",
  meeting_in_progress: "Đang họp",
  multi_room_transition: "Di chuyển giữa phòng",
};

function riskTone(score: number) {
  if (score >= 70) return "bg-rose-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

function NodeCard({ n }: { n: NodeSensing }) {
  const v = n.latest;
  const present = !!v?.presence;
  const hrStatus = classifyHeart(v?.heartrate_bpm ?? null);
  const brStatus = classifyBreathing(v?.breathing_rate_bpm ?? null);
  const activeStates = n.semantics.filter((s) => s.active);

  return (
    <Card className={present ? "" : "opacity-70"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            {n.node.label}
          </CardTitle>
          <Badge variant={present ? "default" : "outline"} className="text-xs">
            {present ? `${v?.n_persons ?? 1} người` : "trống"}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono">
          {n.node.node_id} · RSSI {v ? `${v.rssi.toFixed(0)} dBm` : "—"}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Wind className="w-3.5 h-3.5" /> Nhịp thở
            </div>
            <div className={`text-2xl font-bold tabular-nums ${STATUS_CLS[brStatus]}`}>
              {v?.breathing_rate_bpm != null ? v.breathing_rate_bpm.toFixed(0) : "—"}
              <span className="text-xs font-normal text-muted-foreground ml-1">bpm</span>
            </div>
            <VitalsTrace history={n.history} field="breathing_rate_bpm" className="text-sky-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <HeartPulse className="w-3.5 h-3.5" /> Nhịp tim
            </div>
            <div className={`text-2xl font-bold tabular-nums ${STATUS_CLS[hrStatus]}`}>
              {v?.heartrate_bpm != null ? v.heartrate_bpm.toFixed(0) : "—"}
              <span className="text-xs font-normal text-muted-foreground ml-1">bpm</span>
            </div>
            <VitalsTrace history={n.history} field="heartrate_bpm" className="text-rose-500" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Mức vận động</span>
            <span className="tabular-nums">{v ? (v.motion * 100).toFixed(0) : 0}%</span>
          </div>
          <VitalsTrace history={n.history} field="motion" className="text-violet-500" />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Nguy cơ té ngã</span>
            <span className="font-semibold tabular-nums">{n.fallRisk}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all ${riskTone(n.fallRisk)}`} style={{ width: `${n.fallRisk}%` }} />
          </div>
        </div>

        {activeStates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeStates.map((s) => (
              <Badge
                key={s.primitive}
                variant="outline"
                className={
                  s.primitive === "possible_distress" || s.primitive === "fall_risk_elevated"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px]"
                    : "text-[11px]"
                }
                title={s.reason.join(" · ")}
              >
                {PRIMITIVE_LABEL[s.primitive] ?? s.primitive}
                {s.score != null ? ` (${s.score})` : ""}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Sensing() {
  const { nodes, connected, source, engineDetail, summary } = useRuViewSensing();

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wifi className="w-6 h-6 text-primary" /> Giám sát sinh hiệu không tiếp xúc
          </h1>
          <p className="text-sm text-muted-foreground">
            Nhịp thở, nhịp tim và chuyển động đo bằng sóng WiFi (CSI) — xuyên tường,
            không camera, không thiết bị đeo trên người bệnh.
          </p>
        </div>
        <Badge variant={connected ? "default" : "outline"} className="gap-1.5 shrink-0">
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? "Engine trực tiếp" : "Chế độ mô phỏng"}
        </Badge>
      </div>

      {source === "simulated" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Đang hiển thị <strong>dữ liệu mô phỏng</strong> (chưa kết nối bộ thu RuView
            {engineDetail ? ` — ${engineDetail}` : ""}). Cấu hình <code>VITE_RUVIEW_WS_URL</code> trỏ
            tới sensing-server để nhận tín hiệu CSI thật từ mesh ESP32.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" /> Cảm biến</div>
          <div className="text-2xl font-bold">{nodes.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Phòng có người</div>
          <div className="text-2xl font-bold">{summary.occupied}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Tổng người</div>
          <div className="text-2xl font-bold">{summary.people}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Cảnh báo</div>
          <div className={`text-2xl font-bold ${summary.activeAlerts.length ? "text-rose-600" : ""}`}>
            {summary.activeAlerts.length}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" /> Bản sao số không gian
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Vị trí người ở suy ra từ cường độ nhiễu CSI của từng cảm biến. Quầng sáng
            rộng = độ tin cậy thấp hơn; hình người dao động theo mức vận động thực tế.
          </p>
        </CardHeader>
        <CardContent>
          <SpatialTwin nodes={nodes} className="aspect-[4/3] w-full max-w-2xl mx-auto" />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((n) => <NodeCard key={n.node.node_id} n={n} />)}
      </div>

      <p className="text-[11px] text-muted-foreground border-t pt-3">
        Công cụ hỗ trợ tham khảo. Không thay thế tư vấn và chẩn đoán của bác sĩ.
      </p>
    </div>
  );
}

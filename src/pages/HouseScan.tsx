import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEFAULT_FLOORPLAN } from "@/components/sensing/SpatialTwin";
import {
  surveyCoverage, qualityColour, nodeAnchor, QUALITY, UNIT_M, type ScanRoom,
} from "@/services/rfCoverage";
import { useRuViewSensing } from "@/hooks/useRuViewSensing";
import { Radar, Radio, TriangleAlert, Plus, Minus, Info, CheckCircle2 } from "lucide-react";

/**
 * Whole-home RF survey — the commissioning view.
 *
 * Sensing range is set by the reflected (round-trip) path, so a node covers far
 * less area than its WiFi link would suggest. This page shows what the current
 * node placement can actually sense, where the blind spots are, and where one
 * more node would recover the most area.
 */
export default function HouseScan() {
  const { t } = useTranslation();
  const { nodes: live } = useRuViewSensing();
  const [extra, setExtra] = useState<{ x: number; y: number }[]>([]);

  const plan: ScanRoom[] = useMemo(
    () => [
      ...DEFAULT_FLOORPLAN.map((r) => ({ ...r })),
      // Extra nodes are modelled as tiny virtual rooms centred on the drop point,
      // so they contribute coverage without adding walls.
      ...extra.map((e, i) => ({
        node_id: `extra-${i}`, label: `extra-${i + 1}`,
        x: e.x - 0.5, y: e.y - 0.5, w: 1, h: 1,
      })),
    ],
    [extra],
  );

  // Walls should come only from real rooms; virtual node markers must not block.
  const realRooms = useMemo(() => DEFAULT_FLOORPLAN.map((r) => ({ ...r })), []);
  const report = useMemo(() => surveyCoverage(plan, 3), [plan]);

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const areaM2 = useMemo(
    () => realRooms.reduce((s, r) => s + r.w * UNIT_M * (r.h * UNIT_M), 0),
    [realRooms],
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radar className="w-6 h-6 text-primary" /> {t("sensing.scan.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
            {t("sensing.scan.subtitle")}
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Tầm cảm biến quyết định bởi <strong>đường phản xạ khứ hồi</strong> (sóng đi tới cơ thể rồi
          quay lại), nên suy hao theo <code>d⁴</code> — bán kính đo được (~5 m) nhỏ hơn nhiều
          so với vùng phủ WiFi thông thường. Đây là mô hình ước lượng khi lắp đặt, cần đo thực địa để xác nhận.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">{t("sensing.scan.area")}</div>
          <div className="text-2xl font-bold">{areaM2.toFixed(0)}<span className="text-sm font-normal"> m²</span></div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">{t("sensing.scan.measurable")}</div>
          <div className={`text-2xl font-bold ${report.covered >= 0.9 ? "text-emerald-600" : "text-amber-600"}`}>
            {pct(report.covered)}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">{t("sensing.scan.goodQuality")}</div>
          <div className="text-2xl font-bold">{pct(report.wellCovered)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">{t("sensing.scan.localisable")}</div>
          <div className="text-2xl font-bold">{pct(report.multilaterable)}</div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">{t("sensing.scan.coverageMap")}</CardTitle>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ background: "#10b981" }} /> {t("sensing.scan.good")}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ background: "#f59e0b" }} /> {t("sensing.scan.usable")}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ background: "#ef4444" }} /> {t("sensing.scan.blindSpot")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 100 100" className="w-full max-w-2xl mx-auto rounded-lg bg-slate-950"
               role="img" aria-label={t("sensing.coverage.title")}>
            {/* coverage cells */}
            {report.cells.map((c, i) => (
              <rect
                key={i}
                x={c.x - report.gridStep / 2} y={c.y - report.gridStep / 2}
                width={report.gridStep} height={report.gridStep}
                fill={qualityColour(c.quality)}
                opacity={0.16 + c.quality * 0.5}
              />
            ))}

            {/* room outlines */}
            {realRooms.map((r) => (
              <g key={r.node_id}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="1"
                      fill="none" stroke="#94a3b8" strokeOpacity="0.55" strokeWidth="0.5" />
                <text x={r.x + 1.6} y={r.y + 4} fontSize="2.6" fill="#cbd5e1">{r.label}</text>
              </g>
            ))}

            {/* installed nodes */}
            {realRooms.map((r) => {
              const a = nodeAnchor(r);
              const online = live.find((n) => n.node.node_id === r.node_id)?.latest?.presence !== undefined;
              return (
                <g key={`n-${r.node_id}`}>
                  <circle cx={a.x} cy={a.y} r="1.6" fill="#22d3ee" />
                  <circle cx={a.x} cy={a.y} r="3" fill="none" stroke="#22d3ee" strokeOpacity="0.5" strokeWidth="0.35">
                    <animate attributeName="r" values="2;7;2" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.55;0;0.55" dur="3s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}

            {/* user-added nodes */}
            {extra.map((e, i) => (
              <circle key={`e-${i}`} cx={e.x} cy={e.y} r="1.6" fill="#a78bfa" />
            ))}

            {/* suggested placement */}
            {report.suggestion && (
              <g>
                <circle cx={report.suggestion.x} cy={report.suggestion.y} r="2.4"
                        fill="none" stroke="#f472b6" strokeWidth="0.6" strokeDasharray="1.2 1" />
                <text x={report.suggestion.x + 3.2} y={report.suggestion.y + 1} fontSize="2.6" fill="#f472b6">
                  {t("sensing.scan.suggestGain", { gain: report.suggestion.gain })}
                </text>
              </g>
            )}
          </svg>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {report.blindSpots.length === 0
              ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Không còn điểm mù</>
              : <><TriangleAlert className="w-4 h-4 text-amber-600" /> Khuyến nghị lắp đặt</>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <Radio className="w-3 h-3" /> {realRooms.length + extra.length} cảm biến
            </Badge>
            <Badge variant="outline">{report.blindSpots.length} ô mù</Badge>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" disabled={!report.suggestion}
                      onClick={() => report.suggestion && setExtra((p) => [...p, { x: report.suggestion!.x, y: report.suggestion!.y }])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Thêm tại vị trí đề xuất
              </Button>
              <Button size="sm" variant="ghost" disabled={!extra.length} onClick={() => setExtra([])}>
                <Minus className="w-3.5 h-3.5 mr-1" /> Đặt lại
              </Button>
            </div>
          </div>

          {report.multilaterable < 0.3 && (
            <p className="text-muted-foreground text-xs">
              Chỉ {pct(report.multilaterable)} diện tích được ít nhất 2 cảm biến nhìn thấy — hệ thống
              hiện chỉ định vị ở mức <strong>từng phòng</strong>. Muốn định vị chính xác trong phòng
              (đa điểm), cần các vùng phủ chồng lấn nhau.
            </p>
          )}
          {report.suggestion && (
            <p className="text-muted-foreground text-xs">
              Thêm một cảm biến tại ô đề xuất sẽ khôi phục thêm khoảng{" "}
              <strong>{report.suggestion.gain}%</strong> diện tích đang mù.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

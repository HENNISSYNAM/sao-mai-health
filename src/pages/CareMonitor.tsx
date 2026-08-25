import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
  const brStatus = classifyBreathing(bedroom?.breathing.value ?? null);
  const hrStatus = classifyHeart(bedroom?.heart.value ?? null);
  const vitalsConcern = brStatus === "critical" || hrStatus === "critical";

  const escalations = [
    fell && { level: "critical", label: t("sensing.alerts.fallDetected"), detail: t("sensing.alerts.checkNow") },
    distress && { level: "critical", label: t("sensing.alerts.suspectedCritical"), detail: t("sensing.alerts.hrSpikeWithMotion") },
    vitalsConcern && { level: "critical", label: t("sensing.alerts.abnormalVitals"), detail: t("sensing.alerts.vitalsOutOfRange") },
    noMovement && { level: "warning", label: t("sensing.presence.prolongedNoMotion"), detail: t("sensing.alerts.presentButStill") },
    inactivity && { level: "warning", label: t("sensing.alerts.inactivityAnomaly"), detail: t("sensing.alerts.belowBaseline") },
  ].filter(Boolean) as { level: string; label: string; detail: string }[];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-primary" /> {t("sensing.care.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
            {t("sensing.care.subtitle")}
        </p>
      </div>

      {source === "simulated" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {t("sensing.care.simNote")}
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
            {t("sensing.care.allNormal")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Moon className="w-4 h-4" /> {t("sensing.care.restState")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sleeping ? t("sensing.presence.asleep") : v?.presence ? t("sensing.presence.awake") : t("sensing.presence.noOccupant")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {sleeping
                ? t("sensing.care.breathingSteady", { bpm: bedroom?.breathing.value?.toFixed(0) ?? "--" })
                : t("sensing.vitals.inferredFrom")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> {t("sensing.care.fallRisk")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.maxFallRisk >= 70 ? "text-rose-600" : summary.maxFallRisk >= 40 ? "text-amber-600" : "text-emerald-600"}`}>
              {summary.maxFallRisk}<span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("sensing.care.fallRiskBasis")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> {t("sensing.care.activityLevel")}
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
            <Bed className="w-4 h-4" /> {t("sensing.vitals.nightVitals")} {bedroom ? t(bedroom.node.label) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t("sensing.care.breathingBpm")}</div>
            <div className="text-3xl font-bold tabular-nums">
              {bedroom?.breathing.value?.toFixed(0) ?? "—"}
            </div>
            <VitalsTrace history={bedroom?.history ?? []} field="breathing_rate_bpm" className="text-sky-500" />
            <p className="text-[11px] text-muted-foreground mt-1">{t("sensing.care.normalSleep")}</p>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t("sensing.care.heartBpm")}</div>
            <div className="text-3xl font-bold tabular-nums">
              {bedroom?.heart.value?.toFixed(0) ?? "—"}
            </div>
            <VitalsTrace history={bedroom?.history ?? []} field="heartrate_bpm" className="text-rose-500" />
            <p className="text-[11px] text-muted-foreground mt-1">{t("sensing.care.normalResting")}</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground border-t pt-3">
              {t("sensing.disclaimer")}
              {t("sensing.care.disclaimer2")}
      </p>
    </div>
  );
}

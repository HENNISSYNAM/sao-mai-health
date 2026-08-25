import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VitalsTrace } from "@/components/sensing/VitalsTrace";
import { SpatialTwin } from "@/components/sensing/SpatialTwin";
import { VitalsMonitor } from "@/components/sensing/VitalsMonitor";
// three.js is heavy — keep it out of the main bundle.
const SpatialTwin3D = lazy(() => import("@/components/sensing/SpatialTwin3D"));
import { useRuViewSensing, type NodeSensing } from "@/hooks/useRuViewSensing";
import { classifyBreathing, classifyHeart, type VitalStatus } from "@/services/ruview";
import { setAmbientRF } from "@/services/ruview";
import { useWifiScanning } from "@/hooks/useWifiScanning";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Wifi, WifiOff, Activity, HeartPulse, Wind, Users, ShieldAlert, Radio, Info, Boxes,
  Radar, ChevronRight,
} from "lucide-react";


const STATUS_CLS: Record<VitalStatus, string> = {
  normal: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-rose-600 dark:text-rose-400",
  unknown: "text-muted-foreground",
};

const PRIMITIVE_LABEL: Record<string, string> = {
  someone_sleeping: "sensing.presence.asleep",
  possible_distress: "sensing.alerts.suspectedCritical",
  room_active: "sensing.presence.occupied",
  elderly_inactivity_anomaly: "sensing.alerts.lowActivity",
  no_movement: "sensing.presence.noMotion",
  fall_risk_elevated: "sensing.alerts.fallRiskHigh",
  bathroom_occupied: "sensing.presence.bathroomOccupied",
  bed_exit: "sensing.presence.outOfBed",
  meeting_in_progress: "sensing.presence.inMeeting",
  multi_room_transition: "sensing.presence.movingBetweenRooms",
};

function riskTone(score: number) {
  if (score >= 70) return "bg-rose-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

/** Why a vital is currently unmeasurable, in plain Vietnamese. */
const UNMEASURABLE: Record<string, string> = {
  motion_too_high: "sensing.vitals.movingUnavailable",
  weak_signal: "sensing.vitals.weakSignal",
  no_presence: "sensing.presence.noOccupant",
  insufficient_data: "sensing.acquiring",
  unstable_signal: "sensing.vitals.noisySignal",
  implausible_change: "sensing.vitals.abnormalVariance",
  no_data: "sensing.acquiring",
};

/**
 * Shows the filtered estimate with its confidence, or an honest reason instead
 * of a plausible-looking wrong number. Colour comes from deviation against the
 * subject's own baseline, not a population band.
 */
function VitalReadout({
  est, z,
}: { est: { value: number | null; confidence: number; reason: string }; z: number | null }) {
  const { t } = useTranslation();
  if (est.value == null) {
    return (
      <div className="h-8 flex items-center text-xs text-muted-foreground">
        {est.reason && UNMEASURABLE[est.reason] ? t(UNMEASURABLE[est.reason]) : t("sensing.vitals.unavailable")}
      </div>
    );
  }
  const abnormal = z != null && Math.abs(z) >= 3;
  return (
    <div className="flex items-baseline gap-1.5 h-8">
      <span className={`text-2xl font-bold tabular-nums ${abnormal ? "text-rose-600 dark:text-rose-400" : ""}`}>
        {est.value.toFixed(0)}
      </span>
      <span className="text-xs text-muted-foreground">bpm</span>
      <span
        className="text-[10px] text-muted-foreground ml-auto tabular-nums"
        title={t("sensing.confidence", { pct: (est.confidence * 100).toFixed(0) }) + (z != null ? t("sensing.zDeviation", { z: z.toFixed(1) }) : "")}
      >
        {(est.confidence * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function NodeCard({ n }: { n: NodeSensing }) {
  const { t } = useTranslation();
  const v = n.latest;
  const present = !!v?.presence;
  const activeStates = n.semantics.filter((s) => s.active);

  return (
    <Card className={present ? "" : "opacity-70"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            {t(n.node.label)}
          </CardTitle>
          <Badge variant={present ? "default" : "outline"} className="text-xs">
            {present ? t("sensing.personCount", { count: v?.n_persons ?? 1 }) : t("sensing.presence.empty")}
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
              <Wind className="w-3.5 h-3.5" /> {t("sensing.vitals.breathing")}
            </div>
            <VitalReadout est={n.breathing} z={n.breathingZ} />
            <VitalsTrace history={n.history} field="breathing_rate_bpm" className="text-sky-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <HeartPulse className="w-3.5 h-3.5" /> {t("sensing.vitals.heartRate")}
            </div>
            <VitalReadout est={n.heart} z={n.heartZ} />
            <VitalsTrace history={n.history} field="heartrate_bpm" className="text-rose-500" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {t("sensing.motionLevel")}</span>
            <span className="tabular-nums">{v ? (v.motion * 100).toFixed(0) : 0}%</span>
          </div>
          <VitalsTrace history={n.history} field="motion" className="text-violet-500" />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t("sensing.fallRisk")}</span>
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
                {PRIMITIVE_LABEL[s.primitive] ? t(PRIMITIVE_LABEL[s.primitive]) : s.primitive}
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
  const { t } = useTranslation();

  // Feed the real browser RF measurement into the sensing engine. Without a
  // RuView mesh the vitals come from a simulator, and this is what makes that
  // simulator respond to the actual room instead of running on a fixed clock.
  const { env: rfEnv } = useWifiScanning(8000);
  useEffect(() => {
    if (!rfEnv.sampledAt) return;
    setAmbientRF({
      congestion: rfEnv.channelCongestion,
      jitter: rfEnv.rttJitter,
      devices: rfEnv.estimatedDevices,
      radiusM: rfEnv.spatialRadiusMetres,
      sampledAt: rfEnv.sampledAt,
    });
  }, [rfEnv]);
  const { nodes, connected, source, engineDetail, summary, positionFix } = useRuViewSensing();
  const [view, setView] = useState<"3d" | "2d">("3d");

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap order-1">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <span className="leading-tight">{t("sensing.title")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("sensing.subtitle")}
          </p>
        </div>
        <Badge variant={connected ? "default" : "outline"} className="gap-1.5 shrink-0">
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? t("sensing.liveEngine") : t("sensing.simMode")}
        </Badge>
      </div>

      {/* On phones the simulated-data notice is redundant with the status badge
          above, so that row becomes the WiFi coverage-scan entry point instead. */}
      <Link
        to="/scan"
        className="sm:hidden order-2 flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 active:scale-[.99] transition-transform"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Radar className="h-4 w-4 text-primary" />
          <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("sensing.buildingScanCta")}</span>
          <span className="block text-[11px] text-muted-foreground truncate">
                {t("sensing.buildingScanSub")}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>

      {source === "simulated" && (
        <Alert className="hidden sm:flex order-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs"
            dangerouslySetInnerHTML={{ __html: t("sensing.simBanner", {
              reason: engineDetail || "no-engine-configured",
            }) }} />
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 order-4">

        <Card className="p-2.5 sm:p-3">
          <div className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 shrink-0" /> {t("sensing.kpi.sensors")}</div>
          <div className="text-xl sm:text-2xl font-bold">{nodes.length}</div>
        </Card>
        <Card className="p-2.5 sm:p-3">
          <div className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5 shrink-0" /> {t("sensing.kpi.roomsOccupied")}</div>
          <div className="text-xl sm:text-2xl font-bold">{summary.occupied}</div>
        </Card>
        <Card className="p-2.5 sm:p-3">
          <div className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 shrink-0" /> {t("sensing.kpi.totalPeople")}</div>
          <div className="text-xl sm:text-2xl font-bold">{summary.people}</div>
        </Card>
        <Card className="p-2.5 sm:p-3">
          <div className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {t("sensing.kpi.alerts")}</div>
          <div className={`text-xl sm:text-2xl font-bold ${summary.activeAlerts.length ? "text-rose-600" : ""}`}>
            {summary.activeAlerts.length}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden order-3 sm:order-5">
        <CardHeader className="pb-2 px-3 sm:px-6">

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary shrink-0" /> {t("sensing.twin.title")}
              </CardTitle>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                {view === "3d"
                  ? t("sensing.twin.subtitle")
                  : t("sensing.twin.posHint")}
              </p>
            </div>
            <div className="flex rounded-lg border overflow-hidden shrink-0">
              {(["3d", "2d"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setView(m)}
                  className={`px-3 py-1.5 text-xs transition-colors min-w-[52px] ${
                    view === m ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                >
                  {m === "3d" ? "3D" : t("sensing.twin.viewPlan")}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
          {view === "3d" ? (
            <Suspense
              fallback={
                <div className="aspect-square sm:aspect-[16/10] w-full max-w-3xl mx-auto rounded-xl bg-slate-950 flex items-center justify-center text-xs text-slate-400">
                  {t("sensing.building3d")}
                </div>
              }
            >
              <SpatialTwin3D nodes={nodes} fix={positionFix} className="aspect-square sm:aspect-[16/10] w-full max-w-3xl mx-auto touch-none" />
            </Suspense>
          ) : (
            <SpatialTwin nodes={nodes} className="aspect-square sm:aspect-[4/3] w-full max-w-2xl mx-auto" />
          )}
        </CardContent>
      </Card>


      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 order-6">
        {nodes.map((n) => (
          <VitalsMonitor
            key={`mon-${n.node.node_id}`}
            label={t(n.node.label)}
            breathing={n.breathing}
            heart={n.heart}
            history={n.history}
            heartZ={n.heartZ}
            breathingZ={n.breathingZ}
          />
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 order-7">
        {nodes.map((n) => <NodeCard key={n.node.node_id} n={n} />)}
      </div>

      <p className="text-[11px] text-muted-foreground border-t pt-3 order-8">
              {t("sensing.disclaimer")}
      </p>
    </div>
  );
}

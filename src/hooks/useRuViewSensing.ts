import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectRuView, simulateVitals, deriveSemantics, fallRiskScore, fetchEngineStatus,
  DEMO_NODES, type EdgeVitals, type SemanticState, type SensingNode, type VitalsSource,
} from "@/services/ruview";
import {
  estimateVital, updateBaseline, personalZ, debounceState, fuseOccupancy,
  type VitalEstimate, type VitalSample, type Baseline,
} from "@/services/vitalsQuality";
import {
  estimatePosition, postureFromPose, POSE_MIN_SCORE,
  type PoseFrame, type PositionFix,
} from "@/services/positioning";
import { DEFAULT_FLOORPLAN } from "@/components/sensing/SpatialTwin";

const HISTORY_LEN = 120; // ~2 min at 1 Hz
const DEBOUNCE_WINDOW = 5;

export interface NodeSensing {
  node: SensingNode;
  latest: EdgeVitals | null;
  history: EdgeVitals[];
  semantics: SemanticState[];
  fallRisk: number;
  /** Filtered, gated estimates — prefer these over `latest.*_bpm` for display. */
  breathing: VitalEstimate;
  heart: VitalEstimate;
  /** Deviation from this subject's own learned norm, in robust sigmas. */
  heartZ: number | null;
  breathingZ: number | null;
  /** Latest DensePose skeleton, if the engine publishes one with usable score. */
  pose: PoseFrame | null;
  /** Posture from the skeleton; falls back to the sleep primitive when absent. */
  posture: "standing" | "lying" | "unknown";
}

export interface SensingState {
  nodes: NodeSensing[];
  connected: boolean;
  source: VitalsSource;
  engineDetail: string;
  /** Best available position estimate for the tracked subject. */
  positionFix: PositionFix;
  /** Cross-node roll-up used by the dashboard and alerts. */
  summary: {
    occupied: number;
    people: number;
    maxFallRisk: number;
    activeAlerts: SemanticState[];
    alertNodeIds: string[];
  };
}

/**
 * Subscribes to the RuView sensing mesh. Uses a live engine when
 * VITE_RUVIEW_WS_URL is set and reachable; otherwise runs the built-in
 * simulator so the platform stays demonstrable without hardware.
 */
export function useRuViewSensing(nodes: SensingNode[] = DEMO_NODES): SensingState {
  const [frames, setFrames] = useState<Record<string, EdgeVitals[]>>({});
  const [connected, setConnected] = useState(false);
  const [engineDetail, setEngineDetail] = useState("");
  // Learned per-subject norms and alert vote windows must survive re-renders.
  const baselines = useRef<Record<string, { heart: Baseline | null; breathing: Baseline | null }>>({});
  const votes = useRef<Record<string, boolean[]>>({});
  const latched = useRef<Record<string, boolean>>({});
  const [poses, setPoses] = useState<Record<string, PoseFrame>>({});
  const liveRef = useRef(false);

  // Live engine (no-op when unconfigured)
  useEffect(() => {
    const dispose = connectRuView({
      onVitals: (v) => {
        liveRef.current = true;
        setFrames((prev) => {
          const arr = [...(prev[v.node_id] ?? []), v].slice(-HISTORY_LEN);
          return { ...prev, [v.node_id]: arr };
        });
      },
      onPose: (p) => setPoses((prev) => ({ ...prev, [p.node_id]: p })),
      onStatus: (ok, detail) => {
        setConnected(ok);
        if (detail) setEngineDetail(detail);
        if (!ok) liveRef.current = false;
      },
    });
    fetchEngineStatus().then((s) => {
      if (!s.ok) setEngineDetail((d) => d || "no-engine-configured");
      else if (s.demoted) setEngineDetail("engine-demoted");
    });
    return dispose;
  }, []);

  // Simulator — only drives nodes the live engine is not feeding.
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      if (liveRef.current) return;
      tick++;
      setFrames((prev) => {
        const next = { ...prev };
        for (const n of nodes) {
          const v = simulateVitals(n, tick);
          next[n.node_id] = [...(next[n.node_id] ?? []), v].slice(-HISTORY_LEN);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [nodes]);

  return useMemo(() => {
    const per: NodeSensing[] = nodes.map((node) => {
      const history = frames[node.node_id] ?? [];
      const latest = history.length ? history[history.length - 1] : null;
      const semantics = latest ? deriveSemantics(latest, history) : [];

      // Gated + outlier-rejected estimates rather than the raw last frame.
      const toSamples = (field: "breathing_rate_bpm" | "heartrate_bpm"): VitalSample[] =>
        history.map((h) => ({
          value: h[field],
          motion: h.motion,
          presence: h.presence,
          presence_score: h.presence_score,
          rssi: h.rssi,
          timestamp_ms: h.timestamp_ms,
        }));

      const breathing = estimateVital(toSamples("breathing_rate_bpm"), "breathing");
      const heart = estimateVital(toSamples("heartrate_bpm"), "heart");

      // Learn each subject's own norm from confident resting samples only, so the
      // baseline is not dragged around by noise or by movement artefacts.
      const bl = baselines.current[node.node_id] ?? { heart: null, breathing: null };
      if (heart.value != null && heart.confidence >= 0.6) {
        bl.heart = updateBaseline(bl.heart, heart.value);
      }
      if (breathing.value != null && breathing.confidence >= 0.6) {
        bl.breathing = updateBaseline(bl.breathing, breathing.value);
      }
      baselines.current[node.node_id] = bl;

      // Trust a skeleton only when the engine reports usable confidence; the
      // shipped on-device pose model is early, so we fall back rather than draw
      // a posture we cannot stand behind.
      const rawPose = poses[node.node_id] ?? null;
      const pose = rawPose && rawPose.score >= POSE_MIN_SCORE ? rawPose : null;
      const posture = pose
        ? postureFromPose(pose)
        : semantics.some((s) => s.active && s.primitive === "someone_sleeping")
          ? "lying" as const
          : latest?.presence ? "standing" as const : "unknown" as const;

      return {
        node,
        latest,
        history,
        semantics,
        fallRisk: latest ? fallRiskScore(latest, history) : 0,
        breathing,
        heart,
        heartZ: personalZ(bl.heart, heart.value, "heart"),
        breathingZ: personalZ(bl.breathing, breathing.value, "breathing"),
        pose,
        posture,
      };
    });

    // Alerts go through an N-of-M vote with hysteresis so a flapping detector
    // cannot produce an alert storm; a sustained condition still fires.
    const activeAlerts: SemanticState[] = [];
    const alertNodeIds: string[] = [];
    for (const p of per) {
      for (const s of p.semantics) {
        const alertable =
          s.primitive === "possible_distress" ||
          s.primitive === "no_movement" ||
          s.primitive === "elderly_inactivity_anomaly" ||
          s.primitive === "fall_risk_elevated";
        if (!alertable) continue;

        const key = `${p.node.node_id}:${s.primitive}`;
        const win = [...(votes.current[key] ?? []), s.active].slice(-DEBOUNCE_WINDOW);
        votes.current[key] = win;
        const wasOn = latched.current[key] ?? false;
        const isOn = debounceState(win, wasOn, 3, 1);
        latched.current[key] = isOn;

        if (isOn) { activeAlerts.push(s); alertNodeIds.push(p.node.node_id); }
      }
      // A detected fall is safety-critical: fire immediately, never debounce it.
      if (p.latest?.fall_detected) {
        activeAlerts.push({ primitive: "fall_risk_elevated", active: true, score: 100, reason: ["fall_detected"] });
        alertNodeIds.push(p.node.node_id);
      }
    }

    const source: VitalsSource =
      per.find((p) => p.latest)?.latest?.source ?? "simulated";

    const base = {
      nodes: per,
      connected,
      source,
      engineDetail,
      summary: {
        occupied: per.filter((p) => p.latest?.presence).length,
        // Zone-aware fusion — summing per-node counts double-counts anyone
        // standing where two nodes overlap.
        people: fuseOccupancy(
          per
            .filter((p) => p.latest?.presence)
            .map((p) => ({
              node_id: p.node.node_id,
              n_persons: p.latest?.n_persons ?? 0,
              presence_score: p.latest?.presence_score ?? 0,
              zone: p.node.zone,
            })),
        ),
        maxFallRisk: per.reduce((m, p) => Math.max(m, p.fallRisk), 0),
        activeAlerts,
        alertNodeIds,
      },
    };
    // Mesh-wide position fix: multilateration when coverage overlaps, honest
    // degradation to a room-level fix when it does not.
    const positionFix = estimatePosition(
      per.map((p) => ({
        node_id: p.node.node_id,
        presence: !!p.latest?.presence,
        presence_score: p.latest?.presence_score ?? 0,
      })),
      DEFAULT_FLOORPLAN,
    );

    return { ...base, positionFix };
  }, [frames, nodes, connected, engineDetail, poses]);
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectRuView, simulateVitals, deriveSemantics, fallRiskScore, fetchEngineStatus,
  DEMO_NODES, type EdgeVitals, type SemanticState, type SensingNode, type VitalsSource,
} from "@/services/ruview";

const HISTORY_LEN = 120; // ~2 min at 1 Hz

export interface NodeSensing {
  node: SensingNode;
  latest: EdgeVitals | null;
  history: EdgeVitals[];
  semantics: SemanticState[];
  fallRisk: number;
}

export interface SensingState {
  nodes: NodeSensing[];
  connected: boolean;
  source: VitalsSource;
  engineDetail: string;
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
      return {
        node,
        latest,
        history,
        semantics,
        fallRisk: latest ? fallRiskScore(latest, history) : 0,
      };
    });

    const activeAlerts: SemanticState[] = [];
    const alertNodeIds: string[] = [];
    for (const p of per) {
      for (const s of p.semantics) {
        const isAlert =
          (s.primitive === "possible_distress" ||
            s.primitive === "no_movement" ||
            s.primitive === "elderly_inactivity_anomaly" ||
            s.primitive === "fall_risk_elevated") && s.active;
        if (isAlert) { activeAlerts.push(s); alertNodeIds.push(p.node.node_id); }
      }
      if (p.latest?.fall_detected) {
        activeAlerts.push({ primitive: "fall_risk_elevated", active: true, score: 100, reason: ["fall_detected"] });
        alertNodeIds.push(p.node.node_id);
      }
    }

    const source: VitalsSource =
      per.find((p) => p.latest)?.latest?.source ?? "simulated";

    return {
      nodes: per,
      connected,
      source,
      engineDetail,
      summary: {
        occupied: per.filter((p) => p.latest?.presence).length,
        people: per.reduce((s, p) => s + (p.latest?.n_persons ?? 0), 0),
        maxFallRisk: per.reduce((m, p) => Math.max(m, p.fallRisk), 0),
        activeAlerts,
        alertNodeIds,
      },
    };
  }, [frames, nodes, connected, engineDetail]);
}

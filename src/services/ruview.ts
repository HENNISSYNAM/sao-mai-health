/**
 * RuView WiFi-sensing client — the platform's core signal source.
 *
 * RuView turns ordinary WiFi into a contactless sensor: an ESP32 mesh streams
 * Channel State Information (CSI), and the sensing engine derives presence,
 * breathing rate, heart rate, motion and falls — through walls, no camera,
 * nothing worn by the patient.
 *
 * Wire contract (RuView sensing-server WebSocket):
 *   { type: "connection_established", ... }
 *   { type: "edge_vitals", node_id, presence, fall_detected, motion,
 *     breathing_rate_bpm, heartrate_bpm, n_persons, motion_energy,
 *     presence_score, rssi }
 *
 * When no engine is reachable we fall back to a physiologically plausible
 * simulator so the product is demonstrable without hardware. `source` on every
 * frame says which one produced it — never present simulated data as live.
 */

export type VitalsSource = "live" | "simulated";

export interface EdgeVitals {
  node_id: string;
  presence: boolean;
  presence_score: number;      // 0..1
  n_persons: number;
  breathing_rate_bpm: number | null;
  heartrate_bpm: number | null;
  motion: number;              // 0..1
  motion_energy: number;
  fall_detected: boolean;
  rssi: number;                // dBm
  timestamp_ms: number;
  source: VitalsSource;
}

/** The 10 semantic primitives RuView derives on top of raw vitals. */
export type SemanticPrimitive =
  | "someone_sleeping"
  | "possible_distress"
  | "room_active"
  | "elderly_inactivity_anomaly"
  | "meeting_in_progress"
  | "bathroom_occupied"
  | "fall_risk_elevated"
  | "bed_exit"
  | "no_movement"
  | "multi_room_transition";

export interface SemanticState {
  primitive: SemanticPrimitive;
  active: boolean;
  /** Why it fired, e.g. ["motion<5%", "br=12bpm", "presence=true"]. */
  reason: string[];
  score?: number;              // fall_risk_elevated → 0..100
}

export interface SensingNode {
  node_id: string;
  label: string;               // human room name, e.g. "Phòng ngủ ông Ba"
  zone: string;
  online: boolean;
}

const DEFAULT_WS = (import.meta as any).env?.VITE_RUVIEW_WS_URL as string | undefined;
const DEFAULT_HTTP = (import.meta as any).env?.VITE_RUVIEW_API_URL as string | undefined;

// ───────────────────────── vitals → clinical helpers ─────────────────────────

/** Adult resting reference bands used for the UI status colouring. */
export const VITALS_BANDS = {
  breathing: { low: 12, high: 20, criticalLow: 8, criticalHigh: 25 },
  heart: { low: 60, high: 100, criticalLow: 45, criticalHigh: 120 },
} as const;

export type VitalStatus = "normal" | "warning" | "critical" | "unknown";

export function classifyBreathing(bpm: number | null): VitalStatus {
  if (bpm == null) return "unknown";
  const b = VITALS_BANDS.breathing;
  if (bpm < b.criticalLow || bpm > b.criticalHigh) return "critical";
  if (bpm < b.low || bpm > b.high) return "warning";
  return "normal";
}

export function classifyHeart(bpm: number | null): VitalStatus {
  if (bpm == null) return "unknown";
  const h = VITALS_BANDS.heart;
  if (bpm < h.criticalLow || bpm > h.criticalHigh) return "critical";
  if (bpm < h.low || bpm > h.high) return "warning";
  return "normal";
}

/**
 * Derive the semantic primitives we act on from a vitals frame plus a short
 * history window. Mirrors the thresholds RuView publishes to Home Assistant so
 * the UI agrees with the engine when a real engine is attached.
 */
export function deriveSemantics(v: EdgeVitals, history: EdgeVitals[]): SemanticState[] {
  const out: SemanticState[] = [];
  const motionPct = v.motion * 100;
  const recent = history.slice(-30);
  const avgMotion = recent.length
    ? (recent.reduce((s, r) => s + r.motion, 0) / recent.length) * 100
    : motionPct;

  // someone_sleeping: presence + motion<5% + BR in [8,20]
  const sleeping =
    v.presence && motionPct < 5 && v.breathing_rate_bpm != null &&
    v.breathing_rate_bpm >= 8 && v.breathing_rate_bpm <= 20;
  out.push({
    primitive: "someone_sleeping",
    active: sleeping,
    reason: sleeping
      ? [`motion<5%`, `br=${v.breathing_rate_bpm?.toFixed(0)}bpm`, "presence=true"]
      : [],
  });

  // possible_distress: HR > 1.5x baseline + motion > 20%
  const hrBaseline = recent.length
    ? recent.map((r) => r.heartrate_bpm).filter((x): x is number => x != null)
    : [];
  const baseline = hrBaseline.length
    ? hrBaseline.reduce((a, b) => a + b, 0) / hrBaseline.length
    : null;
  const distress =
    v.heartrate_bpm != null && baseline != null &&
    v.heartrate_bpm > baseline * 1.5 && motionPct > 20 && !v.fall_detected;
  out.push({
    primitive: "possible_distress",
    active: distress,
    reason: distress ? [`hr=${v.heartrate_bpm?.toFixed(0)}`, `>1.5x baseline`, `motion=${motionPct.toFixed(0)}%`] : [],
  });

  // room_active: motion > 10%
  out.push({
    primitive: "room_active",
    active: motionPct > 10,
    reason: motionPct > 10 ? [`motion=${motionPct.toFixed(0)}%`] : [],
  });

  // no_movement (safety): presence + motion < 1%
  const noMove = v.presence && avgMotion < 1;
  out.push({
    primitive: "no_movement",
    active: noMove,
    reason: noMove ? ["presence=true", `avg motion<1%`] : [],
  });

  // elderly_inactivity_anomaly: sustained very low motion while present
  const inactivity = v.presence && avgMotion < 2 && recent.length >= 20;
  out.push({
    primitive: "elderly_inactivity_anomaly",
    active: inactivity,
    reason: inactivity ? [`avg motion=${avgMotion.toFixed(1)}%`, "sustained"] : [],
  });

  // fall_risk_elevated: 0..100 composite
  const score = fallRiskScore(v, history);
  out.push({
    primitive: "fall_risk_elevated",
    active: score >= 70,
    score,
    reason: score >= 70 ? [`score=${score}`] : [],
  });

  return out;
}

/** Composite 0..100 fall-risk score from motion volatility and vitals drift. */
export function fallRiskScore(v: EdgeVitals, history: EdgeVitals[]): number {
  let score = 0;
  const recent = history.slice(-30);
  if (v.fall_detected) return 100;

  // motion volatility → unsteadiness
  if (recent.length >= 5) {
    const ms = recent.map((r) => r.motion);
    const mean = ms.reduce((a, b) => a + b, 0) / ms.length;
    const varr = ms.reduce((s, m) => s + (m - mean) ** 2, 0) / ms.length;
    score += Math.min(35, Math.sqrt(varr) * 220);
  }
  // tachycardia / bradycardia at rest
  const hs = classifyHeart(v.heartrate_bpm);
  if (hs === "critical") score += 30;
  else if (hs === "warning") score += 15;
  // abnormal breathing
  const bs = classifyBreathing(v.breathing_rate_bpm);
  if (bs === "critical") score += 25;
  else if (bs === "warning") score += 12;
  // very low activity (frailty proxy)
  if (v.presence && v.motion * 100 < 2) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ───────────────────────── simulator (no hardware) ─────────────────────────

export const DEMO_NODES: SensingNode[] = [
  { node_id: "node-a1", label: "Phòng ngủ", zone: "bedroom", online: true },
  { node_id: "node-a2", label: "Phòng khách", zone: "living", online: true },
  { node_id: "node-a3", label: "Nhà vệ sinh", zone: "bathroom", online: true },
];

interface SimState { phase: number; hrBase: number; brBase: number; scenario: string }
const simStates = new Map<string, SimState>();

/**
 * Physiologically plausible CSI-derived vitals. Deterministic-ish drift, not
 * random noise, so charts look like real respiration/HR traces.
 */
export function simulateVitals(node: SensingNode, tick: number): EdgeVitals {
  let st = simStates.get(node.node_id);
  if (!st) {
    st = {
      phase: Math.random() * Math.PI * 2,
      hrBase: node.zone === "bedroom" ? 62 : 74,
      brBase: node.zone === "bedroom" ? 13 : 16,
      scenario: node.zone === "bedroom" ? "sleeping" : "active",
    };
    simStates.set(node.node_id, st);
  }
  const t = tick / 10 + st.phase;
  const sleeping = st.scenario === "sleeping";
  const present = node.zone !== "bathroom" || Math.sin(t / 7) > 0.6;

  const motion = present
    ? sleeping
      ? Math.max(0, 0.02 + Math.sin(t * 1.7) * 0.015)
      : Math.max(0, 0.18 + Math.sin(t * 0.9) * 0.14 + Math.sin(t * 3.1) * 0.05)
    : 0;

  const hr = present ? st.hrBase + Math.sin(t * 0.6) * 4 + Math.sin(t * 2.3) * 1.5 : null;
  const br = present ? st.brBase + Math.sin(t * 0.4) * 2 : null;

  return {
    node_id: node.node_id,
    presence: present,
    presence_score: present ? 0.86 + Math.sin(t) * 0.1 : 0.05,
    n_persons: present ? 1 : 0,
    breathing_rate_bpm: br,
    heartrate_bpm: hr,
    motion,
    motion_energy: motion * 12,
    fall_detected: false,
    rssi: -52 + Math.sin(t * 0.3) * 4,
    timestamp_ms: Date.now(),
    source: "simulated",
  };
}

// ───────────────────────── live client ─────────────────────────

export interface RuViewClientOptions {
  wsUrl?: string;
  onVitals: (v: EdgeVitals) => void;
  onStatus: (connected: boolean, detail?: string) => void;
}

/**
 * Connects to a RuView sensing-server. Returns a disposer.
 * Unknown message types are ignored (forward-compatible, same as the Python client).
 */
export function connectRuView(opts: RuViewClientOptions): () => void {
  const url = opts.wsUrl ?? DEFAULT_WS;
  if (!url) {
    opts.onStatus(false, "no-engine-configured");
    return () => {};
  }
  let ws: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;

  const open = () => {
    if (closed) return;
    try {
      ws = new WebSocket(url);
    } catch {
      opts.onStatus(false, "bad-url");
      return;
    }
    ws.onopen = () => { attempts = 0; opts.onStatus(true); };
    ws.onmessage = (ev) => {
      let msg: any;
      try { msg = JSON.parse(ev.data as string); } catch { return; }
      if (msg?.type !== "edge_vitals") return;   // ignore pose_data / handshakes
      opts.onVitals({
        node_id: String(msg.node_id ?? "unknown"),
        presence: !!msg.presence,
        presence_score: Number(msg.presence_score ?? 0),
        n_persons: Number(msg.n_persons ?? 0),
        breathing_rate_bpm: msg.breathing_rate_bpm ?? null,
        heartrate_bpm: msg.heartrate_bpm ?? null,
        motion: Number(msg.motion ?? 0),
        motion_energy: Number(msg.motion_energy ?? 0),
        fall_detected: !!msg.fall_detected,
        rssi: Number(msg.rssi ?? 0),
        timestamp_ms: Date.now(),
        source: "live",
      });
    };
    ws.onclose = () => {
      opts.onStatus(false, "closed");
      if (closed) return;
      attempts++;
      retry = setTimeout(open, Math.min(15000, 800 * 2 ** attempts));
    };
    ws.onerror = () => ws?.close();
  };
  open();

  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    ws?.close();
  };
}

/** Engine health via REST (`GET /api/v1/status`). */
export async function fetchEngineStatus(baseUrl = DEFAULT_HTTP): Promise<{
  ok: boolean; demoted?: boolean; engine_error_count?: number;
}> {
  if (!baseUrl) return { ok: false };
  try {
    const r = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/status`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return { ok: false };
    const j = await r.json();
    return { ok: true, demoted: j?.demoted, engine_error_count: j?.engine_error_count };
  } catch {
    return { ok: false };
  }
}

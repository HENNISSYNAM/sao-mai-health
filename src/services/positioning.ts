/**
 * Position estimation from the sensing mesh, plus the DensePose skeleton.
 *
 * Two independent improvements over "draw the person at the centre of the room":
 *
 *  1. Multilateration. Each node's `presence_score` is a monotonic proxy for how
 *     strongly that node is being perturbed, which the RF model turns back into a
 *     distance. With ≥3 nodes seeing the subject we solve for a point; with 2 we
 *     get a weighted position along their baseline; with 1 we honestly fall back
 *     to the room centre and report low confidence.
 *
 *  2. DensePose keypoints. RuView can publish a 17-joint COCO skeleton
 *     (`pose_data`). When it arrives with usable confidence we render the real
 *     posture instead of a capsule.
 *
 * Caveat carried into the UI: the shipped on-device pose model is an early one
 * (its own benchmark reports low PCK and a confidence=0 runtime stub), so we gate
 * on confidence and fall back rather than draw a skeleton we cannot stand behind.
 */

import { cellQuality, nodeAnchor, UNIT_M, type ScanRoom } from "./rfCoverage";

// ── DensePose ────────────────────────────────────────────────────────────────

/** COCO-17 joint order, as published by the sensing engine. */
export const KEYPOINT_NAMES = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle",
] as const;
export type KeypointName = typeof KEYPOINT_NAMES[number];

export interface Keypoint { x: number; y: number; z?: number; score: number }

export interface PoseFrame {
  node_id: string;
  /** 17 joints in COCO order; normalised 0..1 within the node's field. */
  keypoints: Keypoint[];
  score: number;          // overall pose confidence 0..1
  timestamp_ms: number;
}

/** Bone list for drawing the skeleton. */
export const SKELETON: [KeypointName, KeypointName][] = [
  ["left_shoulder", "right_shoulder"], ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"],
  ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
  ["nose", "left_shoulder"], ["nose", "right_shoulder"],
];

/** Minimum confidence before a skeleton is trusted enough to render. */
export const POSE_MIN_SCORE = 0.35;

export function kp(pose: PoseFrame | null, name: KeypointName): Keypoint | null {
  if (!pose) return null;
  const i = KEYPOINT_NAMES.indexOf(name);
  const k = pose.keypoints?.[i];
  return k && k.score > 0.2 ? k : null;
}

/** Posture from the skeleton: lying when the torso is more horizontal than vertical. */
export function postureFromPose(pose: PoseFrame | null): "standing" | "lying" | "unknown" {
  const sL = kp(pose, "left_shoulder"), sR = kp(pose, "right_shoulder");
  const hL = kp(pose, "left_hip"), hR = kp(pose, "right_hip");
  if (!sL || !sR || !hL || !hR) return "unknown";
  const sx = (sL.x + sR.x) / 2, sy = (sL.y + sR.y) / 2;
  const hx = (hL.x + hR.x) / 2, hy = (hL.y + hR.y) / 2;
  const dx = Math.abs(hx - sx), dy = Math.abs(hy - sy);
  return dy >= dx ? "standing" : "lying";
}

// ── Multilateration ──────────────────────────────────────────────────────────

export interface NodeObservation {
  node_id: string;
  presence: boolean;
  presence_score: number;   // 0..1
}

export interface PositionFix {
  x: number; y: number;      // plan units
  confidence: number;        // 0..1
  method: "multilateration" | "weighted" | "room-centre" | "none";
  /** Nodes that contributed. */
  usedNodes: string[];
  /** Estimated 1-sigma uncertainty in plan units (for the halo). */
  sigma: number;
}

/**
 * Invert the RF model: find the distance at which a node would produce this
 * presence_score. Coarse but monotonic, which is all multilateration needs.
 */
function scoreToDistance(score: number, rooms: ScanRoom[], anchor: { x: number; y: number }): number {
  const s = Math.max(0.02, Math.min(1, score));
  let lo = 0.5, hi = 80;                    // plan units
  for (let i = 0; i < 24; i++) {            // bisect on the monotonic quality curve
    const mid = (lo + hi) / 2;
    const q = cellQuality(anchor, { x: anchor.x + mid, y: anchor.y }, rooms);
    if (q > s) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Estimate the subject's position from all nodes currently seeing them.
 * Degrades honestly: 3+ nodes → least-squares fix; 2 → weighted point on the
 * baseline; 1 → room centre with a wide sigma.
 */
export function estimatePosition(
  observations: NodeObservation[],
  rooms: ScanRoom[],
): PositionFix {
  const seeing = observations.filter((o) => o.presence && o.presence_score > 0.1);
  if (!seeing.length) {
    return { x: 0, y: 0, confidence: 0, method: "none", usedNodes: [], sigma: 999 };
  }

  const anchors = seeing
    .map((o) => {
      const room = rooms.find((r) => r.node_id === o.node_id);
      if (!room) return null;
      const a = nodeAnchor(room);
      return { id: o.node_id, ...a, d: scoreToDistance(o.presence_score, rooms, a), w: o.presence_score };
    })
    .filter(Boolean) as { id: string; x: number; y: number; d: number; w: number }[];

  if (!anchors.length) {
    return { x: 0, y: 0, confidence: 0, method: "none", usedNodes: [], sigma: 999 };
  }

  if (anchors.length === 1) {
    const a = anchors[0];
    return {
      x: a.x, y: a.y,
      confidence: Math.min(0.45, a.w * 0.45),
      method: "room-centre",
      usedNodes: [a.id],
      sigma: Math.max(6, a.d * 0.8),
    };
  }

  if (anchors.length === 2) {
    const [a, b] = anchors;
    const wSum = a.w + b.w || 1;
    return {
      x: (a.x * a.w + b.x * b.w) / wSum,
      y: (a.y * a.w + b.y * b.w) / wSum,
      confidence: Math.min(0.65, (a.w + b.w) / 2 * 0.65),
      method: "weighted",
      usedNodes: [a.id, b.id],
      sigma: Math.max(4, Math.min(a.d, b.d) * 0.5),
    };
  }

  // 3+ nodes: iterative least squares on the range residuals (Gauss-Newton).
  let px = anchors.reduce((s, a) => s + a.x * a.w, 0) / anchors.reduce((s, a) => s + a.w, 0);
  let py = anchors.reduce((s, a) => s + a.y * a.w, 0) / anchors.reduce((s, a) => s + a.w, 0);

  for (let iter = 0; iter < 30; iter++) {
    let gx = 0, gy = 0, norm = 0;
    for (const a of anchors) {
      const dx = px - a.x, dy = py - a.y;
      const r = Math.hypot(dx, dy) || 1e-6;
      const resid = r - a.d;
      gx += a.w * resid * (dx / r);
      gy += a.w * resid * (dy / r);
      norm += a.w;
    }
    const step = 0.6 / (norm || 1);
    px -= gx * step;
    py -= gy * step;
  }

  // Residual spread → uncertainty.
  const residuals = anchors.map((a) => Math.abs(Math.hypot(px - a.x, py - a.y) - a.d));
  const rms = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);
  const conf = Math.max(0.2, Math.min(0.95, 1 - rms / 30));

  return {
    x: px, y: py,
    confidence: conf,
    method: "multilateration",
    usedNodes: anchors.map((a) => a.id),
    sigma: Math.max(1.5, rms),
  };
}

/** Convenience: metres for display. */
export const toMetres = (units: number) => units * UNIT_M;

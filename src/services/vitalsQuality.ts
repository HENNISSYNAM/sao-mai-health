/**
 * Estimation layer that turns noisy per-frame CSI vitals into values worth
 * acting on. Pure functions — no React, no network — so they can be unit tested.
 *
 * Why this exists: reading `latest.heartrate_bpm` straight off the wire is the
 * dominant source of error. A single corrupted frame becomes a "critical" alert,
 * and a value reported while the subject is walking is not a measurement at all.
 * Four defences, in order of how much error they remove:
 *
 *   1. Validity gating  — CSI respiration/heartbeat estimation is only physically
 *      meaningful on a quasi-static subject. Chest wall displacement is ~1-12 mm
 *      for breathing but only ~0.2-0.5 mm for the heartbeat, so the heart needs a
 *      much stricter stillness gate than breathing. Above those motion levels the
 *      body's own movement swamps the signal and any number produced is noise.
 *      We return null with a reason instead of a confident-looking wrong value.
 *   2. Robust filtering — Hampel (median + MAD) rejects impulsive outliers that a
 *      mean would smear across the window.
 *   3. Physiological plausibility — absolute range plus a slew-rate limit; a
 *      resting heart rate cannot move 40 bpm in one second.
 *   4. Personal baseline — a population band (HR 60-100) mislabels the healthy
 *      elderly person who rests at 55. Deviation from the subject's own learned
 *      baseline is what actually predicts deterioration.
 */

export type VitalKind = "breathing" | "heart";

export interface VitalSample {
  value: number | null;
  motion: number;        // 0..1
  presence: boolean;
  presence_score: number; // 0..1
  rssi: number;           // dBm
  timestamp_ms: number;
}

export interface VitalEstimate {
  value: number | null;
  /** 0..1 — how much to trust `value`. 0 when value is null. */
  confidence: number;
  /** Machine-readable reason when unusable, e.g. "motion_too_high". */
  reason: string;
  /** Samples that survived gating + outlier rejection. */
  used: number;
}

// ── Physical limits ──────────────────────────────────────────────────────────

/**
 * Motion ceilings above which the estimate is not physically recoverable.
 * Heart is ~10-20x smaller in displacement than breathing, hence the tighter gate.
 */
export const MOTION_GATE: Record<VitalKind, number> = {
  breathing: 0.20,
  heart: 0.10,
};

/** Plausible physiological range; anything outside is an artefact, not a reading. */
export const PLAUSIBLE: Record<VitalKind, { min: number; max: number; maxSlewPerSec: number }> = {
  breathing: { min: 5, max: 40, maxSlewPerSec: 3 },
  heart: { min: 35, max: 180, maxSlewPerSec: 12 },
};

/** Below this the CSI SNR degrades to the point estimates are unreliable. */
export const RSSI_FLOOR = -78;

// ── Robust statistics ────────────────────────────────────────────────────────

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median absolute deviation, scaled to be a consistent estimator of sigma. */
export function mad(xs: number[]): number {
  if (!xs.length) return 0;
  const m = median(xs);
  return 1.4826 * median(xs.map((x) => Math.abs(x - m)));
}

/**
 * Hampel filter: drop points more than `nSigma` robust deviations from the median.
 * Unlike a mean/std filter this does not let the outlier inflate its own threshold.
 */
export function hampel(xs: number[], nSigma = 3): number[] {
  if (xs.length < 3) return xs;
  const m = median(xs);
  const s = mad(xs);
  if (s === 0) return xs;           // constant window — nothing to reject
  return xs.filter((x) => Math.abs(x - m) <= nSigma * s);
}

// ── Estimation ───────────────────────────────────────────────────────────────

/**
 * Estimate one vital from a rolling window.
 * Returns null with a reason whenever the window cannot support a real reading.
 */
export function estimateVital(
  samples: VitalSample[],
  kind: VitalKind,
  opts: { minSamples?: number; windowMs?: number } = {},
): VitalEstimate {
  const { minSamples = 5, windowMs = 30_000 } = opts;
  const none = (reason: string, used = 0): VitalEstimate => ({ value: null, confidence: 0, reason, used });

  if (!samples.length) return none("no_data");
  const now = samples[samples.length - 1].timestamp_ms;
  const win = samples.filter((s) => now - s.timestamp_ms <= windowMs);
  if (!win.length) return none("no_data");

  const last = win[win.length - 1];
  if (!last.presence) return none("no_presence");

  // 1. Validity gate — keep only frames where the vital is physically measurable.
  const gate = MOTION_GATE[kind];
  const lim = PLAUSIBLE[kind];
  const valid = win.filter(
    (s) =>
      s.presence &&
      s.value != null &&
      Number.isFinite(s.value) &&
      s.motion <= gate &&
      s.rssi >= RSSI_FLOOR &&
      (s.value as number) >= lim.min &&
      (s.value as number) <= lim.max,
  );

  if (valid.length < minSamples) {
    // Say *why* it is unusable — this drives honest UI copy.
    if (win.some((s) => s.motion > gate)) return none("motion_too_high", valid.length);
    if (win.some((s) => s.rssi < RSSI_FLOOR)) return none("weak_signal", valid.length);
    return none("insufficient_data", valid.length);
  }

  // 2. Reject impulsive outliers.
  const vals = valid.map((s) => s.value as number);
  const kept = hampel(vals, 3);
  if (kept.length < minSamples) return none("unstable_signal", kept.length);

  // 3. Slew-rate plausibility against the recent estimate.
  const est = median(kept);
  const older = valid.slice(0, Math.max(1, valid.length - 1));
  if (older.length >= minSamples) {
    const prev = median(hampel(older.map((s) => s.value as number), 3));
    const dtSec = Math.max(1, (last.timestamp_ms - older[0].timestamp_ms) / 1000);
    if (Number.isFinite(prev) && Math.abs(est - prev) / dtSec > lim.maxSlewPerSec) {
      return none("implausible_change", kept.length);
    }
  }

  // 4. Confidence: agreement of the window, coverage, and signal strength.
  const spread = mad(kept);
  const agreement = 1 / (1 + spread / (kind === "heart" ? 6 : 2));  // tighter tolerance for BR
  const coverage = Math.min(1, kept.length / Math.max(minSamples * 2, 10));
  const presence = Math.max(0, Math.min(1, last.presence_score));
  const signal = Math.max(0, Math.min(1, (last.rssi - RSSI_FLOOR) / 30));
  const confidence = Math.max(0, Math.min(1, agreement * 0.4 + coverage * 0.25 + presence * 0.2 + signal * 0.15));

  return { value: Math.round(est * 10) / 10, confidence: Math.round(confidence * 100) / 100, reason: "ok", used: kept.length };
}

// ── Personal baseline ────────────────────────────────────────────────────────

export interface Baseline { mean: number; sd: number; n: number }

/**
 * Update a per-subject baseline with an exponentially weighted mean/variance.
 * Only high-confidence resting samples should be fed in, otherwise the baseline
 * drifts toward whatever noise the room produces.
 */
export function updateBaseline(b: Baseline | null, value: number, alpha = 0.02): Baseline {
  if (!b || b.n === 0) return { mean: value, sd: 0, n: 1 };
  const mean = b.mean + alpha * (value - b.mean);
  const variance = (1 - alpha) * (b.sd * b.sd + alpha * (value - b.mean) ** 2);
  return { mean, sd: Math.sqrt(Math.max(0, variance)), n: b.n + 1 };
}

/**
 * How far the current value sits from the subject's own norm, in robust sigmas.
 * Needs a settled baseline; a floor on sd stops a very stable subject from
 * turning trivial fluctuation into a huge z-score.
 */
export function personalZ(b: Baseline | null, value: number | null, kind: VitalKind): number | null {
  if (!b || value == null || b.n < 60) return null;   // ~1 min of settled data
  const floor = kind === "heart" ? 3 : 1.2;
  return (value - b.mean) / Math.max(b.sd, floor);
}

// ── State debouncing ─────────────────────────────────────────────────────────

/**
 * N-of-M vote with hysteresis: a state must be observed `enter` times out of the
 * last M to switch on, and drop below `exit` to switch off. Prevents the
 * frame-to-frame flapping that makes alerting untrustworthy.
 */
export function debounceState(
  window: boolean[],
  currentlyOn: boolean,
  enter = 3,
  exit = 1,
): boolean {
  const hits = window.filter(Boolean).length;
  return currentlyOn ? hits >= exit : hits >= enter;
}

// ── Occupancy fusion ─────────────────────────────────────────────────────────

export interface NodeOccupancy { node_id: string; n_persons: number; presence_score: number; zone?: string }

/**
 * Total occupancy across a mesh.
 *
 * Summing `n_persons` per node double-counts anyone standing where two nodes
 * overlap, which is common in a small flat. Distinct zones are additive; within
 * a zone we take the strongest observer rather than the sum.
 */
export function fuseOccupancy(nodes: NodeOccupancy[]): number {
  const byZone = new Map<string, NodeOccupancy[]>();
  for (const n of nodes) {
    const z = n.zone ?? n.node_id;
    const arr = byZone.get(z) ?? [];
    arr.push(n);
    byZone.set(z, arr);
  }
  let total = 0;
  for (const group of byZone.values()) {
    total += group.reduce((best, n) => Math.max(best, n.n_persons), 0);
  }
  return total;
}

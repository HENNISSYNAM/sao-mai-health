/**
 * Whole-home RF sensing survey.
 *
 * Answers the question an installer actually has: with these nodes in these
 * rooms, which parts of the home can I sense, and where are the blind spots?
 *
 * Model (deliberately simple and physically grounded, not a ray tracer):
 *   - Log-distance path loss at 2.4 GHz: PL(d) = PL(1m) + 10·n·log10(d)
 *   - A fixed penalty per wall crossed between node and cell
 *   - Sensing (not just link) needs far more SNR than data transfer: reflected
 *     energy off a human chest is orders of magnitude below the direct path, so
 *     the usable sensing radius is much smaller than the WiFi coverage radius.
 *     We grade against sensing thresholds, not connectivity ones.
 *
 * Everything here is pure so it can be unit tested without a browser.
 */

export interface ScanRoom {
  node_id: string;
  label: string;
  x: number; y: number; w: number; h: number;   // 0..100 plan grid
}

/** 1 plan unit ≈ 10 cm, so a 40-unit room ≈ 4 m across. */
export const UNIT_M = 0.1;

export interface CoverageCell {
  x: number; y: number;          // cell centre, plan units
  /** Best achievable sensing quality at this point, 0..1. */
  quality: number;
  /** Node that provides it. */
  bestNode: string | null;
  /** How many nodes can sense here — >1 enables position multilateration. */
  redundancy: number;
}

export interface CoverageReport {
  cells: CoverageCell[];
  gridStep: number;
  covered: number;        // fraction of floor area with quality >= usable
  wellCovered: number;    // fraction with quality >= good
  blindSpots: { x: number; y: number; w: number; h: number }[];
  multilaterable: number; // fraction sensed by >= 2 nodes
  /** Where an extra node would recover the most blind area. */
  suggestion: { x: number; y: number; gain: number } | null;
}

export const QUALITY = { usable: 0.35, good: 0.6 } as const;

const PL_1M_DB = 40;        // 2.4 GHz reference path loss at 1 m
/**
 * One-way indoor exponent (2 = free space, 3-4 = cluttered). Sensing does not
 * use this directly: the signal must travel to the body AND back, so the
 * reflected path follows the radar-style round trip and the exponent doubles.
 * Using the one-way figure here was wrong — it predicted whole-building
 * coverage from a single node, which contradicts the ~5 m sensing range the
 * engine actually achieves.
 */
const PATH_EXP_ONE_WAY = 2.6;
const PATH_EXP = PATH_EXP_ONE_WAY * 2;   // round trip (node → body → node)
const WALL_DB_ONE_WAY = 6.5;             // typical interior partition
const WALL_DB = WALL_DB_ONE_WAY * 2;     // crossed twice on the reflected path
const SENSING_BUDGET_DB = 62; // usable dynamic range for reflected-energy sensing

/** Node position = centre of the room it is mounted in. */
export function nodeAnchor(r: ScanRoom) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Count room boundaries crossed by the straight line from a to b. */
export function wallsBetween(
  a: { x: number; y: number }, b: { x: number; y: number }, rooms: ScanRoom[],
): number {
  let n = 0;
  for (const r of rooms) {
    const aIn = a.x >= r.x && a.x <= r.x + r.w && a.y >= r.y && a.y <= r.y + r.h;
    const bIn = b.x >= r.x && b.x <= r.x + r.w && b.y >= r.y && b.y <= r.y + r.h;
    if (aIn !== bIn) n++;   // the segment enters or leaves this room → one wall
  }
  return n;
}

/** Sensing quality 0..1 from one node to one point. */
export function cellQuality(
  node: { x: number; y: number }, cell: { x: number; y: number }, rooms: ScanRoom[],
): number {
  const dUnits = Math.hypot(cell.x - node.x, cell.y - node.y);
  const dM = Math.max(0.5, dUnits * UNIT_M);
  const pl = PL_1M_DB + 10 * PATH_EXP * Math.log10(dM);
  const walls = wallsBetween(node, cell, rooms) * WALL_DB;
  const margin = SENSING_BUDGET_DB - (pl - PL_1M_DB) - walls;
  return Math.max(0, Math.min(1, margin / SENSING_BUDGET_DB));
}

/**
 * Survey the whole plan on a grid.
 * `gridStep` is in plan units; 4 (≈40 cm) is a good balance for a flat.
 */
export function surveyCoverage(rooms: ScanRoom[], gridStep = 4): CoverageReport {
  if (!rooms.length) {
    return { cells: [], gridStep, covered: 0, wellCovered: 0, blindSpots: [], multilaterable: 0, suggestion: null };
  }
  const anchors = rooms.map((r) => ({ id: r.node_id, ...nodeAnchor(r) }));
  const cells: CoverageCell[] = [];

  for (const r of rooms) {
    for (let x = r.x + gridStep / 2; x < r.x + r.w; x += gridStep) {
      for (let y = r.y + gridStep / 2; y < r.y + r.h; y += gridStep) {
        let best = 0, bestNode: string | null = null, redundancy = 0;
        for (const a of anchors) {
          const q = cellQuality(a, { x, y }, rooms);
          if (q >= QUALITY.usable) redundancy++;
          if (q > best) { best = q; bestNode = a.id; }
        }
        cells.push({ x, y, quality: best, bestNode, redundancy });
      }
    }
  }

  const total = cells.length || 1;
  const covered = cells.filter((c) => c.quality >= QUALITY.usable).length / total;
  const wellCovered = cells.filter((c) => c.quality >= QUALITY.good).length / total;
  const multilaterable = cells.filter((c) => c.redundancy >= 2).length / total;

  const blind = cells.filter((c) => c.quality < QUALITY.usable);
  const blindSpots = blind.map((c) => ({
    x: c.x - gridStep / 2, y: c.y - gridStep / 2, w: gridStep, h: gridStep,
  }));

  // Where would one more node help most? Test each blind cell as a candidate site.
  let suggestion: CoverageReport["suggestion"] = null;
  if (blind.length) {
    let bestGain = 0, bestAt: { x: number; y: number } | null = null;
    for (const cand of blind) {
      let gain = 0;
      for (const c of blind) {
        if (cellQuality(cand, c, rooms) >= QUALITY.usable) gain++;
      }
      if (gain > bestGain) { bestGain = gain; bestAt = { x: cand.x, y: cand.y }; }
    }
    if (bestAt) {
      suggestion = { x: bestAt.x, y: bestAt.y, gain: Math.round((bestGain / total) * 100) };
    }
  }

  return { cells, gridStep, covered, wellCovered, blindSpots, multilaterable, suggestion };
}

/** Green → amber → red ramp for a 0..1 quality value. */
export function qualityColour(q: number): string {
  if (q >= QUALITY.good) return "#10b981";
  if (q >= QUALITY.usable) return "#f59e0b";
  return "#ef4444";
}

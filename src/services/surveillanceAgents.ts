/**
 * Autonomous Surveillance Agent Network.
 *
 * One agent per continent runs on its own cadence, independently sweeping its
 * assigned regions: it pulls signals, scores each region, and emits detections
 * that the map renders as live dots. Agents do not wait for a user to press
 * anything — the network runs as long as the page is open.
 *
 *   Agent.tick() → sweep regions → score → emit AgentDetection[]
 *                                              ↓
 *                              subscriber (map layer / UI)
 */

import {
  SURVEILLANCE_REGIONS,
  REGIONS_BY_CONTINENT,
  CONTINENTS,
  type Continent,
} from './surveillanceRegions';
import { extractSeedSignals, type SeedSignal } from './swarmIntelligenceEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'sweeping' | 'analyzing' | 'cooldown';

export interface AgentDetection {
  id: string;
  regionKey: string;
  regionName: string;
  lat: number;
  lng: number;
  /** 0–1 — drives dot size and colour on the map */
  severity: number;
  disease: string;
  source: string;
  detectedBy: Continent;
  detectedAt: number;
  /** Detections decay; this is when the dot should disappear */
  expiresAt: number;
  isNew: boolean;
}

export interface AgentState {
  id: Continent;
  status: AgentStatus;
  regionCount: number;
  /** Region currently being swept — drives the scanning-beam animation */
  currentRegion: string | null;
  detectionCount: number;
  lastSweepAt: number;
  nextSweepAt: number;
  sweepsCompleted: number;
}

export interface NetworkSnapshot {
  agents: AgentState[];
  detections: AgentDetection[];
  totalRegions: number;
  totalDetections: number;
  isRunning: boolean;
}

type Subscriber = (snapshot: NetworkSnapshot) => void;

// ─── Tuning ──────────────────────────────────────────────────────────────────

/** Each agent sweeps on its own interval so detections arrive staggered, not in bursts */
const SWEEP_INTERVAL_MS: Record<Continent, number> = {
  Asia:     8_000,
  Europe:   11_000,
  Americas: 9_500,
  Africa:   13_000,
  Oceania:  15_000,
};

/** How long a detection dot stays on the map before fading out */
const DETECTION_TTL_MS = 90_000;

/** Regions swept per tick — keeps each tick cheap and the map alive continuously */
const REGIONS_PER_SWEEP = 3;

/** Above this severity a detection is worth showing */
const DETECTION_THRESHOLD = 0.28;

// ─── Single continent agent ──────────────────────────────────────────────────

class ContinentAgent {
  readonly id: Continent;
  private regions: string[];
  private cursor = 0;
  private cachedSignals: SeedSignal[] = [];
  private signalsFetchedAt = 0;

  status: AgentStatus = 'idle';
  currentRegion: string | null = null;
  detectionCount = 0;
  lastSweepAt = 0;
  nextSweepAt = 0;
  sweepsCompleted = 0;

  constructor(id: Continent, regions: string[]) {
    this.id = id;
    this.regions = regions;
    this.nextSweepAt = Date.now() + Math.random() * SWEEP_INTERVAL_MS[id];
  }

  get regionCount() {
    return this.regions.length;
  }

  get interval() {
    return SWEEP_INTERVAL_MS[this.id];
  }

  /** Signals are refetched at most once a minute; sweeps in between reuse the cache. */
  private async signals(regionKeys: string[]): Promise<SeedSignal[]> {
    const stale = Date.now() - this.signalsFetchedAt > 60_000;
    if (stale || this.cachedSignals.length === 0) {
      try {
        this.cachedSignals = await extractSeedSignals(regionKeys);
        this.signalsFetchedAt = Date.now();
      } catch {
        // Keep whatever we had; a failed fetch should not stop the sweep.
      }
    }
    return this.cachedSignals;
  }

  /** Sweep the next slice of this agent's regions and emit any detections. */
  async tick(): Promise<AgentDetection[]> {
    if (this.regions.length === 0) return [];

    this.status = 'sweeping';
    this.lastSweepAt = Date.now();

    const slice: string[] = [];
    for (let i = 0; i < REGIONS_PER_SWEEP; i++) {
      slice.push(this.regions[this.cursor % this.regions.length]);
      this.cursor++;
    }
    this.currentRegion = slice[0];

    const all = await this.signals(slice);
    this.status = 'analyzing';

    const out: AgentDetection[] = [];
    for (const regionKey of slice) {
      const meta = SURVEILLANCE_REGIONS[regionKey];
      if (!meta) continue;

      const regionSignals = all.filter(s => s.region === regionKey);
      if (regionSignals.length === 0) continue;

      // Strongest signal defines the detection; the rest raise confidence slightly.
      const strongest = regionSignals.reduce((a, b) => (b.magnitude > a.magnitude ? b : a));
      const corroboration = Math.min(0.15, (regionSignals.length - 1) * 0.04);
      const severity = Math.min(1, strongest.magnitude + corroboration);

      if (severity < DETECTION_THRESHOLD) continue;

      out.push({
        id: `${regionKey}-${this.sweepsCompleted}-${Math.round(severity * 1000)}`,
        regionKey,
        regionName: meta.name,
        // Jitter so repeat detections in one city do not stack on one pixel
        lat: meta.lat + (Math.random() - 0.5) * 0.12,
        lng: meta.lng + (Math.random() - 0.5) * 0.12,
        severity,
        disease: strongest.disease ?? meta.endemic[0] ?? 'unknown',
        source: strongest.source,
        detectedBy: this.id,
        detectedAt: Date.now(),
        expiresAt: Date.now() + DETECTION_TTL_MS,
        isNew: true,
      });
    }

    this.detectionCount += out.length;
    this.sweepsCompleted++;
    this.status = 'cooldown';
    this.currentRegion = null;
    this.nextSweepAt = Date.now() + this.interval;
    return out;
  }

  snapshot(): AgentState {
    return {
      id: this.id,
      status: this.status,
      regionCount: this.regionCount,
      currentRegion: this.currentRegion,
      detectionCount: this.detectionCount,
      lastSweepAt: this.lastSweepAt,
      nextSweepAt: this.nextSweepAt,
      sweepsCompleted: this.sweepsCompleted,
    };
  }
}

// ─── Network ─────────────────────────────────────────────────────────────────

class AgentNetwork {
  private agents: ContinentAgent[] = [];
  private detections = new Map<string, AgentDetection>();
  private subscribers = new Set<Subscriber>();
  private loop: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor() {
    this.agents = CONTINENTS.map(
      c => new ContinentAgent(c, REGIONS_BY_CONTINENT[c] ?? [])
    );
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    fn(this.snapshot());
    return () => {
      this.subscribers.delete(fn);
      // Stop the loop once nothing is listening — no work in a hidden tab.
      if (this.subscribers.size === 0) this.stop();
    };
  }

  private emit() {
    const snap = this.snapshot();
    this.subscribers.forEach(fn => fn(snap));
  }

  start() {
    if (this.running) return;
    this.running = true;
    // One coordinator tick; each agent fires only when its own timer is due.
    this.loop = setInterval(() => void this.coordinate(), 1000);
    void this.coordinate();
  }

  stop() {
    this.running = false;
    if (this.loop) clearInterval(this.loop);
    this.loop = null;
    this.emit();
  }

  private async coordinate() {
    const now = Date.now();

    // Retire expired detections and clear the "new" flag after one cycle.
    let changed = false;
    for (const [id, d] of this.detections) {
      if (d.expiresAt <= now) {
        this.detections.delete(id);
        changed = true;
      } else if (d.isNew && now - d.detectedAt > 3000) {
        d.isNew = false;
        changed = true;
      }
    }

    const due = this.agents.filter(a => a.nextSweepAt <= now);
    if (due.length > 0) {
      const results = await Promise.all(due.map(a => a.tick()));
      for (const batch of results) {
        for (const d of batch) {
          this.detections.set(d.regionKey + ':' + d.disease, d);
          changed = true;
        }
      }
    }

    if (changed || due.length > 0) this.emit();
  }

  snapshot(): NetworkSnapshot {
    return {
      agents: this.agents.map(a => a.snapshot()),
      detections: [...this.detections.values()].sort((a, b) => b.severity - a.severity),
      totalRegions: this.agents.reduce((n, a) => n + a.regionCount, 0),
      totalDetections: this.detections.size,
      isRunning: this.running,
    };
  }
}

/** Process-wide singleton — every consumer shares one running network. */
export const agentNetwork = new AgentNetwork();

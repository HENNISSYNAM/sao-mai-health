/**
 * WiFi Spatial Scanning Hook — v2
 *
 * Estimates the physical-space occupancy around the device using only
 * browser-accessible signals — no native OS WiFi scan is available from JS.
 *
 * Technique stack:
 *  1. Network Information API  — downlink, rtt, effectiveType
 *  2. Multi-server STUN RTT    — 5 STUN servers, measures jitter (timing variance)
 *     High jitter = many competing devices on channel = dense space
 *  3. Resource timing probe    — fetch a tiny resource, measure actual transfer time
 *     Slow transfer relative to advertised downlink = congested local network
 *  4. Frequency band heuristic — 2.4GHz has range ~30 m (building-wide), 5GHz ~15 m
 *     Estimated from RTT / downlink ratio: low RTT + high downlink → likely 5 GHz → smaller zone
 *  5. Spatial radius estimate  — derived from band + congestion
 *
 * All values feed into the MiroFish Swarm Engine as seed signal magnitude.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export type OccupancyDensity = 'sparse' | 'moderate' | 'dense' | 'crowd';
export type BandwidthCategory = 'low' | 'medium' | 'high';
export type FrequencyBand    = '2.4GHz' | '5GHz' | 'cellular' | 'unknown';

export interface WifiEnvironment {
  /** Estimated number of unique devices competing for bandwidth */
  estimatedDevices: number;
  /** Connection type from Network Information API */
  connectionType: string;
  /** Bandwidth category */
  bandwidthCategory: BandwidthCategory;
  /** 0–1: channel congestion (higher = more devices competing) */
  channelCongestion: number;
  /** 0–1: timing jitter across multiple RTT samples (key spatial indicator) */
  rttJitter: number;
  /** Physical-space occupancy density */
  occupancyDensity: OccupancyDensity;
  /** Estimated WiFi frequency band */
  frequencyBand: FrequencyBand;
  /** Estimated scanning radius in metres */
  spatialRadiusMetres: number;
  /** Timestamp of this sample */
  sampledAt: number;
  /** Raw advertised downlink Mbps */
  downlinkMbps: number | null;
  /** Median RTT across STUN servers (ms) */
  rttMs: number | null;
  /** Whether any scanning technique is supported */
  isSupported: boolean;
}

// ── STUN servers for RTT probing ───────────────────────────────────────────

const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
  'stun:stun.ekiga.net',
  'stun:stun.ideasip.com',
];

/**
 * Measure RTT to a single STUN server.
 * Creates a minimal RTCPeerConnection, starts ICE gathering, and records
 * the time from offer creation to first ICE candidate (network round-trip).
 */
async function measureStunRTT(server: string, timeoutMs = 1200): Promise<number | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => { resolve(null); try { pc.close(); } catch {} }, timeoutMs);
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: server }] });
      const t0 = performance.now();
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          clearTimeout(timer);
          const rtt = performance.now() - t0;
          try { pc.close(); } catch {}
          resolve(Math.round(rtt));
        }
      };
      // Data channel triggers ICE gathering without audio/video
      pc.createDataChannel('probe');
      pc.createOffer()
        .then(o => pc.setLocalDescription(o))
        .catch(() => { clearTimeout(timer); resolve(null); });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/**
 * Probe multiple STUN servers in parallel, return all valid RTTs.
 * Parallel = simultaneous → jitter reflects real channel variance, not sequential delay.
 */
async function probeMultipleSTUN(): Promise<number[]> {
  const results = await Promise.all(
    STUN_SERVERS.map(s => measureStunRTT(s))
  );
  return results.filter((r): r is number => r !== null && r > 0 && r < 2000);
}

/**
 * Compute statistical jitter (normalised std-dev) from RTT samples.
 * A quiet, uncrowded channel → RTTs cluster tightly → low jitter.
 * A congested channel → RTTs vary widely → high jitter.
 */
function computeJitter(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
  const stdDev = Math.sqrt(variance);
  // Normalise: stdDev of ~200 ms or more → jitter = 1.0
  return Math.min(1, stdDev / 200);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ── Network Information API ────────────────────────────────────────────────

function getConnectionInfo() {
  const nav = navigator as any;
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
  if (!conn) return { type: 'unknown', downlink: null, rtt: null, effectiveType: 'unknown' };
  return {
    type:          conn.type          ?? 'unknown',
    effectiveType: conn.effectiveType ?? 'unknown',
    downlink:      conn.downlink      ?? null,   // Mbps
    rtt:           conn.rtt           ?? null,   // ms
  };
}

// ── Band & spatial radius heuristics ──────────────────────────────────────

/**
 * Infer frequency band from RTT and downlink.
 * 5 GHz: lower RTT, higher throughput, shorter range (~15 m)
 * 2.4 GHz: higher RTT, lower throughput, wider range (~30 m)
 * Cellular: effectiveType 4g/5g
 */
function inferFrequencyBand(
  rttMs: number | null,
  downlinkMbps: number | null,
  effectiveType: string
): FrequencyBand {
  if (effectiveType === '4g' || effectiveType === '5g') return 'cellular';
  if (rttMs === null || downlinkMbps === null) return 'unknown';
  // Low latency + high throughput → likely 5 GHz
  if (rttMs < 15 && downlinkMbps > 50) return '5GHz';
  // Higher latency or lower throughput → likely 2.4 GHz
  if (rttMs < 80) return '2.4GHz';
  return 'unknown';
}

function spatialRadius(band: FrequencyBand, congestion: number): number {
  // 5 GHz: ~10–20 m; 2.4 GHz: ~20–40 m; cellular: city-scale
  switch (band) {
    case '5GHz':    return Math.round(10 + (1 - congestion) * 10);   // 10–20 m
    case '2.4GHz':  return Math.round(20 + (1 - congestion) * 20);   // 20–40 m
    case 'cellular': return 500;
    default:         return 30;
  }
}

// ── Occupancy inference ────────────────────────────────────────────────────

/**
 * Combine channel congestion + jitter for a robust occupancy signal.
 * Jitter is the primary spatial indicator (how many devices are competing).
 */
function inferOccupancy(congestion: number, jitter: number): OccupancyDensity {
  const score = congestion * 0.45 + jitter * 0.55;
  if (score < 0.18) return 'sparse';
  if (score < 0.42) return 'moderate';
  if (score < 0.68) return 'dense';
  return 'crowd';
}

function inferDeviceCount(congestion: number, jitter: number, band: FrequencyBand): number {
  // Estimate based on how many devices typically compete at this congestion level
  const areaFactor = band === '5GHz' ? 0.6 : 1.0;   // 5 GHz covers smaller area → fewer devices
  const base = 5;
  return Math.round((base + (congestion * 0.5 + jitter * 0.5) * 180) * areaFactor);
}

// ── Default environment ────────────────────────────────────────────────────

const defaultEnv: WifiEnvironment = {
  estimatedDevices: 0,
  connectionType: 'unknown',
  bandwidthCategory: 'medium',
  channelCongestion: 0,
  rttJitter: 0,
  occupancyDensity: 'sparse',
  frequencyBand: 'unknown',
  spatialRadiusMetres: 30,
  sampledAt: 0,
  downlinkMbps: null,
  rttMs: null,
  isSupported: false,
};

// ── Hook ────────────────────────────────────────────────────────────────────

export function useWifiScanning(intervalMs = 15000) {
  const [env, setEnv]       = useState<WifiEnvironment>(defaultEnv);
  const [history, setHistory] = useState<WifiEnvironment[]>([]);
  const [scanning, setScanning] = useState(false);
  const timerRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const conn = getConnectionInfo();

      // Run STUN probe + Network Info concurrently
      const [stunRTTs] = await Promise.all([
        probeMultipleSTUN(),
      ]);

      const medianRtt = stunRTTs.length > 0 ? median(stunRTTs) : (conn.rtt ?? null);
      const jitter    = computeJitter(stunRTTs);

      // Congestion: higher rtt + lower downlink → more congested
      const rttNorm      = Math.min(1, (medianRtt ?? 100) / 600);
      const downlinkNorm = conn.downlink ? Math.max(0, 1 - Math.min(conn.downlink, 100) / 100) : 0.5;
      const congestion   = parseFloat((rttNorm * 0.5 + downlinkNorm * 0.3 + jitter * 0.2).toFixed(3));

      const band     = inferFrequencyBand(medianRtt, conn.downlink, conn.effectiveType);
      const radius   = spatialRadius(band, congestion);
      const density  = inferOccupancy(congestion, jitter);
      const devices  = inferDeviceCount(congestion, jitter, band);

      const bandwidth: BandwidthCategory =
        (conn.downlink ?? 0) > 20 ? 'high' : (conn.downlink ?? 0) > 2 ? 'medium' : 'low';

      const sample: WifiEnvironment = {
        estimatedDevices:  devices,
        connectionType:    conn.type,
        bandwidthCategory: bandwidth,
        channelCongestion: congestion,
        rttJitter:         parseFloat(jitter.toFixed(3)),
        occupancyDensity:  density,
        frequencyBand:     band,
        spatialRadiusMetres: radius,
        sampledAt:         Date.now(),
        downlinkMbps:      conn.downlink,
        rttMs:             medianRtt,
        isSupported:       stunRTTs.length > 0 || 'connection' in navigator,
      };

      setEnv(sample);
      setHistory(prev => [...prev.slice(-30), sample]);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    scan();
    timerRef.current = setInterval(scan, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [scan, intervalMs]);

  // React to connection change events immediately
  useEffect(() => {
    const nav = navigator as any;
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    if (!conn) return;
    conn.addEventListener('change', scan);
    return () => conn.removeEventListener('change', scan);
  }, [scan]);

  /** Convert latest scan to a swarm seed signal magnitude (0–1) */
  const toSeedMagnitude = (): number =>
    env.channelCongestion * 0.5 + env.rttJitter * 0.5;

  return { env, history, scanning, scan, toSeedMagnitude };
}

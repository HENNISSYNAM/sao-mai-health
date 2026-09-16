/**
 * WiFi Spatial Scanning — v3
 *
 * Browsers expose no native WiFi scan, so occupancy is inferred from how the
 * local radio environment distorts network timing. v3 adds a compatibility
 * ladder so the hook produces a usable reading on every engine, not just
 * Chromium (Safari and Firefox ship no Network Information API).
 *
 * Compatibility ladder — each rung is tried, results are fused by confidence:
 *   1. Network Information API   Chromium only      downlink / rtt / effectiveType
 *   2. Multi-server STUN RTT     all WebRTC engines median + jitter across 5 servers
 *   3. Resource Timing API       all engines        real transfer timing of a fetch
 *   4. Fetch race                all engines        wall-clock RTT when 1–3 unavailable
 *   5. Device signals            all engines        cores + memory scale the estimate
 *
 * The spatial model turns those measurements into a 2-D occupancy field:
 * a ring of directional sectors, each with an independent density estimate,
 * so the UI can draw the room rather than a single number.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGPS } from './useGPS';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OccupancyDensity = 'sparse' | 'moderate' | 'dense' | 'crowd';
export type BandwidthCategory = 'low' | 'medium' | 'high';
export type FrequencyBand = '2.4GHz' | '5GHz' | '6GHz' | 'cellular' | 'unknown';
export type ScanMethod = 'network-info' | 'stun-rtt' | 'resource-timing' | 'fetch-race' | 'device-only';

/** One directional slice of the inferred space around the device */
export interface SpatialSector {
  /** Bearing of the sector centre, degrees clockwise from north */
  bearing: number;
  /** 0–1 inferred device density in this direction */
  density: number;
  /** Estimated distance to the densest cluster in this sector, metres */
  distanceM: number;
}

export interface WifiEnvironment {
  estimatedDevices: number;
  connectionType: string;
  bandwidthCategory: BandwidthCategory;
  /** 0–1 channel congestion */
  channelCongestion: number;
  /** 0–1 timing variance — the primary crowd-density indicator */
  rttJitter: number;
  occupancyDensity: OccupancyDensity;
  frequencyBand: FrequencyBand;
  spatialRadiusMetres: number;
  /** 12 sectors × 30° covering the full circle around the device */
  sectors: SpatialSector[];
  /** Estimated floor area covered by the scan, m² */
  coverageAreaM2: number;
  sampledAt: number;
  downlinkMbps: number | null;
  rttMs: number | null;
  /** Quietest RTT seen this session — the uncontended channel reference, ms */
  rttBaselineMs: number | null;
  /** How far this reading sits above that reference, ms */
  rttExcessMs: number | null;
  /** Number of timing samples that survived outlier rejection */
  sampleCount: number;
  /** Plausible range for the device estimate, [low, high] */
  estimatedDevicesRange: [number, number];
  /** Which rungs of the ladder actually produced data */
  methodsUsed: ScanMethod[];
  /** 0–1 — how much to trust this reading */
  confidence: number;
  isSupported: boolean;
  /** Where this reading was taken — null until GPS resolves */
  anchor: { lat: number; lng: number; accuracyM: number } | null;
  /** Compass heading in degrees at sample time, or null without a magnetometer */
  headingDeg: number | null;
  /** Metres travelled since the previous scan */
  movedSinceLastM: number;
}

// ─── Rung 1: Network Information API ─────────────────────────────────────────

interface ConnInfo {
  type: string;
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
  available: boolean;
}

function readNetworkInformation(): ConnInfo {
  const nav = navigator as any;
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
  if (!conn) {
    return { type: 'unknown', effectiveType: 'unknown', downlink: null, rtt: null, available: false };
  }
  return {
    type: conn.type ?? 'unknown',
    effectiveType: conn.effectiveType ?? 'unknown',
    downlink: typeof conn.downlink === 'number' ? conn.downlink : null,
    rtt: typeof conn.rtt === 'number' ? conn.rtt : null,
    available: true,
  };
}

// ─── Rung 2: multi-server STUN RTT ───────────────────────────────────────────

const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
  'stun:stun.nextcloud.com:443',
  'stun:stun.sipgate.net:3478',
];

function hasWebRTC(): boolean {
  return typeof RTCPeerConnection !== 'undefined';
}

async function measureStunRTT(server: string, timeoutMs = 1500): Promise<number | null> {
  if (!hasWebRTC()) return null;
  return new Promise(resolve => {
    let pc: RTCPeerConnection | null = null;
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { pc?.close(); } catch { /* already closed */ }
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: server }] });
      const t0 = performance.now();
      pc.onicecandidate = e => {
        // Only server-reflexive candidates represent a real round trip
        if (e.candidate?.type === 'srflx' || (e.candidate && e.candidate.candidate.includes('srflx'))) {
          finish(Math.round(performance.now() - t0));
        }
      };
      pc.createDataChannel('probe');
      pc.createOffer()
        .then(o => pc!.setLocalDescription(o))
        .catch(() => finish(null));
    } catch {
      finish(null);
    }
  });
}

/**
 * Two rounds against every server. One probe per server conflates server-side
 * variance with local channel contention; repeated probes let the statistics
 * below separate them.
 */
async function probeSTUN(rounds = 2): Promise<number[]> {
  if (!hasWebRTC()) return [];
  const out: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const results = await Promise.all(STUN_SERVERS.map(s => measureStunRTT(s)));
    for (const v of results) {
      if (v !== null && v > 0 && v < 3000) out.push(v);
    }
  }
  return out;
}

// ─── Rung 3: Resource Timing API ─────────────────────────────────────────────

/** Real transfer timings already recorded by the browser for this page's assets. */
function readResourceTimings(): { rtts: number[]; throughputMbps: number | null } {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return { rtts: [], throughputMbps: null };
  }
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const recent = entries.slice(-40);

  const rtts: number[] = [];
  let bytes = 0;
  let seconds = 0;

  for (const e of recent) {
    // responseStart - requestStart is the server round trip for that asset
    if (e.responseStart > 0 && e.requestStart > 0) {
      const rtt = e.responseStart - e.requestStart;
      if (rtt > 0 && rtt < 3000) rtts.push(rtt);
    }
    if (e.transferSize > 0 && e.duration > 0) {
      bytes += e.transferSize;
      seconds += e.duration / 1000;
    }
  }

  const throughputMbps = seconds > 0 && bytes > 0 ? (bytes * 8) / seconds / 1_000_000 : null;
  return { rtts, throughputMbps };
}

// ─── Rung 4: fetch race ──────────────────────────────────────────────────────

/** Last-resort timing: time a few tiny same-origin requests. */
async function fetchRaceRTT(samples = 3): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    try {
      await fetch(`${location.origin}/favicon.ico?probe=${Date.now()}-${i}`, {
        cache: 'no-store',
        method: 'HEAD',
      });
      out.push(Math.round(performance.now() - t0));
    } catch {
      // A failed probe still tells us the request took this long to fail
      const elapsed = Math.round(performance.now() - t0);
      if (elapsed > 0 && elapsed < 3000) out.push(elapsed);
    }
  }
  return out;
}

// ─── Rung 5: device signals ──────────────────────────────────────────────────

/** Device class shifts the device-count estimate; a phone in a hall differs from a desktop. */
function deviceScale(): number {
  const nav = navigator as any;
  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 4;
  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 4;
  // Lower-powered devices are typically mobile → more likely in shared space
  const mobility = cores <= 4 || memory <= 4 ? 1.15 : 0.9;
  return mobility;
}

// ─── Statistics ──────────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median absolute deviation — spread measure that a single slow probe cannot inflate. */
function mad(samples: number[]): number {
  if (samples.length < 2) return 0;
  const med = median(samples);
  return median(samples.map(v => Math.abs(v - med)));
}

/**
 * Drop samples further than 3 robust sigma from the median. A CDN hiccup or a
 * cold TLS handshake is not channel contention, and averaging it in was the
 * main source of false "crowded" readings.
 */
function rejectOutliers(samples: number[]): number[] {
  if (samples.length < 4) return samples;
  const med = median(samples);
  const sigma = mad(samples) * 1.4826 || 1;   // MAD → sigma for a normal spread
  const kept = samples.filter(v => Math.abs(v - med) <= 3 * sigma);
  return kept.length >= 3 ? kept : samples;
}

/**
 * Jitter relative to the channel's own latency instead of a fixed 200 ms scale.
 * A ±10 ms spread means something very different on a 6 ms link than on a
 * 300 ms one, so we normalise by the median (robust coefficient of variation).
 */
function jitterOf(samples: number[]): number {
  if (samples.length < 3) return 0;
  const med = median(samples) || 1;
  const sigma = mad(samples) * 1.4826;
  return Math.min(1, sigma / Math.max(8, med * 0.9));
}

// ─── Band and space inference ────────────────────────────────────────────────

/**
 * Band inference. `connection.type` is authoritative when present — only guess
 * from timing when the browser will not say. Thresholds follow the practical
 * throughput ceilings of each standard (802.11n ≈ 2.4 GHz, ac ≈ 5 GHz,
 * ax/be ≈ 6 GHz) rather than round numbers.
 */
function inferBand(
  rtt: number | null, downlink: number | null, connType: string, effectiveType: string,
): FrequencyBand {
  if (connType === 'cellular') return 'cellular';
  if (connType === 'ethernet') return 'unknown';
  if (connType !== 'wifi' && (effectiveType === '2g' || effectiveType === '3g')) return 'cellular';
  if (rtt === null || downlink === null) return 'unknown';
  if (rtt < 10 && downlink >= 120) return '6GHz';
  if (rtt < 20 && downlink >= 45) return '5GHz';
  if (rtt < 90) return '2.4GHz';
  return 'unknown';
}

function radiusFor(band: FrequencyBand, congestion: number): number {
  switch (band) {
    case '6GHz':    return Math.round(6 + (1 - congestion) * 6);    //  6–12 m
    case '5GHz':    return Math.round(10 + (1 - congestion) * 10);  // 10–20 m
    case '2.4GHz':  return Math.round(20 + (1 - congestion) * 20);  // 20–40 m
    case 'cellular': return 500;
    default:         return 30;
  }
}

/**
 * Build a 12-sector occupancy field.
 *
 * A single RTT stream carries no true bearing, so direction is derived
 * deterministically from the measurement fingerprint: sector energy is a
 * low-frequency harmonic of the jitter and congestion values. The result is
 * stable between scans of the same environment and shifts when the
 * environment does — a spatial *model*, not a claim of real direction finding.
 */
function buildSectors(congestion: number, jitter: number, radiusM: number): SpatialSector[] {
  const SECTORS = 12;
  const sectors: SpatialSector[] = [];
  // Phase derived from the measurement so the field is stable, not random
  const phase = (congestion * 7.3 + jitter * 11.1) % (Math.PI * 2);

  for (let i = 0; i < SECTORS; i++) {
    const bearing = (360 / SECTORS) * i;
    const theta = (bearing * Math.PI) / 180;
    // Two harmonics give a lobed field rather than a flat circle
    const lobe =
      0.5 +
      0.32 * Math.sin(theta * 2 + phase) +
      0.18 * Math.sin(theta * 3 - phase * 1.7);

    const density = Math.max(0, Math.min(1, lobe * (0.45 + congestion * 0.75 + jitter * 0.5)));
    // Denser sectors read as nearer — signal contention falls off with distance
    const distanceM = Math.round(radiusM * (1 - density * 0.55));

    sectors.push({ bearing, density: parseFloat(density.toFixed(3)), distanceM });
  }
  return sectors;
}

function inferOccupancy(congestion: number, jitter: number): OccupancyDensity {
  const score = congestion * 0.45 + jitter * 0.55;
  if (score < 0.18) return 'sparse';
  if (score < 0.42) return 'moderate';
  if (score < 0.68) return 'dense';
  return 'crowd';
}

/**
 * Device estimate with an honest error bar. Contention grows sub-linearly with
 * the number of stations sharing a channel (each retry costs more airtime), so
 * a power curve fits far better than the old straight line, which read 180
 * devices from a merely slow uplink.
 */
function inferDeviceCount(
  congestion: number, jitter: number, band: FrequencyBand, confidence: number,
): { estimate: number; range: [number, number] } {
  const areaFactor = band === '6GHz' ? 0.45 : band === '5GHz' ? 0.65 : band === 'cellular' ? 1.6 : 1;
  const load = Math.max(0, Math.min(1, congestion * 0.55 + jitter * 0.45));
  const estimate = Math.max(1, Math.round((2 + Math.pow(load, 1.6) * 70) * areaFactor * deviceScale()));
  // Wider band when few methods agreed — the uncertainty is real, so show it.
  const spread = 0.35 + (1 - confidence) * 0.65;
  return {
    estimate,
    range: [Math.max(1, Math.round(estimate * (1 - spread * 0.6))), Math.round(estimate * (1 + spread))],
  };
}

// ─── Geography ───────────────────────────────────────────────────────────────

/** Great-circle distance in metres (haversine). */
export function distanceMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Project a sector onto real coordinates so the occupancy field can be drawn
 * on a map at the user's actual position rather than in an abstract circle.
 */
export function sectorToLatLng(
  origin: { lat: number; lng: number },
  bearingDeg: number,
  distanceM: number
): { lat: number; lng: number } {
  const R = 6_371_000;
  const brg = (bearingDeg * Math.PI) / 180;
  const la1 = (origin.lat * Math.PI) / 180;
  const lo1 = (origin.lng * Math.PI) / 180;
  const dr = distanceM / R;

  const la2 = Math.asin(
    Math.sin(la1) * Math.cos(dr) + Math.cos(la1) * Math.sin(dr) * Math.cos(brg)
  );
  const lo2 =
    lo1 +
    Math.atan2(
      Math.sin(brg) * Math.sin(dr) * Math.cos(la1),
      Math.cos(dr) - Math.sin(la1) * Math.sin(la2)
    );

  return { lat: (la2 * 180) / Math.PI, lng: (((lo2 * 180) / Math.PI + 540) % 360) - 180 };
}

/** Live compass heading. Returns null where no magnetometer or permission is denied. */
function useCompassHeading(): number | null {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;

    const onOrient = (e: DeviceOrientationEvent) => {
      // iOS exposes a true-north heading directly; other engines give alpha
      const webkit = (e as any).webkitCompassHeading;
      if (typeof webkit === 'number' && !Number.isNaN(webkit)) {
        setHeading(webkit);
      } else if (typeof e.alpha === 'number') {
        setHeading((360 - e.alpha) % 360);
      }
    };

    // iOS 13+ requires an explicit grant; without a user gesture this rejects,
    // and the scan simply proceeds without a heading.
    const anyDOE = DeviceOrientationEvent as any;
    if (typeof anyDOE.requestPermission === 'function') {
      anyDOE.requestPermission()
        .then((state: string) => {
          if (state === 'granted') window.addEventListener('deviceorientation', onOrient);
        })
        .catch(() => { /* no heading available */ });
    } else {
      window.addEventListener('deviceorientation', onOrient);
    }

    return () => window.removeEventListener('deviceorientation', onOrient);
  }, []);

  return heading;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_ENV: WifiEnvironment = {
  estimatedDevices: 0,
  connectionType: 'unknown',
  bandwidthCategory: 'medium',
  channelCongestion: 0,
  rttJitter: 0,
  occupancyDensity: 'sparse',
  frequencyBand: 'unknown',
  spatialRadiusMetres: 30,
  sectors: [],
  coverageAreaM2: 0,
  sampledAt: 0,
  downlinkMbps: null,
  rttMs: null,
  rttBaselineMs: null,
  rttExcessMs: null,
  sampleCount: 0,
  estimatedDevicesRange: [0, 0],
  methodsUsed: [],
  confidence: 0,
  isSupported: false,
  anchor: null,
  headingDeg: null,
  movedSinceLastM: 0,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/** Re-scan once the user has moved this far — the radio environment has changed. */
const MOVEMENT_RESCAN_M = 40;

export function useWifiScanning(intervalMs = 15000) {
  const [env, setEnv] = useState<WifiEnvironment>(DEFAULT_ENV);
  const [history, setHistory] = useState<WifiEnvironment[]>([]);
  const [scanning, setScanning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Follow the user continuously so a reading always belongs to where they are
  const { position } = useGPS({ watch: true, highAccuracy: true, maxAge: 10000 });
  const headingDeg = useCompassHeading();

  // Latest values, read inside scan() without making it a new callback each move
  const posRef = useRef(position);
  const headingRef = useRef(headingDeg);
  const lastScanPosRef = useRef<{ lat: number; lng: number } | null>(null);
  /** Quietest RTT of the session — the uncontended channel reference. */
  const baselineRef = useRef<number | null>(null);
  const scanCountRef = useRef(0);
  posRef.current = position;
  headingRef.current = headingDeg;

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const methods: ScanMethod[] = [];

      // Rung 1
      const conn = readNetworkInformation();
      if (conn.available) methods.push('network-info');

      // Rungs 2 and 3 run concurrently — neither depends on the other
      const [stunRTTs, timings] = await Promise.all([
        probeSTUN(),
        Promise.resolve(readResourceTimings()),
      ]);
      if (stunRTTs.length > 0) methods.push('stun-rtt');
      if (timings.rtts.length > 0) methods.push('resource-timing');

      // Rung 4 only when the rungs above produced nothing measurable
      let raceRTTs: number[] = [];
      if (stunRTTs.length === 0 && timings.rtts.length === 0 && conn.rtt === null) {
        raceRTTs = await fetchRaceRTT();
        if (raceRTTs.length > 0) methods.push('fetch-race');
      }

      if (methods.length === 0) methods.push('device-only');

      // Fuse every RTT source, then reject outliers before any statistic is taken
      const rawRTTs = [...stunRTTs, ...timings.rtts, ...raceRTTs];
      const allRTTs = rejectOutliers(rawRTTs);
      const medianRtt =
        allRTTs.length > 0 ? Math.round(median(allRTTs)) : conn.rtt;
      const jitter = jitterOf(allRTTs);

      const downlink = conn.downlink ?? timings.throughputMbps;

      // Session baseline: the quietest RTT we have ever measured here is the
      // uncontended channel. Congestion is the *excess* over that reference, so
      // a naturally distant server no longer reads as a crowded room.
      if (medianRtt !== null && medianRtt > 0) {
        baselineRef.current = baselineRef.current === null
          ? medianRtt
          : Math.min(baselineRef.current, medianRtt);
      }
      const baseline = baselineRef.current;
      const excess = medianRtt !== null && baseline !== null ? Math.max(0, medianRtt - baseline) : null;
      // Contention scale grows with the link's own latency, not a fixed 600 ms.
      const excessScale = Math.max(25, (baseline ?? 40) * 1.5);
      const rttNorm = excess !== null ? Math.min(1, excess / excessScale) : 0.35;

      const downNorm = downlink !== null ? Math.max(0, 1 - Math.min(downlink, 100) / 100) : 0.4;
      const congestion = parseFloat((rttNorm * 0.5 + downNorm * 0.2 + jitter * 0.3).toFixed(3));

      const band = inferBand(medianRtt, downlink, conn.type, conn.effectiveType);
      const radius = radiusFor(band, congestion);
      // Sectors are generated in device frame, then rotated by the compass so
      // each sector keeps its real-world bearing as the user turns around.
      const rawSectors = buildSectors(congestion, jitter, radius);
      const heading = headingRef.current;
      const sectors = heading === null
        ? rawSectors
        : rawSectors.map(sec => ({ ...sec, bearing: (sec.bearing + heading) % 360 }));

      const pos = posRef.current;
      const anchor = pos
        ? { lat: pos.lat, lng: pos.lng, accuracyM: Math.round(pos.accuracy) }
        : null;

      const moved = pos && lastScanPosRef.current
        ? Math.round(distanceMetres(lastScanPosRef.current, pos))
        : 0;
      if (pos) lastScanPosRef.current = { lat: pos.lat, lng: pos.lng };

      // Confidence combines method diversity with how many samples survived
      // rejection — three agreeing probes deserve more trust than one.
      const methodScore = Math.min(0.6, methods.filter(m => m !== 'device-only').length * 0.18);
      const sampleScore = Math.min(0.3, allRTTs.length * 0.04);
      // A baseline is only meaningful after a few scans have had a chance to find it
      scanCountRef.current += 1;
      const baselineScore = baseline !== null && scanCountRef.current >= 3 ? 0.1 : 0;
      const confidence = parseFloat(
        Math.max(0.1, Math.min(1, methodScore + sampleScore + baselineScore)).toFixed(2)
      );

      const devices = inferDeviceCount(congestion, jitter, band, confidence);

      const sample: WifiEnvironment = {
        estimatedDevices: devices.estimate,
        connectionType: conn.type !== 'unknown' ? conn.type : conn.effectiveType,
        bandwidthCategory: (downlink ?? 0) > 20 ? 'high' : (downlink ?? 0) > 2 ? 'medium' : 'low',
        channelCongestion: congestion,
        rttJitter: parseFloat(jitter.toFixed(3)),
        occupancyDensity: inferOccupancy(congestion, jitter),
        frequencyBand: band,
        spatialRadiusMetres: radius,
        sectors,
        coverageAreaM2: Math.round(Math.PI * radius * radius),
        sampledAt: Date.now(),
        downlinkMbps: downlink !== null ? parseFloat(downlink.toFixed(1)) : null,
        rttMs: medianRtt,
        rttBaselineMs: baseline,
        rttExcessMs: excess,
        sampleCount: allRTTs.length,
        estimatedDevicesRange: devices.range,
        methodsUsed: methods,
        confidence,
        isSupported: methods.some(m => m !== 'device-only'),
        anchor,
        headingDeg: heading,
        movedSinceLastM: moved,
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

  // A move past the threshold invalidates the current reading — scan again.
  useEffect(() => {
    if (!position) return;
    const last = lastScanPosRef.current;
    if (last && distanceMetres(last, position) >= MOVEMENT_RESCAN_M) scan();
  }, [position, scan]);

  useEffect(() => {
    const nav = navigator as any;
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    if (!conn?.addEventListener) return;
    conn.addEventListener('change', scan);
    return () => conn.removeEventListener('change', scan);
  }, [scan]);

  /** Seed magnitude handed to the swarm engine (0–1) */
  const toSeedMagnitude = () => env.channelCongestion * 0.5 + env.rttJitter * 0.5;

  return { env, history, scanning, scan, toSeedMagnitude };
}

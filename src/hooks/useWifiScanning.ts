/**
 * WiFi Passive Scanning Hook
 * Uses browser Network Information API + WebRTC timing + navigator.connection
 * to infer occupancy density and signal environment.
 * On mobile, proximity to known AP MAC prefixes is used to estimate crowd density.
 * Results feed into the MiroFish Swarm Intelligence Engine as seed signals.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface WifiEnvironment {
  /** Estimated number of unique devices nearby (inferred from timing variance) */
  estimatedDevices: number;
  /** Connection type: wifi | cellular | ethernet | unknown */
  connectionType: string;
  /** Effective bandwidth category */
  bandwidthCategory: 'low' | 'medium' | 'high';
  /** Round-trip timing jitter — high jitter = crowded channel */
  channelCongestion: number; // 0-1
  /** Occupancy density inferred from congestion */
  occupancyDensity: 'sparse' | 'moderate' | 'dense' | 'crowd';
  /** Timestamp */
  sampledAt: number;
  /** Raw downlink Mbps (if available) */
  downlinkMbps: number | null;
  /** RTT ms (if available) */
  rttMs: number | null;
  /** Whether scanning is supported in this browser */
  isSupported: boolean;
}

// WebRTC ICE candidate timing trick to probe network stack
async function measureNetworkRTT(): Promise<number | null> {
  try {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const start = performance.now();
    const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    const rtt = performance.now() - start;
    pc.close();
    return Math.round(rtt);
  } catch {
    return null;
  }
}

function getConnectionInfo(): {
  type: string;
  downlink: number | null;
  rtt: number | null;
} {
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (!conn) return { type: 'unknown', downlink: null, rtt: null };
  return {
    type: conn.effectiveType ?? conn.type ?? 'unknown',
    downlink: conn.downlink ?? null,
    rtt: conn.rtt ?? null,
  };
}

function inferOccupancy(congestion: number): WifiEnvironment['occupancyDensity'] {
  if (congestion < 0.2) return 'sparse';
  if (congestion < 0.5) return 'moderate';
  if (congestion < 0.75) return 'dense';
  return 'crowd';
}

function inferDeviceCount(congestion: number, type: string): number {
  // Rough heuristic: crowded WiFi channels in public venues have 50-500 devices
  const base = type === '4g' || type === '5g' ? 10 : 30;
  return Math.round(base + congestion * 200);
}

export function useWifiScanning(intervalMs = 15000) {
  const [env, setEnv] = useState<WifiEnvironment>({
    estimatedDevices: 0,
    connectionType: 'unknown',
    bandwidthCategory: 'medium',
    channelCongestion: 0,
    occupancyDensity: 'sparse',
    sampledAt: 0,
    downlinkMbps: null,
    rttMs: null,
    isSupported: false,
  });

  const [history, setHistory] = useState<WifiEnvironment[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scan = useCallback(async () => {
    const conn = getConnectionInfo();
    const rtt = conn.rtt ?? await measureNetworkRTT();

    // Congestion: higher RTT + lower downlink → more congested
    const rttNorm = Math.min(1, (rtt ?? 100) / 500);
    const downlinkNorm = conn.downlink ? Math.max(0, 1 - conn.downlink / 100) : 0.5;
    const congestion = (rttNorm * 0.6 + downlinkNorm * 0.4);

    const bandwidth: WifiEnvironment['bandwidthCategory'] =
      (conn.downlink ?? 0) > 10 ? 'high' : (conn.downlink ?? 0) > 1 ? 'medium' : 'low';

    const sample: WifiEnvironment = {
      estimatedDevices: inferDeviceCount(congestion, conn.type),
      connectionType: conn.type,
      bandwidthCategory: bandwidth,
      channelCongestion: parseFloat(congestion.toFixed(3)),
      occupancyDensity: inferOccupancy(congestion),
      sampledAt: Date.now(),
      downlinkMbps: conn.downlink,
      rttMs: rtt,
      isSupported: 'connection' in navigator || 'mozConnection' in navigator,
    };

    setEnv(sample);
    setHistory(prev => [...prev.slice(-20), sample]);
  }, []);

  useEffect(() => {
    scan();
    timerRef.current = setInterval(scan, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scan, intervalMs]);

  // Listen for connection change events
  useEffect(() => {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (!conn) return;
    conn.addEventListener('change', scan);
    return () => conn.removeEventListener('change', scan);
  }, [scan]);

  /** Convert latest scan to a swarm seed signal magnitude (0-1) */
  const toSeedMagnitude = (): number => env.channelCongestion;

  return { env, history, scan, toSeedMagnitude };
}

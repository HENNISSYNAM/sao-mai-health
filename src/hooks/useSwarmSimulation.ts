import { useState, useCallback, useRef } from 'react';
import {
  runSwarmSimulation,
  type PredictionReport,
  type SimulationTick,
  SURVEILLANCE_REGIONS,
} from '@/services/swarmIntelligenceEngine';

export type SimulationStatus = 'idle' | 'extracting' | 'simulating' | 'done' | 'error';

export function useSwarmSimulation() {
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [report, setReport] = useState<PredictionReport | null>(null);
  const [currentTick, setCurrentTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const availableRegions = Object.entries(SURVEILLANCE_REGIONS).map(([key, val]) => ({
    key,
    name: val.name,
  }));

  const run = useCallback(async (regionKeys: string[], days = 60) => {
    setStatus('extracting');
    setError(null);
    setCurrentTick(0);
    try {
      setStatus('simulating');
      const result = await runSwarmSimulation(regionKeys, days);
      setReport(result);
      setStatus('done');

      // Animate tick playback
      let tick = 0;
      const animate = () => {
        if (tick <= result.ticks.length - 1) {
          setCurrentTick(tick++);
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };
      animate();
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setStatus('idle');
    setReport(null);
    setCurrentTick(0);
    setError(null);
  }, []);

  const currentTickData: SimulationTick | null = report?.ticks[currentTick] ?? null;

  return {
    status,
    report,
    currentTick,
    currentTickData,
    error,
    availableRegions,
    run,
    reset,
  };
}

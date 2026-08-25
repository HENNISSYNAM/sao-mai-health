import { useEffect, useState } from 'react';
import { agentNetwork, type NetworkSnapshot } from '@/services/surveillanceAgents';

const EMPTY: NetworkSnapshot = {
  agents: [],
  detections: [],
  totalRegions: 0,
  totalDetections: 0,
  isRunning: false,
};

/**
 * Subscribe to the autonomous agent network.
 * Pass `autoStart: false` to observe without starting the sweep loop.
 */
export function useSurveillanceAgents(autoStart = true) {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(EMPTY);

  useEffect(() => {
    const unsubscribe = agentNetwork.subscribe(setSnapshot);
    if (autoStart) agentNetwork.start();
    return unsubscribe;
  }, [autoStart]);

  return {
    ...snapshot,
    start: () => agentNetwork.start(),
    stop: () => agentNetwork.stop(),
  };
}

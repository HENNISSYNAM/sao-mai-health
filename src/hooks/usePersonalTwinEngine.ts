import { useState, useEffect, useCallback, useRef } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserHealthProfile } from '@/types/health';

// ============= TYPES =============
interface TwinInput {
  type: 'manual' | 'sensor' | 'gps' | 'qr' | 'environment';
  timestamp: string;
  data: Record<string, any>;
  source?: string;
}

interface HealthSystem {
  id: string;
  name: string;
  status: 'optimal' | 'good' | 'caution' | 'warning' | 'critical';
  score: number;
  factors: string[];
  recommendations: string[];
}

interface TwinAlert {
  id: string;
  type: 'health' | 'environment' | 'behavior' | 'emergency';
  severity: 'info' | 'warning' | 'danger' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  createdAt: string;
}

interface TwinPrediction {
  timeframe: string;
  type: string;
  probability: number;
  description: string;
  preventiveActions: string[];
}

interface TwinContext {
  location?: { lat: number; lng: number; address?: string };
  environment?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    aqi?: number;
  };
}

interface TwinState {
  id: string;
  lastUpdated: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  systems: HealthSystem[];
  activeAlerts: TwinAlert[];
  predictions: TwinPrediction[];
  context: TwinContext;
}

interface SyncPayload {
  broadcast: Record<string, any>;
  userView: Record<string, any>;
  alertFeed: TwinAlert[];
  overview: Record<string, any>;
}

// ============= INPUT COLLECTORS =============
const collectGPSInput = async (): Promise<TwinInput | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          type: 'gps',
          timestamp: new Date().toISOString(),
          data: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          },
          source: 'browser_geolocation'
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
};

const collectEnvironmentInput = async (location?: { lat: number; lng: number }): Promise<TwinInput | null> => {
  // Simulate environmental data (in production, fetch from weather API)
  if (!location) return null;

  // Mock data based on location
  const isHCMC = location.lat > 10.5 && location.lat < 11.2 && location.lng > 106.4 && location.lng < 107.0;
  
  return {
    type: 'environment',
    timestamp: new Date().toISOString(),
    data: {
      temperature: isHCMC ? 32 + Math.random() * 4 : 28 + Math.random() * 5,
      humidity: isHCMC ? 75 + Math.random() * 15 : 60 + Math.random() * 20,
      pressure: 1010 + Math.random() * 10,
      aqi: isHCMC ? 80 + Math.random() * 60 : 40 + Math.random() * 40
    },
    source: 'environment_api'
  };
};


// ============= MAIN HOOK =============
export const usePersonalTwinEngine = (profile: UserHealthProfile | null) => {
  const [twinState, setTwinState] = useState<TwinState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncPayload | null>(null);
  const [inputQueue, setInputQueue] = useState<TwinInput[]>([]);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const processingInterval = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase.channel(`twin-engine:${profile.id}`)
      .on('broadcast', { event: 'twin_update' }, (payload) => {
        console.log('[TWIN-ENGINE] Received broadcast:', payload);
        // Handle remote updates
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [profile?.id]);

  // Process input queue periodically
  useEffect(() => {
    if (!profile?.id) return;

    processingInterval.current = setInterval(() => {
      if (inputQueue.length > 0) {
        processInputs();
      }
    }, 5000); // Process every 5 seconds

    return () => {
      if (processingInterval.current) {
        clearInterval(processingInterval.current);
      }
    };
  }, [profile?.id, inputQueue]);

  // Add input to queue
  const addInput = useCallback((input: TwinInput) => {
    setInputQueue(prev => [...prev, input]);
    console.log('[TWIN-ENGINE] Input added:', input.type);
  }, []);

  // Add manual input (profile, symptoms)
  const addManualInput = useCallback((data: Record<string, any>) => {
    addInput({
      type: 'manual',
      timestamp: new Date().toISOString(),
      data,
      source: 'user_input'
    });
  }, [addInput]);

  // Add sensor input
  const addSensorInput = useCallback((data: Record<string, any>) => {
    addInput({
      type: 'sensor',
      timestamp: new Date().toISOString(),
      data,
      source: 'device_sensor'
    });
  }, [addInput]);

  // Inject full DeviceSensorsState - only on significant changes
  const lastSensorInjectRef = useRef<number>(0);
  const injectSensorData = useCallback((sensorState: {
    health: {
      steps: number;
      activityLevel: string;
      tremorDetected: boolean;
      tremorIntensity: number;
      balanceScore: number;
      balanceIssue: boolean;
      fallDetected: boolean;
    };
    isAnyActive: boolean;
  }) => {
    if (!sensorState.isAnyActive) return;
    const now = Date.now();
    const { health } = sensorState;

    // Only inject on significant change or every 60s
    const isSignificant = health.tremorDetected || health.fallDetected || health.balanceScore < 50;
    if (!isSignificant && now - lastSensorInjectRef.current < 60_000) return;

    lastSensorInjectRef.current = now;
    addSensorInput({
      steps: health.steps,
      activityLevel: health.activityLevel,
      tremorDetected: health.tremorDetected,
      tremorIntensity: health.tremorIntensity,
      balanceScore: health.balanceScore,
      balanceIssue: health.balanceIssue,
      fallDetected: health.fallDetected,
    });
  }, [addSensorInput]);

  // Collect all automatic inputs
  const collectAllInputs = useCallback(async (): Promise<TwinInput[]> => {
    const inputs: TwinInput[] = [];

    // GPS
    const gpsInput = await collectGPSInput();
    if (gpsInput) inputs.push(gpsInput);

    // Environment (depends on GPS)
    if (gpsInput) {
      const envInput = await collectEnvironmentInput(gpsInput.data as { lat: number; lng: number });
      if (envInput) inputs.push(envInput);
    }

    return inputs;
  }, []);

  // Process all inputs through the agent
  const processInputs = useCallback(async () => {
    if (!profile?.id || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Collect automatic inputs
      const autoInputs = await collectAllInputs();
      
      // Combine with queued inputs
      const allInputs = [...inputQueue, ...autoInputs];
      
      if (allInputs.length === 0) {
        setIsProcessing(false);
        return;
      }

      console.log(`[TWIN-ENGINE] Processing ${allInputs.length} inputs`);

      // Call the Personal Twin Agent
      const { data, error } = await supabase.functions.invoke('personal-twin-agent', {
        body: {
          action: 'process_input',
          twinId: profile.id,
          sessionId: profile.id, // Use profile ID as session for now
          inputs: allInputs,
          profile: {
            bloodType: profile.bloodType,
            chronicConditions: profile.chronicConditions,
            allergies: profile.allergies,
            bioShieldScore: profile.bioShieldScore
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setTwinState(data.state);
        setLastSync(data.sync);
        setInputQueue([]); // Clear processed inputs

        // Show alerts
        if (data.state.activeAlerts?.length > 0) {
          data.state.activeAlerts.forEach((alert: TwinAlert) => {
            if (alert.severity === 'danger' || alert.severity === 'critical') {
              toast.error(alert.title, { description: alert.message });
            } else if (alert.severity === 'warning') {
              toast.warning(alert.title, { description: alert.message });
            }
          });
        }

        // Broadcast update
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'twin_update',
            payload: data.sync.broadcast
          });
        }

        console.log('[TWIN-ENGINE] State updated, score:', data.state.overallScore);
      }
    } catch (error) {
      console.error('[TWIN-ENGINE] Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [profile, inputQueue, isProcessing, collectAllInputs]);

  // Get current state without new inputs
  const refreshState = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('personal-twin-agent', {
        body: {
          action: 'get_state',
          twinId: profile.id,
          profile: {
            bloodType: profile.bloodType,
            chronicConditions: profile.chronicConditions,
            allergies: profile.allergies,
            bioShieldScore: profile.bioShieldScore
          }
        }
      });

      if (error) throw new Error(error.message);
      if (data.success) {
        setTwinState(data.state);
      }
    } catch (error) {
      console.error('[TWIN-ENGINE] Refresh error:', error);
    }
  }, [profile]);

  // Generate AI insights
  const generateInsights = useCallback(async () => {
    if (!profile?.id) return null;

    try {
      const { data, error } = await supabase.functions.invoke('personal-twin-agent', {
        body: {
          action: 'generate_insights',
          twinId: profile.id
        }
      });

      if (error) throw new Error(error.message);
      return data.success ? data.insights : null;
    } catch (error) {
      console.error('[TWIN-ENGINE] Insights error:', error);
      return null;
    }
  }, [profile]);

  // Initial load
  useEffect(() => {
    if (profile?.id && !twinState) {
      processInputs();
    }
  }, [profile?.id]);

  return {
    twinState,
    isProcessing,
    lastSync,
    inputQueue,
    addManualInput,
    addSensorInput,
    injectSensorData,
    addInput,
    processInputs,
    refreshState,
    generateInsights
  };
};

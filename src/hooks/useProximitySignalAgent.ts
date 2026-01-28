import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProximityEvent {
  deviceId: string;
  rssi: number;
  txPower?: number;
  timestamp: string;
  duration: number;
}

interface RiskZone {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'crowd' | 'outdoor' | 'transport' | 'unknown';
  riskLevel: number;
  factors: string[];
}

interface ProximityContext {
  nearbyDevices: number;
  averageRssi: number;
  estimatedDistance: number;
  crowdDensity: 'low' | 'medium' | 'high' | 'very_high';
  riskZone: RiskZone | null;
  exposureDuration: number;
  shouldTriggerReeval: boolean;
}

interface ExposureResult {
  exposureScore: number;
  riskFactors: string[];
  recommendations: string[];
  alertLevel: 'none' | 'info' | 'warning' | 'danger';
}

interface ProximityState {
  isScanning: boolean;
  isSupported: boolean;
  signals: ProximityEvent[];
  context: ProximityContext | null;
  exposure: ExposureResult | null;
  lastUpdate: string | null;
  error: string | null;
}

export function useProximitySignalAgent(twinId: string) {
  const [state, setState] = useState<ProximityState>({
    isScanning: false,
    isSupported: false,
    signals: [],
    context: null,
    exposure: null,
    lastUpdate: null,
    error: null
  });

  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceTrackerRef = useRef<Map<string, { firstSeen: number; rssiHistory: number[] }>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bluetoothDeviceRef = useRef<any>(null);

  // Check BLE support
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check for Web Bluetooth API support
        const nav = navigator as any;
        const isSupported = 'bluetooth' in nav;
        setState(prev => ({ ...prev, isSupported }));
      } catch {
        setState(prev => ({ ...prev, isSupported: false }));
      }
    };
    checkSupport();
  }, []);

  // Generate anonymized device ID (privacy-preserving)
  const anonymizeDeviceId = useCallback((deviceId: string): string => {
    // Create a hash-like anonymized ID
    let hash = 0;
    for (let i = 0; i < deviceId.length; i++) {
      const char = deviceId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `ANON_${Math.abs(hash).toString(16).slice(0, 8)}`;
  }, []);

  // Calculate distance from RSSI
  const calculateDistance = useCallback((rssi: number, txPower: number = -59): number => {
    const n = 2.5;
    return Math.pow(10, (txPower - rssi) / (10 * n));
  }, []);

  // Process signals through the agent
  const processSignals = useCallback(async (signals: ProximityEvent[]) => {
    try {
      // Get current location for context
      let location: { lat: number; lng: number } | undefined;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 60000
          });
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch {
        // Location not available, continue without it
      }

      const { data, error } = await supabase.functions.invoke('proximity-signal-agent', {
        body: {
          action: 'process_signals',
          twinId,
          signals,
          location
        }
      });

      if (error) throw error;

      if (data.success) {
        setState(prev => ({
          ...prev,
          context: data.context,
          exposure: data.exposure,
          lastUpdate: data.timestamp,
          error: null
        }));

        // Return context for twin engine integration
        return {
          context: data.context,
          exposure: data.exposure,
          shouldTriggerReeval: data.context?.shouldTriggerReeval || false
        };
      }
    } catch (error) {
      console.error('[PROXIMITY-AGENT] Processing error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Processing failed' 
      }));
    }
    return null;
  }, [twinId]);

  // Start BLE scanning
  const startScanning = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Bluetooth not supported' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isScanning: true, error: null }));

      // Request Bluetooth device (triggers browser permission)
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information']
      });

      bluetoothDeviceRef.current = device;

      // Track this device
      const deviceId = anonymizeDeviceId(device.id || device.name || 'unknown');
      deviceTrackerRef.current.set(deviceId, {
        firstSeen: Date.now(),
        rssiHistory: []
      });

      // Start periodic signal simulation (real RSSI requires GATT connection)
      // In production, this would use actual RSSI from connected devices
      scanIntervalRef.current = setInterval(async () => {
        const now = Date.now();
        const signals: ProximityEvent[] = [];

        // Process tracked devices
        deviceTrackerRef.current.forEach((tracker, devId) => {
          const duration = Math.floor((now - tracker.firstSeen) / 1000);
          
          // Simulate RSSI (in production, get from actual BLE connection)
          const simulatedRssi = -50 - Math.random() * 40; // -50 to -90 dBm
          tracker.rssiHistory.push(simulatedRssi);
          
          // Keep last 10 readings
          if (tracker.rssiHistory.length > 10) {
            tracker.rssiHistory.shift();
          }

          // Calculate average RSSI
          const avgRssi = tracker.rssiHistory.reduce((a, b) => a + b, 0) / tracker.rssiHistory.length;

          signals.push({
            deviceId: devId,
            rssi: Math.round(avgRssi),
            txPower: -59,
            timestamp: new Date().toISOString(),
            duration
          });
        });

        // Add simulated nearby devices for testing
        const nearbyCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < nearbyCount; i++) {
          signals.push({
            deviceId: `ANON_SIM_${i}`,
            rssi: -60 - Math.random() * 30,
            txPower: -59,
            timestamp: new Date().toISOString(),
            duration: Math.floor(Math.random() * 300)
          });
        }

        setState(prev => ({ ...prev, signals }));
        
        // Process through agent
        await processSignals(signals);
      }, 5000); // Every 5 seconds

      console.log('[PROXIMITY-AGENT] Scanning started');
    } catch (error) {
      console.error('[PROXIMITY-AGENT] Scan start error:', error);
      setState(prev => ({ 
        ...prev, 
        isScanning: false,
        error: error instanceof Error ? error.message : 'Failed to start scanning' 
      }));
    }
  }, [state.isSupported, anonymizeDeviceId, processSignals]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (bluetoothDeviceRef.current?.gatt?.connected) {
      bluetoothDeviceRef.current.gatt.disconnect();
    }

    deviceTrackerRef.current.clear();

    setState(prev => ({
      ...prev,
      isScanning: false,
      signals: [],
      context: null,
      exposure: null
    }));

    console.log('[PROXIMITY-AGENT] Scanning stopped');
  }, []);

  // Get known risk zones
  const getRiskZones = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('proximity-signal-agent', {
        body: {
          action: 'get_risk_zones',
          twinId
        }
      });

      if (error) throw error;
      return data.zones as RiskZone[];
    } catch (error) {
      console.error('[PROXIMITY-AGENT] Failed to get risk zones:', error);
      return [];
    }
  }, [twinId]);

  // Manual signal injection (for testing or external sources)
  const injectSignals = useCallback(async (signals: ProximityEvent[]) => {
    setState(prev => ({ ...prev, signals }));
    return processSignals(signals);
  }, [processSignals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (bluetoothDeviceRef.current?.gatt?.connected) {
        bluetoothDeviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  // Get crowd density label
  const getCrowdDensityLabel = useCallback((density: string) => {
    const labels: Record<string, string> = {
      'low': 'Thấp',
      'medium': 'Trung bình',
      'high': 'Cao',
      'very_high': 'Rất cao'
    };
    return labels[density] || density;
  }, []);

  // Get alert level color
  const getAlertColor = useCallback((level: string) => {
    const colors: Record<string, string> = {
      'none': 'text-muted-foreground',
      'info': 'text-blue-500',
      'warning': 'text-yellow-500',
      'danger': 'text-red-500'
    };
    return colors[level] || colors.none;
  }, []);

  return {
    ...state,
    startScanning,
    stopScanning,
    getRiskZones,
    injectSignals,
    getCrowdDensityLabel,
    getAlertColor,
    calculateDistance
  };
}

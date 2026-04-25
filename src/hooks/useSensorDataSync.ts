import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { DeviceSensorsState } from './useDeviceSensors';
import type { EnvironmentData } from './useStrokeRiskEngine';

interface SyncStatus {
  lastSyncAt: string | null;
  totalRecords: number;
  isSyncing: boolean;
}

interface UseSensorDataSyncOptions {
  sensorState: DeviceSensorsState;
  environment?: EnvironmentData | null;
  enabled?: boolean;
  onSynced?: () => void;
}

const DETAIL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SUMMARY_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useSensorDataSync({ sensorState, environment, enabled = true, onSynced }: UseSensorDataSyncOptions) {
  const { user } = useAuth();
  const lastDetailSyncRef = useRef<number>(0);
  const lastSummarySyncRef = useRef<number>(0);
  const syncStatusRef = useRef<SyncStatus>({ lastSyncAt: null, totalRecords: 0, isSyncing: false });
  const tremorEventsAccRef = useRef(0);
  const balanceIssueAccRef = useRef(0);
  const fallEventsAccRef = useRef(0);
  const balanceScoresRef = useRef<number[]>([]);
  const tremorIntensitiesRef = useRef<number[]>([]);

  // Accumulate events between syncs
  useEffect(() => {
    if (!sensorState.isAnyActive) return;
    const { health } = sensorState;
    if (health.tremorDetected) tremorEventsAccRef.current++;
    if (health.balanceIssue) balanceIssueAccRef.current++;
    if (health.fallDetected) fallEventsAccRef.current++;
    balanceScoresRef.current.push(health.balanceScore);
    if (health.tremorIntensity > 0) tremorIntensitiesRef.current.push(health.tremorIntensity);
  }, [sensorState.health.tremorDetected, sensorState.health.balanceIssue, sensorState.health.fallDetected, sensorState.isAnyActive]);

  const syncDetailData = useCallback(async () => {
    if (!user?.id || !sensorState.isAnyActive || syncStatusRef.current.isSyncing) return;
    
    const now = Date.now();
    if (now - lastDetailSyncRef.current < DETAIL_INTERVAL) return;

    syncStatusRef.current.isSyncing = true;
    try {
      const { health, data } = sensorState;
      const value: Record<string, any> = {
        steps: health.steps,
        activityLevel: health.activityLevel,
        tremorDetected: health.tremorDetected,
        tremorIntensity: health.tremorIntensity,
        balanceScore: health.balanceScore,
        balanceIssue: health.balanceIssue,
        fallDetected: health.fallDetected,
        accelerometer: data.accelerometer ? { x: data.accelerometer.x, y: data.accelerometer.y, z: data.accelerometer.z, magnitude: data.accelerometer.magnitude } : null,
        gyroscope: data.gyroscope ? { magnitude: data.gyroscope.magnitude } : null,
        magnetometer: data.magnetometer ? { magnitude: data.magnetometer.magnitude } : null,
        ambientLight: data.ambientLight?.lux ?? null,
      };

      if (environment) {
        value.environment = {
          aqi: environment.aqi,
          temperature: environment.temperature,
          humidity: environment.humidity,
          pressure: environment.pressure,
          pm25: environment.pm25,
        };
      }

      await supabase.from('user_health_data').insert({
        user_id: user.id,
        data_type: 'sensor_reading',
        value,
        source: 'device_sensors',
        recorded_at: new Date().toISOString(),
      } as any);

      lastDetailSyncRef.current = now;
      syncStatusRef.current.totalRecords++;
      syncStatusRef.current.lastSyncAt = new Date().toISOString();
      onSynced?.();
      console.log('[SensorSync] Detail data saved');
    } catch (err) {
      console.error('[SensorSync] Detail sync error:', err);
    } finally {
      syncStatusRef.current.isSyncing = false;
    }
  }, [user?.id, sensorState, environment, onSynced]);

  const syncSummaryData = useCallback(async () => {
    if (!user?.id || !sensorState.isAnyActive) return;
    
    const now = Date.now();
    if (now - lastSummarySyncRef.current < SUMMARY_INTERVAL) return;

    try {
      const { health, data } = sensorState;
      const today = new Date().toISOString().split('T')[0];
      const avgBalance = balanceScoresRef.current.length > 0
        ? balanceScoresRef.current.reduce((a, b) => a + b, 0) / balanceScoresRef.current.length
        : health.balanceScore;
      const avgTremor = tremorIntensitiesRef.current.length > 0
        ? tremorIntensitiesRef.current.reduce((a, b) => a + b, 0) / tremorIntensitiesRef.current.length
        : 0;

      const envSnapshot = environment ? {
        aqi: environment.aqi,
        temperature: environment.temperature,
        humidity: environment.humidity,
        pressure: environment.pressure,
        pm25: environment.pm25,
        pm10: environment.pm10,
      } : null;

      // UPSERT via raw query workaround - delete then insert
      const { data: existing } = await supabase
        .from('sensor_daily_summary' as any)
        .select('id, total_steps, tremor_events, fall_events, accelerometer_samples, gyroscope_samples')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      const record: any = {
        user_id: user.id,
        date: today,
        total_steps: health.steps,
        avg_activity_level: health.activityLevel,
        tremor_events: (existing as any)?.tremor_events 
          ? (existing as any).tremor_events + tremorEventsAccRef.current 
          : tremorEventsAccRef.current,
        avg_tremor_intensity: avgTremor,
        balance_avg_score: Math.round(avgBalance),
        balance_issue_count: balanceIssueAccRef.current,
        fall_events: (existing as any)?.fall_events
          ? (existing as any).fall_events + fallEventsAccRef.current
          : fallEventsAccRef.current,
        ambient_light_avg_lux: data.ambientLight?.lux ?? null,
        magnetic_field_avg: data.magnetometer?.magnitude ?? null,
        accelerometer_samples: ((existing as any)?.accelerometer_samples || 0) + 1,
        gyroscope_samples: ((existing as any)?.gyroscope_samples || 0) + 1,
        environment_snapshot: envSnapshot,
      };

      if (existing) {
        await supabase
          .from('sensor_daily_summary' as any)
          .update(record)
          .eq('id', (existing as any).id);
      } else {
        await supabase
          .from('sensor_daily_summary' as any)
          .insert(record);
      }

      lastSummarySyncRef.current = now;
      // Reset accumulators
      tremorEventsAccRef.current = 0;
      balanceIssueAccRef.current = 0;
      fallEventsAccRef.current = 0;
      balanceScoresRef.current = [];
      tremorIntensitiesRef.current = [];
      console.log('[SensorSync] Daily summary updated');
    } catch (err) {
      console.error('[SensorSync] Summary sync error:', err);
    }
  }, [user?.id, sensorState, environment]);

  // Periodic sync
  useEffect(() => {
    if (!enabled || !user?.id || !sensorState.isAnyActive) return;

    const interval = setInterval(() => {
      syncDetailData();
      syncSummaryData();
    }, 60_000); // Check every minute

    // Initial sync after 30 seconds
    const initialTimeout = setTimeout(() => {
      syncDetailData();
    }, 30_000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [enabled, user?.id, sensorState.isAnyActive, syncDetailData, syncSummaryData]);

  return {
    syncStatus: syncStatusRef.current,
    forceSyncNow: async () => {
      lastDetailSyncRef.current = 0;
      lastSummarySyncRef.current = 0;
      await syncDetailData();
      await syncSummaryData();
    },
  };
}

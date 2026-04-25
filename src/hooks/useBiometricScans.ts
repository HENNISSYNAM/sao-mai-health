import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface BiometricScanData {
  irisPattern: string;
  confidence: number;
  healthIndicators: {
    eyeHealth: number;
    bloodVesselClarity: number;
    pupilReactivity: number;
    scleraCondition: number;
  };
  facialHealth: {
    estimatedHeartRate: number;
    estimatedOxygenLevel: number;
    stressIndicators: number;
    skinHealth: number;
    hydrationLevel: number;
  };
  timestamp: string;
}

export interface StoredBiometricScan {
  id: string;
  user_id: string;
  iris_pattern: string;
  confidence: number;
  eye_health: number | null;
  blood_vessel_clarity: number | null;
  pupil_reactivity: number | null;
  sclera_condition: number | null;
  estimated_heart_rate: number | null;
  estimated_oxygen_level: number | null;
  stress_indicators: number | null;
  skin_health: number | null;
  hydration_level: number | null;
  scan_timestamp: string;
  created_at: string;
}

export function useBiometricScans() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [latestScan, setLatestScan] = useState<StoredBiometricScan | null>(null);

  // Save biometric scan to database
  const saveBiometricScan = useCallback(async (scanData: BiometricScanData) => {
    if (!user?.id) {
      toast.error('Cần đăng nhập để lưu dữ liệu sinh trắc');
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_biometric_scans')
        .upsert({
          user_id: user.id,
          iris_pattern: scanData.irisPattern,
          confidence: scanData.confidence,
          eye_health: scanData.healthIndicators.eyeHealth,
          blood_vessel_clarity: scanData.healthIndicators.bloodVesselClarity,
          pupil_reactivity: scanData.healthIndicators.pupilReactivity,
          sclera_condition: scanData.healthIndicators.scleraCondition,
          estimated_heart_rate: scanData.facialHealth.estimatedHeartRate,
          estimated_oxygen_level: scanData.facialHealth.estimatedOxygenLevel,
          stress_indicators: scanData.facialHealth.stressIndicators,
          skin_health: scanData.facialHealth.skinHealth,
          hydration_level: scanData.facialHealth.hydrationLevel,
          scan_timestamp: scanData.timestamp,
        }, {
          onConflict: 'user_id,iris_pattern'
        })
        .select()
        .single();

      if (error) throw error;

      // Also update user_profiles with last biometric scan timestamp
      await supabase
        .from('user_profiles')
        .update({
          last_biometric_scan: scanData.timestamp,
          biometric_verified: true,
        })
        .eq('user_id', user.id);

      setLatestScan(data as StoredBiometricScan);
      return { success: true, data };
    } catch (err: any) {
      console.error('Error saving biometric scan:', err);
      toast.error('Không thể lưu dữ liệu sinh trắc');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Get all biometric scans for the user
  const getBiometricScans = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('user_biometric_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('scan_timestamp', { ascending: false });

      if (error) throw error;
      return data as StoredBiometricScan[];
    } catch (err) {
      console.error('Error fetching biometric scans:', err);
      return [];
    }
  }, [user?.id]);

  // Get the latest biometric scan
  const getLatestScan = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('user_biometric_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('scan_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLatestScan(data as StoredBiometricScan);
      return data as StoredBiometricScan;
    } catch (err) {
      console.error('Error fetching latest scan:', err);
      return null;
    }
  }, [user?.id]);

  return {
    loading,
    latestScan,
    saveBiometricScan,
    getBiometricScans,
    getLatestScan,
  };
}

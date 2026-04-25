import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BodyScanSession {
  id: string;
  session_code: string;
  scan_mode: string;
  overall_confidence: number | null;
  overall_health_score: number | null;
  status: string;
  image_count: number;
  duration_seconds: number | null;
  clinician_notes: string | null;
  created_at: string;
}

export interface ScanVitalSigns {
  id: string;
  heart_rate: number | null;
  heart_rate_variability: number | null;
  spo2: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  respiratory_rate: number | null;
  body_temperature: number | null;
  stress_index: number | null;
  fatigue_index: number | null;
  hydration_level: number | null;
  biological_age_estimate: number | null;
  measured_at: string;
}

export interface ScanFacialLandmarks {
  id: string;
  facial_symmetry_score: number | null;
  left_right_deviation: number | null;
  drooping_indicators: Record<string, any>;
  stroke_risk_indicators: Record<string, any>;
  bells_palsy_score: number | null;
}

export interface FullScanRecord {
  session: BodyScanSession;
  vitals: ScanVitalSigns | null;
  landmarks: ScanFacialLandmarks | null;
  regions: any[];
  dermatology: any[];
  measurements: any[];
}

export function useBodyScanStorage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getScanSessions = useCallback(async (limit = 50): Promise<BodyScanSession[]> => {
    if (!user?.id) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('body_scan_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as BodyScanSession[];
    } finally { setLoading(false); }
  }, [user?.id]);

  const getFullScanRecord = useCallback(async (sessionId: string): Promise<FullScanRecord | null> => {
    if (!user?.id) return null;
    setLoading(true);
    try {
      const [sessionRes, vitalsRes, landmarksRes, regionsRes, dermRes, measRes] = await Promise.all([
        supabase.from('body_scan_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('scan_vital_signs').select('*').eq('session_id', sessionId).maybeSingle(),
        supabase.from('scan_facial_landmarks').select('*').eq('session_id', sessionId).maybeSingle(),
        supabase.from('body_region_scans').select('*').eq('session_id', sessionId),
        supabase.from('scan_dermatology').select('*').eq('session_id', sessionId),
        supabase.from('scan_clinical_measurements').select('*').eq('session_id', sessionId),
      ]);

      if (sessionRes.error) throw sessionRes.error;

      return {
        session: sessionRes.data as unknown as BodyScanSession,
        vitals: (vitalsRes.data as unknown as ScanVitalSigns) || null,
        landmarks: (landmarksRes.data as unknown as ScanFacialLandmarks) || null,
        regions: (regionsRes.data || []) as any[],
        dermatology: (dermRes.data || []) as any[],
        measurements: (measRes.data || []) as any[],
      };
    } finally { setLoading(false); }
  }, [user?.id]);

  const getLatestVitals = useCallback(async (): Promise<ScanVitalSigns | null> => {
    if (!user?.id) return null;
    const { data } = await supabase
      .from('scan_vital_signs')
      .select('*')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as unknown as ScanVitalSigns) || null;
  }, [user?.id]);

  const getVitalsHistory = useCallback(async (limit = 30): Promise<ScanVitalSigns[]> => {
    if (!user?.id) return [];
    const { data } = await supabase
      .from('scan_vital_signs')
      .select('*')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(limit);
    return (data || []) as unknown as ScanVitalSigns[];
  }, [user?.id]);

  const getDermatologyFindings = useCallback(async (): Promise<any[]> => {
    if (!user?.id) return [];
    const { data } = await supabase
      .from('scan_dermatology')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return (data || []) as any[];
  }, [user?.id]);

  return {
    loading,
    getScanSessions,
    getFullScanRecord,
    getLatestVitals,
    getVitalsHistory,
    getDermatologyFindings,
  };
}

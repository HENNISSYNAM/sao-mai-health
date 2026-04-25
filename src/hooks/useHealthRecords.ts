import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface HealthRecord {
  id: string;
  user_id: string;
  patient_code: string;
  created_at: string;
  updated_at: string;
}

export interface HealthEncounter {
  id: string;
  record_id: string;
  encounter_code: string;
  scan_type: string;
  status: string;
  vital_signs: Record<string, any>;
  facial_metrics: Record<string, any>;
  inferred_health: Record<string, any>;
  recommendations: string[];
  confidence: number | null;
  notes: string | null;
  created_at: string;
}

export function useHealthRecords() {
  const { user } = useAuth();
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [encounters, setEncounters] = useState<HealthEncounter[]>([]);
  const [loading, setLoading] = useState(true);

  // Load or create health record for current user
  const ensureRecord = useCallback(async (): Promise<HealthRecord | null> => {
    if (!user?.id) return null;

    try {
      // Check existing
      const { data: existing } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setRecord(existing as any);
        return existing as any;
      }

      // Generate patient code
      const { data: codeData } = await supabase.rpc('generate_patient_code');
      const patientCode = (codeData as string) || `SMH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

      // Create new record
      const { data: newRecord, error } = await supabase
        .from('health_records')
        .insert({ user_id: user.id, patient_code: patientCode } as any)
        .select()
        .single();

      if (error) throw error;
      setRecord(newRecord as any);
      return newRecord as any;
    } catch (err) {
      console.error('Error ensuring health record:', err);
      return null;
    }
  }, [user?.id]);

  // Load encounters
  const loadEncounters = useCallback(async (recordId: string) => {
    const { data, error } = await supabase
      .from('health_encounters')
      .select('*')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEncounters(data as any[]);
    }
  }, []);

  // Create new encounter from face scan
  const createEncounter = useCallback(async (scanData: {
    scan_type: string;
    vital_signs: Record<string, any>;
    facial_metrics: Record<string, any>;
    inferred_health: Record<string, any>;
    recommendations: string[];
    confidence: number;
    notes?: string;
  }): Promise<HealthEncounter | null> => {
    let rec = record;
    if (!rec) {
      rec = await ensureRecord();
    }
    if (!rec) {
      toast.error('Không thể tạo hồ sơ sức khỏe');
      return null;
    }

    try {
      const { data: codeData } = await supabase.rpc('generate_encounter_code');
      const encounterCode = (codeData as string) || `ENC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

      const { data: encounter, error } = await supabase
        .from('health_encounters')
        .insert({
          record_id: rec.id,
          encounter_code: encounterCode,
          ...scanData,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const enc = encounter as any as HealthEncounter;
      setEncounters(prev => [enc, ...prev]);
      return enc;
    } catch (err) {
      console.error('Error creating encounter:', err);
      toast.error('Không thể lưu phiên khám');
      return null;
    }
  }, [record, ensureRecord]);

  // Init
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    ensureRecord().then(rec => {
      if (rec) loadEncounters(rec.id);
      setLoading(false);
    });
  }, [user?.id, ensureRecord, loadEncounters]);

  return {
    record,
    encounters,
    loading,
    createEncounter,
    refreshEncounters: () => record && loadEncounters(record.id),
  };
}

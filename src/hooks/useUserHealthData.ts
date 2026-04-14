import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserHealthData {
  id: string;
  user_id: string;
  data_type: string;
  value: Record<string, any>;
  recorded_at: string;
  source: string;
  notes: string | null;
  created_at: string;
}

export function useUserHealthData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getHealthData = useCallback(async (dataType?: string, limit = 100) => {
    if (!user?.id) return { data: [], error: new Error('Not authenticated') };

    try {
      setLoading(true);
      let query = supabase
        .from('user_health_data')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (dataType) {
        query = query.eq('data_type', dataType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: (data || []) as unknown as UserHealthData[], error: null };
    } catch (err) {
      setError(err as Error);
      return { data: [], error: err as Error };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const addHealthData = useCallback(async (
    dataType: string,
    value: Record<string, any>,
    options?: { source?: string; notes?: string; recorded_at?: string }
  ) => {
    if (!user?.id) return { data: null, error: new Error('Not authenticated') };

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_health_data')
        .insert({
          user_id: user.id,
          data_type: dataType,
          value,
          source: options?.source || 'manual',
          notes: options?.notes,
          recorded_at: options?.recorded_at || new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return { data: data as unknown as UserHealthData, error: null };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err as Error };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const deleteHealthData = useCallback(async (id: string) => {
    if (!user?.id) return { error: new Error('Not authenticated') };

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_health_data')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      setError(err as Error);
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    loading,
    error,
    getHealthData,
    addHealthData,
    deleteHealthData,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthUpdate {
  disease: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  cases: number;
  date: string;
  summary: string;
  source: string;
}

interface TriggerState {
  isTriggering: boolean;
  lastTrigger: Date | null;
  updates: HealthUpdate[];
  error: string | null;
}

export function useHealthUpdateTrigger(autoTrigger: boolean = true, intervalMs: number = 300000) {
  const [state, setState] = useState<TriggerState>({
    isTriggering: false,
    lastTrigger: null,
    updates: [],
    error: null
  });

  const triggerUpdate = useCallback(async () => {
    setState(prev => ({ ...prev, isTriggering: true, error: null }));

    try {
      console.log('🔄 Health update trigger activated...');
      
      const { data, error } = await supabase.functions.invoke('fetch-disease-news');

      if (error) throw error;

      if (data?.success) {
        const updates: HealthUpdate[] = (data.articles || []).map((article: any) => ({
          disease: article.disease || 'unknown',
          location: article.location || 'Vietnam',
          severity: article.severity || 'low',
          cases: article.cases || 0,
          date: article.date || new Date().toISOString(),
          summary: article.summary || '',
          source: 'Official Health Sources'
        }));

        setState({
          isTriggering: false,
          lastTrigger: new Date(),
          updates,
          error: null
        });

        return { success: true, updates };
      }

      return { success: false, updates: [] };
    } catch (error: any) {
      console.error('❌ Health update trigger error:', error);
      setState(prev => ({
        ...prev,
        isTriggering: false,
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // Auto-trigger on mount and at intervals
  useEffect(() => {
    if (autoTrigger) {
      // Initial trigger
      triggerUpdate();

      // Set up interval
      const interval = setInterval(triggerUpdate, intervalMs);
      return () => clearInterval(interval);
    }
  }, [autoTrigger, intervalMs, triggerUpdate]);

  return {
    ...state,
    triggerUpdate
  };
}

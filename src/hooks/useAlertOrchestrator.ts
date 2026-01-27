import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeAlerts } from './useRealtimeHealth';

export interface AlertSummary {
  total: number;
  by_level: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_disease: Record<string, number>;
  last_updated: string;
}

export interface AlertAction {
  action: 'create' | 'update' | 'close';
  alert_id?: string;
  disease: string;
  region: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export interface OrchestratorState {
  isConnected: boolean;
  isProcessing: boolean;
  summary: AlertSummary;
  recentActions: AlertAction[];
  lastUpdate: Date | null;
  error: string | null;
}

const DEFAULT_SUMMARY: AlertSummary = {
  total: 0,
  by_level: { critical: 0, high: 0, medium: 0, low: 0 },
  by_disease: {},
  last_updated: new Date().toISOString()
};

export function useAlertOrchestrator() {
  const [state, setState] = useState<OrchestratorState>({
    isConnected: false,
    isProcessing: false,
    summary: DEFAULT_SUMMARY,
    recentActions: [],
    lastUpdate: null,
    error: null
  });

  const channelRef = useRef<any>(null);
  const { isConnected: dbConnected, data: alertsData } = useRealtimeAlerts();

  // Subscribe to alert orchestration channel
  useEffect(() => {
    const channel = supabase.channel('alert-orchestration');

    channel
      .on('broadcast', { event: 'alert_update' }, (payload: any) => {
        console.log('📢 Alert orchestration update received:', payload);
        
        const data = payload.payload;
        setState(prev => ({
          ...prev,
          summary: data.summary || prev.summary,
          recentActions: [
            ...(data.actions || []).slice(0, 10),
            ...prev.recentActions
          ].slice(0, 20), // Keep last 20 actions
          lastUpdate: new Date(data.timestamp),
          isProcessing: false
        }));
      })
      .subscribe((status) => {
        console.log('Alert orchestration channel status:', status);
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED'
        }));
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Trigger orchestration manually or from external events
  const triggerOrchestration = useCallback(async (options?: {
    trigger_source?: string;
    risk_data?: any;
    delta_data?: any;
    region_filter?: string;
  }) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      console.log('🔄 Triggering alert orchestration...');
      
      const { data, error } = await supabase.functions.invoke('realtime-alert-orchestrator', {
        body: {
          trigger_source: options?.trigger_source || 'manual',
          risk_data: options?.risk_data,
          delta_data: options?.delta_data,
          region_filter: options?.region_filter
        }
      });

      if (error) throw error;

      if (data?.success) {
        setState(prev => ({
          ...prev,
          summary: data.summary,
          recentActions: [
            ...(data.actions || []),
            ...prev.recentActions
          ].slice(0, 20),
          lastUpdate: new Date(data.timestamp),
          isProcessing: false
        }));

        return { success: true, data };
      }

      return { success: false, error: 'Unknown error' };
    } catch (error: any) {
      console.error('❌ Alert orchestration error:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // Fetch current alert summary
  const refreshSummary = useCallback(async () => {
    try {
      const { data: openAlerts, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('status', 'open');

      if (error) throw error;

      const alerts = openAlerts || [];
      
      const byLevel = {
        critical: alerts.filter(a => a.rule?.includes('critical')).length,
        high: alerts.filter(a => a.rule?.includes('high') || a.cases > 50).length,
        medium: alerts.filter(a => a.rule?.includes('medium') || (a.cases > 20 && a.cases <= 50)).length,
        low: alerts.filter(a => !a.rule?.includes('critical') && !a.rule?.includes('high') && !a.rule?.includes('medium') && a.cases <= 20).length
      };

      const byDisease: Record<string, number> = {};
      alerts.forEach(a => {
        const disease = a.disease_code || 'unknown';
        byDisease[disease] = (byDisease[disease] || 0) + 1;
      });

      setState(prev => ({
        ...prev,
        summary: {
          total: alerts.length,
          by_level: byLevel,
          by_disease: byDisease,
          last_updated: new Date().toISOString()
        },
        lastUpdate: new Date()
      }));
    } catch (error: any) {
      console.error('Error refreshing alert summary:', error);
    }
  }, []);

  // Initial summary fetch
  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  // Refresh when alerts data changes from realtime
  useEffect(() => {
    if (alertsData.length > 0) {
      refreshSummary();
    }
  }, [alertsData, refreshSummary]);

  // Auto-trigger orchestration every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      triggerOrchestration({ trigger_source: 'auto_interval' });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [triggerOrchestration]);

  return {
    ...state,
    triggerOrchestration,
    refreshSummary,
    dbConnected
  };
}

// Helper hook for alert count badges
export function useAlertCounts() {
  const { summary, isConnected, lastUpdate } = useAlertOrchestrator();
  
  return {
    total: summary.total,
    critical: summary.by_level.critical,
    high: summary.by_level.high,
    medium: summary.by_level.medium,
    low: summary.by_level.low,
    byDisease: summary.by_disease,
    isConnected,
    lastUpdate
  };
}

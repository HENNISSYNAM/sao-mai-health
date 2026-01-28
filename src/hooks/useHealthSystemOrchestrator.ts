import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepResult {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  data?: any;
  error?: string;
}

interface PipelineState {
  pipelineId: string;
  startedAt: string;
  completedAt?: string;
  stoppedAt?: string;
  stopReason?: string;
  currentStep: number;
  totalSteps: number;
  steps: StepResult[];
  status: 'idle' | 'running' | 'completed' | 'stopped' | 'failed';
  dataStats: {
    articlesFound: number;
    articlesNew: number;
    dataPointsExtracted: number;
    predictionsGenerated: number;
    alertsTriggered: number;
  };
}

interface DashboardData {
  kpis: {
    newCases: number;
    activeAlerts: number;
    regionsMonitored: number;
    predictionsGenerated: number;
  };
  chartData: {
    observed: any[];
    predicted: any[];
    scenarios: {
      bestCase: any[];
      mostLikely: any[];
      worstCase: any[];
    };
  };
  alerts: any[];
  newsFeed: any[];
  regionalRisks: any[];
  personalInsights: any[];
  dataQuality: {
    observedCount: number;
    predictedCount: number;
    lastUpdated: string;
  };
}

interface OrchestratorState {
  pipeline: PipelineState | null;
  dashboard: DashboardData | null;
  isLoading: boolean;
  isConnected: boolean;
  lastUpdated: Date | null;
  error: string | null;
  cycleCount: number;
}

const STEP_NAMES = [
  'Scheduler Trigger',
  'Web Search (New Data Only)',
  'Data Extraction',
  'Disease Diversity Control',
  'AI Summary (UI Layer)',
  'Predictive & Generative Data',
  'GPS-Based Regional Risk',
  'Personal Twin Personalization',
  'Realtime Alert Orchestration',
  'Push to Dashboard'
];

export function useHealthSystemOrchestrator(
  scheduleType: '5min' | '15min' | '30min' = '5min',
  autoStart: boolean = true
) {
  const [state, setState] = useState<OrchestratorState>({
    pipeline: null,
    dashboard: null,
    isLoading: false,
    isConnected: false,
    lastUpdated: null,
    error: null,
    cycleCount: 0
  });

  const [userGPS, setUserGPS] = useState<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get user GPS
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserGPS({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('GPS not available:', error.message);
          // Default to HCMC
          setUserGPS({ lat: 10.8231, lng: 106.6297 });
        }
      );
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    // Dashboard updates channel
    const dashboardChannel = supabase.channel('health-dashboard-updates');
    
    dashboardChannel
      .on('broadcast', { event: 'pipeline-update' }, (payload) => {
        console.log('📥 Dashboard update received:', payload);
        
        const data = payload.payload?.data;
        if (data) {
          setState(prev => ({
            ...prev,
            dashboard: data,
            lastUpdated: new Date(payload.payload.timestamp),
            isLoading: false
          }));

          toast.success('Dashboard updated', {
            description: `${data.kpis?.newCases || 0} new cases, ${data.kpis?.activeAlerts || 0} alerts`
          });
        }
      })
      .subscribe((status) => {
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED'
        }));
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to health-dashboard-updates channel');
        }
      });

    // Alert orchestration channel
    const alertChannel = supabase.channel('alert-orchestration');
    
    alertChannel
      .on('broadcast', { event: 'alert_update' }, (payload) => {
        console.log('🚨 Alert update:', payload);
        
        const { alertsCreated, alertsClosed, totalOpen } = payload.payload || {};
        
        if (alertsCreated > 0) {
          toast.warning(`${alertsCreated} new alert(s) created`, {
            description: `Total open: ${totalOpen}`
          });
        }
        if (alertsClosed > 0) {
          toast.success(`${alertsClosed} alert(s) auto-closed`, {
            description: 'Risk level dropped below threshold'
          });
        }
      })
      .subscribe();

    // News feed channel
    const newsChannel = supabase.channel('health-news-feed');
    
    newsChannel
      .on('broadcast', { event: 'new-articles' }, (payload) => {
        console.log('📰 New articles:', payload);
        
        const { articlesCount, articles } = payload.payload || {};
        
        if (articlesCount > 0) {
          toast.info(`${articlesCount} new health articles`, {
            description: articles?.[0]?.title?.substring(0, 50) + '...'
          });
        }
      })
      .subscribe();

    return () => {
      dashboardChannel.unsubscribe();
      alertChannel.unsubscribe();
      newsChannel.unsubscribe();
    };
  }, []);

  // Trigger pipeline manually
  const triggerPipeline = useCallback(async (forceRefresh: boolean = false) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      pipeline: {
        pipelineId: `pending-${Date.now()}`,
        startedAt: new Date().toISOString(),
        currentStep: 0,
        totalSteps: 10,
        steps: STEP_NAMES.map((name, idx) => ({
          step: idx + 1,
          name,
          status: 'pending'
        })),
        status: 'running',
        dataStats: {
          articlesFound: 0,
          articlesNew: 0,
          dataPointsExtracted: 0,
          predictionsGenerated: 0,
          alertsTriggered: 0
        }
      }
    }));

    try {
      const { data, error } = await supabase.functions.invoke('health-system-orchestrator', {
        body: { 
          userGPS,
          scheduleType,
          forceRefresh 
        }
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        pipeline: data,
        isLoading: false,
        cycleCount: prev.cycleCount + 1,
        lastUpdated: new Date()
      }));

      if (data.status === 'stopped') {
        console.log('⏹️ Pipeline stopped:', data.stopReason);
        toast.info('Pipeline stopped', { description: data.stopReason });
      } else if (data.status === 'completed') {
        console.log('✅ Pipeline completed');
        toast.success('Health data updated', {
          description: `${data.dataStats.articlesNew} new articles, ${data.dataStats.predictionsGenerated} predictions`
        });
      } else if (data.status === 'failed') {
        throw new Error(data.steps.find((s: StepResult) => s.status === 'failed')?.error || 'Pipeline failed');
      }

    } catch (error: any) {
      console.error('Pipeline error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        pipeline: prev.pipeline ? {
          ...prev.pipeline,
          status: 'failed',
          completedAt: new Date().toISOString()
        } : null
      }));
      toast.error('Pipeline failed', { description: error.message });
    }
  }, [userGPS, scheduleType]);

  // Auto-refresh based on schedule
  useEffect(() => {
    if (!autoStart) return;

    const intervalMs = {
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '30min': 30 * 60 * 1000
    }[scheduleType];

    // Initial trigger
    triggerPipeline();

    // Set up interval
    intervalRef.current = setInterval(() => {
      triggerPipeline();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoStart, scheduleType, triggerPipeline]);

  // Get step progress
  const getStepProgress = useCallback(() => {
    if (!state.pipeline) return { current: 0, total: 10, percentage: 0 };
    
    const { currentStep, totalSteps } = state.pipeline;
    return {
      current: currentStep,
      total: totalSteps,
      percentage: Math.round((currentStep / totalSteps) * 100)
    };
  }, [state.pipeline]);

  // Get current step name
  const getCurrentStepName = useCallback(() => {
    if (!state.pipeline) return '';
    const currentStep = state.pipeline.steps.find(s => s.status === 'running');
    return currentStep?.name || state.pipeline.steps[state.pipeline.currentStep - 1]?.name || '';
  }, [state.pipeline]);

  return {
    ...state,
    triggerPipeline,
    getStepProgress,
    getCurrentStepName,
    userGPS,
    setUserGPS,
    stepNames: STEP_NAMES
  };
}

export type { PipelineState, StepResult, DashboardData, OrchestratorState };

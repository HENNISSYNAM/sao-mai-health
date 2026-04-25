import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RegionalRisk {
  regionId: string;
  regionName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  diseases: { disease: string; cases: number; trend: string }[];
  coordinates: { lat: number; lng: number };
  updatedAt: string;
}

interface PipelineData {
  articles: any[];
  chartData: {
    trendData: any[];
    diseaseDistribution: any[];
    locationDistribution: any[];
    regionalRisks: RegionalRisk[];
  };
  riskSummary: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    criticalRegions: number;
    userRegion?: RegionalRisk;
  };
  dataQuality: {
    isRealtime: boolean;
    searchEngine: string;
    observedCount: number;
    predictedCount: number;
  };
}

interface PipelineState {
  data: PipelineData | null;
  isLoading: boolean;
  isConnected: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useHealthPipeline(autoRefresh: boolean = true, refreshInterval: number = 5 * 60 * 1000) {
  const [state, setState] = useState<PipelineState>({
    data: null,
    isLoading: false,
    isConnected: false,
    lastUpdated: null,
    error: null
  });

  const [userGPS, setUserGPS] = useState<{ lat: number; lng: number } | null>(null);

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
        }
      );
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase.channel('health-dashboard-updates');

    channel
      .on('broadcast', { event: 'pipeline-update' }, (payload) => {
        console.log('📥 Received pipeline update:', payload);
        
        const updateData = payload.payload?.data;
        if (updateData) {
          setState(prev => ({
            ...prev,
            data: updateData,
            lastUpdated: new Date(payload.payload.timestamp),
            isLoading: false
          }));

          toast.success('Dashboard updated with latest data', {
            description: `Source: ${updateData.dataQuality?.searchEngine || 'Pipeline'}`
          });
        }
      })
      .subscribe((status) => {
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED'
        }));
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to health pipeline realtime channel');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Trigger pipeline manually
  const triggerPipeline = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('health-pipeline-orchestrator', {
        body: { 
          userGPS,
          forceRefresh: true 
        }
      });

      if (error) throw error;

      if (data.overallStatus === 'completed') {
        // Extract the last stage's pushed data
        const pushStage = data.stages.find((s: any) => s.stage === 'realtime-push-agent');
        
        // Data will come through realtime channel, but we can use direct response as fallback
        if (!pushStage?.data?.pushed) {
          // Process pipeline result directly
          const extractedStage = data.stages.find((s: any) => s.stage === 'data-extraction-agent');
          const predictiveStage = data.stages.find((s: any) => s.stage === 'predictive-agent');
          const riskStage = data.stages.find((s: any) => s.stage === 'regional-risk-classifier');
          const webSearchStage = data.stages.find((s: any) => s.stage === 'web-search-agent');

          setState(prev => ({
            ...prev,
            data: {
              articles: webSearchStage?.data?.articles || [],
              chartData: {
                trendData: predictiveStage?.data?.forecastTimeline || [],
                diseaseDistribution: extractedStage?.data?.observedData || [],
                locationDistribution: [],
                regionalRisks: riskStage?.data?.regionalRisks || []
              },
              riskSummary: {
                overallRisk: 'low',
                criticalRegions: riskStage?.data?.summary?.criticalRegions || 0,
                userRegion: riskStage?.data?.userRegion
              },
              dataQuality: {
                isRealtime: true,
                searchEngine: webSearchStage?.data?.searchEngine || 'Unknown',
                observedCount: extractedStage?.data?.dataQuality?.totalPoints || 0,
                predictedCount: predictiveStage?.data?.summary?.totalPredictions || 0
              }
            },
            lastUpdated: new Date(),
            isLoading: false
          }));
        }
      } else {
        throw new Error(data.error || 'Pipeline failed');
      }

    } catch (error: any) {
      console.error('Pipeline error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      toast.error('Failed to update health data', { description: error.message });
    }
  }, [userGPS]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      // Initial fetch
      triggerPipeline();

      // Set up interval
      const interval = setInterval(triggerPipeline, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, triggerPipeline]);

  return {
    ...state,
    triggerPipeline,
    userGPS,
    setUserGPS
  };
}

export type { PipelineData, RegionalRisk, PipelineState };

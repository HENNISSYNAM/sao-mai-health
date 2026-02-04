import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ============= TYPES =============
export interface TwinSyncData {
  id: string;
  userId: string;
  
  // GPS & Location
  currentLat: number | null;
  currentLng: number | null;
  locationUpdatedAt: string | null;
  region: string | null;
  
  // Environment data (from Stroke Risk)
  environmentData: {
    temperature?: number;
    humidity?: number;
    aqi?: number;
    pressure?: number;
    uv?: number;
    pressureChange1h?: number;
  };
  strokeRiskScore: number | null;
  environmentRisks: EnvironmentRisk[];
  
  // Disease data (from Surveillance)
  diseaseRisks: DiseaseRisk[];
  outbreakAlerts: OutbreakAlert[];
  
  // AI-generated insights
  aiInsights: AIInsight[];
  healthPredictions: HealthPrediction[];
  personalizedActions: PersonalizedAction[];
  
  // Metadata
  lastSyncAt: string;
}

export interface EnvironmentRisk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
}

export interface DiseaseRisk {
  diseaseCode: string;
  diseaseName: string;
  riskLevel: number;
  nearbyCase: number;
  distanceKm: number;
}

export interface OutbreakAlert {
  id: string;
  diseaseCode: string;
  severity: string;
  message: string;
  location: string;
  detectedAt: string;
}

export interface AIInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'info';
  title: string;
  description: string;
  source: 'environment' | 'disease' | 'personal';
  confidence: number;
  generatedAt: string;
}

export interface HealthPrediction {
  id: string;
  type: string;
  probability: number;
  timeframe: string;
  description: string;
  preventiveActions: string[];
}

export interface PersonalizedAction {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action: string;
  reason: string;
  deadline?: string;
}

// ============= HOOK =============
export const useTwinDataSync = () => {
  const { user } = useAuth();
  const [twinData, setTwinData] = useState<TwinSyncData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load existing twin data from DB
  const loadTwinData = useCallback(async () => {
    if (!user?.id) return null;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_twin_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        const mapped: TwinSyncData = {
          id: data.id,
          userId: data.user_id,
          currentLat: data.current_lat,
          currentLng: data.current_lng,
          locationUpdatedAt: data.location_updated_at,
          region: data.region,
          environmentData: (data.environment_data as unknown as TwinSyncData['environmentData']) || {},
          strokeRiskScore: data.stroke_risk_score,
          environmentRisks: (data.environment_risks as unknown as EnvironmentRisk[]) || [],
          diseaseRisks: (data.disease_risks as unknown as DiseaseRisk[]) || [],
          outbreakAlerts: (data.outbreak_alerts as unknown as OutbreakAlert[]) || [],
          aiInsights: (data.ai_generated_insights as unknown as AIInsight[]) || [],
          healthPredictions: (data.health_predictions as unknown as HealthPrediction[]) || [],
          personalizedActions: (data.personalized_actions as unknown as PersonalizedAction[]) || [],
          lastSyncAt: data.last_sync_at || new Date().toISOString(),
        };
        setTwinData(mapped);
        return mapped;
      }
      
      return null;
    } catch (err) {
      console.error('[TWIN-SYNC] Load error:', err);
      setLastError('Không thể tải dữ liệu Song sinh số');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Save/update twin data to DB
  const saveTwinData = useCallback(async (updates: Partial<TwinSyncData>) => {
    if (!user?.id) return false;
    
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('user_twin_data')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const dbData: Record<string, unknown> = {
        user_id: user.id,
        current_lat: updates.currentLat,
        current_lng: updates.currentLng,
        location_updated_at: updates.locationUpdatedAt,
        region: updates.region,
        environment_data: updates.environmentData,
        stroke_risk_score: updates.strokeRiskScore,
        environment_risks: updates.environmentRisks,
        disease_risks: updates.diseaseRisks,
        outbreak_alerts: updates.outbreakAlerts,
        ai_generated_insights: updates.aiInsights,
        health_predictions: updates.healthPredictions,
        personalized_actions: updates.personalizedActions,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(dbData).forEach(key => {
        if (dbData[key] === undefined) delete dbData[key];
      });

      let error;
      if (existing) {
        const result = await supabase
          .from('user_twin_data')
          .update(dbData)
          .eq('user_id', user.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_twin_data')
          .insert(dbData as any);
        error = result.error;
      }
      
      if (error) throw error;
      
      // Update local state
      setTwinData(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('[TWIN-SYNC] Save error:', err);
      return false;
    }
  }, [user?.id]);

  // Sync environment data from Stroke Risk engine
  const syncEnvironmentData = useCallback(async (envData: {
    temperature?: number;
    humidity?: number;
    aqi?: number;
    pressure?: number;
    uv?: number;
    pressureChange1h?: number;
    strokeRiskScore?: number;
    risks?: EnvironmentRisk[];
  }) => {
    if (!user?.id) return;
    
    const updates: Partial<TwinSyncData> = {
      environmentData: {
        temperature: envData.temperature,
        humidity: envData.humidity,
        aqi: envData.aqi,
        pressure: envData.pressure,
        uv: envData.uv,
        pressureChange1h: envData.pressureChange1h,
      },
      strokeRiskScore: envData.strokeRiskScore || null,
      environmentRisks: envData.risks || [],
    };
    
    await saveTwinData(updates);
    console.log('[TWIN-SYNC] Environment data synced');
  }, [user?.id, saveTwinData]);

  // Sync disease data from Surveillance
  const syncDiseaseData = useCallback(async (diseaseData: {
    diseaseRisks?: DiseaseRisk[];
    outbreakAlerts?: OutbreakAlert[];
  }) => {
    if (!user?.id) return;
    
    await saveTwinData({
      diseaseRisks: diseaseData.diseaseRisks || [],
      outbreakAlerts: diseaseData.outbreakAlerts || [],
    });
    console.log('[TWIN-SYNC] Disease data synced');
  }, [user?.id, saveTwinData]);

  // Update GPS location
  const updateLocation = useCallback(async (lat: number, lng: number, region?: string) => {
    if (!user?.id) return;
    
    await saveTwinData({
      currentLat: lat,
      currentLng: lng,
      locationUpdatedAt: new Date().toISOString(),
      region: region || null,
    });
    
    // Also update map presence
    await updateMapPresence(lat, lng);
  }, [user?.id, saveTwinData]);

  // Update map presence for Surveillance map
  const updateMapPresence = useCallback(async (lat: number, lng: number) => {
    if (!user?.id) return;
    
    try {
      // Get user profile for age group and sharing mode - use columns that exist
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Type assertion to access dynamic columns
      const profileData = profile as Record<string, unknown> | null;
      const ageGroup = profileData?.age_group as string || 'unknown';
      const sharingMode = profileData?.sharing_mode as string || 'anonymous';

      // First check if presence exists
      const { data: existing } = await supabase
        .from('user_map_presence')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const presenceData = {
        user_id: user.id,
        lat,
        lng,
        age_group: ageGroup,
        risk_level: twinData?.strokeRiskScore 
          ? (twinData.strokeRiskScore > 70 ? 'high' : twinData.strokeRiskScore > 40 ? 'medium' : 'low')
          : 'unknown',
        is_sharing: sharingMode === 'community',
        last_active_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        const result = await supabase
          .from('user_map_presence')
          .update(presenceData)
          .eq('user_id', user.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_map_presence')
          .insert(presenceData as any);
        error = result.error;
      }
      
      if (error) throw error;
    } catch (err) {
      console.error('[TWIN-SYNC] Presence update error:', err);
    }
  }, [user?.id, twinData?.strokeRiskScore]);

  // Trigger AI insights generation
  const generateAIInsights = useCallback(async () => {
    if (!user?.id || !twinData) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('twin-data-synthesis', {
        body: {
          userId: user.id,
          environmentData: twinData.environmentData,
          strokeRiskScore: twinData.strokeRiskScore,
          diseaseRisks: twinData.diseaseRisks,
          location: twinData.currentLat && twinData.currentLng 
            ? { lat: twinData.currentLat, lng: twinData.currentLng }
            : null,
        }
      });

      if (error) throw error;

      if (data?.success) {
        await saveTwinData({
          aiInsights: data.insights || [],
          healthPredictions: data.predictions || [],
          personalizedActions: data.actions || [],
        });
        toast.success('Đã cập nhật insights AI');
      }
    } catch (err) {
      console.error('[TWIN-SYNC] AI insights error:', err);
      toast.error('Không thể tạo insights AI');
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, twinData, saveTwinData]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`twin-sync:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_twin_data',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('[TWIN-SYNC] Realtime update:', payload.eventType);
        loadTwinData();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, loadTwinData]);

  // Periodic sync every 1 hour
  useEffect(() => {
    if (!user?.id) return;

    // Initial load
    loadTwinData();

    // Set up hourly sync
    syncIntervalRef.current = setInterval(() => {
      console.log('[TWIN-SYNC] Hourly sync triggered');
      generateAIInsights();
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [user?.id, loadTwinData, generateAIInsights]);

  return {
    twinData,
    isLoading,
    isSyncing,
    lastError,
    
    // Actions
    loadTwinData,
    saveTwinData,
    syncEnvironmentData,
    syncDiseaseData,
    updateLocation,
    updateMapPresence,
    generateAIInsights,
  };
};

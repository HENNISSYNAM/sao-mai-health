import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGPS } from '@/hooks/useGPS';
import { toast } from 'sonner';

export interface UserMapDot {
  userId: string;
  lat: number;
  lng: number;
  ageGroup?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  lastActiveAt: string;
  hasChronic?: boolean;
  conditionCount?: number;
}

export interface HealthProfile {
  medicalConditions: string[];
  allergies: string[];
  healthScore?: number;
}

export interface RiskResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  healthProfile: HealthProfile | null;
  vulnerabilityScore: number;
  alertCreated: boolean;
  nearbyHotspots: Array<{
    disease: string;
    severity: string;
    distanceKm: string;
    caseCount: number;
  }>;
  newsSummary: { critical: number; high: number; medium: number; low: number };
  caseDensity: number;
}

export function useUserRiskScorer() {
  const { user } = useAuth();
  const { gps } = useGPS();
  const [mapUsers, setMapUsers] = useState<UserMapDot[]>([]);
  const [myRisk, setMyRisk] = useState<RiskResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScored, setLastScored] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertShown = useRef<string | null>(null);

  const scoreMyRisk = useCallback(async () => {
    if (!gps?.lat || !gps?.lng) return null;

    try {
      const { data, error } = await supabase.functions.invoke('user-risk-scorer', {
        body: {
          action: 'score_user',
          userId: user?.id,
          lat: gps.lat,
          lng: gps.lng,
        }
      });

      if (error) throw error;
      if (data?.success) {
        const result = data as RiskResult;
        setMyRisk(result);
        setLastScored(data.timestamp);

        // Show toast for high risk (once per session per level change)
        if (result.riskLevel === 'high' && lastAlertShown.current !== 'high') {
          lastAlertShown.current = 'high';
          toast.error('⚠️ Cảnh báo nguy cơ cao!', {
            description: `Điểm rủi ro: ${result.riskScore}/100. ${result.riskFactors[0] || ''}`,
            duration: 8000,
          });
        } else if (result.riskLevel === 'medium' && lastAlertShown.current !== 'medium') {
          lastAlertShown.current = 'medium';
          toast.warning('🟡 Nguy cơ trung bình', {
            description: `Điểm rủi ro: ${result.riskScore}/100`,
            duration: 5000,
          });
        }

        if (result.alertCreated) {
          toast.info('🔔 Cảnh báo mới đã được tạo tự động', {
            description: 'Dựa trên dịch bệnh xung quanh và hồ sơ sức khỏe của bạn',
          });
        }

        return result;
      }
    } catch (err) {
      console.error('[RISK-SCORER] Score error:', err);
    }
    return null;
  }, [user?.id, gps?.lat, gps?.lng]);

  const fetchMapUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-risk-scorer', {
        body: { action: 'get_map_users' }
      });

      if (error) throw error;
      if (data?.success) {
        const dots: UserMapDot[] = (data.users || []).map((u: any) => ({
          userId: u.user_id,
          lat: u.lat,
          lng: u.lng,
          ageGroup: u.age_group,
          riskLevel: u.risk_level || 'unknown',
          lastActiveAt: u.last_active_at,
          hasChronic: u.has_chronic || false,
          conditionCount: u.condition_count || 0,
        }));
        setMapUsers(dots);
      }
    } catch (err) {
      console.error('[RISK-SCORER] Fetch users error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapUsers();
    intervalRef.current = setInterval(fetchMapUsers, 120_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMapUsers]);

  useEffect(() => {
    if (gps?.lat && gps?.lng) {
      scoreMyRisk();
    }
  }, [gps?.lat, gps?.lng, scoreMyRisk]);

  return {
    mapUsers,
    myRisk,
    isLoading,
    lastScored,
    scoreMyRisk,
    fetchMapUsers,
  };
}

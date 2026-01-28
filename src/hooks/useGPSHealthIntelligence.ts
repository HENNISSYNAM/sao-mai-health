import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PrioritizedAlert {
  priority: 1 | 2 | 3 | 4;
  priorityLabel: string;
  priorityLabelVi: string;
  disease: string;
  diseaseVi: string;
  title: string;
  summary: string;
  location: string;
  casesCount?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  relevanceScore: number;
}

export interface GPSHealthIntelligence {
  userLocation: {
    city: string;
    region: string;
    regionVi: string;
    coordinates: { lat: number; lon: number };
  };
  communityRiskStatus: {
    level: 'Thấp' | 'Trung bình' | 'Cao';
    levelEn: 'Low' | 'Medium' | 'High';
    explanation: string;
    explanationVi: string;
  };
  kpi: {
    todayCasesLocal: number;
    openAlertsLocal: number;
    diseasesMonitoredRegional: number;
    vaccinationRate: number | null;
  };
  prioritizedAlerts: PrioritizedAlert[];
  personalInsight: {
    message: string;
    messageVi: string;
  };
  footer: {
    dataType: string;
    lastUpdated: string;
  };
}

interface UseGPSHealthIntelligenceOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useGPSHealthIntelligence(options: UseGPSHealthIntelligenceOptions = {}) {
  const { autoFetch = true, refreshInterval = 300000 } = options; // 5 min default

  const [data, setData] = useState<GPSHealthIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchIntelligence = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🌍 Fetching GPS Health Intelligence for:', lat, lon);
      
      const { data: result, error: fnError } = await supabase.functions.invoke('gps-health-intelligence', {
        body: { lat, lon, locale: 'vi' }
      });

      if (fnError) throw fnError;

      if (result?.success) {
        setData(result);
        setLocation({ lat, lon });
        setLastUpdated(new Date());

        // Show toast for high risk
        if (result.communityRiskStatus?.level === 'Cao') {
          toast.warning('Cảnh báo rủi ro cao', {
            description: result.communityRiskStatus.explanationVi,
            duration: 6000
          });
        }

        return result;
      } else {
        throw new Error(result?.error || 'Failed to fetch intelligence');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi kết nối';
      setError(message);
      console.error('GPS Health Intelligence error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshWithCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị GPS');
      // Fallback to HCMC
      return fetchIntelligence(10.8231, 106.6297);
    }

    return new Promise<GPSHealthIntelligence | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const result = await fetchIntelligence(
            position.coords.latitude,
            position.coords.longitude
          );
          resolve(result);
        },
        async (err) => {
          console.warn('GPS error, using default location:', err.message);
          // Fallback to HCMC
          const result = await fetchIntelligence(10.8231, 106.6297);
          resolve(result);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, [fetchIntelligence]);

  // Initial fetch and interval
  useEffect(() => {
    if (autoFetch) {
      refreshWithCurrentLocation();

      const interval = setInterval(refreshWithCurrentLocation, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoFetch, refreshInterval, refreshWithCurrentLocation]);

  return {
    data,
    isLoading,
    error,
    location,
    lastUpdated,
    refresh: refreshWithCurrentLocation,
    fetchForLocation: fetchIntelligence
  };
}

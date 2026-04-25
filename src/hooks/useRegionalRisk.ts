import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGPS } from '@/hooks/useGPS';

export interface EpidemiologicalRegion {
  id: string;
  name: string;
  nameVi: string;
  type: 'northern' | 'central' | 'southern' | 'mekong' | 'urban';
  populationDensity: 'low' | 'medium' | 'high' | 'very_high';
  climate: string;
}

export interface RiskAlert {
  disease: string;
  diseaseVi: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  explanation: string;
  explanationVi: string;
  recommendations: string[];
  recommendationsVi: string[];
  source: string;
  timestamp: string;
}

export interface RegionalRiskData {
  region: EpidemiologicalRegion;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alerts: RiskAlert[];
  environmentalAdvice: {
    en: string[];
    vi: string[];
  };
  metadata: {
    location: { lat: number; lon: number };
    timestamp: string;
    alertCount: number;
    criticalCount: number;
    highCount: number;
    fromAI?: boolean;
  };
}

interface UseRegionalRiskOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useRegionalRisk(options: UseRegionalRiskOptions = {}) {
  const { autoFetch = true, refreshInterval = 300000 } = options; // 5 min default
  
  const [data, setData] = useState<RegionalRiskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [environmentalFactors, setEnvironmentalFactors] = useState<{
    temperature?: number;
    humidity?: number;
    aqi?: number;
    pressure?: number;
  }>({});

  const fetchRiskData = useCallback(async (lat: number, lon: number, factors?: typeof environmentalFactors) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('location-risk-classifier', {
        body: { 
          lat, 
          lon, 
          environmentalFactors: factors || environmentalFactors 
        }
      });
      
      if (fnError) throw fnError;
      
      setData(result);
      setLocation({ lat, lon });
      
      // Show toast for critical/high alerts
      if (result.overallRiskLevel === 'CRITICAL') {
        toast.error('Cảnh báo nguy cơ nghiêm trọng', {
          description: `${result.alerts[0]?.diseaseVi || 'Dịch bệnh'} - Vui lòng xem khuyến nghị`,
          duration: 8000
        });
      } else if (result.overallRiskLevel === 'HIGH') {
        toast.warning('Cảnh báo nguy cơ cao', {
          description: `${result.alerts[0]?.diseaseVi || 'Dịch bệnh'} - Cần chú ý phòng ngừa`,
          duration: 6000
        });
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch risk data';
      setError(message);
      console.error('Regional risk fetch error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [environmentalFactors]);

  const { gps, requestPosition } = useGPS();
  const hasFetched = useRef(false);
  const isFetching = useRef(false);
  const lastFetchTime = useRef(0);

  const refreshWithCurrentLocation = useCallback(async (force = false) => {
    if (isFetching.current) return;
    const now = Date.now();
    if (!force && hasFetched.current && now - lastFetchTime.current < 3 * 60 * 1000) return;
    
    isFetching.current = true;
    try {
      const pos = await requestPosition();
      const lat = pos?.lat ?? gps.lat;
      const lng = pos?.lng ?? gps.lng;
      await fetchRiskData(lat, lng);
      hasFetched.current = true;
      lastFetchTime.current = Date.now();
    } finally {
      isFetching.current = false;
    }
  }, [fetchRiskData, requestPosition, gps]);

  const updateEnvironmentalFactors = useCallback((factors: typeof environmentalFactors) => {
    setEnvironmentalFactors(prev => ({ ...prev, ...factors }));
    if (location) {
      fetchRiskData(location.lat, location.lon, { ...environmentalFactors, ...factors });
    }
  }, [location, environmentalFactors, fetchRiskData]);

  // Initial fetch - only once
  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      refreshWithCurrentLocation(true);
    }
  }, [autoFetch]);

  // Periodic refresh - every refreshInterval
  useEffect(() => {
    if (!autoFetch) return;
    const interval = setInterval(() => {
      refreshWithCurrentLocation();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    data,
    isLoading,
    error,
    location,
    fetchRiskData,
    refreshWithCurrentLocation,
    updateEnvironmentalFactors
  };
}

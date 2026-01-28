import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeDailyCounts, useRealtimeAlerts } from "@/hooks/useRealtimeHealth";

// Dashboard Sections
import { VerifiedKpiSection } from "@/components/dashboard/VerifiedKpiSection";
import { HealthNewsFeed } from "@/components/dashboard/HealthNewsFeed";
import { PredictiveHealthChart } from "@/components/dashboard/PredictiveHealthChart";
import { EarlyWarningAlerts } from "@/components/dashboard/EarlyWarningAlerts";

interface DailyCount {
  id: string;
  day: string;
  disease_code: string;
  district_id: string;
  cases: number;
  created_at: string;
}

interface Alert {
  id: string;
  disease_code: string;
  day: string;
  cases: number;
  status: string;
  created_at: string;
  closed_at?: string;
}

export default function Dashboard() {
  const { i18n } = useTranslation();
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGPS, setUserGPS] = useState<{ lat: number; lng: number } | null>(null);

  // Predictive data state
  const [predictiveData, setPredictiveData] = useState<{
    bestCase: any[];
    mostLikely: any[];
    worstCase: any[];
  } | null>(null);

  // Realtime subscriptions
  const { isConnected: countsConnected } = useRealtimeDailyCounts(() => {
    fetchInitialData();
  });
  
  const { isConnected: alertsConnected } = useRealtimeAlerts(() => {
    fetchAlerts();
  });

  const isConnected = countsConnected || alertsConnected;

  // Get user GPS for localized alerts
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserGPS({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Default to HCMC
          setUserGPS({ lat: 10.8231, lng: 106.6297 });
        }
      );
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-hcmc-data', {
        body: { type: 'diseases' }
      });

      if (error) {
        console.error('Error fetching HCMC disease data:', error);
        return;
      }

      if (data?.success && data?.data) {
        const formattedData: DailyCount[] = data.data.map((item: any) => ({
          id: `${item.disease_code}-${item.district_id}-${item.date}`,
          day: item.date,
          district_id: item.district_id,
          disease_code: item.disease_code,
          cases: item.cases,
          created_at: new Date().toISOString()
        }));
        setDailyCounts(formattedData);
        
        // Generate predictive data based on observed data
        generatePredictiveData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching daily counts:', error);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-hcmc-data', {
        body: { type: 'alerts' }
      });

      if (error) {
        console.error('Error fetching HCMC alerts:', error);
        return;
      }

      if (data?.success && data?.data) {
        const formattedAlerts: Alert[] = data.data.map((item: any) => ({
          id: item.id,
          disease_code: extractDiseaseFromTitle(item.title),
          day: new Date(item.created_at).toISOString().split('T')[0],
          cases: extractCasesFromTitle(item.title),
          status: item.status,
          created_at: item.created_at
        }));
        setAlerts(formattedAlerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  const extractCasesFromTitle = (title: string): number => {
    const match = title.match(/(\d+)\s*ca/);
    return match ? parseInt(match[1]) : 0;
  };

  const extractDiseaseFromTitle = (title: string): string => {
    if (title.toLowerCase().includes('dengue')) return 'dengue';
    if (title.toLowerCase().includes('covid')) return 'covid19';
    if (title.toLowerCase().includes('hfmd')) return 'hfmd';
    return 'unknown';
  };

  // Generate AI predictive data (7-14 days forecast)
  const generatePredictiveData = useCallback((observedData: DailyCount[]) => {
    if (!observedData || observedData.length === 0) return;

    const diseases = [...new Set(observedData.map(d => d.disease_code))];
    const today = new Date();
    
    const scenarios = {
      bestCase: [] as any[],
      mostLikely: [] as any[],
      worstCase: [] as any[]
    };

    // Calculate average cases per disease from last 7 days
    const avgByDisease: Record<string, number> = {};
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    diseases.forEach(disease => {
      const recentCases = observedData
        .filter(d => d.disease_code === disease && d.day >= last7Days);
      avgByDisease[disease] = recentCases.length > 0
        ? recentCases.reduce((sum, d) => sum + d.cases, 0) / recentCases.length
        : 50; // Default baseline
    });

    // Generate 14-day forecast for each disease
    for (let i = 1; i <= 14; i++) {
      const forecastDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = forecastDate.toISOString().split('T')[0];
      
      diseases.forEach(disease => {
        const base = avgByDisease[disease];
        const dayOfWeek = forecastDate.getDay();
        const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.85 : 1;
        const decayFactor = 1 - (i * 0.02); // Confidence decay
        
        // Best case: -15% trend
        scenarios.bestCase.push({
          date: dateStr,
          disease,
          cases: Math.max(0, Math.round(base * 0.85 * weekendFactor * decayFactor)),
          confidence: i <= 7 ? 'high' : 'medium'
        });
        
        // Most likely: slight increase +2%
        scenarios.mostLikely.push({
          date: dateStr,
          disease,
          cases: Math.round(base * 1.02 * weekendFactor),
          confidence: i <= 7 ? 'high' : i <= 10 ? 'medium' : 'low'
        });
        
        // Worst case: +25% trend
        scenarios.worstCase.push({
          date: dateStr,
          disease,
          cases: Math.round(base * 1.25 * weekendFactor * (1 + i * 0.01)),
          confidence: i <= 7 ? 'medium' : 'low'
        });
      });
    }

    setPredictiveData(scenarios);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInitialData(), fetchAlerts()]);
      setLoading(false);
    };
    loadData();
  }, [fetchInitialData, fetchAlerts]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-up">
        <div className="space-y-1">
          <Skeleton className="h-8 sm:h-9 w-48 sm:w-64" />
          <Skeleton className="h-4 sm:h-5 w-64 sm:w-96" />
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 sm:h-32 rounded-xl sm:rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* ===== PHASE 1: VERIFIED DATA OVERVIEW ===== */}
      {/* KPI cards showing ONLY verified real-time data */}
      <div className="animate-fade-up">
        <VerifiedKpiSection 
          dailyCounts={dailyCounts}
          alerts={alerts}
          isConnected={isConnected}
        />
      </div>

      {/* News & Pipeline Integration */}
      <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <HealthNewsFeed />
      </div>

      {/* ===== PHASE 2 & 3: PREDICTIVE DATA & EARLY WARNINGS ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Predictive Chart - 2/3 width */}
        <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <PredictiveHealthChart 
            observedData={dailyCounts}
            predictedData={predictiveData || undefined}
            isLoading={loading}
          />
        </div>

        {/* Early Warning Alerts - 1/3 width */}
        <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
          <EarlyWarningAlerts 
            verifiedAlerts={alerts}
            userGPS={userGPS}
          />
        </div>
      </div>
    </div>
  );
}

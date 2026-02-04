import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeDailyCounts, useRealtimeAlerts } from "@/hooks/useRealtimeHealth";
import { Heart, Coffee } from "lucide-react";
import { Link } from "react-router-dom";

// Dashboard Sections
import { VerifiedKpiSection } from "@/components/dashboard/VerifiedKpiSection";
import { HealthNewsFeed } from "@/components/dashboard/HealthNewsFeed";
import { LivingAIChart } from "@/components/dashboard/LivingAIChart";
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

  const isVi = i18n.language === 'vi';

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* ===== DONATION BANNER ===== */}
      <Link 
        to="/about"
        className="block animate-fade-up"
      >
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-warning/5 to-danger/10 border border-primary/20 p-3 sm:p-4 hover:border-primary/40 transition-all group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 group-hover:scale-110 transition-transform">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="text-xs sm:text-sm">
                <span className="text-muted-foreground">
                  {isVi 
                    ? 'Ủng hộ dự án: ' 
                    : 'Support the project: '}
                </span>
                <span className="font-mono font-bold text-primary">
                  2800205302805
                </span>
                <span className="text-muted-foreground">
                  {' — Agribank (ĐINH VĂN NAM)'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              <Coffee className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isVi ? 'Mua cho tôi một ly cà phê' : 'Buy me a coffee'}
              </span>
              <span className="sm:hidden">
                {isVi ? 'Ủng hộ' : 'Donate'}
              </span>
            </div>
          </div>
        </div>
      </Link>

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

      {/* ===== PHASE 2 & 3: AI LIVING CHART & EARLY WARNINGS ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Living AI Chart - 2/3 width */}
        <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <LivingAIChart />
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

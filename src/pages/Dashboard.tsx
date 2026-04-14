import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeDailyCounts, useRealtimeAlerts } from "@/hooks/useRealtimeHealth";
import { Heart, Activity, Newspaper, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { useGPS } from "@/hooks/useGPS";

// Dashboard Sections
import { VerifiedKpiSection } from "@/components/dashboard/VerifiedKpiSection";
import { DiseaseIntelligenceSummary } from "@/components/dashboard/DiseaseIntelligenceSummary";
import { DiseaseAnalyticsSummary } from "@/components/dashboard/DiseaseAnalyticsSummary";
import { HealthNewsFeed } from "@/components/dashboard/HealthNewsFeed";
import { LivingAIChart } from "@/components/dashboard/LivingAIChart";


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
  const { gps: userGPS } = useGPS();

  // Realtime subscriptions
  const { isConnected: countsConnected } = useRealtimeDailyCounts(() => {
    fetchInitialData();
  });
  
  const { isConnected: alertsConnected } = useRealtimeAlerts(() => {
    fetchAlerts();
  });

  const isConnected = countsConnected || alertsConnected;

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
      <div className="space-y-4 sm:space-y-6 animate-fade-up">
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 sm:h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  const isVi = i18n.language === 'vi';

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto">
      {/* KPI Cards - Always visible */}
      <div className="animate-fade-up">
        <VerifiedKpiSection 
          dailyCounts={dailyCounts}
          alerts={alerts}
          isConnected={isConnected}
        />
      </div>

      {/* Environment Summary - Compact, always visible */}
      <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <DiseaseIntelligenceSummary />
      </div>

      {/* Tabbed Detail Sections - Reduces visual overload */}
      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <Tabs defaultValue="news" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-10 sm:h-11 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="forecast" className="text-xs sm:text-sm gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isVi ? 'Dự báo' : 'Forecast'}</span>
              <span className="sm:hidden">{isVi ? 'AI' : 'AI'}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isVi ? 'Phân tích' : 'Analytics'}</span>
              <span className="sm:hidden">{isVi ? 'PT' : 'Stats'}</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="text-xs sm:text-sm gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
              <Newspaper className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isVi ? 'Tin tức' : 'News'}</span>
              <span className="sm:hidden">{isVi ? 'Tin' : 'News'}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="mt-3 animate-fade-up">
            <LivingAIChart />
          </TabsContent>

          <TabsContent value="analytics" className="mt-3 animate-fade-up">
            <DiseaseAnalyticsSummary />
          </TabsContent>

          <TabsContent value="news" className="mt-3 animate-fade-up">
            <HealthNewsFeed />
          </TabsContent>
        </Tabs>
      </div>

      {/* Donation Footer - More subtle */}
      <Link 
        to="/about"
        className="block pt-2 pb-1"
      >
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60 hover:text-primary/70 transition-colors duration-300">
          <Heart className="h-3 w-3" />
          <span>{isVi ? 'Ủng hộ dự án' : 'Support project'}</span>
          <span className="font-mono font-medium">2800205302805</span>
          <span>Agribank</span>
        </div>
      </Link>
    </div>
  );
}

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeDailyCounts, useRealtimeAlerts } from "@/hooks/useRealtimeHealth";
import { Heart, Activity, Newspaper, Brain, ClipboardPlus, BarChart3, FileText, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGPS } from "@/hooks/useGPS";
import { useDemoMode } from "@/hooks/useDemoMode";
import { WeeklyReportModal } from "@/components/reports/WeeklyReportModal";
import { invokeWithTimeout } from "@/lib/invokeWithTimeout";

// Always-visible sections — loaded eagerly
import { VerifiedKpiSection } from "@/components/dashboard/VerifiedKpiSection";
import { DiseaseIntelligenceSummary } from "@/components/dashboard/DiseaseIntelligenceSummary";
import { MetricLegend } from "@/components/metrics/MetricLegend";

// Tab content & below-fold sections — loaded on demand
const LivingAIChart = React.lazy(() =>
  import("@/components/dashboard/LivingAIChart").then(m => ({ default: m.LivingAIChart }))
);
const DiseaseAnalyticsSummary = React.lazy(() =>
  import("@/components/dashboard/DiseaseAnalyticsSummary").then(m => ({ default: m.DiseaseAnalyticsSummary }))
);
const HealthNewsFeed = React.lazy(() =>
  import("@/components/dashboard/HealthNewsFeed").then(m => ({ default: m.HealthNewsFeed }))
);
const MedicalBrainWidget = React.lazy(() =>
  import("@/components/dashboard/MedicalBrainWidget").then(m => ({ default: m.MedicalBrainWidget }))
);

const TabFallback = () => <Skeleton className="h-[300px] rounded-xl" />;


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
  const navigate = useNavigate();
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { gps: userGPS } = useGPS();
  const { isDemo, demoDailyCounts, demoAlerts } = useDemoMode();
  const [showReport, setShowReport] = useState(false);

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
      const data = await invokeWithTimeout<{ success: boolean; data: any[] }>('fetch-hcmc-data', {
        body: { type: 'diseases' },
        timeoutMs: 20_000,
        retries: 1,
      }).catch(err => { console.error('Error fetching HCMC disease data:', err); return null; });

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
      const data = await invokeWithTimeout<{ success: boolean; data: any[] }>('fetch-hcmc-data', {
        body: { type: 'alerts' },
        timeoutMs: 20_000,
        retries: 1,
      }).catch(err => { console.error('Error fetching HCMC alerts:', err); return null; });

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

  // Use demo data when no real data yet or in demo mode
  const displayCounts = dailyCounts.length > 0 ? dailyCounts : demoDailyCounts;
  const displayAlerts = alerts.length > 0 ? alerts : demoAlerts;
  const hasNoData = displayCounts.length === 0 && displayAlerts.length === 0;

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <BarChart3 className="h-10 w-10 text-primary/40 mx-auto" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isVi ? 'Chưa có dữ liệu dịch tễ' : 'No surveillance data yet'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            {isVi
              ? 'Bắt đầu bằng cách nhập ca bệnh đầu tiên để dashboard hiển thị thống kê.'
              : 'Start by entering the first case to populate the dashboard.'}
          </p>
        </div>
        <Button onClick={() => navigate('/case-intake')} className="gap-2">
          <ClipboardPlus className="h-4 w-4" />
          {isVi ? 'Nhập ca bệnh' : 'Enter a case'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1400px] mx-auto">
      {/* Demo mode banner */}
      {isDemo && dailyCounts.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50 animate-fade-up">
          <Sparkles className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex-1">
            <strong>Demo mode</strong> — dữ liệu tổng hợp TP.HCM Q1/2025. Đăng nhập để xem dữ liệu thực tế của đơn vị bạn.
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300" onClick={() => navigate('/auth')}>
            Đăng nhập
          </Button>
        </div>
      )}

      {/* Header row: title + export button */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            {isVi ? 'Tổng quan dịch tễ' : 'Surveillance Overview'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isVi ? 'Dữ liệu cập nhật theo thời gian thực' : 'Real-time data'}
            {isDemo && dailyCounts.length === 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1.5">Demo</Badge>
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-2 h-8 text-xs" onClick={() => setShowReport(true)}>
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Xuất báo cáo A1</span>
          <span className="sm:hidden">Báo cáo</span>
        </Button>
      </div>

      {/* KPI Cards - Always visible */}
      <div className="animate-fade-up">
        <VerifiedKpiSection
          dailyCounts={displayCounts}
          alerts={displayAlerts}
          isConnected={isConnected}
        />
      </div>

      <WeeklyReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        dailyCounts={displayCounts}
      />

      {/* Environment Summary - Compact, always visible */}
      <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <DiseaseIntelligenceSummary />
      </div>

      {/* Medical Brain — Tri thức AI thế hệ mới (PubMed × Dịch tễ) */}
      <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <Suspense fallback={<Skeleton className="h-32 rounded-xl" />}>
          <MedicalBrainWidget />
        </Suspense>
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
            <Suspense fallback={<TabFallback />}>
              <LivingAIChart />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics" className="mt-3 animate-fade-up">
            <Suspense fallback={<TabFallback />}>
              <DiseaseAnalyticsSummary />
            </Suspense>
          </TabsContent>

          <TabsContent value="news" className="mt-3 animate-fade-up">
            <Suspense fallback={<TabFallback />}>
              <HealthNewsFeed />
            </Suspense>
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

      {/* Floating data legend — accessible from anywhere on the dashboard */}
      <MetricLegend variant="floating" />
    </div>
  );
}

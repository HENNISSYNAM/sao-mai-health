import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, Heart, Users, RefreshCw, Newspaper, ArrowRight } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { DashboardChart } from "@/components/DashboardChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRealtimeDailyCounts, useRealtimeAlerts } from "@/hooks/useRealtimeHealth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HealthNewsFeed } from "@/components/dashboard/HealthNewsFeed";
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
  const {
    t,
    i18n
  } = useTranslation();
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingNews, setFetchingNews] = useState(false);
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const {
    isConnected: countsConnected,
    nowTs
  } = useRealtimeDailyCounts(payload => {
    fetchInitialData();
  });
  const {
    isConnected: alertsConnected
  } = useRealtimeAlerts(payload => {
    fetchAlerts();
  });
  const fetchInitialData = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('fetch-hcmc-data', {
        body: {
          type: 'diseases'
        }
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
  };
  const fetchAlerts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('fetch-hcmc-data', {
        body: {
          type: 'alerts'
        }
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
  };
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
  const fetchNewsData = async () => {
    setFetchingNews(true);
    toast.info(t('common.loading'));
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('fetch-disease-news');
      if (error) throw error;
      if (data?.success) {
        toast.success(t('common.success'));
        await Promise.all([fetchInitialData(), fetchAlerts()]);
      } else {
        toast.error(t('common.error'));
      }
    } catch (error: any) {
      console.error('Error fetching news:', error);
      toast.error(t('common.error'));
    } finally {
      setFetchingNews(false);
    }
  };
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInitialData(), fetchAlerts()]);
      setLoading(false);
    };
    loadData();
  }, []);
  const kpiData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayCases = dailyCounts.filter(count => count.day === today).reduce((sum, count) => sum + count.cases, 0);
    const openAlerts = alerts.filter(alert => alert.status === 'open').length;
    const recentDiseases = new Set(dailyCounts.filter(count => count.day >= sevenDaysAgo).map(count => count.disease_code)).size;
    return [{
      title: t('dashboard.todayCases'),
      value: todayCases.toLocaleString(locale),
      change: {
        value: 12,
        type: 'increase' as const
      },
      icon: Users,
      variant: 'info' as const
    }, {
      title: t('dashboard.openAlerts'),
      value: openAlerts.toString(),
      change: {
        value: 2,
        type: 'decrease' as const
      },
      icon: AlertTriangle,
      variant: openAlerts > 5 ? 'danger' as const : 'warning' as const
    }, {
      title: t('dashboard.diseaseTypes'),
      value: recentDiseases.toString(),
      change: {
        value: 1,
        type: 'increase' as const
      },
      icon: Activity,
      variant: 'success' as const
    }, {
      title: t('dashboard.vaccinationRate'),
      value: "92%",
      change: {
        value: 3,
        type: 'increase' as const
      },
      icon: Heart,
      variant: 'success' as const
    }];
  }, [dailyCounts, alerts, t, locale]);
  const trendData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString(locale, {
        weekday: 'short'
      });
      const dayCases = dailyCounts.filter(count => count.day === dayStr).reduce((sum, count) => sum + count.cases, 0);
      last7Days.push({
        name: dayName,
        value: dayCases
      });
    }
    return last7Days;
  }, [dailyCounts, locale]);
  const diseaseData = useMemo(() => {
    const diseaseMap: Record<string, number> = {};
    dailyCounts.forEach(count => {
      diseaseMap[count.disease_code] = (diseaseMap[count.disease_code] || 0) + count.cases;
    });
    return Object.entries(diseaseMap).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [dailyCounts]);
  const districtData = useMemo(() => {
    const districtMap: Record<string, number> = {};
    dailyCounts.forEach(count => {
      districtMap[count.district_id] = (districtMap[count.district_id] || 0) + count.cases;
    });
    return Object.entries(districtMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [dailyCounts]);
  if (loading) {
    return <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-up">
        <div className="space-y-1">
          <Skeleton className="h-8 sm:h-9 w-48 sm:w-64" />
          <Skeleton className="h-4 sm:h-5 w-64 sm:w-96" />
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 sm:h-32 rounded-xl sm:rounded-2xl" />)}
        </div>
      </div>;
  }
  return <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-3 animate-fade-up">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              {t('dashboard.title')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {t('dashboard.subtitle')}
            </p>
          </div>
          <Badge variant="outline" className={cn("rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-xs shrink-0", countsConnected && alertsConnected ? "border-success/50 bg-success/10 text-success" : "border-muted")}>
            {countsConnected && alertsConnected ? `● ${t('dashboard.live')}` : `○ ${t('dashboard.offline')}`}
          </Badge>
        </div>
        
        
      </div>

      {/* KPI Cards - 2 columns on mobile, 4 on desktop */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => <div key={index} className="animate-fade-up" style={{
        animationDelay: `${index * 50}ms`
      }}>
            <KpiCard {...kpi} />
          </div>)}
      </div>

      {/* Health News & Pipeline - Full width */}
      <div className="animate-fade-up" style={{
      animationDelay: '100ms'
    }}>
        <HealthNewsFeed />
      </div>

    </div>;
}
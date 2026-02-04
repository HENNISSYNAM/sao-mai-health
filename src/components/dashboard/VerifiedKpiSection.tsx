import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, Heart, Users, Globe, Loader2, RefreshCw } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface KpiMetric {
  value: number;
  change: number;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
  fetchedAt: string;
}

interface AllKpiMetrics {
  todayCases: KpiMetric;
  openAlerts: KpiMetric;
  diseaseTypes: KpiMetric;
  vaccinationRate: KpiMetric;
}

interface VerifiedKpiSectionProps {
  dailyCounts: any[];
  alerts: any[];
  isConnected: boolean;
}

// Cache for KPI data
const KPI_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let kpiCache: { metrics: AllKpiMetrics; sources: string[]; fetchedAt: number } | null = null;

export function VerifiedKpiSection({ dailyCounts, alerts, isConnected }: VerifiedKpiSectionProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  
  const [metrics, setMetrics] = useState<AllKpiMetrics | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromAI, setIsFromAI] = useState(false);

  // Fetch all KPIs from AI agents
  const fetchKpiFromAI = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh && kpiCache && Date.now() - kpiCache.fetchedAt < KPI_CACHE_TTL) {
      console.log('⚡ Using cached KPI data');
      setMetrics(kpiCache.metrics);
      setSources(kpiCache.sources);
      setIsFromAI(true);
      setIsLoading(false);
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      console.log('🔍 Fetching KPIs from AI agents...');
      
      const { data, error } = await supabase.functions.invoke('health-kpi-intelligence', {
        body: { language: i18n.language }
      });

      if (error) {
        console.error('KPI fetch error:', error);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (data?.success && data.metrics) {
        // Update cache
        kpiCache = {
          metrics: data.metrics,
          sources: data.kpi?.sources || [],
          fetchedAt: Date.now()
        };
        
        setMetrics(data.metrics);
        setSources(data.kpi?.sources || []);
        setIsFromAI(true);
        console.log(`✅ KPIs loaded from AI agents`);
      }
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [i18n.language]);

  // Fetch on mount
  useEffect(() => {
    fetchKpiFromAI();
  }, [fetchKpiFromAI]);

  // Build KPI cards data
  const getKpiCards = () => {
    if (metrics) {
      return [
        {
          title: t('kpi.todayCases'),
          value: metrics.todayCases.value.toLocaleString(locale),
          change: { 
            value: Math.abs(metrics.todayCases.change), 
            type: metrics.todayCases.change >= 0 ? 'increase' as const : 'decrease' as const 
          },
          icon: Users,
          variant: 'info' as const,
          confidence: metrics.todayCases.confidence
        },
        {
          title: t('kpi.openAlerts'),
          value: metrics.openAlerts.value.toString(),
          change: { 
            value: Math.abs(metrics.openAlerts.change), 
            type: metrics.openAlerts.change >= 0 ? 'increase' as const : 'decrease' as const 
          },
          icon: AlertTriangle,
          variant: metrics.openAlerts.value > 5 ? 'danger' as const : 'warning' as const,
          confidence: metrics.openAlerts.confidence
        },
        {
          title: t('kpi.diseaseTypes'),
          value: metrics.diseaseTypes.value.toString(),
          change: metrics.diseaseTypes.change !== 0 ? { 
            value: Math.abs(metrics.diseaseTypes.change), 
            type: metrics.diseaseTypes.change >= 0 ? 'increase' as const : 'decrease' as const 
          } : undefined,
          icon: Activity,
          variant: 'success' as const,
          confidence: metrics.diseaseTypes.confidence
        },
        {
          title: t('kpi.vaccinationRate'),
          value: `${metrics.vaccinationRate.value}%`,
          change: { 
            value: Math.abs(metrics.vaccinationRate.change), 
            // For vaccination, increase is GOOD (green), decrease is BAD (red)
            type: metrics.vaccinationRate.change >= 0 ? 'decrease' as const : 'increase' as const 
          },
          icon: Heart,
          variant: 'success' as const,
          confidence: metrics.vaccinationRate.confidence
        }
      ];
    }

    // Fallback to local data
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const todayCases = dailyCounts
      .filter(count => count.day === today)
      .reduce((sum, count) => sum + count.cases, 0);
    
    const openAlerts = alerts.filter(alert => alert.status === 'open').length;
    
    const recentDiseases = new Set(
      dailyCounts
        .filter(count => count.day >= sevenDaysAgo)
        .map(count => count.disease_code)
    ).size;

    return [
      {
        title: t('kpi.todayCases'),
        value: todayCases.toLocaleString(locale),
        change: todayCases > 0 ? { value: 12, type: 'increase' as const } : undefined,
        icon: Users,
        variant: 'info' as const
      },
      {
        title: t('kpi.openAlerts'),
        value: openAlerts.toString(),
        change: openAlerts > 0 ? { value: 2, type: 'decrease' as const } : undefined,
        icon: AlertTriangle,
        variant: openAlerts > 5 ? 'danger' as const : 'warning' as const
      },
      {
        title: t('kpi.diseaseTypes'),
        value: recentDiseases.toString(),
        change: recentDiseases > 0 ? { value: 1, type: 'increase' as const } : undefined,
        icon: Activity,
        variant: 'success' as const
      },
      {
        title: t('kpi.vaccinationRate'),
        value: "92%",
        change: { value: 3, type: 'decrease' as const },
        icon: Heart,
        variant: 'success' as const
      }
    ];
  };

  const kpiCards = getKpiCards();

  return (
    <div className="space-y-3">
      {/* Header with Status Badges */}
      <div className="flex items-center justify-end gap-2">
        {/* Refresh button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => fetchKpiFromAI(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </Button>

        {/* AI Search Status */}
        {isFromAI && (
          <Badge 
            variant="outline" 
            className="rounded-lg px-2 py-0.5 text-xs border-primary/50 bg-primary/10 text-primary"
          >
            <Globe className="h-3 w-3 mr-1" />
            Web Search
          </Badge>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {i18n.language === 'vi' ? 'Đang tải...' : 'Loading...'}
          </Badge>
        )}
        
        {/* Live Status */}
        <Badge 
          variant="outline" 
          className={cn(
            "rounded-lg px-2 py-0.5 text-xs",
            isConnected 
              ? "border-success/50 bg-success/10 text-success" 
              : "border-muted"
          )}
        >
          {isConnected ? (
            <span className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              {t('dashboard.live')}
            </span>
          ) : (
            <span>○ {t('dashboard.offline')}</span>
          )}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <div 
            key={index} 
            className="animate-fade-up" 
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <KpiCard {...kpi} />
          </div>
        ))}
      </div>

      {/* Sources footer */}
      {sources && sources.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <span>{i18n.language === 'vi' ? 'Nguồn:' : 'Sources:'}</span>
          {sources.slice(0, 4).map((source, idx) => (
            <a 
              key={idx} 
              href={source.startsWith('http') ? source : `https://${source}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal hover:bg-accent cursor-pointer">
                {source.replace('https://', '').replace('http://', '').split('/')[0]}
              </Badge>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

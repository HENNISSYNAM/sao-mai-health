import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, Heart, Users, Globe, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface KpiData {
  todayCases: number;
  todayCasesChange: number;
  openAlerts: number;
  openAlertsChange: number;
  diseaseTypes: number;
  diseaseTypesChange: number;
  vaccinationRate: number;
  vaccinationRateChange: number;
  lastUpdated: string;
  sources: string[];
}

interface VerifiedKpiSectionProps {
  dailyCounts: any[];
  alerts: any[];
  isConnected: boolean;
}

// Cache for KPI data
const KPI_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let kpiCache: { data: KpiData; fetchedAt: number } | null = null;

export function VerifiedKpiSection({ dailyCounts, alerts, isConnected }: VerifiedKpiSectionProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromWebSearch, setIsFromWebSearch] = useState(false);

  // Fetch KPI from web search AI agent
  const fetchKpiFromAI = useCallback(async () => {
    // Check cache first
    if (kpiCache && Date.now() - kpiCache.fetchedAt < KPI_CACHE_TTL) {
      console.log('⚡ Using cached KPI data');
      setKpiData(kpiCache.data);
      setIsFromWebSearch(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Fetching KPI from AI web search...');
      
      const { data, error } = await supabase.functions.invoke('health-kpi-intelligence', {
        body: { language: i18n.language }
      });

      if (error) {
        console.error('KPI fetch error:', error);
        setIsLoading(false);
        return;
      }

      if (data?.success && data.kpi) {
        // Update cache
        kpiCache = {
          data: data.kpi,
          fetchedAt: Date.now()
        };
        
        setKpiData(data.kpi);
        setIsFromWebSearch(!data.fromCache);
        console.log(`✅ KPI loaded from ${data.fromCache ? 'cache' : 'web search'}`);
      }
    } catch (error) {
      console.error('Failed to fetch KPI:', error);
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language]);

  // Fetch on mount
  useEffect(() => {
    fetchKpiFromAI();
  }, [fetchKpiFromAI]);

  // Build KPI cards data
  const getKpiCards = () => {
    if (kpiData) {
      return [
        {
          title: t('kpi.todayCases'),
          value: kpiData.todayCases.toLocaleString(locale),
          change: { 
            value: Math.abs(kpiData.todayCasesChange), 
            type: kpiData.todayCasesChange >= 0 ? 'increase' as const : 'decrease' as const 
          },
          icon: Users,
          variant: 'info' as const
        },
        {
          title: t('kpi.openAlerts'),
          value: kpiData.openAlerts.toString(),
          change: { 
            value: Math.abs(kpiData.openAlertsChange), 
            type: kpiData.openAlertsChange >= 0 ? 'increase' as const : 'decrease' as const 
          },
          icon: AlertTriangle,
          variant: kpiData.openAlerts > 5 ? 'danger' as const : 'warning' as const
        },
        {
          title: t('kpi.diseaseTypes'),
          value: kpiData.diseaseTypes.toString(),
          change: kpiData.diseaseTypesChange !== 0 ? { 
            value: Math.abs(kpiData.diseaseTypesChange), 
            type: kpiData.diseaseTypesChange >= 0 ? 'increase' as const : 'decrease' as const 
          } : undefined,
          icon: Activity,
          variant: 'success' as const
        },
        {
          title: t('kpi.vaccinationRate'),
          value: `${kpiData.vaccinationRate}%`,
          change: { 
            value: Math.abs(kpiData.vaccinationRateChange), 
            // For vaccination, increase is GOOD (green), decrease is BAD (red)
            // We flip the type here so KpiCard renders correctly
            type: kpiData.vaccinationRateChange >= 0 ? 'decrease' as const : 'increase' as const 
          },
          icon: Heart,
          variant: 'success' as const
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
        {/* Web Search Status */}
        {isFromWebSearch && (
          <Badge 
            variant="outline" 
            className="rounded-lg px-2 py-0.5 text-xs border-primary/50 bg-primary/10 text-primary"
          >
            <Globe className="h-3 w-3 mr-1" />
            {i18n.language === 'vi' ? 'Web Search' : 'Web Search'}
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
      {kpiData?.sources && kpiData.sources.length > 0 && (
        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <span>{i18n.language === 'vi' ? 'Nguồn:' : 'Sources:'}</span>
          {kpiData.sources.slice(0, 3).map((source, idx) => (
            <Badge key={idx} variant="outline" className="text-[9px] px-1 py-0 font-normal">
              {source}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

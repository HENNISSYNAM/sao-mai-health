import { useEffect, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Activity, AlertTriangle, Heart, Users, RefreshCw, Newspaper, ArrowRight } from "lucide-react"
import { KpiCard } from "@/components/KpiCard"
import { DashboardChart } from "@/components/DashboardChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useRealtimeDailyCounts, useRealtimeAlerts } from "@/hooks/useRealtimeHealth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SystemHealthOverview } from "@/components/dashboard/SystemHealthOverview"
import { HealthDataSynthesis } from "@/components/dashboard/HealthDataSynthesis"
import { RegionalRiskMap } from "@/components/dashboard/RegionalRiskMap"
import { PipelineStatus } from "@/components/dashboard/PipelineStatus"
import { HealthNewsFeed } from "@/components/dashboard/HealthNewsFeed"
import { useHealthPipeline } from "@/hooks/useHealthPipeline"

interface DailyCount {
  id: string
  day: string
  disease_code: string
  district_id: string
  cases: number
  created_at: string
}

interface Alert {
  id: string
  disease_code: string
  day: string
  cases: number
  status: string
  created_at: string
  closed_at?: string
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingNews, setFetchingNews] = useState(false)

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  // Multi-agent pipeline hook
  const { 
    data: pipelineData, 
    isLoading: pipelineLoading, 
    isConnected: pipelineConnected,
    lastUpdated: pipelineLastUpdated,
    triggerPipeline
  } = useHealthPipeline(true, 5 * 60 * 1000) // Auto-refresh every 5 minutes

  const { isConnected: countsConnected, nowTs } = useRealtimeDailyCounts((payload) => {
    fetchInitialData()
  })

  const { isConnected: alertsConnected } = useRealtimeAlerts((payload) => {
    fetchAlerts()
  })

  const fetchInitialData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-hcmc-data', {
        body: { type: 'diseases' }
      })
      
      if (error) {
        console.error('Error fetching HCMC disease data:', error)
        return
      }
      
      if (data?.success && data?.data) {
        const formattedData: DailyCount[] = data.data.map((item: any) => ({
          id: `${item.disease_code}-${item.district_id}-${item.date}`,
          day: item.date,
          district_id: item.district_id,
          disease_code: item.disease_code,
          cases: item.cases,
          created_at: new Date().toISOString()
        }))
        
        setDailyCounts(formattedData)
      }
    } catch (error) {
      console.error('Error fetching daily counts:', error)
    }
  }

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-hcmc-data', {
        body: { type: 'alerts' }
      })
      
      if (error) {
        console.error('Error fetching HCMC alerts:', error)
        return
      }
      
      if (data?.success && data?.data) {
        const formattedAlerts: Alert[] = data.data.map((item: any) => ({
          id: item.id,
          disease_code: extractDiseaseFromTitle(item.title),
          day: new Date(item.created_at).toISOString().split('T')[0],
          cases: extractCasesFromTitle(item.title),
          status: item.status,
          created_at: item.created_at
        }))
        
        setAlerts(formattedAlerts)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const extractCasesFromTitle = (title: string): number => {
    const match = title.match(/(\d+)\s*ca/)
    return match ? parseInt(match[1]) : 0
  }

  const extractDiseaseFromTitle = (title: string): string => {
    if (title.toLowerCase().includes('dengue')) return 'dengue'
    if (title.toLowerCase().includes('covid')) return 'covid19'
    if (title.toLowerCase().includes('hfmd')) return 'hfmd'
    return 'unknown'
  }

  const fetchNewsData = async () => {
    setFetchingNews(true)
    toast.info(t('common.loading'))
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-disease-news')
      
      if (error) throw error
      
      if (data?.success) {
        toast.success(t('common.success'))
        await Promise.all([fetchInitialData(), fetchAlerts()])
      } else {
        toast.error(t('common.error'))
      }
    } catch (error: any) {
      console.error('Error fetching news:', error)
      toast.error(t('common.error'))
    } finally {
      setFetchingNews(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchInitialData(), fetchAlerts()])
      setLoading(false)
    }
    loadData()
  }, [])

  const kpiData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const todayCases = dailyCounts
      .filter(count => count.day === today)
      .reduce((sum, count) => sum + count.cases, 0)

    const openAlerts = alerts.filter(alert => alert.status === 'open').length

    const recentDiseases = new Set(
      dailyCounts
        .filter(count => count.day >= sevenDaysAgo)
        .map(count => count.disease_code)
    ).size

    return [
      {
        title: t('dashboard.todayCases'),
        value: todayCases.toLocaleString(locale),
        change: { value: 12, type: 'increase' as const },
        icon: Users,
        variant: 'info' as const
      },
      {
        title: t('dashboard.openAlerts'),
        value: openAlerts.toString(),
        change: { value: 2, type: 'decrease' as const },
        icon: AlertTriangle,
        variant: openAlerts > 5 ? 'danger' as const : 'warning' as const
      },
      {
        title: t('dashboard.diseaseTypes'),
        value: recentDiseases.toString(),
        change: { value: 1, type: 'increase' as const },
        icon: Activity,
        variant: 'success' as const
      },
      {
        title: t('dashboard.vaccinationRate'),
        value: "92%",
        change: { value: 3, type: 'increase' as const },
        icon: Heart,
        variant: 'success' as const
      }
    ]
  }, [dailyCounts, alerts, t, locale])

  const trendData = useMemo(() => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStr = date.toISOString().split('T')[0]
      const dayName = date.toLocaleDateString(locale, { weekday: 'short' })
      
      const dayCases = dailyCounts
        .filter(count => count.day === dayStr)
        .reduce((sum, count) => sum + count.cases, 0)
      
      last7Days.push({ name: dayName, value: dayCases })
    }
    return last7Days
  }, [dailyCounts, locale])

  const diseaseData = useMemo(() => {
    const diseaseMap: Record<string, number> = {}
    dailyCounts.forEach(count => {
      diseaseMap[count.disease_code] = (diseaseMap[count.disease_code] || 0) + count.cases
    })
    
    return Object.entries(diseaseMap)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [dailyCounts])

  const districtData = useMemo(() => {
    const districtMap: Record<string, number> = {}
    dailyCounts.forEach(count => {
      districtMap[count.district_id] = (districtMap[count.district_id] || 0) + count.cases
    })
    
    return Object.entries(districtMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [dailyCounts])

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-fade-up">
        <div className="space-y-1">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchNewsData}
            disabled={fetchingNews}
            size="sm"
            className="gap-2 rounded-xl"
          >
            {fetchingNews ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Newspaper className="h-4 w-4" />
            )}
            {t('dashboard.fetchNews')}
          </Button>
          <Badge 
            variant="outline" 
            className={cn(
              "rounded-lg px-3 py-1",
              countsConnected && alertsConnected 
                ? "border-success/50 bg-success/10 text-success" 
                : "border-muted"
            )}
          >
            {countsConnected && alertsConnected ? `● ${t('dashboard.live')}` : `○ ${t('dashboard.offline')}`}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {nowTs.toLocaleTimeString(locale)}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <div key={index} className="animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
            <KpiCard {...kpi} />
          </div>
        ))}
      </div>

      {/* Multi-Agent Pipeline Status */}
      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <PipelineStatus 
          isLoading={pipelineLoading}
          isConnected={pipelineConnected}
          lastUpdated={pipelineLastUpdated}
          onRefresh={triggerPipeline}
          dataQuality={pipelineData?.dataQuality}
        />
      </div>

      {/* System Health Overview - News Intelligence */}
      <div className="animate-fade-up" style={{ animationDelay: '150ms' }}>
        <SystemHealthOverview />
      </div>

      {/* Regional Risk Map - GPS-based Classification */}
      {pipelineData?.chartData?.regionalRisks && pipelineData.chartData.regionalRisks.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '175ms' }}>
          <RegionalRiskMap 
            regionalRisks={pipelineData.chartData.regionalRisks}
            userRegion={pipelineData.riskSummary?.userRegion}
            isLoading={pipelineLoading}
          />
        </div>
      )}

      {/* Health Data Synthesis - Observed + Predicted */}
      <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <HealthDataSynthesis />
      </div>

      {/* Charts Row 1 - with News Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="animate-fade-up lg:col-span-2" style={{ animationDelay: '200ms' }}>
          <DashboardChart
            title={t('dashboard.caseTrend')}
            data={trendData}
            type="line"
            multiSeries={false}
          />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '250ms' }}>
          <HealthNewsFeed />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
          <DashboardChart
            title={t('dashboard.diseaseDistribution')}
            data={diseaseData}
            type="bar"
            multiSeries={false}
          />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '350ms' }}>
          <DashboardChart
            title={t('dashboard.districtDistribution')}
            data={districtData}
            type="bar"
            multiSeries={false}
          />
        </div>
      </div>

      {/* Recent Alerts */}
      <Card className="rounded-2xl border-border/50 animate-fade-up" style={{ animationDelay: '400ms' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div>
                <CardTitle className="text-base">{t('dashboard.recentAlerts')}</CardTitle>
                <CardDescription className="text-xs">
                  {alerts.filter(a => a.status === 'open').length} {t('alerts.open').toLowerCase()}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => window.location.href = '/alerts'}>
              {t('common.all')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('common.noData')}</p>
            </div>
          ) : (
            alerts.slice(0, 4).map((alert) => (
              <div 
                key={alert.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    alert.status === 'open' ? "bg-danger animate-pulse" : "bg-muted"
                  )} />
                  <div>
                    <p className="text-sm font-medium">
                      {t(`diseases.${alert.disease_code}`, alert.disease_code.toUpperCase())} - {alert.cases} {i18n.language === 'vi' ? 'ca' : 'cases'}
                    </p>
                    <p className="text-xs text-muted-foreground">{alert.day}</p>
                  </div>
                </div>
                <Badge 
                  variant={alert.status === 'open' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {alert.status === 'open' ? t('alerts.open') : t('alerts.closed')}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

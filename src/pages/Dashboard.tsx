import { useEffect, useState, useMemo } from "react"
import { Activity, AlertTriangle, Building2, Heart, Users, RefreshCw, Newspaper } from "lucide-react"
import { KpiCard } from "@/components/KpiCard"
import { DashboardChart } from "@/components/DashboardChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useRealtimeDailyCounts, useRealtimeAlerts } from "@/hooks/useRealtimeHealth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

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
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingNews, setFetchingNews] = useState(false)

  // Realtime subscriptions
  const { isConnected: countsConnected, nowTs } = useRealtimeDailyCounts((payload) => {
    // Refresh KPIs when daily_counts updates
    fetchInitialData()
  })

  const { isConnected: alertsConnected } = useRealtimeAlerts((payload) => {
    // Refresh alerts when alerts table updates
    fetchAlerts()
  })

  const fetchInitialData = async () => {
    try {
      // Fetch real data from HCMC API
      const { data, error } = await supabase.functions.invoke('fetch-hcmc-data', {
        body: { type: 'diseases' }
      })
      
      if (error) {
        console.error('Error fetching HCMC disease data:', error)
        return
      }
      
      if (data?.success && data?.data) {
        // Convert API data to DailyCount format
        const formattedData: DailyCount[] = data.data.map((item: any) => ({
          id: `${item.disease_code}-${item.district_id}-${item.date}`,
          day: item.date,
          district_id: item.district_id,
          disease_code: item.disease_code,
          cases: item.cases,
          created_at: new Date().toISOString()
        }))
        
        setDailyCounts(formattedData)
        console.log(`Loaded ${formattedData.length} disease records from HCMC API`)
      }
    } catch (error) {
      console.error('Error fetching daily counts:', error)
    }
  }

  const fetchAlerts = async () => {
    try {
      // Fetch real alerts from HCMC API
      const { data, error } = await supabase.functions.invoke('fetch-hcmc-data', {
        body: { type: 'alerts' }
      })
      
      if (error) {
        console.error('Error fetching HCMC alerts:', error)
        return
      }
      
      if (data?.success && data?.data) {
        // Convert API data to Alert format
        const formattedAlerts: Alert[] = data.data.map((item: any) => ({
          id: item.id,
          disease_code: extractDiseaseFromTitle(item.title),
          day: new Date(item.created_at).toISOString().split('T')[0],
          cases: extractCasesFromTitle(item.title),
          status: item.status,
          created_at: item.created_at
        }))
        
        setAlerts(formattedAlerts)
        console.log(`Loaded ${formattedAlerts.length} alerts from HCMC API`)
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
    toast.info('🔍 Đang thu thập tin tức mới nhất...')
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-disease-news')
      
      if (error) throw error
      
      if (data?.success) {
        toast.success(`✅ Đã phân tích ${data.articlesFound} tin tức, cập nhật ${data.casesInserted} ca bệnh, tạo ${data.alertsCreated} cảnh báo`)
        
        // Refresh data
        await Promise.all([fetchInitialData(), fetchAlerts()])
      } else {
        toast.error('❌ Không thể thu thập tin tức')
      }
    } catch (error: any) {
      console.error('Error fetching news:', error)
      toast.error('❌ Lỗi khi thu thập tin tức')
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

  // Calculate KPIs from real data
  const kpiData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Today's cases
    const todayCases = dailyCounts
      .filter(count => count.day === today)
      .reduce((sum, count) => sum + count.cases, 0)

    // Open alerts
    const openAlerts = alerts.filter(alert => alert.status === 'open').length

    // Diseases in last 7 days
    const recentDiseases = new Set(
      dailyCounts
        .filter(count => count.day >= sevenDaysAgo)
        .map(count => count.disease_code)
    ).size

    return [
      {
        title: "Ca bệnh hôm nay",
        value: todayCases.toLocaleString(),
        change: { value: 12, type: 'increase' as const },
        icon: Users,
        variant: 'info' as const
      },
      {
        title: "Cảnh báo mở",
        value: openAlerts.toString(),
        change: { value: 2, type: 'decrease' as const },
        icon: AlertTriangle,
        variant: openAlerts > 5 ? 'danger' as const : 'warning' as const
      },
      {
        title: "Bệnh (7 ngày)",
        value: recentDiseases.toString(),
        change: { value: 1, type: 'increase' as const },
        icon: Activity,
        variant: 'success' as const
      },
      {
        title: "Tỷ lệ tiêm chủng",
        value: "92%",
        change: { value: 3, type: 'increase' as const },
        icon: Heart,
        variant: 'success' as const
      }
    ]
  }, [dailyCounts, alerts])

  // Chart data from real daily counts
  const trendData = useMemo(() => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStr = date.toISOString().split('T')[0]
      const dayName = date.toLocaleDateString('vi-VN', { weekday: 'short' })
      
      const dayCases = dailyCounts
        .filter(count => count.day === dayStr)
        .reduce((sum, count) => sum + count.cases, 0)
      
      last7Days.push({
        name: dayName,
        value: dayCases
      })
    }
    return last7Days
  }, [dailyCounts])

  // Disease distribution data
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

  // District distribution data
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tổng quan hệ thống</h1>
          <p className="text-muted-foreground">Giám sát y tế công cộng TP. Hồ Chí Minh</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tổng quan hệ thống</h1>
          <p className="text-muted-foreground">Giám sát y tế công cộng TP. Hồ Chí Minh</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchNewsData}
            disabled={fetchingNews}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {fetchingNews ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Đang cập nhật...
              </>
            ) : (
              <>
                <Newspaper className="h-4 w-4" />
                Thu thập tin tức
              </>
            )}
          </Button>
          <Badge variant={countsConnected && alertsConnected ? "default" : "secondary"}>
            {countsConnected && alertsConnected ? "Live" : "Offline"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {nowTs.toLocaleTimeString('vi-VN')}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <KpiCard key={index} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardChart
          title="Xu hướng ca bệnh (7 ngày)"
          data={trendData}
          type="line"
          multiSeries={false}
        />
        <DashboardChart
          title="Phân bố theo loại bệnh"
          data={diseaseData}
          type="bar"
          multiSeries={false}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardChart
          title="Phân bố theo quận/huyện"
          data={districtData}
          type="bar"
          multiSeries={false}
        />
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Cảnh báo gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có cảnh báo</p>
              ) : (
                alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={alert.status === 'open' ? 'destructive' : 'secondary'}
                        className="min-w-[50px] justify-center"
                      >
                        {alert.status === 'open' ? 'Đông' : 'Đóng'}
                      </Badge>
                      <span className="text-sm">
                        {alert.disease_code} - {alert.cases} ca tại {alert.day}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
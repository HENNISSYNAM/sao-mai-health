import { useEffect, useState, useMemo } from "react"
import { Activity, AlertTriangle, Building2, Heart, Users, TrendingUp, BarChart3, Calendar, MapPin } from "lucide-react"
import { KpiCard } from "@/components/KpiCard"
import { DashboardChart } from "@/components/DashboardChart"
import { DiseaseStreamChart } from "@/components/DiseaseStreamChart"
import { AIAssistant } from "@/components/AIAssistant"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/integrations/supabase/client"
import { useRealtimeDailyCounts, useRealtimeAlerts } from "@/hooks/useRealtimeHealth"

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
  district_id?: string
  ward_id?: string
}

interface DetailedMetric {
  name: string
  value: number
  change: number
  trend: 'up' | 'down' | 'neutral'
  details: string
}

const Index = () => {
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>(['dengue', 'covid19', 'tcm', 'ari'])

  // Realtime subscriptions
  const { isConnected: countsConnected, nowTs } = useRealtimeDailyCounts((payload) => {
    fetchInitialData()
  })

  const { isConnected: alertsConnected } = useRealtimeAlerts((payload) => {
    fetchAlerts()
  })

  const fetchInitialData = async () => {
    try {
      // Enhanced mock data with more diseases and districts
      const mockData: DailyCount[] = []
      const diseases = ['dengue', 'covid19', 'tcm', 'ari', 'h1n1', 'malaria']
      const districts = ['quan_1', 'quan_3', 'quan_7', 'binh_thanh', 'tan_binh', 'thu_duc']
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dayStr = date.toISOString().split('T')[0]
        
        diseases.forEach((disease) => {
          districts.forEach((district) => {
            const baseCases = disease === 'dengue' ? 30 : disease === 'covid19' ? 20 : 15
            const seasonalMultiplier = disease === 'dengue' ? (Math.sin(i * 0.2) + 1.5) : 1
            const randomFactor = 0.7 + Math.random() * 0.6
            
            mockData.push({
              id: `mock-${i}-${disease}-${district}`,
              day: dayStr,
              disease_code: disease,
              district_id: district,
              cases: Math.floor(baseCases * seasonalMultiplier * randomFactor),
              created_at: date.toISOString()
            })
          })
        })
      }
      setDailyCounts(mockData)
    } catch (error) {
      console.error('Error fetching daily counts:', error)
    }
  }

  const fetchAlerts = async () => {
    try {
      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          disease_code: 'dengue',
          day: new Date().toISOString().split('T')[0],
          cases: 85,
          status: 'open',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          district_id: 'quan_1',
          ward_id: 'ben_nghe'
        },
        {
          id: 'alert-2',
          disease_code: 'covid19',
          day: new Date().toISOString().split('T')[0],
          cases: 42,
          status: 'investigating',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          district_id: 'binh_thanh',
          ward_id: '12'
        },
        {
          id: 'alert-3',
          disease_code: 'tcm',
          day: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cases: 28,
          status: 'closed',
          created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          closed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          district_id: 'quan_7'
        },
        {
          id: 'alert-4',
          disease_code: 'ari',
          day: new Date().toISOString().split('T')[0],
          cases: 156,
          status: 'open',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          district_id: 'thu_duc'
        }
      ]
      setAlerts(mockAlerts)
    } catch (error) {
      console.error('Error fetching alerts:', error)
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

  // Enhanced KPIs with more detailed calculations
  const kpiData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Today's cases
    const todayCases = dailyCounts
      .filter(count => count.day === today)
      .reduce((sum, count) => sum + count.cases, 0)

    const yesterdayCases = dailyCounts
      .filter(count => count.day === yesterday)
      .reduce((sum, count) => sum + count.cases, 0)

    const caseChange = yesterdayCases > 0 ? ((todayCases - yesterdayCases) / yesterdayCases) * 100 : 0

    // Open alerts
    const openAlerts = alerts.filter(alert => alert.status === 'open').length
    const investigatingAlerts = alerts.filter(alert => alert.status === 'investigating').length
    
    // Diseases in last 7 days
    const recentDiseases = new Set(
      dailyCounts
        .filter(count => count.day >= sevenDaysAgo)
        .map(count => count.disease_code)
    ).size

    // Most affected district
    const districtCases = dailyCounts
      .filter(count => count.day >= sevenDaysAgo)
      .reduce((acc, count) => {
        acc[count.district_id] = (acc[count.district_id] || 0) + count.cases
        return acc
      }, {} as Record<string, number>)

    const topDistrict = Object.entries(districtCases)
      .sort(([,a], [,b]) => b - a)[0]

    return [
      {
        title: "Ca bệnh hôm nay",
        value: todayCases.toLocaleString(),
        change: { value: Math.abs(Math.round(caseChange)), type: caseChange >= 0 ? 'increase' as const : 'decrease' as const },
        icon: Users,
        variant: caseChange > 20 ? 'danger' as const : caseChange > 5 ? 'warning' as const : 'info' as const
      },
      {
        title: "Cảnh báo đang mở",
        value: openAlerts.toString(),
        change: { value: investigatingAlerts, type: 'increase' as const },
        icon: AlertTriangle,
        variant: openAlerts > 3 ? 'danger' as const : openAlerts > 1 ? 'warning' as const : 'success' as const
      },
      {
        title: "Loại bệnh (7 ngày)",
        value: recentDiseases.toString(),
        change: { value: 2, type: 'increase' as const },
        icon: Activity,
        variant: 'info' as const
      },
      {
        title: "Quận ảnh hưởng nhiều nhất",
        value: topDistrict ? topDistrict[0].replace('_', ' ').toUpperCase() : "N/A",
        change: { value: topDistrict ? Math.round((topDistrict[1] / Object.values(districtCases).reduce((a, b) => a + b, 0)) * 100) : 0, type: 'increase' as const },
        icon: MapPin,
        variant: 'warning' as const
      }
    ]
  }, [dailyCounts, alerts])

  // Enhanced chart data with multiple series and diseases
  const trendData = useMemo(() => {
    const last14Days = []
    const diseases = ['dengue', 'covid19', 'tcm', 'ari', 'h1n1', 'malaria']
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStr = date.toISOString().split('T')[0]
      const dayName = date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
      
      const dayData: any = { name: dayName }
      let totalCases = 0
      
      diseases.forEach(disease => {
        const cases = dailyCounts
          .filter(count => count.day === dayStr && count.disease_code === disease)
          .reduce((sum, count) => sum + count.cases, 0)
        dayData[disease] = cases
        totalCases += cases
      })
      
      dayData.value = totalCases
      last14Days.push(dayData)
    }
    return last14Days
  }, [dailyCounts])

  const handleDiseaseToggle = (disease: string) => {
    setSelectedDiseases(prev => 
      prev.includes(disease) 
        ? prev.filter(d => d !== disease)
        : [...prev, disease]
    )
  }

  // District distribution data
  const districtData = useMemo(() => {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const districtCases = dailyCounts
      .filter(count => count.day >= last7Days)
      .reduce((acc, count) => {
        const displayName = count.district_id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        acc[displayName] = (acc[displayName] || 0) + count.cases
        return acc
      }, {} as Record<string, number>)

    return Object.entries(districtCases)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [dailyCounts])

  const getAlertStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Đang mở</Badge>
      case 'investigating':
        return <Badge className="bg-warning text-warning-foreground">Điều tra</Badge>
      case 'closed':
        return <Badge variant="secondary">Đã đóng</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDiseaseName = (code: string) => {
    const names: Record<string, string> = {
      dengue: 'Sốt xuất huyết',
      covid19: 'COVID-19',
      tcm: 'Tay chân miệng',
      ari: 'Nhiễm khuẩn hô hấp',
      h1n1: 'Cúm H1N1',
      malaria: 'Sốt rét'
    }
    return names[code] || code
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tổng quan hệ thống</h1>
          <p className="text-muted-foreground">Giám sát y tế công cộng TP. Hồ Chí Minh</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tổng quan hệ thống</h1>
          <p className="text-muted-foreground">Giám sát y tế công cộng TP. Hồ Chí Minh</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={countsConnected && alertsConnected ? "default" : "secondary"} className="px-3 py-1">
            {countsConnected && alertsConnected ? "🟢 Trực tuyến" : "🔴 Ngoại tuyến"}
          </Badge>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Cập nhật lần cuối</div>
            <div className="text-sm font-medium">{nowTs.toLocaleTimeString('vi-VN')}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <KpiCard key={index} {...kpi} />
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DiseaseStreamChart
            title="Phân loại xu hướng bệnh theo luồng (14 ngày)"
            data={trendData}
            selectedDiseases={selectedDiseases}
            onDiseaseToggle={handleDiseaseToggle}
          />
        </div>
        <DashboardChart
          title="Phân bố theo quận (7 ngày)"
          data={districtData}
          type="bar"
          dataKey="value"
        />
      </div>

      {/* Detailed Analytics & Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts Panel */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Cảnh báo & Sự kiện
              </CardTitle>
              <Button variant="outline" size="sm" className="text-xs">
                Xem tất cả
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-sm text-muted-foreground">Không có cảnh báo nào</p>
              </div>
            ) : (
              alerts.slice(0, 4).map((alert, index) => (
                <div key={alert.id}>
                  <div className="flex items-start justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getAlertStatusBadge(alert.status)}
                        <span className="text-sm font-medium">
                          {getDiseaseName(alert.disease_code)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>{alert.cases} ca</strong> tại {alert.district_id?.replace('_', ' ').toUpperCase()}
                        {alert.ward_id && `, phường ${alert.ward_id}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Chi tiết
                    </Button>
                  </div>
                  {index < alerts.length - 1 && index < 3 && (
                    <Separator className="my-3" />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Thống kê nhanh
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="text-2xl font-bold text-primary">{alerts.filter(a => a.status === 'open').length}</div>
                <div className="text-xs text-muted-foreground">Cảnh báo mở</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-success/5 border border-success/10">
                <div className="text-2xl font-bold text-success">{alerts.filter(a => a.status === 'closed').length}</div>
                <div className="text-xs text-muted-foreground">Đã xử lý</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Hành động nhanh</h4>
              <div className="grid gap-2">
                <Button variant="outline" size="sm" className="justify-start gap-2">
                  <Calendar className="h-4 w-4" />
                  Báo cáo hàng tuần
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Phân tích xu hướng
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2">
                  <Building2 className="h-4 w-4" />
                  Quản lý cơ sở
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant */}
      <AIAssistant position="corner" />
    </div>
  )
};

export default Index;

import { useMemo } from "react"
import { Activity, AlertTriangle, Heart, Users } from "lucide-react"
import { KpiCard } from "@/components/KpiCard"
import { DashboardChart } from "@/components/DashboardChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useHealthRealtime } from "@/contexts/HealthRealtimeContext"

export default function Dashboard() {
  const { dailyCounts, alerts, isConnected, loading, lastTick } = useHealthRealtime()

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
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Live" : "Offline"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {lastTick}
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
                      >
                        {alert.status === 'open' ? 'Mở' : 'Đóng'}
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
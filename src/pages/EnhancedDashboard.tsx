import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KpiCard } from "@/components/KpiCard"
import { DashboardChart } from "@/components/DashboardChart"
import { HealthAPI } from "@/services/healthAPI"
import { useRealtimeMetrics, useRealtimeAlerts } from "@/hooks/useRealtimeHealth"
import { useOfflineFirst } from "@/hooks/useOfflineFirst"
import { 
  TrendingUp, TrendingDown, Activity, Bed, Shield, 
  AlertTriangle, Users, MapPin, Zap, Clock,
  RefreshCw, Wifi, WifiOff
} from "lucide-react"
import { toast } from "sonner"

interface DashboardMetric {
  metric_name: string
  value: number
  change: {
    value: number
    type: 'increase' | 'decrease'
  }
  trend: number
  last_updated: string
}

interface Alert {
  id: string
  type: 'anomaly' | 'outbreak' | 'threshold' | 'quality'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'backlog' | 'acknowledged' | 'assigned' | 'investigating' | 'resolved'
  location: string
  disease_code?: string
  created_at: string
}

export default function EnhancedDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d')
  const [loading, setLoading] = useState(true)

  // Realtime hooks
  const { data: realtimeMetrics, isConnected: metricsConnected } = useRealtimeMetrics()
  const { data: realtimeAlerts, isConnected: alertsConnected } = useRealtimeAlerts()
  const { isOnline, pendingSync, syncPendingRecords } = useOfflineFirst()

  // Load initial data
  useEffect(() => {
    loadDashboardData()
  }, [selectedDistrict, selectedTimeRange])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load metrics
      const metricsData = await HealthAPI.getDashboardMetrics()
      setMetrics(metricsData || [])
      
      // Load alerts
      const alertsData = await HealthAPI.getAlerts({ 
        status: 'backlog',
        limit: 10 
      })
      setAlerts(alertsData || [])
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Không thể tải dữ liệu dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Process metrics for KPI cards
  const getMetricValue = (name: string) => {
    const metric = metrics.find(m => m.metric_name === name)
    return metric ? metric.value : 0
  }

  const getMetricTrend = (name: string) => {
    const metric = metrics.find(m => m.metric_name === name)
    return metric?.change || { value: 0, type: 'increase' as const }
  }

  // Mock data for charts (in real app, this would come from API)
  const trendData = [
    { name: '2024-01-15', value: 45, dengue: 45, tcm: 23, ari: 67 },
    { name: '2024-01-16', value: 52, dengue: 52, tcm: 19, ari: 71 },
    { name: '2024-01-17', value: 48, dengue: 48, tcm: 25, ari: 63 },
    { name: '2024-01-18', value: 61, dengue: 61, tcm: 31, ari: 69 },
    { name: '2024-01-19', value: 55, dengue: 55, tcm: 28, ari: 74 },
    { name: '2024-01-20', value: 67, dengue: 67, tcm: 33, ari: 82 },
    { name: '2024-01-21', value: 59, dengue: 59, tcm: 29, ari: 77 }
  ]

  const facilityData = [
    { name: 'BV Chợ Rẫy', value: 85, occupancy: 85, capacity: 1200 },
    { name: 'BV Nhi Đồng 1', value: 92, occupancy: 92, capacity: 800 },
    { name: 'BV Từ Dũ', value: 78, occupancy: 78, capacity: 600 },
    { name: 'BV Bình Dan', value: 88, occupancy: 88, capacity: 500 },
    { name: 'BV Thống Nhất', value: 76, occupancy: 76, capacity: 400 }
  ]

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'bg-info text-white',
      medium: 'bg-warning text-white',
      high: 'bg-danger text-white',
      critical: 'bg-destructive text-white animate-pulse'
    }
    
    const labels = {
      low: 'Thấp',
      medium: 'Trung bình', 
      high: 'Cao',
      critical: 'Khẩn cấp'
    }

    return (
      <Badge className={variants[priority as keyof typeof variants]}>
        {labels[priority as keyof typeof labels]}
      </Badge>
    )
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'anomaly': return <TrendingUp className="h-4 w-4 text-danger" />
      case 'outbreak': return <MapPin className="h-4 w-4 text-warning" />
      case 'threshold': return <Activity className="h-4 w-4 text-info" />
      case 'quality': return <Shield className="h-4 w-4 text-muted-foreground" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tổng quan hệ thống</h1>
          <p className="text-muted-foreground">Giám sát y tế công cộng TPHCM</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-success" />
                <span className="text-sm text-success">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-danger" />
                <span className="text-sm text-danger">Offline</span>
              </>
            )}
            
            {pendingSync > 0 && (
              <Badge variant="outline" className="bg-warning text-white">
                {pendingSync} chờ sync
              </Badge>
            )}
          </div>

          {/* Filters */}
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Chọn quận/huyện" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả quận/huyện</SelectItem>
              <SelectItem value="q1">Quận 1</SelectItem>
              <SelectItem value="q2">Quận 2</SelectItem>
              <SelectItem value="q3">Quận 3</SelectItem>
              <SelectItem value="q4">Quận 4</SelectItem>
              <SelectItem value="q5">Quận 5</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">24h</SelectItem>
              <SelectItem value="7d">7 ngày</SelectItem>
              <SelectItem value="30d">30 ngày</SelectItem>
              <SelectItem value="90d">90 ngày</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              loadDashboardData()
              syncPendingRecords()
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Realtime Status */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${metricsConnected ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-sm">Metrics: {metricsConnected ? 'Realtime' : 'Offline'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${alertsConnected ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-sm">Alerts: {alertsConnected ? 'Realtime' : 'Offline'}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Ca mới hôm nay"
          value={getMetricValue('Ca mới hôm nay')}
          change={getMetricTrend('Ca mới hôm nay')}
          icon={Users}
          variant="default"
        />
        <KpiCard
          title="Rt 7 ngày"
          value={getMetricValue('Rt 7 ngày')}
          change={getMetricTrend('Rt 7 ngày')}
          icon={TrendingUp}
          variant="info"
        />
        <KpiCard
          title="Công suất giường"
          value={getMetricValue('Công suất giường')}
          change={getMetricTrend('Công suất giường')}
          icon={Bed}
          variant="warning"
        />
        <KpiCard
          title="Cảnh báo mở"
          value={alerts.length}
          change={{ value: 0, type: 'increase' }}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Xu hướng ca bệnh</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardChart
              title="Xu hướng ca bệnh"
              data={trendData}
              type="line"
              dataKey="value"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Công suất cơ sở y tế</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardChart
              title="Công suất cơ sở y tế"
              data={facilityData}
              type="bar"
              dataKey="value"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cảnh báo gần đây
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/alerts'}>
              Xem tất cả
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  {getAlertIcon(alert.type)}
                  <div>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground">{alert.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {alert.location}
                  </Badge>
                  {getPriorityBadge(alert.priority)}
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(alert.created_at).toLocaleString('vi-VN')}
                  </Badge>
                </div>
              </div>
            ))}
            
            {alerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Không có cảnh báo mới</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
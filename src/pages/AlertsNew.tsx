import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  X, 
  Bell,
  TrendingUp,
  MapPin,
  Activity,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Eye,
  RefreshCw,
  Zap,
  ThermometerSun,
  Wind,
  Droplets,
  Users,
  Send,
  FileText
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useRealtimeAlerts } from "@/hooks/useRealtimeHealth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CommandControlPanel } from "@/components/CommandControlPanel"

interface Alert {
  id: string
  disease_code: string
  day: string
  cases: number
  status: string
  rule?: string
  district_id?: string
  ward_id?: string
  created_at: string
  closed_at?: string
  level?: 'critical' | 'high' | 'medium' | 'low'
  title?: string
  description?: string
  avg7?: number
}

const DISEASE_NAMES: Record<string, string> = {
  'dengue': 'Sốt xuất huyết',
  'covid': 'COVID-19',
  'influenza': 'Cúm mùa',
  'hand_foot_mouth': 'Tay chân miệng',
  'tuberculosis': 'Lao phổi',
  'malaria': 'Sốt rét',
  'food_poisoning': 'Ngộ độc thực phẩm',
  'ari': 'Nhiễm trùng hô hấp',
  'diarrhea': 'Tiêu chảy',
  'stroke_risk': 'Nguy cơ đột quỵ'
}

const DISTRICT_NAMES: Record<string, string> = {
  'District_01': 'Quận 1',
  'District_02': 'Quận 2', 
  'District_03': 'Quận 3',
  'District_04': 'Quận 4',
  'District_05': 'Quận 5',
  'District_06': 'Quận 6',
  'District_07': 'Quận 7',
  'District_08': 'Quận 8',
  'District_09': 'Quận 9',
  'District_10': 'Quận 10',
  'District_12': 'Quận 12',
  'quan_1': 'Quận 1',
  'quan_3': 'Quận 3'
}

const LEVEL_CONFIG = {
  critical: { 
    label: 'Nghiêm trọng', 
    color: 'bg-red-500', 
    textColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: Zap
  },
  high: { 
    label: 'Cao', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: AlertTriangle
  },
  medium: { 
    label: 'Trung bình', 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: Activity
  },
  low: { 
    label: 'Thấp', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: Bell
  }
}

export default function AlertsNew() {
  const { t, i18n } = useTranslation()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Realtime subscription
  const { isConnected, nowTs } = useRealtimeAlerts((payload) => {
    if (soundEnabled && payload.eventType === 'INSERT') {
      playAlertSound()
      const diseaseKey = payload.new.disease_code as string
      toast.error(t('common.warning') as string, {
        description: (t(`diseases.${diseaseKey}`, diseaseKey) as string),
        duration: 5000
      })
    }
    fetchAlerts()
  })

  const playAlertSound = () => {
    try {
      const audio = new Audio('/alert-sound.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch (e) {}
  }

  const fetchAlerts = async () => {
    try {
      // Try to fetch from database first
      const { data: dbAlerts, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && dbAlerts && dbAlerts.length > 0) {
        const formattedAlerts = dbAlerts.map(a => ({
          ...a,
          level: determineLevel(a.cases, a.avg7)
        }))
        setAlerts(formattedAlerts)
      } else {
        // Fallback to mock data
        setAlerts(generateMockAlerts())
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
      setAlerts(generateMockAlerts())
    }
  }

  const determineLevel = (cases?: number, avg7?: number): 'critical' | 'high' | 'medium' | 'low' => {
    if (!cases) return 'low'
    if (cases > 40 || (avg7 && cases > avg7 * 2)) return 'critical'
    if (cases > 20 || (avg7 && cases > avg7 * 1.5)) return 'high'
    if (cases > 10) return 'medium'
    return 'low'
  }

  const generateMockAlerts = (): Alert[] => [
    {
      id: "alert-1",
      disease_code: "dengue",
      day: new Date(Date.now() - 1000 * 60 * 30).toISOString().split('T')[0],
      cases: 47,
      status: "open",
      rule: "Vượt ngưỡng 40 ca/ngày",
      district_id: "District_01", 
      ward_id: "Ward_BenThanh",
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      level: 'critical',
      title: 'Bùng phát sốt xuất huyết',
      description: 'Số ca sốt xuất huyết tăng đột biến tại Quận 1, vượt ngưỡng cảnh báo cao nhất.',
      avg7: 22
    },
    {
      id: "alert-2",
      disease_code: "stroke_risk",
      day: new Date(Date.now() - 1000 * 60 * 45).toISOString().split('T')[0],
      cases: 156,
      status: "open",
      rule: "Áp suất khí quyển giảm mạnh",
      district_id: "District_03",
      ward_id: "Ward_01_Q3", 
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      level: 'critical',
      title: 'Nguy cơ đột quỵ cao',
      description: 'Áp suất khí quyển giảm 15hPa trong 3 giờ, kết hợp với độ ẩm cao. Nguy cơ đột quỵ tăng 35%.',
      avg7: 89
    },
    {
      id: "alert-3",
      disease_code: "covid",
      day: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString().split('T')[0],
      cases: 28,
      status: "open",
      rule: "Tăng 60% so với tuần trước",
      district_id: "District_05",
      ward_id: "Ward_12_Q5", 
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      level: 'high',
      title: 'Gia tăng ca COVID-19',
      description: 'Số ca COVID-19 tăng nhanh so với tuần trước, cần giám sát chặt chẽ.',
      avg7: 17
    },
    {
      id: "alert-4",
      disease_code: "food_poisoning",
      day: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString().split('T')[0],
      cases: 22,
      status: "acknowledged",
      rule: "Ngộ độc thực phẩm tập thể",
      district_id: "District_06",
      ward_id: "Ward_05_Q6",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      level: 'high',
      title: 'Ngộ độc thực phẩm',
      description: 'Phát hiện 22 ca ngộ độc thực phẩm tại một nhà hàng. Đã cách ly và điều trị.',
      avg7: 3
    },
    {
      id: "alert-5",
      disease_code: "influenza",
      day: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString().split('T')[0],
      cases: 18,
      status: "open",
      rule: "Vượt ngưỡng mùa",
      district_id: "District_07",
      ward_id: "Ward_TanBinh",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      level: 'medium',
      title: 'Cúm mùa tăng cao',
      description: 'Số ca cúm mùa vượt ngưỡng trung bình mùa dịch.',
      avg7: 12
    },
    {
      id: "alert-6",
      disease_code: "hand_foot_mouth",
      day: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString().split('T')[0],
      cases: 15,
      status: "open",
      rule: "Cụm ca bệnh trong trường học",
      district_id: "District_10",
      ward_id: "Ward_02_Q10",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      level: 'medium',
      title: 'Tay chân miệng trong trường học',
      description: 'Phát hiện cụm ca tay chân miệng tại trường mầm non.',
      avg7: 8
    },
    {
      id: "alert-7",
      disease_code: "dengue",
      day: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0],
      cases: 12,
      status: "closed",
      rule: "Vượt ngưỡng 10 ca/ngày",
      district_id: "District_02",
      ward_id: "Ward_DaKao",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      closed_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      level: 'low',
      avg7: 6
    },
    {
      id: "alert-8",
      disease_code: "ari",
      day: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString().split('T')[0],
      cases: 8,
      status: "closed",
      rule: "Tăng trưởng bất thường",
      district_id: "District_04",
      ward_id: "Ward_06_Q4",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      closed_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      level: 'low',
      avg7: 5
    }
  ]

  const acknowledgeAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'acknowledged' }
        : alert
    ))
    
    toast.success("Đã xác nhận cảnh báo")
  }

  const closeAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'closed', closed_at: new Date().toISOString() }
        : alert
    ))
    
    toast.success("Đã đóng cảnh báo")
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAlerts()
    setRefreshing(false)
    toast.success("Đã cập nhật dữ liệu")
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchAlerts()
      setLoading(false)
    }
    loadData()

    // Auto refresh every 30s
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = 
        (DISEASE_NAMES[alert.disease_code] || alert.disease_code).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (DISTRICT_NAMES[alert.district_id || ''] || alert.district_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (alert.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter
      const matchesLevel = levelFilter === 'all' || alert.level === levelFilter

      return matchesSearch && matchesStatus && matchesLevel
    })
  }, [alerts, searchTerm, statusFilter, levelFilter])

  const openAlerts = filteredAlerts.filter(a => a.status === 'open')
  const acknowledgedAlerts = filteredAlerts.filter(a => a.status === 'acknowledged')
  const closedAlerts = filteredAlerts.filter(a => a.status === 'closed')

  // Stats
  const stats = useMemo(() => {
    const open = alerts.filter(a => a.status === 'open')
    return {
      total: alerts.length,
      open: open.length,
      critical: open.filter(a => a.level === 'critical').length,
      high: open.filter(a => a.level === 'high').length,
      medium: open.filter(a => a.level === 'medium').length
    }
  }, [alerts])

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days} ngày trước`
    if (hours > 0) return `${hours} giờ trước`
    if (mins > 0) return `${mins} phút trước`
    return 'Vừa xong'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trung tâm cảnh báo</h1>
          <p className="text-muted-foreground">Giám sát và phản hồi cảnh báo y tế công cộng</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trung tâm cảnh báo</h1>
          <p className="text-muted-foreground">Giám sát và phản hồi cảnh báo y tế công cộng</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className={cn(
            "px-3 py-1",
            isConnected && "bg-success text-success-foreground"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full mr-2",
              isConnected ? "bg-success-foreground animate-pulse" : "bg-muted-foreground"
            )} />
            {isConnected ? "Realtime" : "Offline"}
          </Badge>
          <span className="text-sm text-muted-foreground font-mono">
            {nowTs.toLocaleTimeString('vi-VN')}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng cảnh báo</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nghiêm trọng</p>
                <p className="text-3xl font-bold text-red-500">{stats.critical}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mức cao</p>
                <p className="text-3xl font-bold text-orange-500">{stats.high}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đang mở</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.open}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo bệnh, khu vực..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="open">Đang mở</SelectItem>
                <SelectItem value="acknowledged">Đã xác nhận</SelectItem>
                <SelectItem value="closed">Đã đóng</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder="Mức độ" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="critical">Nghiêm trọng</SelectItem>
                <SelectItem value="high">Cao</SelectItem>
                <SelectItem value="medium">Trung bình</SelectItem>
                <SelectItem value="low">Thấp</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Alerts - Critical & High Priority */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                Cảnh báo đang hoạt động
              </div>
              <Badge variant="destructive" className="text-sm">
                {openAlerts.length + acknowledgedAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {openAlerts.length === 0 && acknowledgedAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                  <p className="text-muted-foreground">Không có cảnh báo nào đang hoạt động</p>
                </div>
              ) : (
                [...openAlerts, ...acknowledgedAlerts].map((alert) => {
                  const config = LEVEL_CONFIG[alert.level || 'low']
                  const LevelIcon = config.icon
                  
                  return (
                    <div 
                      key={alert.id} 
                      className={cn(
                        "p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer",
                        config.bgColor,
                        config.borderColor,
                        alert.status === 'acknowledged' && "opacity-75"
                      )}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          config.bgColor
                        )}>
                          <LevelIcon className={cn("h-5 w-5", config.textColor)} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={cn("text-xs", config.color, "text-white")}>
                              {config.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {DISEASE_NAMES[alert.disease_code] || alert.disease_code}
                            </Badge>
                            {alert.status === 'acknowledged' && (
                              <Badge variant="secondary" className="text-xs">
                                Đã xác nhận
                              </Badge>
                            )}
                          </div>
                          
                          <p className="font-semibold text-foreground mb-1">
                            {alert.title || `${alert.cases} ca mới`}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {DISTRICT_NAMES[alert.district_id || ''] || alert.district_id}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(alert.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {alert.cases} ca (TB: {alert.avg7?.toFixed(0) || 0})
                            </span>
                          </div>
                          
                          {alert.rule && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {alert.rule}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedAlert(alert)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {alert.status === 'open' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                acknowledgeAlert(alert.id)
                              }}
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              closeAlert(alert.id)
                            }}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side - Environmental Factors & History */}
        <div className="space-y-6">
          {/* Environmental Alerts */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ThermometerSun className="h-5 w-5 text-orange-500" />
                Yếu tố môi trường
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <Wind className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Áp suất khí quyển</p>
                    <p className="text-xs text-muted-foreground">Giảm 12hPa/3h</p>
                  </div>
                </div>
                <Badge className="bg-red-500">Cảnh báo</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Độ ẩm</p>
                    <p className="text-xs text-muted-foreground">92% - Rất cao</p>
                  </div>
                </div>
                <Badge className="bg-orange-500">Cao</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <ThermometerSun className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Nhiệt độ</p>
                    <p className="text-xs text-muted-foreground">34°C - Nóng</p>
                  </div>
                </div>
                <Badge className="bg-yellow-500 text-yellow-900">TB</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Closed Alerts */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Đã xử lý
                </div>
                <Badge variant="secondary">{closedAlerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {closedAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Chưa có cảnh báo nào được đóng
                  </p>
                ) : (
                  closedAlerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {DISEASE_NAMES[alert.disease_code] || alert.disease_code}
                        </Badge>
                        <span className="text-sm">{alert.cases} ca</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(alert.closed_at || alert.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          {selectedAlert && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {selectedAlert.level && (
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      LEVEL_CONFIG[selectedAlert.level].bgColor
                    )}>
                      {(() => {
                        const Icon = LEVEL_CONFIG[selectedAlert.level].icon
                        return <Icon className={cn("h-5 w-5", LEVEL_CONFIG[selectedAlert.level].textColor)} />
                      })()}
                    </div>
                  )}
                  <div>
                    <DialogTitle className="text-lg">
                      {selectedAlert.title || DISEASE_NAMES[selectedAlert.disease_code] || selectedAlert.disease_code}
                    </DialogTitle>
                    <DialogDescription>
                      {DISTRICT_NAMES[selectedAlert.district_id || ''] || selectedAlert.district_id} • {selectedAlert.day}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Số ca</p>
                    <p className="text-2xl font-bold text-foreground">{selectedAlert.cases}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">TB 7 ngày</p>
                    <p className="text-2xl font-bold text-foreground">{selectedAlert.avg7?.toFixed(0) || 'N/A'}</p>
                  </div>
                </div>
                
                {selectedAlert.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Mô tả</p>
                    <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
                  </div>
                )}
                
                {selectedAlert.rule && (
                  <div>
                    <p className="text-sm font-medium mb-1">Quy tắc kích hoạt</p>
                    <p className="text-sm text-muted-foreground">{selectedAlert.rule}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Tạo lúc: {new Date(selectedAlert.created_at).toLocaleString('vi-VN')}
                </div>
                
                {selectedAlert.status !== 'closed' && (
                  <div className="flex gap-2 pt-2">
                    {selectedAlert.status === 'open' && (
                      <Button 
                        className="flex-1 rounded-xl"
                        onClick={() => {
                          acknowledgeAlert(selectedAlert.id)
                          setSelectedAlert(null)
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Xác nhận
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => {
                        closeAlert(selectedAlert.id)
                        setSelectedAlert(null)
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Đóng cảnh báo
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

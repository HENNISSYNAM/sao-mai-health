import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/hooks/useAuth"
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
import { CommunityAlertModal } from "@/components/CommunityAlertModal"

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

const DISTRICT_NAMES: Record<string, string> = {
  'District_01': 'District 1',
  'District_02': 'District 2', 
  'District_03': 'District 3',
  'District_04': 'District 4',
  'District_05': 'District 5',
  'District_06': 'District 6',
  'District_07': 'District 7',
  'District_08': 'District 8',
  'District_09': 'District 9',
  'District_10': 'District 10',
  'District_12': 'District 12',
  'quan_1': 'District 1',
  'quan_3': 'District 3'
}

const LEVEL_CONFIG = {
  critical: { 
    labelKey: 'alerts.level.critical', 
    color: 'bg-red-500', 
    textColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: Zap
  },
  high: { 
    labelKey: 'alerts.level.high', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: AlertTriangle
  },
  medium: { 
    labelKey: 'alerts.level.medium', 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: Activity
  },
  low: { 
    labelKey: 'alerts.level.low', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: Bell
  }
}

export default function AlertsNew() {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showCommunityAlertModal, setShowCommunityAlertModal] = useState(false)

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
          level: getLevelFromRule(a.rule) || determineLevel(a.cases, a.avg7)
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

  const getLevelFromRule = (rule?: string): 'critical' | 'high' | 'medium' | 'low' | null => {
    if (!rule) return null
    const match = rule.match(/\[severity:(critical|high|medium|low)\]/)
    return (match?.[1] as 'critical' | 'high' | 'medium' | 'low' | undefined) || null
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
    
    toast.success(t('alerts.alertAcknowledged'))
  }

  const closeAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'closed', closed_at: new Date().toISOString() }
        : alert
    ))
    
    toast.success(t('alerts.alertClosed'))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAlerts()
    setRefreshing(false)
    toast.success(t('alerts.dataRefreshed'))
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

  // Get disease name with i18n
  const getDiseaseName = (code: string) => {
    return t(`diseases.${code}`, code)
  }

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const diseaseName = t(`diseases.${alert.disease_code}`, alert.disease_code)
      const matchesSearch = 
        diseaseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (DISTRICT_NAMES[alert.district_id || ''] || alert.district_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (alert.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter
      const matchesLevel = levelFilter === 'all' || alert.level === levelFilter

      return matchesSearch && matchesStatus && matchesLevel
    })
  }, [alerts, searchTerm, statusFilter, levelFilter, t])

  const openAlerts = filteredAlerts.filter(a => a.status === 'open')
  const acknowledgedAlerts = filteredAlerts.filter(a => a.status === 'acknowledged')
  const closedAlerts = filteredAlerts.filter(a => a.status === 'closed')

  // Stats
  const stats = useMemo(() => {
    const open = alerts.filter(a => a.status === 'open')
    return {
      critical: open.filter(a => a.level === 'critical').length,
      high: open.filter(a => a.level === 'high').length,
      medium: open.filter(a => a.level === 'medium').length,
      low: open.filter(a => a.level === 'low').length,
    }
  }, [alerts])

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return t('time.daysAgo', { count: days })
    if (hours > 0) return t('time.hoursAgo', { count: hours })
    if (mins > 0) return t('time.minutesAgo', { count: mins })
    return t('time.justNow')
  }

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('alerts.title')}</h1>
          <p className="text-muted-foreground">{t('alerts.subtitle')}</p>
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
          <h1 className="text-3xl font-bold text-foreground">{t('alerts.title')}</h1>
          <p className="text-muted-foreground">{t('alerts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Button 
              onClick={() => setShowCommunityAlertModal(true)}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Gửi cảnh báo
            </Button>
          )}
          <Badge variant={isConnected ? "default" : "secondary"} className={cn(
            "px-3 py-1",
            isConnected && "bg-success text-success-foreground"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full mr-2",
              isConnected ? "bg-success-foreground animate-pulse" : "bg-muted-foreground"
            )} />
            {isConnected ? "Realtime" : t('common.offline')}
          </Badge>
          <span className="text-sm text-muted-foreground font-mono">
            {nowTs.toLocaleTimeString(locale)}
          </span>
        </div>
      </div>

      {/* Community Alert Modal */}
      <CommunityAlertModal 
        open={showCommunityAlertModal} 
        onOpenChange={setShowCommunityAlertModal}
        onAlertCreated={handleRefresh}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4"> 
        <Card className="rounded-2xl border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('alerts.level.critical')}</p>
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
                <p className="text-sm text-muted-foreground">{t('alerts.level.high')}</p>
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
                <p className="text-sm text-muted-foreground">{t('alerts.level.medium')}</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.medium}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('alerts.level.low')}</p>
                <p className="text-3xl font-bold text-blue-600">{stats.low}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-blue-600" />
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
                placeholder={t('alerts.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder={t('alerts.statusFilter')} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="open">{t('alerts.status.open')}</SelectItem>
                <SelectItem value="acknowledged">{t('alerts.status.acknowledged')}</SelectItem>
                <SelectItem value="closed">{t('alerts.status.closed')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder={t('alerts.levelFilter')} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="critical">{t('alerts.level.critical')}</SelectItem>
                <SelectItem value="high">{t('alerts.level.high')}</SelectItem>
                <SelectItem value="medium">{t('alerts.level.medium')}</SelectItem>
                <SelectItem value="low">{t('alerts.level.low')}</SelectItem>
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
                {t('alerts.activeAlerts')}
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
                  <p className="text-muted-foreground">{t('alerts.noActiveAlerts')}</p>
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
                              {t(config.labelKey)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getDiseaseName(alert.disease_code)}
                            </Badge>
                            {alert.status === 'acknowledged' && (
                              <Badge variant="secondary" className="text-xs">
                                {t('alerts.acknowledged')}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="font-semibold text-foreground mb-1">
                            {alert.title || t('alerts.newCases', { count: alert.cases })}
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
                              {alert.cases} {t('alerts.cases')} ({t('alerts.avg7')}: {alert.avg7?.toFixed(0) || 0})
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
                {t('alerts.environmentalFactors')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <Wind className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">{t('alerts.pressure')}</p>
                    <p className="text-xs text-muted-foreground">{t('alerts.pressureChange', { value: '12hPa' })}</p>
                  </div>
                </div>
                <Badge className="bg-red-500">{t('alerts.alert')}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">{t('alerts.humidity')}</p>
                    <p className="text-xs text-muted-foreground">{t('alerts.humidityLevel', { value: '92%' })}</p>
                  </div>
                </div>
                <Badge className="bg-orange-500">{t('alerts.level.high')}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <ThermometerSun className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">{t('alerts.temperature')}</p>
                    <p className="text-xs text-muted-foreground">{t('alerts.temperatureLevel', { value: '34°C' })}</p>
                  </div>
                </div>
                <Badge className="bg-yellow-500 text-yellow-900">{t('alerts.level.medium')}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Closed Alerts */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  {t('alerts.processed')}
                </div>
                <Badge variant="secondary">{closedAlerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {closedAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('alerts.noClosedAlerts')}
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
                          {getDiseaseName(alert.disease_code)}
                        </Badge>
                        <span className="text-sm">{alert.cases} {t('alerts.cases')}</span>
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
                      {selectedAlert.title || getDiseaseName(selectedAlert.disease_code)}
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
                    <p className="text-xs text-muted-foreground mb-1">{t('alerts.caseCount')}</p>
                    <p className="text-2xl font-bold text-foreground">{selectedAlert.cases}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{t('alerts.avg7')}</p>
                    <p className="text-2xl font-bold text-foreground">{selectedAlert.avg7?.toFixed(0) || 'N/A'}</p>
                  </div>
                </div>
                
                {selectedAlert.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t('alerts.description')}</p>
                    <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
                  </div>
                )}
                
                {selectedAlert.rule && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t('alerts.triggerRule')}</p>
                    <p className="text-sm text-muted-foreground">{selectedAlert.rule}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t('alerts.createdAt')}: {new Date(selectedAlert.created_at).toLocaleString(locale)}
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
                        {t('alerts.actions.acknowledge')}
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
                      {t('alerts.actions.close')}
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

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, Clock, CheckCircle, X } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useRealtimeAlerts } from "@/hooks/useRealtimeHealth"
import { useToast } from "@/hooks/use-toast"

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
}

interface AlertCandidate {
  disease_code?: string
  day?: string
  cases?: number
  rule?: string
  district_id?: string
  ward_id?: string
  avg7?: number
  threshold_daily?: number
  threshold_growth?: number
}

export default function AlertsNew() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [candidates, setCandidates] = useState<AlertCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Realtime subscription
  const { isConnected, nowTs } = useRealtimeAlerts((payload) => {
    fetchAlerts()
  })

  const fetchAlerts = async () => {
    try {
      // Rich mock data with HCMC disease alerts
      const mockAlerts: Alert[] = [
        {
          id: "alert-1",
          disease_code: "dengue",
          day: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString().split('T')[0],
          cases: 15,
          status: "open",
          rule: "Vượt ngưỡng 10 ca/ngày",
          district_id: "District_01", 
          ward_id: "Ward_BenThanh",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
        },
        {
          id: "alert-2",
          disease_code: "covid",
          day: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0],
          cases: 45,
          status: "acknowledged",
          rule: "Tăng 50% so với tuần trước",
          district_id: "District_05",
          ward_id: "Ward_12_Q5", 
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
        },
        {
          id: "alert-3",
          disease_code: "influenza",
          day: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString().split('T')[0],
          cases: 28,
          status: "open",
          rule: "Vượt ngưỡng mùa (25 ca)",
          district_id: "District_03",
          ward_id: "Ward_01_Q3",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
        },
        {
          id: "alert-4",
          disease_code: "dengue",
          day: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString().split('T')[0],
          cases: 12,
          status: "closed",
          rule: "Vượt ngưỡng 10 ca/ngày",
          district_id: "District_07",
          ward_id: "Ward_TanBinh",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          closed_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
        },
        {
          id: "alert-5",
          disease_code: "hand_foot_mouth",
          day: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString().split('T')[0],
          cases: 8,
          status: "open",
          rule: "Cụm ca bệnh trong trường học",
          district_id: "District_10",
          ward_id: "Ward_02_Q10",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
        },
        {
          id: "alert-6",
          disease_code: "tuberculosis",
          day: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString().split('T')[0],
          cases: 3,
          status: "acknowledged",
          rule: "Ca bệnh tại khu dân cư đông đúc",
          district_id: "District_08",
          ward_id: "Ward_15_Q8",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
        },
        {
          id: "alert-7", 
          disease_code: "malaria",
          day: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString().split('T')[0],
          cases: 2,
          status: "open",
          rule: "Ca bệnh nhập cảnh",
          district_id: "District_12",
          ward_id: "Ward_AnPhu",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString()
        },
        {
          id: "alert-8",
          disease_code: "food_poisoning",
          day: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString().split('T')[0],
          cases: 22,
          status: "open",
          rule: "Ngộ độc thực phẩm tập thể",
          district_id: "District_06",
          ward_id: "Ward_05_Q6",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
        }
      ];

      const mockCandidates: AlertCandidate[] = [
        {
          disease_code: "dengue",
          day: new Date().toISOString().split('T')[0],
          cases: 9,
          rule: "Gần đạt ngưỡng (10 ca/ngày)",
          district_id: "District_02",
          ward_id: "Ward_DaKao",
          avg7: 6.2,
          threshold_daily: 10
        },
        {
          disease_code: "covid",
          day: new Date().toISOString().split('T')[0], 
          cases: 35,
          rule: "Tăng 40% so với tuần trước",
          district_id: "District_04",
          ward_id: "Ward_06_Q4",
          avg7: 25.1,
          threshold_growth: 1.5
        },
        {
          disease_code: "influenza",
          day: new Date().toISOString().split('T')[0],
          cases: 18,
          rule: "Xu hướng tăng liên tục",
          district_id: "District_09",
          ward_id: "Ward_HinhChinh",
          avg7: 15.8,
          threshold_daily: 25
        }
      ];
      
      setAlerts(mockAlerts);
      setCandidates(mockCandidates);
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const fetchCandidates = async () => {
    try {
      // Use mock data since alert_candidates table doesn't exist
      const mockCandidates: AlertCandidate[] = [
        {
          disease_code: 'dengue',
          day: new Date().toISOString().split('T')[0],
          cases: 45,
          rule: 'Vượt ngưỡng hàng ngày',
          district_id: 'quan_1',
          avg7: 35.2,
          threshold_daily: 40
        },
        {
          disease_code: 'ari',
          day: new Date().toISOString().split('T')[0],
          cases: 32,
          rule: 'Tăng trưởng nhanh',
          district_id: 'quan_3',
          avg7: 22.5,
          threshold_growth: 2.0
        }
      ]
      setCandidates(mockCandidates)
    } catch (error) {
      console.error('Error fetching alert candidates:', error)
    }
  }

  const closeAlert = async (alertId: string) => {
    try {
      // Mock success for demo - update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'closed', closed_at: new Date().toISOString() }
          : alert
      ))
      
      toast({
        title: "Đã đóng cảnh báo",
        description: "Cảnh báo đã được đóng (demo mode)",
      })
    } catch (error) {
      console.error('Error closing alert:', error)
      toast({
        title: "Lỗi",
        description: "Không thể đóng cảnh báo",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchAlerts(), fetchCandidates()])
      setLoading(false)
    }
    loadData()

    // Refresh candidates every 30s
    const interval = setInterval(fetchCandidates, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cảnh báo y tế</h1>
          <p className="text-muted-foreground">Quản lý cảnh báo và phát hiện bất thường</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  const openAlerts = alerts.filter(alert => alert.status === 'open')
  const closedAlerts = alerts.filter(alert => alert.status === 'closed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cảnh báo y tế</h1>
          <p className="text-muted-foreground">Quản lý cảnh báo và phát hiện bất thường</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Live" : "Offline"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {nowTs.toLocaleTimeString('vi-VN')}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Alerts */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Cảnh báo đang mở
              </div>
              <Badge variant="destructive">{openAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {openAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có cảnh báo đang mở</p>
              ) : (
                openAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive" className="text-xs">
                          {alert.disease_code}
                        </Badge>
                        {alert.district_id && (
                          <Badge variant="outline" className="text-xs">
                            {alert.district_id}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {alert.cases} ca vào {alert.day}
                      </p>
                      {alert.rule && (
                        <p className="text-xs text-muted-foreground">{alert.rule}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => closeAlert(alert.id)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alert Candidates */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Ứng viên cảnh báo
              </div>
              <Badge variant="outline">{candidates.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có ứng viên cảnh báo</p>
              ) : (
                candidates.map((candidate, index) => (
                  <div key={index} className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {candidate.disease_code}
                      </Badge>
                      {candidate.district_id && (
                        <Badge variant="secondary" className="text-xs">
                          {candidate.district_id}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {candidate.cases} ca vào {candidate.day}
                    </p>
                    {candidate.avg7 && (
                      <p className="text-xs text-muted-foreground">
                        Trung bình 7 ngày: {candidate.avg7.toFixed(1)}
                      </p>
                    )}
                    {candidate.rule && (
                      <p className="text-xs text-muted-foreground">{candidate.rule}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Closed Alerts History */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Lịch sử cảnh báo đã đóng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {closedAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có cảnh báo nào được đóng</p>
            ) : (
              closedAlerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {alert.disease_code}
                    </Badge>
                    <span className="text-sm">
                      {alert.cases} ca - {alert.day}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Đóng: {alert.closed_at ? new Date(alert.closed_at).toLocaleDateString('vi-VN') : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
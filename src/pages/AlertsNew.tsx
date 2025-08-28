import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, Clock, CheckCircle, X, Plus } from "lucide-react"
import { useHealthRealtime } from "@/contexts/HealthRealtimeContext"
import { useToast } from "@/hooks/use-toast"

interface AlertCandidate {
  disease_code: string
  day: string
  cases: number
  rule: string
  district_id?: string
  ward_id?: string
  avg7?: number
  threshold_daily?: number
  threshold_growth?: number
}

export default function AlertsNew() {
  const [candidates, setCandidates] = useState<AlertCandidate[]>([])
  const { toast } = useToast()
  
  const { alerts, isConnected, loading, lastTick, closeAlert, createAlertFromCandidate, refreshCandidates } = useHealthRealtime()

  const handleCloseAlert = async (alertId: string) => {
    try {
      await closeAlert(alertId)
      toast({
        title: "Đã đóng cảnh báo",
        description: "Cảnh báo đã được đóng thành công",
      })
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể đóng cảnh báo",
        variant: "destructive"
      })
    }
  }

  const handleCreateAlert = async (candidate: AlertCandidate) => {
    try {
      await createAlertFromCandidate(candidate)
      toast({
        title: "Đã tạo cảnh báo",
        description: `Tạo cảnh báo cho ${candidate.disease_code} - ${candidate.cases} ca`,
      })
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo cảnh báo",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const data = await refreshCandidates()
        setCandidates(data)
      } catch (error) {
        console.error('Error loading candidates:', error)
      }
    }
    
    loadCandidates()
    
    // Refresh candidates every 30s
    const interval = setInterval(loadCandidates, 30000)
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
            {lastTick}
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
                      onClick={() => handleCloseAlert(alert.id)}
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {candidate.disease_code}
                        </Badge>
                        {candidate.district_id && (
                          <Badge variant="secondary" className="text-xs">
                            {candidate.district_id}
                          </Badge>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCreateAlert(candidate)}
                        className="h-6 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Tạo alert
                      </Button>
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
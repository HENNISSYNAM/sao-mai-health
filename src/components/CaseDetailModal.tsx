import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Clock, User, Stethoscope, Activity, Phone, Building2, FileText, Brain, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"
import { SurveillanceCase } from "@/hooks/useSurveillanceSearch"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface CaseDetailModalProps {
  case_: SurveillanceCase | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AIAnalysis {
  diagnosis_confidence: 'high' | 'medium' | 'low'
  severity_level: 'mild' | 'moderate' | 'severe'
  key_findings: string[]
  recommendations: {
    immediate_actions: string[]
    monitoring: string[]
    treatment: string
    isolation: string
  }
  risk_factors: string[]
  follow_up: string
  alert_level: 'green' | 'yellow' | 'orange' | 'red'
}

export function CaseDetailModal({ case_, open, onOpenChange }: CaseDetailModalProps) {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  
  if (!case_) return null

  // Load AI analysis when modal opens
  useEffect(() => {
    if (open && case_) {
      loadAIAnalysis()
    }
  }, [open, case_?.id])

  const loadAIAnalysis = async () => {
    setLoadingAnalysis(true)
    setAiAnalysis(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-case', {
        body: { caseData: case_ }
      })

      if (error) throw error
      
      if (data?.analysis) {
        setAiAnalysis(data.analysis)
      }
    } catch (error) {
      console.error('Error loading AI analysis:', error)
      toast.error('Không thể tải phân tích AI', {
        description: 'Vui lòng thử lại sau'
      })
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="destructive">Xác nhận</Badge>
      case 'suspected':
        return <Badge variant="default">Nghi ngờ</Badge>
      case 'probable':
        return <Badge className="bg-warning text-warning-foreground">Có thể</Badge>
      default:
        return <Badge variant="secondary">Không xác định</Badge>
    }
  }

  const getDiseaseName = (code: string) => {
    const diseaseMap: Record<string, string> = {
      'D01': 'Sốt xuất huyết',
      'D02': 'Tay chân miệng',
      'D03': 'COVID-19',
      'D04': 'Nhiễm khuẩn hô hấp',
      'D05': 'Sốt rét',
      'D06': 'Cúm A/H1N1'
    }
    return diseaseMap[code] || code
  }

  const getSymptomsList = (symptoms: any) => {
    if (!symptoms || typeof symptoms !== 'object') return []
    
    const symptomLabels: Record<string, string> = {
      fever: 'Sốt',
      headache: 'Đau đầu',
      muscle_pain: 'Đau cơ',
      joint_pain: 'Đau khớp',
      nausea: 'Buồn nôn',
      vomiting: 'Nôn',
      rash: 'Phát ban',
      cough: 'Ho',
      sore_throat: 'Đau họng',
      difficulty_breathing: 'Khó thở',
      fatigue: 'Mệt mỏi',
      loss_taste: 'Mất vị giác',
      loss_smell: 'Mất khứu giác',
      chills: 'Ớn lạnh',
      sweating: 'Đổ mồ hôi',
      mouth_sores: 'Loét miệng',
      hand_rash: 'Phát ban tay',
      foot_rash: 'Phát ban chân',
      chest_pain: 'Đau ngực',
      runny_nose: 'Sổ mũi',
      body_aches: 'Đau toàn thân'
    }

    return Object.entries(symptoms)
      .filter(([_, value]) => value === true)
      .map(([key]) => symptomLabels[key] || key)
  }

  const getAlertLevelBadge = (level: string) => {
    const levels = {
      green: { label: 'An toàn', className: 'bg-green-500 text-white' },
      yellow: { label: 'Theo dõi', className: 'bg-yellow-500 text-white' },
      orange: { label: 'Cảnh báo', className: 'bg-orange-500 text-white' },
      red: { label: 'Khẩn cấp', className: 'bg-red-500 text-white' }
    }
    const info = levels[level as keyof typeof levels] || levels.yellow
    return <Badge className={info.className}>{info.label}</Badge>
  }

  const getConfidenceBadge = (confidence: string) => {
    const levels = {
      high: { label: 'Cao', className: 'bg-blue-500 text-white' },
      medium: { label: 'Trung bình', className: 'bg-purple-500 text-white' },
      low: { label: 'Thấp', className: 'bg-gray-500 text-white' }
    }
    const info = levels[confidence as keyof typeof levels] || levels.medium
    return <Badge className={info.className}>{info.label}</Badge>
  }

  const getSeverityBadge = (severity: string) => {
    const levels = {
      mild: { label: 'Nhẹ', className: 'bg-green-600 text-white' },
      moderate: { label: 'Trung bình', className: 'bg-orange-600 text-white' },
      severe: { label: 'Nặng', className: 'bg-red-600 text-white' }
    }
    const info = levels[severity as keyof typeof levels] || levels.moderate
    return <Badge className={info.className}>{info.label}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <FileText className="h-6 w-6 text-primary" />
            Chi tiết ca bệnh & Phân tích AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Thông tin cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Mã ca:</span>
                <Badge variant="outline" className="font-mono">
                  {case_.id.slice(0, 8)}...
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Bệnh nhân:</span>
                <span className="font-medium">
                  {case_.patient_name || case_.patient_hash || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tuổi/Giới:</span>
                <span>{case_.patient_age_bucket || 'N/A'} / {case_.patient_gender || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Điện thoại:</span>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{case_.patient_phone || 'N/A'}</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Bệnh:</span>
                <Badge className="bg-blue-500 text-white">
                  {getDiseaseName(case_.disease_code)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Trạng thái:</span>
                {getStatusBadge(case_.status)}
              </div>
            </CardContent>
          </Card>

          {/* Location & Facility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Địa điểm & Cơ sở
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Cơ sở y tế:</span>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-right max-w-48 truncate">
                    {case_.facility_name || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Phường/Xã:</span>
                <span>{case_.ward_id || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Quận/Huyện:</span>
                <span>{case_.district_id || 'N/A'}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Ngày báo cáo:</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(case_.occurred_at).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Thông tin ca bệnh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Mã bệnh:</span>
                  <Badge className="bg-blue-500 text-white">
                    {case_.disease_code}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Ngày báo cáo:</span>
                  <span className="text-sm">
                    {new Date(case_.occurred_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Tuổi/Giới:</span>
                  <span className="text-sm">{case_.patient_age_bucket || 'N/A'} / {case_.patient_gender || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Khu vực:</span>
                  <span className="text-sm text-right">{case_.district_id || 'N/A'}</span>
                </div>

                <Separator />

                <div>
                  <span className="text-sm font-medium text-muted-foreground mb-2 block">Triệu chứng:</span>
                  <div className="flex flex-wrap gap-2">
                    {getSymptomsList(case_.symptoms).length > 0 ? (
                      getSymptomsList(case_.symptoms).map((symptom, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {symptom}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Không có triệu chứng</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Phân tích & Đề xuất từ AI
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={loadAIAnalysis}
                    disabled={loadingAnalysis}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAnalysis ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">Bác sĩ AI đang phân tích ca bệnh...</p>
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Độ tin cậy chẩn đoán:</span>
                      {getConfidenceBadge(aiAnalysis.diagnosis_confidence)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mức độ nghiêm trọng:</span>
                      {getSeverityBadge(aiAnalysis.severity_level)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mức cảnh báo:</span>
                      {getAlertLevelBadge(aiAnalysis.alert_level)}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Phát hiện chính:
                      </h4>
                      <ul className="space-y-1">
                        {aiAnalysis.key_findings.map((finding, i) => (
                          <li key={i} className="text-sm text-muted-foreground pl-4">• {finding}</li>
                        ))}
                      </ul>
                    </div>

                    {aiAnalysis.risk_factors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          Yếu tố nguy cơ:
                        </h4>
                        <ul className="space-y-1">
                          {aiAnalysis.risk_factors.map((risk, i) => (
                            <li key={i} className="text-sm text-muted-foreground pl-4">• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Nhấn nút làm mới để tải phân tích AI
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {aiAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Khuyến nghị điều trị
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Hành động ngay lập tức:</h4>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.immediate_actions.map((action, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-4">✓ {action}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Theo dõi:</h4>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.monitoring.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-4">→ {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Điều trị:</h4>
                    <p className="text-sm text-muted-foreground">{aiAnalysis.recommendations.treatment}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Cách ly:</h4>
                    <p className="text-sm text-muted-foreground">{aiAnalysis.recommendations.isolation}</p>
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold mb-1">Tái khám:</h4>
                  <p className="text-sm text-muted-foreground">{aiAnalysis.follow_up}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
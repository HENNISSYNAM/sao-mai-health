import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MapPin, Clock, User, Stethoscope, Activity, Phone, Building2, FileText } from "lucide-react"
import { SurveillanceCase } from "@/hooks/useSurveillanceSearch"

interface CaseDetailModalProps {
  case_: SurveillanceCase | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CaseDetailModal({ case_, open, onOpenChange }: CaseDetailModalProps) {
  if (!case_) return null

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <FileText className="h-6 w-6 text-primary" />
            Chi tiết ca bệnh
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Symptoms */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Triệu chứng báo cáo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {getSymptomsList(case_.symptoms).length > 0 ? (
                  getSymptomsList(case_.symptoms).map((symptom, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      <Activity className="h-3 w-3 mr-1" />
                      {symptom}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">Không có triệu chứng được ghi nhận</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button>
            Chỉnh sửa ca bệnh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, MapPin, Stethoscope } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface AddCaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCaseAdded?: () => void
}

export function AddCaseModal({ open, onOpenChange, onCaseAdded }: AddCaseModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    disease_code: '',
    patient_hash: '',
    patient_age_bucket: '',
    patient_gender: '',
    ward_id: '',
    district_id: '',
    source: 'clinic',
    symptoms: {} as Record<string, boolean>
  })

  const diseaseOptions = [
    { value: 'dengue', label: 'Sốt xuất huyết' },
    { value: 'tcm', label: 'Tay chân miệng' },
    { value: 'covid19', label: 'COVID-19' },
    { value: 'ari', label: 'Nhiễm khuẩn hô hấp' },
    { value: 'flu', label: 'Cúm' }
  ]

  const ageGroups = [
    '0-1', '1-4', '5-9', '10-14', '15-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70+'
  ]

  const symptomOptions = [
    { key: 'fever', label: 'Sốt' },
    { key: 'headache', label: 'Đau đầu' },
    { key: 'muscle_pain', label: 'Đau cơ' },
    { key: 'joint_pain', label: 'Đau khớp' },
    { key: 'nausea', label: 'Buồn nôn' },
    { key: 'vomiting', label: 'Nôn' },
    { key: 'rash', label: 'Phát ban' },
    { key: 'cough', label: 'Ho' },
    { key: 'sore_throat', label: 'Đau họng' },
    { key: 'difficulty_breathing', label: 'Khó thở' },
    { key: 'fatigue', label: 'Mệt mỏi' },
    { key: 'chills', label: 'Ớn lạnh' },
    { key: 'mouth_sores', label: 'Loét miệng' },
    { key: 'hand_rash', label: 'Phát ban tay' },
    { key: 'foot_rash', label: 'Phát ban chân' }
  ]

  const handleSymptomChange = (symptom: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [symptom]: checked
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('case_events')
        .insert({
          disease_code: formData.disease_code,
          patient_hash: formData.patient_hash,
          patient_age_bucket: formData.patient_age_bucket,
          patient_gender: formData.patient_gender,
          ward_id: formData.ward_id,
          district_id: formData.district_id,
          source: formData.source,
          symptoms: formData.symptoms,
          occurred_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success("Ca bệnh đã được thêm thành công")
      onCaseAdded?.()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        disease_code: '',
        patient_hash: '',
        patient_age_bucket: '',
        patient_gender: '',
        ward_id: '',
        district_id: '',
        source: 'clinic',
        symptoms: {}
      })
    } catch (error) {
      console.error('Error adding case:', error)
      toast.error("Có lỗi xảy ra khi thêm ca bệnh")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Plus className="h-6 w-6 text-primary" />
            Thêm ca bệnh mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Thông tin bệnh nhân
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="patient_hash">Mã bệnh nhân *</Label>
                  <Input
                    id="patient_hash"
                    value={formData.patient_hash}
                    onChange={(e) => setFormData(prev => ({ ...prev, patient_hash: e.target.value }))}
                    placeholder="Nhập mã bệnh nhân"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="age_group">Nhóm tuổi *</Label>
                  <Select value={formData.patient_age_bucket} onValueChange={(value) => setFormData(prev => ({ ...prev, patient_age_bucket: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhóm tuổi" />
                    </SelectTrigger>
                    <SelectContent>
                      {ageGroups.map(age => (
                        <SelectItem key={age} value={age}>{age}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gender">Giới tính *</Label>
                  <Select value={formData.patient_gender} onValueChange={(value) => setFormData(prev => ({ ...prev, patient_gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn giới tính" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Nam</SelectItem>
                      <SelectItem value="F">Nữ</SelectItem>
                      <SelectItem value="O">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Location & Disease */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Vị trí & Bệnh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="disease">Loại bệnh *</Label>
                  <Select value={formData.disease_code} onValueChange={(value) => setFormData(prev => ({ ...prev, disease_code: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại bệnh" />
                    </SelectTrigger>
                    <SelectContent>
                      {diseaseOptions.map(disease => (
                        <SelectItem key={disease.value} value={disease.value}>
                          {disease.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ward">Phường/Xã</Label>
                  <Input
                    id="ward"
                    value={formData.ward_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, ward_id: e.target.value }))}
                    placeholder="Nhập phường/xã"
                  />
                </div>

                <div>
                  <Label htmlFor="district">Quận/Huyện</Label>
                  <Input
                    id="district"
                    value={formData.district_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, district_id: e.target.value }))}
                    placeholder="Nhập quận/huyện"
                  />
                </div>

                <div>
                  <Label htmlFor="source">Nguồn báo cáo</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinic">Phòng khám</SelectItem>
                      <SelectItem value="hospital">Bệnh viện</SelectItem>
                      <SelectItem value="emergency">Cấp cứu</SelectItem>
                      <SelectItem value="pediatric">Nhi khoa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Triệu chứng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {symptomOptions.map(symptom => (
                  <div key={symptom.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={symptom.key}
                      checked={formData.symptoms[symptom.key] || false}
                      onCheckedChange={(checked) => handleSymptomChange(symptom.key, !!checked)}
                    />
                    <Label htmlFor={symptom.key} className="text-sm">
                      {symptom.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang thêm..." : "Thêm ca bệnh"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
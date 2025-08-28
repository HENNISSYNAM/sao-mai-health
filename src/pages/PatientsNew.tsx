import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { UserPlus, MapPin, Shield } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { sha256Hex } from "@/lib/crypto"

interface PatientForm {
  full_name: string
  mpi: string
  birth_year: string
  gender: string
  phone: string
  disease_code: string
  facility_id: string
  lat: string
  lon: string
  symptoms: string
}

const API_PREDICT_URL = ''

export default function PatientsNew() {
  const [form, setForm] = useState<PatientForm>({
    full_name: '',
    mpi: '',
    birth_year: '',
    gender: '',
    phone: '',
    disease_code: '',
    facility_id: '',
    lat: '',
    lon: '',
    symptoms: '{}'
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: keyof PatientForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validate required fields
      if (!form.full_name || !form.mpi || !form.disease_code || !form.lat || !form.lon) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng điền đầy đủ thông tin bắt buộc",
          variant: "destructive"
        })
        return
      }

      // Validate coordinates
      const lat = parseFloat(form.lat)
      const lon = parseFloat(form.lon)
      if (isNaN(lat) || isNaN(lon)) {
        toast({
          title: "Tọa độ không hợp lệ",
          description: "Vui lòng nhập tọa độ hợp lệ",
          variant: "destructive"
        })
        return
      }

      // Parse symptoms JSON
      let symptomsJson
      try {
        symptomsJson = JSON.parse(form.symptoms)
      } catch (error) {
        toast({
          title: "JSON không hợp lệ",
          description: "Triệu chứng phải là JSON hợp lệ",
          variant: "destructive"
        })
        return
      }

      // Hash MPI for privacy
      const mpiHash = await sha256Hex(form.mpi)

      // Call Supabase RPC function
      try {
        const { data: result, error } = await supabase.rpc('intake_case_fast', {
          p_mpi_hash: mpiHash,
          p_full_name: form.full_name,
          p_birth_year: parseInt(form.birth_year) || null,
          p_gender: form.gender || null,
          p_phone_hash: form.phone || '',
          p_address_hash: '',
          p_disease_code: form.disease_code,
          p_status: 'suspected',
          p_onset_date: new Date().toISOString().split('T')[0],
          p_report_date: new Date().toISOString().split('T')[0],
          p_district_id: '',
          p_ward_id: '',
          p_facility_id: form.facility_id || '',
          p_lat: lat,
          p_lng: lon,
          p_symptoms: symptomsJson
        });

        if (error) {
          throw error;
        }

        if (result && typeof result === 'object' && 'success' in result && result.success) {
          console.log('Case created successfully:', result);
        } else {
          const errorResult = result as { message?: string };
          throw new Error(errorResult?.message || 'Lỗi không xác định');
        }
      } catch (error) {
        console.error('RPC Error:', error)
        toast({
          title: "Lỗi lưu dữ liệu",
          description: error instanceof Error ? error.message : "Không thể kết nối database",
          variant: "destructive"
        })
        return
      }

      // Call prediction API if available
      if (API_PREDICT_URL) {
        try {
          const response = await fetch(API_PREDICT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              events: [{
                lat,
                lon,
                observed_at: new Date().toISOString(),
                features: { ...symptomsJson, disease_code: form.disease_code }
              }]
            })
          })

          if (!response.ok) {
            console.warn('Prediction API failed:', response.statusText)
          }
        } catch (error) {
          console.warn('Prediction API error:', error)
        }
      }

      toast({
        title: "Thành công",
        description: "Đã ghi bệnh nhân và cập nhật realtime",
      })

      // Reset form
      setForm({
        full_name: '',
        mpi: '',
        birth_year: '',
        gender: '',
        phone: '',
        disease_code: '',
        facility_id: '',
        lat: '',
        lon: '',
        symptoms: '{}'
      })

    } catch (error) {
      console.error('Error adding patient:', error)
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi thêm bệnh nhân",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Quản lý bệnh nhân</h1>
        <p className="text-muted-foreground">Thêm bệnh nhân mới với bảo mật MPI</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patient Form */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Thêm bệnh nhân mới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="full_name">Họ và tên *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <Label htmlFor="mpi">MPI/OwnerID *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="mpi"
                    value={form.mpi}
                    onChange={(e) => handleInputChange('mpi', e.target.value)}
                    placeholder="ID định danh bệnh nhân"
                  />
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birth_year">Năm sinh</Label>
                  <Input
                    id="birth_year"
                    value={form.birth_year}
                    onChange={(e) => handleInputChange('birth_year', e.target.value)}
                    placeholder="1990"
                    type="number"
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Giới tính</Label>
                  <Select value={form.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn giới tính" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Nam</SelectItem>
                      <SelectItem value="female">Nữ</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="0901234567"
                />
              </div>

              <div>
                <Label htmlFor="disease_code">Mã bệnh *</Label>
                <Input
                  id="disease_code"
                  value={form.disease_code}
                  onChange={(e) => handleInputChange('disease_code', e.target.value)}
                  placeholder="dengue, covid19, tcm, ari, etc."
                />
              </div>

              <div>
                <Label htmlFor="facility_id">Cơ sở y tế</Label>
                <Input
                  id="facility_id"
                  value={form.facility_id}
                  onChange={(e) => handleInputChange('facility_id', e.target.value)}
                  placeholder="BV_CHORAY, BV_115, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Symptoms */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Vị trí & triệu chứng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Vĩ độ (lat) *</Label>
                <Input
                  id="lat"
                  value={form.lat}
                  onChange={(e) => handleInputChange('lat', e.target.value)}
                  placeholder="10.7756"
                  type="number"
                  step="any"
                />
              </div>

              <div>
                <Label htmlFor="lon">Kinh độ (lon) *</Label>
                <Input
                  id="lon"
                  value={form.lon}
                  onChange={(e) => handleInputChange('lon', e.target.value)}
                  placeholder="106.7009"
                  type="number"
                  step="any"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="symptoms">Triệu chứng (JSON)</Label>
              <Textarea
                id="symptoms"
                value={form.symptoms}
                onChange={(e) => handleInputChange('symptoms', e.target.value)}
                placeholder='{"fever": true, "cough": false, "temperature": 38.5}'
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nhập triệu chứng dưới dạng JSON hợp lệ
              </p>
            </div>

            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                MPI sẽ được hash SHA256 trước khi lưu
              </Badge>
              {API_PREDICT_URL && (
                <Badge variant="outline" className="text-xs">
                  Sẽ gọi API dự đoán: {API_PREDICT_URL}
                </Badge>
              )}
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Đang xử lý..." : "Thêm bệnh nhân & cập nhật realtime"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
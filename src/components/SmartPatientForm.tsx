import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Search, Navigation, Loader2, CreditCard, CheckCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { sha256Hex } from "@/lib/crypto"

interface PatientForm {
  vnid: string
  full_name: string
  birth_year: string
  gender: string
  phone: string
  address: string
  disease_code: string
  lat: string
  lon: string
  symptoms: string
}

// Mock VNID database - replace with real API
const VNID_DATABASE: Record<string, Omit<PatientForm, 'vnid' | 'disease_code' | 'symptoms' | 'lat' | 'lon'>> = {
  "001234567890": {
    full_name: "Nguyễn Văn An",
    birth_year: "1985",
    gender: "male",
    phone: "0901234567",
    address: "123 Nguyễn Thái Học, Phường 1, Quận 1, TP.HCM"
  },
  "001234567891": {
    full_name: "Trần Thị Bình",
    birth_year: "1990",
    gender: "female",
    phone: "0912345678",
    address: "456 Lê Lợi, Phường 3, Quận 3, TP.HCM"
  },
  "001234567892": {
    full_name: "Lê Minh Cường",
    birth_year: "1978",
    gender: "male",
    phone: "0923456789",
    address: "789 Trần Hưng Đạo, Phường 5, Quận 5, TP.HCM"
  }
}

export default function SmartPatientForm() {
  const [form, setForm] = useState<PatientForm>({
    vnid: '',
    full_name: '',
    birth_year: '',
    gender: '',
    phone: '',
    address: '',
    disease_code: '',
    lat: '',
    lon: '',
    symptoms: ''
  })
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [vnidVerified, setVnidVerified] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: keyof PatientForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'vnid') {
      setVnidVerified(false)
    }
  }

  // Look up patient info by VNID
  const lookupVNID = async () => {
    if (!form.vnid || form.vnid.length < 9) {
      toast({
        title: "CCCD không hợp lệ",
        description: "Vui lòng nhập số CCCD (ít nhất 9 ký tự)",
        variant: "destructive"
      })
      return
    }

    setSearching(true)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const patientData = VNID_DATABASE[form.vnid]
    
    if (patientData) {
      setForm(prev => ({
        ...prev,
        full_name: patientData.full_name,
        birth_year: patientData.birth_year,
        gender: patientData.gender,
        phone: patientData.phone,
        address: patientData.address
      }))
      setVnidVerified(true)
      toast({
        title: "✓ Đã tìm thấy thông tin",
        description: `Bệnh nhân: ${patientData.full_name}`
      })
    } else {
      toast({
        title: "Không tìm thấy",
        description: "Không có thông tin cho CCCD này. Vui lòng nhập thủ công.",
        variant: "destructive"
      })
    }

    setSearching(false)
  }

  // Auto-get GPS location
  const getLocation = () => {
    setGettingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm(prev => ({
            ...prev,
            lat: position.coords.latitude.toFixed(6),
            lon: position.coords.longitude.toFixed(6)
          }))
          setGettingLocation(false)
          toast({
            title: "✓ Đã lấy vị trí",
            description: "Tọa độ GPS đã được tự động điền"
          })
        },
        () => {
          setGettingLocation(false)
          toast({
            title: "Không thể lấy vị trí",
            description: "Vui lòng cho phép truy cập vị trí hoặc nhập thủ công",
            variant: "destructive"
          })
        }
      )
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validate required fields
      if (!form.vnid || !form.full_name || !form.disease_code) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng điền CCCD, họ tên và mã bệnh",
          variant: "destructive"
        })
        return
      }

      const lat = parseFloat(form.lat) || 10.7769
      const lon = parseFloat(form.lon) || 106.7009

      // Parse symptoms
      let symptomsJson: any = {}
      if (form.symptoms) {
        symptomsJson = { description: form.symptoms }
      }

      const mpiHash = await sha256Hex(form.vnid)

      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          full_name: form.full_name,
          mpi_hash: mpiHash,
          birth_year: parseInt(form.birth_year) || null,
          gender: form.gender || null,
          phone: form.phone || null,
        })
        .select()
        .single()

      if (patientError) throw patientError

      const { error: caseError } = await supabase
        .from('case_events')
        .insert({
          patient_id: patientData.id,
          disease_code: form.disease_code,
          lat: lat,
          lon: lon,
          symptoms: symptomsJson,
          patient_hash: mpiHash,
          patient_gender: form.gender || null,
          patient_age_bucket: form.birth_year ? `${Math.floor((new Date().getFullYear() - parseInt(form.birth_year)) / 10) * 10}-${Math.floor((new Date().getFullYear() - parseInt(form.birth_year)) / 10) * 10 + 9}` : null,
          source: 'vnid_entry'
        })

      if (caseError) throw caseError

      toast({
        title: "✓ Thành công",
        description: `Đã lưu bệnh nhân ${form.full_name}`
      })

      // Reset form
      setForm({
        vnid: '',
        full_name: '',
        birth_year: '',
        gender: '',
        phone: '',
        address: '',
        disease_code: '',
        lat: '',
        lon: '',
        symptoms: ''
      })
      setVnidVerified(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi lưu dữ liệu",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-primary" />
          Nhập bệnh nhân bằng CCCD
        </h1>
        <p className="text-muted-foreground">Chỉ cần nhập số CCCD để tự động điền thông tin</p>
      </div>

      {/* VNID Lookup Card */}
      <Card className="rounded-2xl shadow-sm border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Tra cứu CCCD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={form.vnid}
                onChange={(e) => handleInputChange('vnid', e.target.value)}
                placeholder="Nhập số CCCD (12 số)"
                className="text-lg h-12"
                maxLength={12}
              />
              {vnidVerified && (
                <CheckCircle className="absolute right-3 top-3 h-6 w-6 text-green-500" />
              )}
            </div>
            <Button
              onClick={lookupVNID}
              disabled={searching || !form.vnid}
              size="lg"
              className="h-12 px-6"
            >
              {searching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Tra cứu
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Demo: thử 001234567890, 001234567891, hoặc 001234567892
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patient Info Card */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Thông tin bệnh nhân
              {vnidVerified && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Đã xác thực
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="full_name">Họ và tên *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Nguyễn Văn A"
                disabled={vnidVerified}
              />
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
                  disabled={vnidVerified}
                />
              </div>

              <div>
                <Label htmlFor="gender">Giới tính</Label>
                <Select 
                  value={form.gender} 
                  onValueChange={(value) => handleInputChange('gender', value)}
                  disabled={vnidVerified}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn" />
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
                disabled={vnidVerified}
              />
            </div>

            <div>
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Địa chỉ"
                disabled={vnidVerified}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Info Card */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Thông tin y tế</span>
              <Button
                variant="outline"
                size="sm"
                onClick={getLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Lấy GPS
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="disease_code">Mã bệnh *</Label>
              <Select 
                value={form.disease_code} 
                onValueChange={(value) => handleInputChange('disease_code', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bệnh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dengue">Sốt xuất huyết</SelectItem>
                  <SelectItem value="tcm">Tay chân miệng</SelectItem>
                  <SelectItem value="ari">Nhiễm khuẩn hô hấp</SelectItem>
                  <SelectItem value="covid19">COVID-19</SelectItem>
                  <SelectItem value="flu">Cúm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Vĩ độ</Label>
                <Input
                  id="lat"
                  value={form.lat}
                  onChange={(e) => handleInputChange('lat', e.target.value)}
                  placeholder="10.7769"
                />
              </div>
              <div>
                <Label htmlFor="lon">Kinh độ</Label>
                <Input
                  id="lon"
                  value={form.lon}
                  onChange={(e) => handleInputChange('lon', e.target.value)}
                  placeholder="106.7009"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="symptoms">Triệu chứng</Label>
              <Textarea
                id="symptoms"
                value={form.symptoms}
                onChange={(e) => handleInputChange('symptoms', e.target.value)}
                placeholder="Mô tả triệu chứng..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !form.vnid || !form.full_name || !form.disease_code}
              className="w-full h-12 text-lg"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-5 w-5 mr-2" />
              )}
              Lưu bệnh nhân
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

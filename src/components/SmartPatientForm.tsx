import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { UserPlus, MapPin, Shield, Mic, MicOff, Navigation, Sparkles, Camera, Loader2 } from "lucide-react"
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

export default function SmartPatientForm() {
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
    symptoms: ''
  })
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeField, setActiveField] = useState<string | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string>('')
  const { toast } = useToast()

  const handleInputChange = (field: keyof PatientForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
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
        (error) => {
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

  // Voice input for any field
  const startVoiceInput = (field: string) => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Không hỗ trợ",
        description: "Trình duyệt không hỗ trợ nhập liệu bằng giọng nói",
        variant: "destructive"
      })
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = false

    setIsListening(true)
    setActiveField(field)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      handleInputChange(field as keyof PatientForm, transcript)
      setIsListening(false)
      setActiveField(null)
    }

    recognition.onerror = () => {
      setIsListening(false)
      setActiveField(null)
      toast({
        title: "Lỗi nhận dạng giọng nói",
        description: "Vui lòng thử lại",
        variant: "destructive"
      })
    }

    recognition.onend = () => {
      setIsListening(false)
      setActiveField(null)
    }

    recognition.start()
  }

  // AI-powered image analysis
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAnalyzingImage(true)

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string

        const { data, error } = await supabase.functions.invoke('surveillance-ai', {
          body: {
            message: "Phân tích hình ảnh này và trích xuất thông tin bệnh nhân: tên, năm sinh, giới tính, số điện thoại, triệu chứng. Trả lời bằng tiếng Việt dưới dạng: Tên: ..., Năm sinh: ..., Giới tính: ..., SĐT: ..., Triệu chứng: ...",
            image: base64.split(',')[1]
          }
        })

        if (error) throw error

        const aiResponse = data.response
        
        // Parse AI response and auto-fill form
        const nameMatch = aiResponse.match(/Tên:\s*(.+?)(?:,|\n|$)/i)
        const yearMatch = aiResponse.match(/Năm sinh:\s*(\d{4})/i)
        const genderMatch = aiResponse.match(/Giới tính:\s*(.+?)(?:,|\n|$)/i)
        const phoneMatch = aiResponse.match(/SĐT:\s*(.+?)(?:,|\n|$)/i)
        const symptomsMatch = aiResponse.match(/Triệu chứng:\s*(.+?)(?:\n|$)/i)

        if (nameMatch) setForm(prev => ({ ...prev, full_name: nameMatch[1].trim() }))
        if (yearMatch) setForm(prev => ({ ...prev, birth_year: yearMatch[1] }))
        if (genderMatch) {
          const gender = genderMatch[1].toLowerCase()
          setForm(prev => ({ 
            ...prev, 
            gender: gender.includes('nam') ? 'male' : gender.includes('nữ') ? 'female' : 'other'
          }))
        }
        if (phoneMatch) setForm(prev => ({ ...prev, phone: phoneMatch[1].trim() }))
        if (symptomsMatch) setForm(prev => ({ ...prev, symptoms: symptomsMatch[1].trim() }))

        setAiSuggestions(aiResponse)
        
        toast({
          title: "✓ Đã phân tích ảnh",
          description: "Thông tin đã được tự động điền từ hình ảnh"
        })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Image analysis error:', error)
      toast({
        title: "Lỗi phân tích ảnh",
        description: "Không thể phân tích hình ảnh",
        variant: "destructive"
      })
    } finally {
      setAnalyzingImage(false)
    }
  }

  // AI-powered disease code suggestions
  const getSuggestedDiseaseCode = async () => {
    if (!form.symptoms) return

    try {
      const { data, error } = await supabase.functions.invoke('surveillance-ai', {
        body: {
          message: `Dựa vào triệu chứng sau, gợi ý 3 mã bệnh có thể: "${form.symptoms}". Chỉ trả lời danh sách mã bệnh (dengue, covid19, tcm, ari, etc.) ngắn gọn.`
        }
      })

      if (!error && data?.response) {
        toast({
          title: "💡 Gợi ý từ AI",
          description: data.response
        })
      }
    } catch (error) {
      console.error('AI suggestion error:', error)
    }
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

      const lat = parseFloat(form.lat)
      const lon = parseFloat(form.lon)
      if (isNaN(lat) || isNaN(lon)) {
        toast({
          title: "Tọa độ không hợp lệ",
          variant: "destructive"
        })
        return
      }

      // Auto-convert natural language symptoms to JSON
      let symptomsJson: any = {}
      if (form.symptoms) {
        try {
          symptomsJson = JSON.parse(form.symptoms)
        } catch {
          // Use AI to convert natural language to JSON
          const { data } = await supabase.functions.invoke('surveillance-ai', {
            body: {
              message: `Chuyển đổi triệu chứng sau sang JSON: "${form.symptoms}". Chỉ trả về JSON object với các key tiếng Anh.`
            }
          })
          
          if (data?.response) {
            try {
              const jsonMatch = data.response.match(/\{.*\}/s)
              if (jsonMatch) {
                symptomsJson = JSON.parse(jsonMatch[0])
              }
            } catch {
              symptomsJson = { description: form.symptoms }
            }
          }
        }
      }

      const mpiHash = await sha256Hex(form.mpi)

      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          full_name: form.full_name,
          mpi_hash: mpiHash,
          birth_year: parseInt(form.birth_year) || null,
          gender: form.gender || null,
          phone: form.phone || null,
          facility_id: form.facility_id || null,
        })
        .select()
        .single()

      if (patientError) throw patientError

      const { error: caseError } = await supabase
        .from('case_events')
        .insert({
          patient_id: patientData.id,
          disease_code: form.disease_code,
          facility_id: form.facility_id || null,
          lat: lat,
          lon: lon,
          symptoms: symptomsJson,
          patient_hash: mpiHash,
          patient_gender: form.gender || null,
          patient_age_bucket: form.birth_year ? `${Math.floor((new Date().getFullYear() - parseInt(form.birth_year)) / 10) * 10}-${Math.floor((new Date().getFullYear() - parseInt(form.birth_year)) / 10) * 10 + 9}` : null,
          source: 'smart_entry'
        })

      if (caseError) throw caseError

      toast({
        title: "✓ Thành công",
        description: `Đã lưu bệnh nhân ${form.full_name}. Dữ liệu đang cập nhật lên bản đồ realtime!`,
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
        symptoms: ''
      })
      setAiSuggestions('')
      
      // Notify user that data is syncing to map
      setTimeout(() => {
        toast({
          title: "🗺️ Đã cập nhật bản đồ",
          description: "Kiểm tra trang MapView để xem ca bệnh mới",
        });
      }, 1500)

    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra",
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
          <Sparkles className="h-8 w-8 text-primary" />
          Nhập liệu thông minh
        </h1>
        <p className="text-muted-foreground">AI-powered • Voice • GPS • Image Analysis</p>
      </div>

      {/* Quick Actions */}
      <Card className="rounded-2xl shadow-sm border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={getLocation}
              disabled={gettingLocation}
              className="h-auto py-4 flex-col gap-2"
            >
              {gettingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
              <span className="text-xs">Lấy GPS</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={analyzingImage}
              className="h-auto py-4 flex-col gap-2"
            >
              {analyzingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              <span className="text-xs">Tải ảnh</span>
            </Button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={getSuggestedDiseaseCode}
              disabled={!form.symptoms}
              className="h-auto py-4 flex-col gap-2"
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-xs">Gợi ý AI</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setForm({
                full_name: '',
                mpi: '',
                birth_year: '',
                gender: '',
                phone: '',
                disease_code: '',
                facility_id: '',
                lat: '',
                lon: '',
                symptoms: ''
              })}
              className="h-auto py-4 flex-col gap-2"
            >
              <span className="text-xs">Xóa hết</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patient Form */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Thông tin bệnh nhân
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="full_name">Họ và tên *</Label>
                <div className="flex gap-2">
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => startVoiceInput('full_name')}
                    disabled={isListening}
                  >
                    {isListening && activeField === 'full_name' ? 
                      <MicOff className="h-4 w-4 text-destructive" /> : 
                      <Mic className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="mpi">MPI/ID *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="mpi"
                    value={form.mpi}
                    onChange={(e) => handleInputChange('mpi', e.target.value)}
                    placeholder="ID bệnh nhân"
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
                />
              </div>

              <div>
                <Label htmlFor="disease_code">Mã bệnh *</Label>
                <Input
                  id="disease_code"
                  value={form.disease_code}
                  onChange={(e) => handleInputChange('disease_code', e.target.value)}
                  placeholder="dengue, covid19, tcm..."
                />
              </div>

              <div>
                <Label htmlFor="facility_id">Cơ sở y tế</Label>
                <Input
                  id="facility_id"
                  value={form.facility_id}
                  onChange={(e) => handleInputChange('facility_id', e.target.value)}
                  placeholder="BV_CHORAY, BV_115..."
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
                <Label htmlFor="lat">Vĩ độ *</Label>
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
                <Label htmlFor="lon">Kinh độ *</Label>
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
              <Label htmlFor="symptoms">Triệu chứng</Label>
              <div className="flex gap-2">
                <Textarea
                  id="symptoms"
                  value={form.symptoms}
                  onChange={(e) => handleInputChange('symptoms', e.target.value)}
                  placeholder="Sốt cao, ho, đau đầu... (nhập tự nhiên hoặc JSON)"
                  rows={4}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => startVoiceInput('symptoms')}
                  disabled={isListening}
                >
                  {isListening && activeField === 'symptoms' ? 
                    <MicOff className="h-4 w-4 text-destructive" /> : 
                    <Mic className="h-4 w-4" />
                  }
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                💡 Nhập bằng ngôn ngữ tự nhiên, AI sẽ tự động chuyển đổi
              </p>
            </div>

            {aiSuggestions && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-xs font-medium mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Phân tích từ AI:
                </p>
                <p className="text-sm text-muted-foreground">{aiSuggestions}</p>
              </div>
            )}

            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                MPI được mã hóa SHA256
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI hỗ trợ nhập liệu
              </Badge>
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Lưu bệnh nhân
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

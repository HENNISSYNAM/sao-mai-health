import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { toast } from "sonner"
import { HealthAPI } from "@/services/healthAPI"
import { useFormAutoSave } from "@/hooks/useOfflineFirst"
import { useRealtimeCases } from "@/hooks/useRealtimeHealth"
import { 
  UserPlus, Clock, Save, AlertCircle, CheckCircle, 
  MapPin, Calendar, User, Phone, Home, Activity,
  Loader2, Scan, RefreshCw
} from "lucide-react"

// Form validation schema
const caseIntakeSchema = z.object({
  name_hash: z.string().min(1, "Tên bệnh nhân là bắt buộc"),
  dob: z.string().min(1, "Ngày sinh là bắt buộc"),
  gender: z.enum(["male", "female", "other"]).refine(val => val, {
    message: "Giới tính là bắt buộc"
  }),
  address_hash: z.string().min(1, "Địa chỉ là bắt buộc"),
  phone_hash: z.string(),
  disease_code: z.enum(["dengue", "tcm", "ari", "covid19", "influenza", "measles", "other"]).refine(val => val, {
    message: "Mã bệnh là bắt buộc"
  }),
  status: z.enum(["suspected", "probable", "confirmed", "ruled_out", "pending"]).default("suspected"),
  onset_date: z.string().min(1, "Ngày khởi phát là bắt buộc"),
  report_date: z.string().optional(),
  district_id: z.string().min(1, "Quận/Huyện là bắt buộc"),
  ward_id: z.string().min(1, "Phường/Xã là bắt buộc"),
  facility_id: z.string().min(1, "Cơ sở y tế là bắt buộc"),
  lat: z.number().optional(),
  lng: z.number().optional()
})

type CaseIntakeFormData = z.infer<typeof caseIntakeSchema>

const diseaseChips = {
  dengue: { label: 'Sốt xuất huyết', color: 'bg-red-500 text-white' },
  tcm: { label: 'Tay chân miệng', color: 'bg-amber-500 text-white' },
  ari: { label: 'Nhiễm khuẩn hô hấp', color: 'bg-blue-500 text-white' },
  covid19: { label: 'COVID-19', color: 'bg-purple-500 text-white' },
  influenza: { label: 'Cúm', color: 'bg-indigo-500 text-white' },
  measles: { label: 'Sởi', color: 'bg-pink-500 text-white' },
  other: { label: 'Khác', color: 'bg-gray-500 text-white' }
}

export default function EnhancedCaseIntake() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitTime, setSubmitTime] = useState<number | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [mpiSuggestions, setMpiSuggestions] = useState<any[]>([])

  // Auto-save and realtime
  const { autoSavedData, saveData, clearData, hasAutoSavedData } = useFormAutoSave('case-intake')
  const { pushUpdate } = useRealtimeCases()

  const form = useForm<CaseIntakeFormData>({
    resolver: zodResolver(caseIntakeSchema),
    defaultValues: autoSavedData || {
      status: "suspected",
      report_date: new Date().toISOString().split('T')[0],
      district_id: "",
      ward_id: "",
      facility_id: ""
    }
  })

  // Watch form changes for auto-save
  const watchedValues = form.watch()
  useState(() => {
    const timeoutId = setTimeout(() => {
      if (Object.values(watchedValues).some(val => val)) {
        saveData(watchedValues)
      }
    }, 2000) // Auto-save after 2 seconds of no changes

    return () => clearTimeout(timeoutId)
  })

  // Handle form submission (target: ≤30 seconds)
  const onSubmit = async (data: CaseIntakeFormData) => {
    const startTime = Date.now()
    setIsSubmitting(true)

    try {
      // Call RPC for fast case intake
      const result = await HealthAPI.intakeCaseFast(data)
      
      if (result.success) {
        const endTime = Date.now()
        const processingTime = (endTime - startTime) / 1000
        setSubmitTime(processingTime)

        // Push optimistic update to realtime
        pushUpdate({
          id: result.case_id,
          patient_id: result.patient_id,
          case_number: `CASE-${Date.now()}`,
          ...data,
          created_at: new Date().toISOString()
        })

        // Clear auto-saved data
        clearData()
        
        // Reset form
        form.reset()
        
        toast.success(
          `Ca bệnh đã được tạo thành công! (${processingTime.toFixed(1)}s)`,
          {
            description: `Mã ca: ${result.case_id?.substring(0, 8)}...`
          }
        )
      } else {
        throw new Error(result.message || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Case intake failed:', error)
      toast.error('Không thể tạo ca bệnh', {
        description: error instanceof Error ? error.message : 'Lỗi không xác định'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mock MPI (Master Patient Index) search
  const handleMPISearch = async () => {
    const nameHash = form.getValues('name_hash')
    const dob = form.getValues('dob')
    
    if (!nameHash || !dob) {
      toast.error('Vui lòng nhập tên và ngày sinh để tìm kiếm')
      return
    }

    // Mock MPI suggestions
    setMpiSuggestions([
      {
        id: '1',
        name_hash: nameHash,
        dob,
        gender: 'male',
        address_hash: '123 Nguyễn Huệ, Q1',
        phone_hash: '0901234567',
        similarity: 0.95
      },
      {
        id: '2', 
        name_hash: nameHash,
        dob,
        gender: 'female',
        address_hash: '456 Lê Lợi, Q1',
        phone_hash: '0907654321',
        similarity: 0.87
      }
    ])
    setIsDrawerOpen(true)
  }

  // Keyboard shortcuts
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault()
            form.handleSubmit(onSubmit)()
            break
          case 'n':
            e.preventDefault()
            form.reset()
            clearData()
            toast.info('Form đã được reset')
            break
        }
      }
      
      if (e.key === 'Escape') {
        setIsDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Nhập ca bệnh mới</h1>
            <p className="text-muted-foreground">Mục tiêu: hoàn thành trong 30 giây</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasAutoSavedData && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
              <Save className="h-3 w-3 mr-1" />
              Có dữ liệu tự động lưu
            </Badge>
          )}
          
          {submitTime && (
            <Badge className={submitTime <= 30 ? 'bg-success text-white' : 'bg-warning text-white'}>
              <Clock className="h-3 w-3 mr-1" />
              {submitTime.toFixed(1)}s
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Scan className="h-5 w-5 text-primary" />
            <span className="font-medium">Quét CCCD hoặc tìm kiếm MPI</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleMPISearch}>
              <User className="h-4 w-4 mr-2" />
              Tìm kiếm bệnh nhân
            </Button>
            <Button variant="outline">
              <Scan className="h-4 w-4 mr-2" />
              Quét CCCD
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Thông tin bệnh nhân
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name_hash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ tên *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập họ tên bệnh nhân" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày sinh *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giới tính *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn giới tính" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Nam</SelectItem>
                        <SelectItem value="female">Nữ</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_hash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập số điện thoại" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address_hash"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Địa chỉ *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập địa chỉ bệnh nhân" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Thông tin ca bệnh
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="disease_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã bệnh *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn mã bệnh" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(diseaseChips).map(([code, config]) => (
                          <SelectItem key={code} value={code}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${config.color}`} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái ca</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="suspected">Nghi ngờ</SelectItem>
                        <SelectItem value="probable">Có thể</SelectItem>
                        <SelectItem value="confirmed">Xác nhận</SelectItem>
                        <SelectItem value="ruled_out">Loại trừ</SelectItem>
                        <SelectItem value="pending">Chờ xử lý</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="onset_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày khởi phát *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="report_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày báo cáo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Thông tin địa điểm
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="district_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quận/Huyện *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn quận/huyện" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="q1">Quận 1</SelectItem>
                        <SelectItem value="q2">Quận 2</SelectItem>
                        <SelectItem value="q3">Quận 3</SelectItem>
                        <SelectItem value="q4">Quận 4</SelectItem>
                        <SelectItem value="q5">Quận 5</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ward_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phường/Xã *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn phường/xã" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="p1">Phường Bến Nghé</SelectItem>
                        <SelectItem value="p2">Phường Bến Thành</SelectItem>
                        <SelectItem value="p3">Phường Cô Giang</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facility_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cơ sở y tế *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cơ sở" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bv001">BV Chợ Rẫy</SelectItem>
                        <SelectItem value="bv002">BV Nhi Đồng 1</SelectItem>
                        <SelectItem value="bv003">BV Từ Dũ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Phím tắt: Alt+S (Lưu), Alt+N (Mới), Esc (Đóng)
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  clearData()
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tạo ca bệnh
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* MPI Suggestions Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Gợi ý từ Master Patient Index</DrawerTitle>
            <DrawerDescription>
              Chọn bệnh nhân phù hợp hoặc đóng để tạo mới
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {mpiSuggestions.map((patient) => (
              <Card key={patient.id} className="cursor-pointer hover:bg-accent" onClick={() => {
                form.setValue('name_hash', patient.name_hash)
                form.setValue('dob', patient.dob)
                form.setValue('gender', patient.gender)
                form.setValue('address_hash', patient.address_hash)
                form.setValue('phone_hash', patient.phone_hash)
                setIsDrawerOpen(false)
                toast.success('Đã áp dụng thông tin bệnh nhân')
              }}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{patient.name_hash}</div>
                      <div className="text-sm text-muted-foreground">
                        {patient.dob} • {patient.gender} • {patient.phone_hash}
                      </div>
                      <div className="text-sm text-muted-foreground">{patient.address_hash}</div>
                    </div>
                    <Badge variant="outline">
                      {(patient.similarity * 100).toFixed(0)}% khớp
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
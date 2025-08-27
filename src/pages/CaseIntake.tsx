import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Scan, Save, User, MapPin, Calendar, Activity } from "lucide-react"
import { useOfflineStorage } from "@/hooks/useOfflineStorage"

const caseSchema = z.object({
  citizenId: z.string().min(9, "CCCD phải có ít nhất 9 ký tự"),
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  dateOfBirth: z.string().min(1, "Ngày sinh là bắt buộc"),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().optional(),
  address: z.string().min(5, "Địa chỉ phải có ít nhất 5 ký tự"),
  wardId: z.string().min(1, "Phường/xã là bắt buộc"),
  facilityId: z.string().min(1, "Cơ sở y tế là bắt buộc"),
  disease: z.enum(["dengue", "tcm", "ari"]),
  onsetDate: z.string().min(1, "Ngày khởi phát là bắt buộc"),
  symptoms: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe"]),
  status: z.enum(["suspected", "probable", "confirmed"])
})

type CaseFormData = z.infer<typeof caseSchema>

const diseaseOptions = [
  { value: "dengue", label: "Sốt xuất huyết", color: "bg-dengue" },
  { value: "tcm", label: "Tay chân miệng", color: "bg-tcm" },
  { value: "ari", label: "Nhiễm khuẩn hô hấp", color: "bg-ari" }
]

export default function CaseIntake() {
  const [isScanning, setIsScanning] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const { queueRecord, isOnline } = useOfflineStorage()

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      gender: "male",
      disease: "dengue",
      severity: "mild",
      status: "suspected"
    }
  })

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled) return

    const subscription = form.watch((value) => {
      const timer = setTimeout(() => {
        localStorage.setItem('case-intake-draft', JSON.stringify(value))
        setLastSaved(new Date())
      }, 2000)

      return () => clearTimeout(timer)
    })

    return () => subscription.unsubscribe()
  }, [form, autoSaveEnabled])

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('case-intake-draft')
    if (draft) {
      try {
        const data = JSON.parse(draft)
        form.reset(data)
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [form])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 's') {
        e.preventDefault()
        form.handleSubmit(onSubmit)()
      }
      if (e.altKey && e.key === 'n') {
        e.preventDefault()
        form.reset()
        localStorage.removeItem('case-intake-draft')
      }
      if (e.key === 'Escape') {
        // Close any open modals or return to dashboard
        window.history.back()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [form])

  const scanCitizenId = async () => {
    setIsScanning(true)
    
    // Simulate CCCD scanning - replace with actual scanner integration
    setTimeout(() => {
      // Mock data from CCCD scan
      const mockData = {
        citizenId: "001234567890",
        fullName: "Nguyễn Văn An",
        dateOfBirth: "1985-06-15",
        address: "123 Nguyễn Thái Học, Phường 1, Quận 1, TP.HCM"
      }
      
      form.setValue('citizenId', mockData.citizenId)
      form.setValue('fullName', mockData.fullName)
      form.setValue('dateOfBirth', mockData.dateOfBirth)
      form.setValue('address', mockData.address)
      
      setIsScanning(false)
      toast.success("Đã quét thành công thông tin từ CCCD")
    }, 2000)
  }

  const onSubmit = async (data: CaseFormData) => {
    try {
      if (isOnline) {
        // TODO: Call Supabase RPC fn_cases_intake_fast
        console.log('Submitting case online:', data)
        toast.success("Đã nhập ca bệnh thành công")
      } else {
        // Queue for offline sync
        await queueRecord('cases', 'insert', data)
        toast.success("Đã lưu ca bệnh offline, sẽ đồng bộ khi có kết nối")
      }
      
      // Clear form and draft
      form.reset()
      localStorage.removeItem('case-intake-draft')
      setLastSaved(null)
      
    } catch (error) {
      console.error('Error submitting case:', error)
      toast.error("Lỗi khi nhập ca bệnh")
    }
  }

  const selectedDisease = diseaseOptions.find(d => d.value === form.watch('disease'))

  return (
    <div className="p-6 min-h-screen">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold text-foreground">Nhập ca bệnh mới</h1>
          <p className="text-muted-foreground">
            Mục tiêu: hoàn thành trong 30 giây
            {lastSaved && (
              <span className="ml-2 text-sm text-success">
                • Tự động lưu lúc {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={scanCitizenId} disabled={isScanning} variant="outline">
            <Scan className="h-4 w-4 mr-2" />
            {isScanning ? "Đang quét..." : "Quét CCCD"}
          </Button>
          <Button type="submit" form="case-form">
            <Save className="h-4 w-4 mr-2" />
            Lưu ca bệnh (Alt+S)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Thông tin bệnh nhân
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form id="case-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="citizenId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số CCCD</FormLabel>
                      <FormControl>
                        <Input placeholder="001234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ và tên</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyễn Văn A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày sinh</FormLabel>
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
                      <FormLabel>Giới tính</FormLabel>
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Điện thoại</FormLabel>
                      <FormControl>
                        <Input placeholder="0901234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phường/Xã</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn phường/xã" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ward-1">Phường 1, Quận 1</SelectItem>
                          <SelectItem value="ward-3">Phường 3, Quận 3</SelectItem>
                          <SelectItem value="ward-5">Phường 5, Quận 5</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Nguyễn Thái Học, Phường 1, Quận 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Thông tin y tế</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facilityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cơ sở y tế</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn cơ sở y tế" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bv-choran">BV Chợ Rẫy</SelectItem>
                            <SelectItem value="bv-nhi-dong-1">BV Nhi Đồng 1</SelectItem>
                            <SelectItem value="bv-115">BV 115</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disease"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bệnh</FormLabel>
                        <div className="flex gap-2">
                          {diseaseOptions.map((disease) => (
                            <Button
                              key={disease.value}
                              type="button"
                              variant={field.value === disease.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange(disease.value)}
                              className={field.value === disease.value ? `${disease.color} text-white` : ""}
                            >
                              {disease.label}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="onsetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày khởi phát</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mức độ nghiêm trọng</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn mức độ" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mild">Nhẹ</SelectItem>
                            <SelectItem value="moderate">Vừa</SelectItem>
                            <SelectItem value="severe">Nặng</SelectItem>
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
                        <FormLabel>Trạng thái</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="suspected">Nghi ngờ</SelectItem>
                            <SelectItem value="probable">Có thể</SelectItem>
                            <SelectItem value="confirmed">Xác nhận</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="symptoms"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Triệu chứng</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Mô tả các triệu chứng..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
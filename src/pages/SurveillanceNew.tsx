import { useState, useMemo, useEffect } from "react"
import { Search, Filter, Download, Calendar, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useHealthRealtime } from "@/contexts/HealthRealtimeContext"

export default function SurveillanceNew() {
  const { dailyCounts, loading, lastTick, isConnected } = useHealthRealtime()
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [diseaseFilter, setDiseaseFilter] = useState("all")
  const [districtFilter, setDistrictFilter] = useState("")

  // Get unique diseases for filter
  const diseases = useMemo(() => {
    const unique = new Set(dailyCounts.map(dc => dc.disease_code))
    return Array.from(unique)
  }, [dailyCounts])

  // Filtered and grouped data
  const filteredData = useMemo(() => {
    let filtered = dailyCounts.filter(dc => {
      const matchesDate = dc.day >= fromDate && dc.day <= toDate
      const matchesDisease = diseaseFilter === "all" || dc.disease_code === diseaseFilter
      const matchesDistrict = !districtFilter || dc.district_id.toLowerCase().includes(districtFilter.toLowerCase())
      const matchesSearch = !searchTerm || 
        dc.disease_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dc.district_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dc.ward_id.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesDate && matchesDisease && matchesDistrict && matchesSearch
    })

    // Group by day, disease_code, district_id
    const grouped = filtered.reduce((acc, dc) => {
      const key = `${dc.day}-${dc.disease_code}-${dc.district_id}`
      if (!acc[key]) {
        acc[key] = {
          day: dc.day,
          disease_code: dc.disease_code,
          district_id: dc.district_id,
          ward_id: dc.ward_id,
          cases: 0
        }
      }
      acc[key].cases += dc.cases
      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(b.day).getTime() - new Date(a.day).getTime()
    )
  }, [dailyCounts, fromDate, toDate, diseaseFilter, districtFilter, searchTerm])

  // Chart data for selected disease
  const chartData = useMemo(() => {
    if (diseaseFilter === "all") return []
    
    const diseaseData = dailyCounts
      .filter(dc => 
        dc.disease_code === diseaseFilter && 
        dc.day >= fromDate && 
        dc.day <= toDate
      )
      .reduce((acc, dc) => {
        if (!acc[dc.day]) {
          acc[dc.day] = { day: dc.day, cases: 0 }
        }
        acc[dc.day].cases += dc.cases
        return acc
      }, {} as Record<string, any>)

    return Object.values(diseaseData)
      .sort((a: any, b: any) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .map((item: any) => ({
        ...item,
        dayName: new Date(item.day).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
      }))
  }, [dailyCounts, diseaseFilter, fromDate, toDate])

  const getDiseaseBadge = (disease: string) => {
    const colors: Record<string, string> = {
      'dengue': 'bg-red-500',
      'ari': 'bg-blue-500', 
      'tcm': 'bg-green-500',
      'covid19': 'bg-purple-500'
    }
    return (
      <Badge className={`${colors[disease] || 'bg-gray-500'} text-white`}>
        {disease.toUpperCase()}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Giám sát bệnh truyền nhiễm</h1>
          <p className="text-muted-foreground">Phân tích và theo dõi xu hướng bệnh dịch</p>
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Giám sát bệnh truyền nhiễm</h1>
          <p className="text-muted-foreground">Phân tích và theo dõi xu hướng bệnh dịch</p>
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

      {/* Filters */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Tìm kiếm bệnh, quận, phường..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="from-date">Từ ngày</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="to-date">Đến ngày</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="disease">Bệnh</Label>
              <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bệnh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả bệnh</SelectItem>
                  {diseases.map(disease => (
                    <SelectItem key={disease} value={disease}>
                      {disease.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="district">Quận/Huyện</Label>
              <Input
                id="district"
                placeholder="Nhập quận/huyện"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Lọc nâng cao
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Biểu đồ theo ngày
              {diseaseFilter !== "all" && (
                <Badge variant="outline">{diseaseFilter.toUpperCase()}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayName" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => `Ngày: ${label}`}
                    formatter={(value) => [`${value} ca`, 'Số ca']}
                  />
                  <Bar dataKey="cases" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-250 flex items-center justify-center text-muted-foreground">
                {diseaseFilter === "all" 
                  ? "Chọn một bệnh để hiển thị biểu đồ" 
                  : "Không có dữ liệu cho bộ lọc hiện tại"
                }
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Thống kê tổng quan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <div className="text-2xl font-bold text-primary">
                  {filteredData.reduce((sum: number, item: any) => sum + item.cases, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Tổng ca bệnh</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-warning/10">
                <div className="text-2xl font-bold text-warning">
                  {new Set(filteredData.map((item: any) => item.disease_code)).size}
                </div>
                <div className="text-sm text-muted-foreground">Loại bệnh</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-success/10">
                <div className="text-2xl font-bold text-success">
                  {new Set(filteredData.map((item: any) => item.district_id)).size}
                </div>
                <div className="text-sm text-muted-foreground">Quận/Huyện</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-info/10">
                <div className="text-2xl font-bold text-info">
                  {new Set(filteredData.map((item: any) => item.day)).size}
                </div>
                <div className="text-sm text-muted-foreground">Ngày có ca</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dữ liệu chi tiết ({filteredData.length} bản ghi)</span>
            <Badge variant="outline">
              <Calendar className="h-3 w-3 mr-1" />
              {fromDate} đến {toDate}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Bệnh</TableHead>
                  <TableHead>Quận/Huyện</TableHead>
                  <TableHead>Phường/Xã</TableHead>
                  <TableHead className="text-right">Số ca</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Không có dữ liệu cho bộ lọc hiện tại
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item: any, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(item.day).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>{getDiseaseBadge(item.disease_code)}</TableCell>
                      <TableCell>{item.district_id}</TableCell>
                      <TableCell>{item.ward_id}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.cases}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
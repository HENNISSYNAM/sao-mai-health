import { useState } from "react"
import { Search, Filter, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

// Mock data
const cases = [
  {
    id: "CASE-001",
    patientName: "Nguyễn Văn A",
    age: 28,
    gender: "Nam",
    disease: "Dengue",
    status: "confirmed",
    facility: "BV Chợ Rẫy",
    ward: "Phường 1, Quận 1",
    reportDate: "2024-01-15",
    onset: "2024-01-12"
  },
  {
    id: "CASE-002", 
    patientName: "Trần Thị B",
    age: 34,
    gender: "Nữ",
    disease: "TCM",
    status: "suspected",
    facility: "BV Nhi Đồng 1",
    ward: "Phường 3, Quận 3",
    reportDate: "2024-01-14",
    onset: "2024-01-11"
  },
  {
    id: "CASE-003",
    patientName: "Lê Văn C", 
    age: 45,
    gender: "Nam",
    disease: "ARI",
    status: "confirmed",
    facility: "BV 115",
    ward: "Phường 5, Quận 5",
    reportDate: "2024-01-13",
    onset: "2024-01-10"
  }
]

export default function Surveillance() {
  const [searchTerm, setSearchTerm] = useState("")
  const [diseaseFilter, setDiseaseFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

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

  const getDiseaseBadge = (disease: string) => {
    switch (disease) {
      case 'Dengue':
        return <Badge className="bg-dengue text-white">Sốt xuất huyết</Badge>
      case 'TCM':
        return <Badge className="bg-tcm text-white">Tay chân miệng</Badge>
      case 'ARI':
        return <Badge className="bg-ari text-white">Nhiễm khuẩn hô hấp</Badge>
      default:
        return <Badge variant="outline">{disease}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Giám sát bệnh truyền nhiễm</h1>
        <p className="text-muted-foreground">Danh sách ca bệnh và theo dõi tiếp xúc</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên, mã ca bệnh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Chọn bệnh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả bệnh</SelectItem>
                <SelectItem value="dengue">Sốt xuất huyết</SelectItem>
                <SelectItem value="tcm">Tay chân miệng</SelectItem>
                <SelectItem value="ari">Nhiễm khuẩn hô hấp</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="confirmed">Xác nhận</SelectItem>
                <SelectItem value="suspected">Nghi ngờ</SelectItem>
                <SelectItem value="probable">Có thể</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách ca bệnh ({cases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã ca</TableHead>
                <TableHead>Bệnh nhân</TableHead>
                <TableHead>Tuổi/Giới</TableHead>
                <TableHead>Bệnh</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Cơ sở y tế</TableHead>
                <TableHead>Địa điểm</TableHead>
                <TableHead>Ngày báo cáo</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((case_) => (
                <TableRow key={case_.id}>
                  <TableCell className="font-medium">{case_.id}</TableCell>
                  <TableCell>{case_.patientName}</TableCell>
                  <TableCell>{case_.age}/{case_.gender}</TableCell>
                  <TableCell>{getDiseaseBadge(case_.disease)}</TableCell>
                  <TableCell>{getStatusBadge(case_.status)}</TableCell>
                  <TableCell>{case_.facility}</TableCell>
                  <TableCell>{case_.ward}</TableCell>
                  <TableCell>{case_.reportDate}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
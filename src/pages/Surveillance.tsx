import { useState, useEffect } from "react"
import { Search, Filter, Download, Eye, Loader2, RefreshCcw } from "lucide-react"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useSurveillanceSearch } from "@/hooks/useSurveillanceSearch"
import { useRealtime } from "@/hooks/useRealtime"
import { toast } from "sonner"

export default function Surveillance() {
  const [searchTerm, setSearchTerm] = useState("")
  const [diseaseFilter, setDiseaseFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const {
    cases,
    totalCount,
    loading,
    error,
    exportToCSV
  } = useSurveillanceSearch({
    searchTerm,
    diseaseFilter,
    statusFilter,
    pageSize,
    currentPage
  })

  // Real-time updates - using cases as the closest available table
  const { isConnected, data: realtimeData } = useRealtime({
    table: 'cases',
    event: '*'
  })

  useEffect(() => {
    if (realtimeData && realtimeData.length > 0) {
      toast.info("Có ca bệnh mới được cập nhật", {
        action: {
          label: "Làm mới",
          onClick: () => window.location.reload()
        }
      })
    }
  }, [realtimeData])

  const totalPages = Math.ceil(totalCount / pageSize)

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
    const diseaseMap: Record<string, { label: string; className: string }> = {
      'dengue': { label: 'Sốt xuất huyết', className: 'bg-dengue text-white' },
      'covid19': { label: 'COVID-19', className: 'bg-covid text-white' },
      'tcm': { label: 'Tay chân miệng', className: 'bg-tcm text-white' },
      'ari': { label: 'Nhiễm khuẩn hô hấp', className: 'bg-ari text-white' },
      'hfmd': { label: 'Bệnh tay chân miệng', className: 'bg-hfmd text-white' },
      'h1n1': { label: 'Cúm A/H1N1', className: 'bg-h1n1 text-white' },
      'malaria': { label: 'Sốt rét', className: 'bg-malaria text-white' }
    }
    
    const diseaseInfo = diseaseMap[disease.toLowerCase()] || { label: disease, className: 'bg-gray-500 text-white' }
    return <Badge className={diseaseInfo.className}>{diseaseInfo.label}</Badge>
  }

  const getDiseaseOptions = () => [
    { value: 'all', label: 'Tất cả bệnh' },
    { value: 'dengue', label: 'Sốt xuất huyết' },
    { value: 'covid19', label: 'COVID-19' },
    { value: 'tcm', label: 'Tay chân miệng' },
    { value: 'ari', label: 'Nhiễm khuẩn hô hấp' },
    { value: 'hfmd', label: 'Bệnh tay chân miệng' },
    { value: 'h1n1', label: 'Cúm A/H1N1' },
    { value: 'malaria', label: 'Sốt rét' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Giám sát bệnh truyền nhiễm</h1>
          <p className="text-muted-foreground">
            Tra cứu ca bệnh thời gian thực • {totalCount} ca • 
            <span className={`ml-2 inline-flex items-center gap-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Trực tuyến' : 'Mất kết nối'}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Gõ tên bệnh nhân, mã ca, bệnh... để tìm kiếm"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1) // Reset to first page when searching
                }}
                className="pl-9"
                disabled={loading}
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Select 
              value={diseaseFilter} 
              onValueChange={(value) => {
                setDiseaseFilter(value)
                setCurrentPage(1)
              }}
              disabled={loading}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Chọn bệnh" />
              </SelectTrigger>
              <SelectContent>
                {getDiseaseOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={statusFilter} 
              onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
              disabled={loading}
            >
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
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={loading || cases.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive text-center">
              Lỗi: {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Danh sách ca bệnh ({totalCount})</span>
            <div className="text-sm text-muted-foreground">
              Trang {currentPage} / {totalPages} • {pageSize} ca/trang
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Đang tải...</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || diseaseFilter !== 'all' || statusFilter !== 'all' 
                ? 'Không tìm thấy ca bệnh nào phù hợp'
                : 'Không có ca bệnh nào'
              }
            </div>
          ) : (
            <>
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
                      <TableCell>
                        {case_.patient_name || case_.patient_hash || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {case_.patient_age_bucket || 'N/A'}/{case_.patient_gender || 'N/A'}
                      </TableCell>
                      <TableCell>{getDiseaseBadge(case_.disease_code)}</TableCell>
                      <TableCell>{getStatusBadge(case_.status)}</TableCell>
                      <TableCell>{case_.facility_name || 'N/A'}</TableCell>
                      <TableCell>
                        {case_.ward_id || 'N/A'}, {case_.district_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(case_.occurred_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) {
                              setCurrentPage(currentPage - 1)
                            }
                          }}
                          className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setCurrentPage(pageNum)
                              }}
                              isActive={currentPage === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}

                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) {
                              setCurrentPage(currentPage + 1)
                            }
                          }}
                          className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
import { useState, useEffect } from "react"
import { Search, Filter, Download, Eye, Loader2, RefreshCcw, Plus } from "lucide-react"
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
import { CaseDetailModal } from "@/components/CaseDetailModal"
import { AddCaseModal } from "@/components/AddCaseModal"
import { SurveillanceAIAssistant } from "@/components/SurveillanceAIAssistant"
import { toast } from "sonner"

export default function Surveillance() {
  const [searchTerm, setSearchTerm] = useState("")
  const [diseaseFilter, setDiseaseFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCase, setSelectedCase] = useState(null)
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
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

  const handleCaseAdded = () => {
    // Refresh data by resetting the page
    setCurrentPage(1)
    window.location.reload()
  }

  // Real-time updates - using cases table (closest available)
  const { isConnected, data: realtimeData } = useRealtime({
    table: 'cases',
    event: '*'
  })

  useEffect(() => {
    if (realtimeData && realtimeData.length > 0) {
      toast.success("Có ca bệnh mới được cập nhật", {
        description: "Dữ liệu đã được cập nhật tự động",
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
      'D01': { label: 'Sốt xuất huyết', className: 'bg-red-500 text-white' },
      'D02': { label: 'Tay chân miệng', className: 'bg-orange-500 text-white' },
      'D03': { label: 'COVID-19', className: 'bg-blue-500 text-white' },
      'D04': { label: 'Nhiễm khuẩn hô hấp', className: 'bg-green-500 text-white' },
      'D05': { label: 'Sốt rét', className: 'bg-purple-500 text-white' },
      'D06': { label: 'Cúm A/H1N1', className: 'bg-pink-500 text-white' }
    }
    
    const diseaseInfo = diseaseMap[disease] || { label: disease, className: 'bg-muted-foreground text-white' }
    return <Badge className={diseaseInfo.className}>{diseaseInfo.label}</Badge>
  }

  const getDiseaseOptions = () => [
    { value: 'all', label: 'Tất cả bệnh' },
    { value: 'D01', label: 'Sốt xuất huyết' },
    { value: 'D02', label: 'Tay chân miệng' },
    { value: 'D03', label: 'COVID-19' },
    { value: 'D04', label: 'Nhiễm khuẩn hô hấp' },
    { value: 'D05', label: 'Sốt rét' },
    { value: 'D06', label: 'Cúm A/H1N1' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container mx-auto py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-border/50 shadow-xl">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Giám sát bệnh truyền nhiễm
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Tra cứu ca bệnh thời gian thực</span>
                <span>•</span>
                <span className="font-medium text-foreground">{totalCount} ca</span>
                <span>•</span>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  isConnected 
                    ? 'bg-success/10 text-success border border-success/20' 
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                  {isConnected ? 'Trực tuyến' : 'Mất kết nối'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                disabled={loading}
                className="hover:bg-primary/10 transition-all duration-200"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm ca mới
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-card via-card to-card/95">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Gõ tên bệnh nhân, mã ca, bệnh... để tìm kiếm"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-12 h-12 text-base border-border/50 focus:border-primary/50 transition-all duration-200"
                  disabled={loading}
                />
                {loading && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Select 
                  value={diseaseFilter} 
                  onValueChange={(value) => {
                    setDiseaseFilter(value)
                    setCurrentPage(1)
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full sm:w-52 h-12 border-border/50 focus:border-primary/50">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Tất cả bệnh" />
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
                  <SelectTrigger className="w-full sm:w-52 h-12 border-border/50 focus:border-primary/50">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Tất cả trạng thái" />
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
                  className="h-12 px-6 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Xuất CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 text-destructive">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="font-medium">Lỗi: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Cases Table */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/95 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xl font-semibold">Danh sách ca bệnh ({totalCount})</span>
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Trang {currentPage} / {totalPages || 1} • {pageSize} ca/trang
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <div className="space-y-2">
                    <div className="text-lg font-medium">Đang tải dữ liệu...</div>
                    <div className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát</div>
                  </div>
                </div>
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-medium text-muted-foreground">
                    {searchTerm || diseaseFilter !== 'all' || statusFilter !== 'all' 
                      ? 'Không tìm thấy ca bệnh nào phù hợp'
                      : 'Không có ca bệnh nào'
                    }
                  </div>
                  {(searchTerm || diseaseFilter !== 'all' || statusFilter !== 'all') && (
                    <div className="text-sm text-muted-foreground">
                      Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm
                    </div>
                  )}
                </div>
              </div>
            ) : (
            <>
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-muted/30">
                      <TableHead className="font-semibold text-foreground">Mã ca</TableHead>
                      <TableHead className="font-semibold text-foreground">Bệnh nhân</TableHead>
                      <TableHead className="font-semibold text-foreground">Tuổi/Giới</TableHead>
                      <TableHead className="font-semibold text-foreground">Bệnh</TableHead>
                      <TableHead className="font-semibold text-foreground">Trạng thái</TableHead>
                      <TableHead className="font-semibold text-foreground">Cơ sở y tế</TableHead>
                      <TableHead className="font-semibold text-foreground">Địa điểm</TableHead>
                      <TableHead className="font-semibold text-foreground">Ngày báo cáo</TableHead>
                      <TableHead className="font-semibold text-foreground">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((case_, index) => (
                      <TableRow 
                        key={case_.id}
                        className={`border-border/30 hover:bg-muted/20 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                        }`}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {case_.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          {case_.patient_name || case_.patient_hash || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {case_.patient_age_bucket || 'N/A'}/{case_.patient_gender || 'N/A'}
                        </TableCell>
                        <TableCell>{getDiseaseBadge(case_.disease_code)}</TableCell>
                        <TableCell>{getStatusBadge(case_.status)}</TableCell>
                        <TableCell className="max-w-48 truncate">
                          {case_.facility_name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {case_.ward_id || 'N/A'}, {case_.district_id || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(case_.occurred_at).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedCase(case_)
                              setShowCaseModal(true)
                            }}
                            className="hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="p-6 bg-gradient-to-r from-muted/20 to-muted/10 border-t border-border/30">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} trong tổng số {totalCount} ca bệnh
                    </div>
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
                            className={`${currentPage <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-primary/10'} transition-colors duration-200`}
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
                                className={`transition-colors duration-200 ${
                                  currentPage === pageNum 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'hover:bg-primary/10'
                                }`}
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
                            className={`${currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-primary/10'} transition-colors duration-200`}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
            )}
          </CardContent>
        </Card>

        {/* Case Detail Modal */}
        <CaseDetailModal 
          case_={selectedCase}
          open={showCaseModal}
          onOpenChange={setShowCaseModal}
        />

        {/* Add Case Modal */}
        <AddCaseModal 
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onCaseAdded={handleCaseAdded}
        />

        {/* AI Assistant */}
        <SurveillanceAIAssistant />
      </div>
    </div>
  )
}
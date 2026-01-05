import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Search, Filter, Download, Eye, Loader2, RefreshCcw, Plus, Calendar, Users, Activity, AlertTriangle, TrendingUp } from "lucide-react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useSurveillanceSearch } from "@/hooks/useSurveillanceSearch"
import { useRealtime } from "@/hooks/useRealtime"
import { CaseDetailModal } from "@/components/CaseDetailModal"
import { AddCaseModal } from "@/components/AddCaseModal"
import { toast } from "sonner"

export default function Surveillance() {
  const { t, i18n } = useTranslation()
  const [searchTerm, setSearchTerm] = useState("")
  const [diseaseFilter, setDiseaseFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [districtFilter, setDistrictFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")
  const [genderFilter, setGenderFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCase, setSelectedCase] = useState(null)
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const pageSize = 20

  const {
    cases,
    totalCount,
    loading,
    error,
    stats,
    exportToCSV
  } = useSurveillanceSearch({
    searchTerm,
    diseaseFilter,
    statusFilter,
    dateFrom,
    dateTo,
    districtFilter,
    ageFilter,
    genderFilter,
    pageSize,
    currentPage
  })

  const handleCaseAdded = () => {
    setCurrentPage(1)
    window.location.reload()
  }

  // Real-time updates
  const { isConnected, data: realtimeData } = useRealtime({
    table: 'case_events',
    event: '*'
  })

  useEffect(() => {
    if (realtimeData && realtimeData.length > 0) {
      toast.success(t("surveillance.newCaseUpdated"), {
        description: t("surveillance.dataAutoUpdated"),
        action: {
          label: t("common.refresh"),
          onClick: () => window.location.reload()
        }
      })
    }
  }, [realtimeData, t])

  const totalPages = Math.ceil(totalCount / pageSize)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="destructive">{t("surveillance.confirmed")}</Badge>
      case 'suspected':
        return <Badge variant="default">{t("surveillance.suspected")}</Badge>
      case 'probable':
        return <Badge className="bg-warning text-warning-foreground">{t("surveillance.probable")}</Badge>
      default:
        return <Badge variant="secondary">{t("surveillance.unknown")}</Badge>
    }
  }

  const getDiseaseBadge = (disease: string) => {
    const diseaseKey = disease.toLowerCase().replace(/[^a-z0-9]/g, '')
    const diseaseMap: Record<string, string> = {
      'dengue': 'dengue',
      'tcm': 'tcm',
      'covid19': 'covid19',
      'ari': 'ari',
      'flu': 'flu',
      'd01': 'dengue',
      'd02': 'tcm',
      'd03': 'covid19',
      'd04': 'ari',
      'd05': 'malaria',
      'd06': 'influenza'
    }
    
    const colorMap: Record<string, string> = {
      'dengue': 'bg-red-500 text-white',
      'tcm': 'bg-orange-500 text-white',
      'covid19': 'bg-blue-500 text-white',
      'ari': 'bg-green-500 text-white',
      'flu': 'bg-purple-500 text-white',
      'malaria': 'bg-purple-500 text-white',
      'influenza': 'bg-pink-500 text-white'
    }
    
    const mappedDisease = diseaseMap[diseaseKey] || 'unknown'
    const label = t(`diseases.${mappedDisease}`, disease)
    const className = colorMap[mappedDisease] || 'bg-muted-foreground text-white'
    
    return <Badge className={className}>{label}</Badge>
  }

  const getDiseaseOptions = () => [
    { value: 'all', label: t("surveillance.allDiseases") },
    { value: 'dengue', label: t("diseases.dengue") },
    { value: 'tcm', label: t("diseases.tcm") },
    { value: 'covid19', label: t("diseases.covid19") },
    { value: 'ari', label: t("diseases.ari") },
    { value: 'flu', label: t("diseases.flu") }
  ]

  const getAgeOptions = () => [
    { value: 'all', label: t("surveillance.allAges") },
    { value: '0-9', label: '0-9' },
    { value: '10-19', label: '10-19' },
    { value: '20-29', label: '20-29' },
    { value: '30-39', label: '30-39' },
    { value: '40-49', label: '40-49' },
    { value: '50-59', label: '50-59' },
    { value: '60+', label: '60+' }
  ]

  const clearFilters = () => {
    setSearchTerm("")
    setDiseaseFilter("all")
    setStatusFilter("all")
    setDateFrom("")
    setDateTo("")
    setDistrictFilter("all")
    setAgeFilter("all")
    setGenderFilter("all")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm || diseaseFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo || districtFilter !== 'all' || ageFilter !== 'all' || genderFilter !== 'all'

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-border/50 shadow-xl">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {t("surveillance.title")}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{t("surveillance.subtitle")}</span>
                <span>•</span>
                <span className="font-medium text-foreground">{totalCount} {t("common.cases")}</span>
                <span>•</span>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  isConnected 
                    ? 'bg-success/10 text-success border border-success/20' 
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                  {isConnected ? t("common.online") : t("common.offline")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                disabled={loading}
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t("common.refresh")}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("surveillance.addCase")}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("surveillance.totalCases")}</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-red-500/10 to-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("surveillance.confirmed")}</p>
                  <p className="text-3xl font-bold text-red-600">{stats.confirmed}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("surveillance.suspected")}</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.suspected}</p>
                </div>
                <Activity className="h-10 w-10 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("surveillance.todayCases")}</p>
                  <p className="text-3xl font-bold text-green-600">{stats.todayCases}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-4">
            {/* Main search row */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t("surveillance.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-12 h-12 text-base"
                  disabled={loading}
                />
                {loading && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
                )}
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Select value={diseaseFilter} onValueChange={(value) => { setDiseaseFilter(value); setCurrentPage(1) }}>
                  <SelectTrigger className="w-44 h-12">
                    <SelectValue placeholder={t("surveillance.allDiseases")} />
                  </SelectTrigger>
                  <SelectContent>
                    {getDiseaseOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1) }}>
                  <SelectTrigger className="w-40 h-12">
                    <SelectValue placeholder={t("surveillance.allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("surveillance.allStatuses")}</SelectItem>
                    <SelectItem value="confirmed">{t("surveillance.confirmed")}</SelectItem>
                    <SelectItem value="suspected">{t("surveillance.suspected")}</SelectItem>
                    <SelectItem value="probable">{t("surveillance.probable")}</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="h-12"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {t("surveillance.advancedFilters")}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={exportToCSV}
                  disabled={loading || cases.length === 0}
                  className="h-12"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("surveillance.exportCSV")}
                </Button>
              </div>
            </div>

            {/* Advanced filters */}
            <Collapsible open={showAdvancedFilters}>
              <CollapsibleContent className="pt-4 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("surveillance.fromDate")}</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("surveillance.toDate")}</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("surveillance.ageGroup")}</label>
                    <Select value={ageFilter} onValueChange={(value) => { setAgeFilter(value); setCurrentPage(1) }}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t("surveillance.allAges")} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAgeOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("surveillance.gender")}</label>
                    <Select value={genderFilter} onValueChange={(value) => { setGenderFilter(value); setCurrentPage(1) }}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t("surveillance.allGenders")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("surveillance.allGenders")}</SelectItem>
                        <SelectItem value="male">{t("surveillance.male")}</SelectItem>
                        <SelectItem value="female">{t("surveillance.female")}</SelectItem>
                        <SelectItem value="M">{t("surveillance.male")} (M)</SelectItem>
                        <SelectItem value="F">{t("surveillance.female")} (F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t("common.filtersApplied")}:</span>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      {t("common.clearFilters")}
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 text-destructive">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="font-medium">{t("common.error")}: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cases Table */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                <span>{t("surveillance.caseList")} ({totalCount})</span>
              </div>
              <span className="text-sm text-muted-foreground font-normal">
                {t("common.page")} {currentPage} {t("common.of")} {totalPages || 1}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 'Không tìm thấy ca bệnh phù hợp' : 'Chưa có ca bệnh nào'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
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
                      {cases.map((case_, index) => (
                        <TableRow key={case_.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                          <TableCell className="font-mono text-sm">{case_.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-medium">{case_.patient_name || case_.patient_hash || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {case_.patient_age_bucket || 'N/A'}/{case_.patient_gender || 'N/A'}
                          </TableCell>
                          <TableCell>{getDiseaseBadge(case_.disease_code)}</TableCell>
                          <TableCell>{getStatusBadge(case_.status)}</TableCell>
                          <TableCell className="max-w-32 truncate">{case_.facility_name || 'N/A'}</TableCell>
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
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 bg-muted/20 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} / {totalCount} ca
                      </span>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#"
                              onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1) }}
                              className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2
                            if (pageNum > totalPages) return null
                            if (pageNum < 1) return null
                            
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); setCurrentPage(pageNum) }}
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
                              onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1) }}
                              className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
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
      </div>

      {/* Modals */}
      <CaseDetailModal
        case_={selectedCase}
        open={showCaseModal}
        onOpenChange={setShowCaseModal}
      />

      <AddCaseModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onCaseAdded={handleCaseAdded}
      />
    </div>
  )
}

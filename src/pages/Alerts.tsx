import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/DataTable"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle, Clock, Search, Filter, User, MapPin } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

interface Alert {
  id: string
  type: 'anomaly' | 'outbreak' | 'threshold' | 'quality'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'acknowledged' | 'assigned' | 'resolved'
  location: string
  disease?: string
  createdAt: string
  assignedTo?: string
  reason?: string
}

const mockAlerts: Alert[] = [
  {
    id: 'ALT-001',
    type: 'anomaly',
    title: 'Bất thường ca sốt xuất huyết',
    description: 'Tăng đột biến 150% ca sốt xuất huyết tại Quận 1 so với baseline 7 ngày',
    priority: 'critical',
    status: 'new',
    location: 'Quận 1',
    disease: 'dengue',
    createdAt: '2024-01-15T08:30:00Z',
    reason: 'EARS C3 threshold exceeded (z-score: 3.2)'
  },
  {
    id: 'ALT-002',
    type: 'outbreak',
    title: 'Ổ dịch tiềm tàng',
    description: 'Phát hiện cluster 8 ca tay chân miệng trong bán kính 500m',
    priority: 'high',
    status: 'acknowledged',
    location: 'Phường 3, Quận 3',
    disease: 'tcm',
    createdAt: '2024-01-15T09:15:00Z',
    assignedTo: 'Dr. Trần Văn B',
    reason: 'HDBSCAN cluster detected (confidence: 0.89)'
  },
  {
    id: 'ALT-003',
    type: 'threshold',
    title: 'Vượt ngưỡng giường ICU',
    description: 'Công suất giường ICU đạt 95% tại BV Chợ Rẫy',
    priority: 'high',
    status: 'assigned',
    location: 'BV Chợ Rẫy',
    createdAt: '2024-01-15T10:00:00Z',
    assignedTo: 'Trưởng khoa ICU'
  },
  {
    id: 'ALT-004',
    type: 'quality',
    title: 'Chất lượng dữ liệu thấp',
    description: 'DQ Score giảm xuống 0.65 tại BV Nhi Đồng 1',
    priority: 'medium',
    status: 'new',
    location: 'BV Nhi Đồng 1',
    createdAt: '2024-01-15T11:30:00Z',
    reason: 'Missing LOINC codes: 25%, Late reporting: 40%'
  }
]

export default function Alerts() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const getPriorityBadge = (priority: Alert['priority']) => {
    const variants = {
      low: 'bg-info text-white',
      medium: 'bg-warning text-white', 
      high: 'bg-danger text-white',
      critical: 'bg-destructive text-white animate-pulse'
    }
    
    const labels = {
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
      critical: 'Khẩn cấp'
    }

    return (
      <Badge className={variants[priority]}>
        {labels[priority]}
      </Badge>
    )
  }

  const getStatusBadge = (status: Alert['status']) => {
    const variants = {
      new: 'bg-danger text-white',
      acknowledged: 'bg-warning text-white',
      assigned: 'bg-info text-white',
      resolved: 'bg-success text-white'
    }
    
    const labels = {
      new: 'Mới',
      acknowledged: 'Đã xác nhận',
      assigned: 'Đã phân công',
      resolved: 'Đã giải quyết'
    }

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    )
  }

  const getTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4 text-danger" />
      case 'outbreak':
        return <MapPin className="h-4 w-4 text-warning" />
      case 'threshold':
        return <Clock className="h-4 w-4 text-info" />
      case 'quality':
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const acknowledgeAndAssign = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'assigned' as const, assignedTo: 'Current User' }
        : alert
    ))
    toast.success("Đã xác nhận và nhận phụ trách cảnh báo")
  }

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' as const }
        : alert
    ))
    toast.success("Đã đánh dấu cảnh báo là đã giải quyết")
  }

  const columns: ColumnDef<Alert>[] = [
    {
      accessorKey: 'type',
      header: '',
      cell: ({ row }) => getTypeIcon(row.original.type),
      size: 40
    },
    {
      accessorKey: 'title',
      header: 'Cảnh báo',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-sm text-muted-foreground">{row.original.description}</div>
          {row.original.reason && (
            <div className="text-xs text-muted-foreground mt-1 italic">
              {row.original.reason}
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'priority',
      header: 'Ưu tiên',
      cell: ({ row }) => getPriorityBadge(row.original.priority),
      size: 100
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => getStatusBadge(row.original.status),
      size: 120
    },
    {
      accessorKey: 'location',
      header: 'Địa điểm',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          {row.original.location}
        </div>
      )
    },
    {
      accessorKey: 'assignedTo',
      header: 'Phụ trách',
      cell: ({ row }) => (
        row.original.assignedTo ? (
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            {row.original.assignedTo}
          </div>
        ) : (
          <span className="text-muted-foreground">Chưa phân công</span>
        )
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Thời gian',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('vi-VN')
    },
    {
      id: 'actions',
      header: 'Hành động',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.status === 'new' && (
            <Button 
              size="sm" 
              onClick={() => acknowledgeAndAssign(row.original.id)}
              className="bg-warning text-white hover:bg-warning/90"
            >
              Nhận xử lý
            </Button>
          )}
          {row.original.status === 'acknowledged' && (
            <Button 
              size="sm" 
              onClick={() => acknowledgeAndAssign(row.original.id)}
              className="bg-info text-white hover:bg-info/90"
            >
              Phân công cho tôi
            </Button>
          )}
          {(row.original.status === 'assigned' || row.original.status === 'acknowledged') && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => resolveAlert(row.original.id)}
              className="border-success text-success hover:bg-success hover:text-white"
            >
              <CheckCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
      size: 150
    }
  ]

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus
    const matchesPriority = filterPriority === 'all' || alert.priority === filterPriority
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const stats = {
    total: alerts.length,
    new: alerts.filter(a => a.status === 'new').length,
    critical: alerts.filter(a => a.priority === 'critical').length,
    resolved24h: alerts.filter(a => a.status === 'resolved').length
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quản lý cảnh báo</h1>
        <p className="text-muted-foreground">Theo dõi và xử lý các cảnh báo y tế công cộng</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng cảnh báo</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cảnh báo mới</p>
                <p className="text-2xl font-bold text-danger">{stats.new}</p>
              </div>
              <Badge className="bg-danger text-white">{stats.new}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Khẩn cấp</p>
                <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              </div>
              <Badge className="bg-destructive text-white animate-pulse">
                {stats.critical}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Giải quyết 24h</p>
                <p className="text-2xl font-bold text-success">{stats.resolved24h}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm cảnh báo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="new">Mới</SelectItem>
                <SelectItem value="acknowledged">Đã xác nhận</SelectItem>
                <SelectItem value="assigned">Đã phân công</SelectItem>
                <SelectItem value="resolved">Đã giải quyết</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Ưu tiên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả mức độ</SelectItem>
                <SelectItem value="critical">Khẩn cấp</SelectItem>
                <SelectItem value="high">Cao</SelectItem>
                <SelectItem value="medium">Trung bình</SelectItem>
                <SelectItem value="low">Thấp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách cảnh báo ({filteredAlerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredAlerts}
            searchPlaceholder="Tìm kiếm cảnh báo..."
            pageSize={20}
          />
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
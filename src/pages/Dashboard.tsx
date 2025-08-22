import { Activity, AlertTriangle, Building2, Heart, Users, Warehouse } from "lucide-react"
import { KpiCard } from "@/components/KpiCard"
import { DashboardChart } from "@/components/DashboardChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Mock data
const kpiData = [
  {
    title: "Tổng ca bệnh",
    value: "2,847",
    change: { value: 12, type: 'increase' as const },
    icon: Users,
    variant: 'info' as const
  },
  {
    title: "Sức chứa giường",
    value: "78%",
    change: { value: 5, type: 'increase' as const },
    icon: Building2,
    variant: 'warning' as const
  },
  {
    title: "Tỷ lệ tiêm chủng",
    value: "92%",
    change: { value: 3, type: 'increase' as const },
    icon: Heart,
    variant: 'success' as const
  },
  {
    title: "Cảnh báo",
    value: "7",
    change: { value: 2, type: 'decrease' as const },
    icon: AlertTriangle,
    variant: 'danger' as const
  }
]

const trendData = [
  { name: 'T2', value: 138, dengue: 65, tcm: 28, ari: 45 },
  { name: 'T3', value: 143, dengue: 59, tcm: 32, ari: 52 },
  { name: 'T4', value: 153, dengue: 80, tcm: 25, ari: 48 },
  { name: 'T5', value: 177, dengue: 81, tcm: 35, ari: 61 },
  { name: 'T6', value: 153, dengue: 56, tcm: 42, ari: 55 },
  { name: 'T7', value: 152, dengue: 55, tcm: 38, ari: 59 },
  { name: 'CN', value: 112, dengue: 40, tcm: 30, ari: 42 }
]

const facilityData = [
  { name: 'BV Chợ Rẫy', value: 89 },
  { name: 'BV Nguyễn Tri Phương', value: 76 },
  { name: 'BV Nhi Đồng 1', value: 92 },
  { name: 'BV Thống Nhất', value: 67 },
  { name: 'BV 115', value: 84 }
]

const alerts = [
  { id: 1, message: "Gia tăng bất thường ca sốt xuất huyết tại Quận 1", severity: "high", time: "2 giờ trước" },
  { id: 2, message: "Thiếu vaccine COVID-19 tại Quận 7", severity: "medium", time: "4 giờ trước" },
  { id: 3, message: "Chất lượng dữ liệu thấp từ BV Thống Nhất", severity: "low", time: "6 giờ trước" }
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tổng quan hệ thống</h1>
        <p className="text-muted-foreground">Giám sát y tế công cộng TP. Hồ Chí Minh</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <KpiCard key={index} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardChart
          title="Xu hướng ca bệnh theo tuần"
          data={trendData}
          type="line"
          multiSeries={true}
        />
        <DashboardChart
          title="Tỷ lệ sử dụng giường bệnh (%)"
          data={facilityData}
          type="bar"
        />
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Cảnh báo gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'default' : 'secondary'}
                  >
                    {alert.severity === 'high' ? 'Cao' : alert.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <span className="text-xs text-muted-foreground">{alert.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
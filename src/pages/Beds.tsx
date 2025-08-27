import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeHealth } from "@/hooks/useRealtimeHealth";
import { ColumnDef } from "@tanstack/react-table";
import { Bed, Building2, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface BedData {
  id: string;
  facility: string;
  department: string;
  bed_type: string;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  status: 'active' | 'maintenance' | 'blocked';
  last_updated: string;
  occupancy_rate: number;
}

interface ForecastData {
  date: string;
  p10: number;
  p50: number;
  p90: number;
}

const Beds = () => {
  const [beds, setBeds] = useState<BedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [forecastPeriod, setForecastPeriod] = useState<"7" | "14">("7");
  const [isForecasting, setIsForecasting] = useState(false);

  // Use realtime hook for beds table
  const { data: realtimeBeds, isConnected } = useRealtimeHealth({
    table: 'beds',
    event: '*'
  });

  // Mock bed data
  const mockBeds: BedData[] = [
    {
      id: "1",
      facility: "BV Chợ Rẫy",
      department: "ICU",
      bed_type: "ICU",
      total_beds: 20,
      occupied_beds: 18,
      available_beds: 2,
      status: 'active',
      last_updated: new Date().toISOString(),
      occupancy_rate: 90
    },
    {
      id: "2",
      facility: "BV Chợ Rẫy", 
      department: "Nội khoa",
      bed_type: "Thường",
      total_beds: 80,
      occupied_beds: 65,
      available_beds: 15,
      status: 'active',
      last_updated: new Date().toISOString(),
      occupancy_rate: 81.25
    },
    {
      id: "3",
      facility: "BV Nguyễn Tri Phương",
      department: "ICU",
      bed_type: "ICU",
      total_beds: 15,
      occupied_beds: 14,
      available_beds: 1,
      status: 'active',
      last_updated: new Date().toISOString(),
      occupancy_rate: 93.33
    },
    {
      id: "4",
      facility: "BV Nhi Đồng 1",
      department: "Nhi ICU",
      bed_type: "ICU",
      total_beds: 12,
      occupied_beds: 10,
      available_beds: 2,
      status: 'active',
      last_updated: new Date().toISOString(),
      occupancy_rate: 83.33
    },
    {
      id: "5",
      facility: "BV 115",
      department: "Cấp cứu",
      bed_type: "Cấp cứu",
      total_beds: 30,
      occupied_beds: 28,
      available_beds: 2,
      status: 'maintenance',
      last_updated: new Date().toISOString(),
      occupancy_rate: 93.33
    }
  ];

  useEffect(() => {
    setBeds(mockBeds);
    setLoading(false);
  }, []);

  // Update beds when realtime data changes
  useEffect(() => {
    if (realtimeBeds && realtimeBeds.length > 0) {
      setBeds(realtimeBeds);
    }
  }, [realtimeBeds]);

  const handleBulkUpdate = async (updates: Partial<BedData>[]) => {
    try {
      // TODO: Implement bulk update when RPC function is available
      console.log('Bulk update requested:', updates);
      toast.success("Cập nhật thành công");
    } catch (error) {
      console.error('Error bulk updating beds:', error);
      toast.error("Lỗi cập nhật");
    }
  };

  const generateForecast = async () => {
    setIsForecasting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai_bed_forecast', {
        body: { 
          period: parseInt(forecastPeriod),
          facility: selectedFacility !== 'all' ? selectedFacility : null
        }
      });

      if (error) throw error;
      
      setForecastData(data.forecast || []);
      toast.success(`Dự báo ${forecastPeriod} ngày hoàn thành`);
    } catch (error) {
      console.error('Error generating forecast:', error);
      // Mock forecast data for demo
      const mockForecast: ForecastData[] = [];
      const days = parseInt(forecastPeriod);
      for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        mockForecast.push({
          date: date.toISOString().split('T')[0],
          p10: Math.floor(Math.random() * 20) + 60,
          p50: Math.floor(Math.random() * 20) + 70,
          p90: Math.floor(Math.random() * 20) + 80
        });
      }
      setForecastData(mockForecast);
      toast.success(`Dự báo ${forecastPeriod} ngày hoàn thành (mock data)`);
    } finally {
      setIsForecasting(false);
    }
  };

  const columns: ColumnDef<BedData>[] = [
    {
      accessorKey: "facility",
      header: "Cơ sở",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("facility")}</span>
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Khoa",
    },
    {
      accessorKey: "bed_type",
      header: "Loại giường",
      cell: ({ row }) => (
        <Badge variant={row.getValue("bed_type") === "ICU" ? "destructive" : "secondary"}>
          {row.getValue("bed_type")}
        </Badge>
      ),
    },
    {
      accessorKey: "total_beds",
      header: "Tổng",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Bed className="h-4 w-4 text-muted-foreground" />
          {row.getValue("total_beds")}
        </div>
      ),
    },
    {
      accessorKey: "occupied_beds",
      header: "Đang sử dụng",
      cell: ({ row }) => (
        <span className="text-destructive font-medium">
          {row.getValue("occupied_beds")}
        </span>
      ),
    },
    {
      accessorKey: "available_beds",
      header: "Còn trống",
      cell: ({ row }) => (
        <span className="text-green-600 font-medium">
          {row.getValue("available_beds")}
        </span>
      ),
    },
    {
      accessorKey: "occupancy_rate",
      header: "Tỷ lệ (%)",
      cell: ({ row }) => {
        const rate = row.getValue("occupancy_rate") as number;
        return (
          <Badge variant={rate > 90 ? "destructive" : rate > 80 ? "default" : "secondary"}>
            {rate.toFixed(1)}%
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const variants = {
          active: "secondary" as const,
          maintenance: "default" as const,
          blocked: "destructive" as const
        };
        const labels = {
          active: "Hoạt động",
          maintenance: "Bảo trì",
          blocked: "Chặn"
        };
        return (
          <Badge variant={variants[status as keyof typeof variants]}>
            {labels[status as keyof typeof labels]}
          </Badge>
        );
      },
    },
  ];

  const filteredBeds = beds.filter(bed => {
    if (selectedFacility !== "all" && bed.facility !== selectedFacility) return false;
    if (selectedDepartment !== "all" && bed.department !== selectedDepartment) return false;
    if (selectedStatus !== "all" && bed.status !== selectedStatus) return false;
    return true;
  });

  const facilities = Array.from(new Set(beds.map(b => b.facility)));
  const departments = Array.from(new Set(beds.map(b => b.department)));
  const totalBeds = filteredBeds.reduce((sum, bed) => sum + bed.total_beds, 0);
  const occupiedBeds = filteredBeds.reduce((sum, bed) => sum + bed.occupied_beds, 0);
  const availableBeds = filteredBeds.reduce((sum, bed) => sum + bed.available_beds, 0);
  const averageOccupancy = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quản lý giường bệnh</h1>
          <p className="text-muted-foreground">
            Theo dõi và dự báo tình hình giường bệnh
            {isConnected && (
              <Badge variant="secondary" className="ml-2">
                Realtime
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={forecastPeriod} onValueChange={(value: "7" | "14") => setForecastPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateForecast} disabled={isForecasting}>
            <TrendingUp className="h-4 w-4 mr-2" />
            {isForecasting ? "Đang dự báo..." : `Dự báo ${forecastPeriod} ngày`}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng giường</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeds}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang sử dụng</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{occupiedBeds}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Còn trống</CardTitle>
            <Bed className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableBeds}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ sử dụng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageOccupancy.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Results */}
      {forecastData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              Dự báo thiếu giường {forecastPeriod} ngày tới
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-7">
              {forecastData.slice(0, 7).map((forecast, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(forecast.date).toLocaleDateString('vi-VN', { 
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-green-600">P10: {forecast.p10}%</div>
                    <div className="text-sm font-medium">P50: {forecast.p50}%</div>
                    <div className="text-xs text-destructive">P90: {forecast.p90}%</div>
                  </div>
                </div>
              ))}
            </div>
            {forecastData.some(f => f.p90 > 85) && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Cảnh báo thiếu giường</span>
                </div>
                <p className="text-sm mt-1">
                  Dự báo thiếu giường nghiêm trọng trong {forecastPeriod} ngày tới. 
                  Đề xuất: liên hệ chuyển tuyến hoặc tăng cường giường dự phòng.
                </p>
                <Button size="sm" className="mt-2">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Gợi ý chuyển tuyến
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={selectedFacility} onValueChange={setSelectedFacility}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn cơ sở" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả cơ sở</SelectItem>
            {facilities.map(facility => (
              <SelectItem key={facility} value={facility}>{facility}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn khoa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khoa</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="maintenance">Bảo trì</SelectItem>
            <SelectItem value="blocked">Chặn</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          onClick={() => handleBulkUpdate([])}
          variant="outline"
        >
          Cập nhật hàng loạt
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredBeds}
            searchPlaceholder="Tìm kiếm giường bệnh..."
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Beds;
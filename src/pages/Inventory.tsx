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
import { Package, AlertTriangle, TrendingDown, TrendingUp, Thermometer } from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  storage_type: string;
  min_temp?: number;
  max_temp?: number;
  reorder_point: number;
  max_stock: number;
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  expiring_soon: number;
  stock_status: 'adequate' | 'low' | 'critical' | 'out_of_stock';
}

interface TemperatureAlert {
  id: string;
  facility_id: string;
  ward_id?: string;
  current_temp: number;
  alert_type: string;
  status: string;
  created_at: string;
}

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [tempAlerts, setTempAlerts] = useState<TemperatureAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStorageType, setSelectedStorageType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Use realtime hooks
  const { data: realtimeStock } = useRealtimeHealth({
    table: 'inventory_stock',
    event: '*',
    schema: 'public'
  });

  const { data: realtimeAlerts } = useRealtimeHealth({
    table: 'temperature_alerts',
    event: '*',
    schema: 'public'
  });

  // Mock inventory data
  const mockItems: InventoryItem[] = [
    {
      id: "1",
      code: "VAC001",
      name: "Vaccine COVID-19 Pfizer",
      category: "vaccine",
      unit: "doses",
      storage_type: "frozen",
      min_temp: -80,
      max_temp: -60,
      reorder_point: 100,
      max_stock: 1000,
      total_stock: 150,
      available_stock: 120,
      reserved_stock: 30,
      expiring_soon: 20,
      stock_status: 'adequate'
    },
    {
      id: "2",
      code: "MED001",
      name: "Paracetamol 500mg",
      category: "medication",
      unit: "tablets",
      storage_type: "normal",
      reorder_point: 500,
      max_stock: 5000,
      total_stock: 200,
      available_stock: 180,
      reserved_stock: 20,
      expiring_soon: 50,
      stock_status: 'critical'
    },
    {
      id: "3",
      code: "SUP001",
      name: "Surgical Mask N95",
      category: "medical_supply",
      unit: "pieces",
      storage_type: "normal",
      reorder_point: 1000,
      max_stock: 10000,
      total_stock: 800,
      available_stock: 750,
      reserved_stock: 50,
      expiring_soon: 0,
      stock_status: 'low'
    },
    {
      id: "4",
      code: "VAC002",
      name: "Vaccine Hepatitis B",
      category: "vaccine",
      unit: "doses",
      storage_type: "cold_chain",
      min_temp: 2,
      max_temp: 8,
      reorder_point: 50,
      max_stock: 500,
      total_stock: 80,
      available_stock: 75,
      reserved_stock: 5,
      expiring_soon: 10,
      stock_status: 'adequate'
    }
  ];

  const mockTempAlerts: TemperatureAlert[] = [
    {
      id: "1",
      facility_id: "BV Chợ Rẫy",
      ward_id: "Kho vaccine",
      current_temp: -50,
      alert_type: "high",
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: "2",
      facility_id: "BV Nguyễn Tri Phương",
      ward_id: "Kho lạnh",
      current_temp: 12,
      alert_type: "high",
      status: "active",
      created_at: new Date().toISOString()
    }
  ];

  useEffect(() => {
    setItems(mockItems);
    setTempAlerts(mockTempAlerts);
    setLoading(false);
  }, []);

  // Update when realtime data changes
  useEffect(() => {
    if (realtimeStock) {
      // Update stock levels based on realtime data
      console.log('Realtime stock update:', realtimeStock);
    }
  }, [realtimeStock]);

  useEffect(() => {
    if (realtimeAlerts) {
      setTempAlerts(realtimeAlerts);
    }
  }, [realtimeAlerts]);

  const handleStockIn = async (itemId: string) => {
    try {
      // TODO: Open stock in dialog
      toast.success("Mở form nhập kho");
    } catch (error) {
      console.error('Error opening stock in:', error);
      toast.error("Lỗi mở form nhập kho");
    }
  };

  const handleStockOut = async (itemId: string) => {
    try {
      // TODO: Open stock out dialog
      toast.success("Mở form xuất kho");
    } catch (error) {
      console.error('Error opening stock out:', error);
      toast.error("Lỗi mở form xuất kho");
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('temperature_alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      toast.success("Đã xác nhận cảnh báo");
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error("Lỗi xác nhận cảnh báo");
    }
  };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "code",
      header: "Mã",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("code")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: "Tên vật tư",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "category",
      header: "Loại",
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        const categoryLabels = {
          vaccine: "Vaccine",
          medication: "Thuốc",
          medical_supply: "Vật tư y tế"
        };
        return (
          <Badge variant="outline">
            {categoryLabels[category as keyof typeof categoryLabels] || category}
          </Badge>
        );
      },
    },
    {
      accessorKey: "storage_type",
      header: "Bảo quản",
      cell: ({ row }) => {
        const storageType = row.getValue("storage_type") as string;
        const storageLabels = {
          normal: "Thường",
          cold_chain: "Kho lạnh",
          frozen: "Đông lạnh"
        };
        const storageColors = {
          normal: "secondary",
          cold_chain: "default",
          frozen: "destructive"
        };
        return (
          <Badge variant={storageColors[storageType as keyof typeof storageColors] as any}>
            <Thermometer className="h-3 w-3 mr-1" />
            {storageLabels[storageType as keyof typeof storageLabels]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "available_stock",
      header: "Tồn kho",
      cell: ({ row }) => {
        const available = row.getValue("available_stock") as number;
        const reorderPoint = row.original.reorder_point;
        const unit = row.original.unit;
        
        return (
          <div className="flex items-center gap-2">
            <span className={available <= reorderPoint ? "text-red-600 font-medium" : ""}>
              {available} {unit}
            </span>
            {available <= reorderPoint && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "stock_status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.getValue("stock_status") as string;
        const statusVariants = {
          adequate: "secondary",
          low: "default",
          critical: "destructive",
          out_of_stock: "destructive"
        };
        const statusLabels = {
          adequate: "Đủ",
          low: "Thấp",
          critical: "Nguy hiểm",
          out_of_stock: "Hết hàng"
        };
        return (
          <Badge variant={statusVariants[status as keyof typeof statusVariants] as any}>
            {statusLabels[status as keyof typeof statusLabels]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "expiring_soon",
      header: "Sắp hết hạn",
      cell: ({ row }) => {
        const expiring = row.getValue("expiring_soon") as number;
        const unit = row.original.unit;
        return expiring > 0 ? (
          <span className="text-orange-600 font-medium">
            {expiring} {unit}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStockIn(row.original.id)}
          >
            Nhập
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStockOut(row.original.id)}
          >
            Xuất
          </Button>
        </div>
      ),
    },
  ];

  const filteredItems = items.filter(item => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (selectedStorageType !== "all" && item.storage_type !== selectedStorageType) return false;
    if (selectedStatus !== "all" && item.stock_status !== selectedStatus) return false;
    return true;
  });

  const categories = Array.from(new Set(items.map(i => i.category)));
  const storageTypes = Array.from(new Set(items.map(i => i.storage_type)));
  const statuses = Array.from(new Set(items.map(i => i.stock_status)));

  // Calculate summary metrics
  const totalItems = filteredItems.length;
  const lowStockItems = filteredItems.filter(i => i.stock_status === 'low' || i.stock_status === 'critical').length;
  const expiringItems = filteredItems.filter(i => i.expiring_soon > 0).length;
  const activeAlerts = tempAlerts.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quản lý kho tồn</h1>
          <p className="text-muted-foreground">
            Theo dõi vật tư y tế, vaccine và thuốc men
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Package className="h-4 w-4 mr-2" />
            Nhập kho
          </Button>
          <Button variant="outline">
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng vật tư</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cần bổ sung</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sắp hết hạn</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiringItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cảnh báo nhiệt độ</CardTitle>
            <Thermometer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeAlerts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Temperature Alerts */}
      {tempAlerts.filter(a => a.status === 'active').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-red-500" />
              Cảnh báo nhiệt độ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tempAlerts.filter(a => a.status === 'active').map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                  <div>
                    <div className="font-medium">{alert.facility_id} - {alert.ward_id}</div>
                    <div className="text-sm text-muted-foreground">
                      Nhiệt độ hiện tại: {alert.current_temp}°C - {alert.alert_type === 'high' ? 'Quá cao' : 'Quá thấp'}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                    Xác nhận
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="vaccine">Vaccine</SelectItem>
            <SelectItem value="medication">Thuốc</SelectItem>
            <SelectItem value="medical_supply">Vật tư y tế</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStorageType} onValueChange={setSelectedStorageType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn bảo quản" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="normal">Thường</SelectItem>
            <SelectItem value="cold_chain">Kho lạnh</SelectItem>
            <SelectItem value="frozen">Đông lạnh</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="adequate">Đủ</SelectItem>
            <SelectItem value="low">Thấp</SelectItem>
            <SelectItem value="critical">Nguy hiểm</SelectItem>
            <SelectItem value="out_of_stock">Hết hàng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredItems}
            searchPlaceholder="Tìm kiếm vật tư..."
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
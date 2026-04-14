import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeHealth } from "@/hooks/useRealtimeHealth";
import { ColumnDef } from "@tanstack/react-table";
import { Package, AlertTriangle, TrendingDown, TrendingUp, Thermometer, Plus, Download, Calendar } from "lucide-react";
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
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockInForm, setStockInForm] = useState({
    quantity: "",
    batchNumber: "",
    expiryDate: "",
    unitCost: "",
    supplier: "",
    notes: ""
  });

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

  // Rich mock inventory data
  const mockItems: InventoryItem[] = [
    // Vaccines
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
      code: "VAC002", 
      name: "Vaccine Hepatitis B",
      category: "vaccine",
      unit: "doses",
      storage_type: "refrigerated",
      min_temp: 2,
      max_temp: 8,
      reorder_point: 50,
      max_stock: 500,
      total_stock: 80,
      available_stock: 65,
      reserved_stock: 15,
      expiring_soon: 5,
      stock_status: 'adequate'
    },
    {
      id: "3",
      code: "VAC003",
      name: "Vaccine Sởi - Rubella",
      category: "vaccine", 
      unit: "doses",
      storage_type: "refrigerated",
      min_temp: 2,
      max_temp: 8,
      reorder_point: 30,
      max_stock: 300,
      total_stock: 25,
      available_stock: 20,
      reserved_stock: 5,
      expiring_soon: 3,
      stock_status: 'critical'
    },
    // Medications
    {
      id: "4",
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
      id: "5",
      code: "MED002",
      name: "Amoxicillin 250mg",
      category: "medication",
      unit: "capsules",
      storage_type: "normal",
      reorder_point: 200,
      max_stock: 2000,
      total_stock: 450,
      available_stock: 420,
      reserved_stock: 30,
      expiring_soon: 15,
      stock_status: 'adequate'
    },
    {
      id: "6",
      code: "MED003",
      name: "Insulin Human",
      category: "medication",
      unit: "vials",
      storage_type: "refrigerated",
      min_temp: 2,
      max_temp: 8,
      reorder_point: 20,
      max_stock: 100,
      total_stock: 5,
      available_stock: 3,
      reserved_stock: 2,
      expiring_soon: 1,
      stock_status: 'critical'
    },
    // Supplies
    {
      id: "7",
      code: "SUP001",
      name: "Surgical Mask N95",
      category: "supplies",
      unit: "pieces",
      storage_type: "normal",
      reorder_point: 1000,
      max_stock: 10000,
      total_stock: 2500,
      available_stock: 2200,
      reserved_stock: 300,
      expiring_soon: 0,
      stock_status: 'adequate'
    },
    {
      id: "8",
      code: "SUP002",
      name: "Disposable Gloves",
      category: "supplies",
      unit: "pairs",
      storage_type: "normal",
      reorder_point: 500,
      max_stock: 5000,
      total_stock: 150,
      available_stock: 120,
      reserved_stock: 30,
      expiring_soon: 0,
      stock_status: 'critical'
    },
    {
      id: "9",
      code: "SUP003",
      name: "Syringes 5ml",
      category: "supplies",
      unit: "pieces",
      storage_type: "normal",
      reorder_point: 200,
      max_stock: 2000,
      total_stock: 350,
      available_stock: 320,
      reserved_stock: 30,
      expiring_soon: 0,
      stock_status: 'adequate'
    },
    // Emergency supplies
    {
      id: "10",
      code: "EMG001",
      name: "Blood Bag O+",
      category: "blood_products",
      unit: "bags",
      storage_type: "refrigerated",
      min_temp: 1,
      max_temp: 6,
      reorder_point: 10,
      max_stock: 50,
      total_stock: 8,
      available_stock: 6,
      reserved_stock: 2,
      expiring_soon: 3,
      stock_status: 'critical'
    },
    {
      id: "11",
      code: "EMG002",
      name: "Plasma AB",
      category: "blood_products",
      unit: "bags",
      storage_type: "frozen",
      min_temp: -18,
      max_temp: -12,
      reorder_point: 5,
      max_stock: 25,
      total_stock: 12,
      available_stock: 10,
      reserved_stock: 2,
      expiring_soon: 1,
      stock_status: 'adequate'
    },
    // Test kits
    {
      id: "12",
      code: "TEST001",
      name: "COVID-19 Rapid Test",
      category: "test_kits",
      unit: "kits",
      storage_type: "normal",
      reorder_point: 100,
      max_stock: 1000,
      total_stock: 50,
      available_stock: 45,
      reserved_stock: 5,
      expiring_soon: 20,
      stock_status: 'low'
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
    const item = items.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setStockInModalOpen(true);
      setStockInForm({
        quantity: "",
        batchNumber: "",
        expiryDate: "",
        unitCost: "",
        supplier: "",
        notes: ""
      });
    }
  };

  const handleStockInSubmit = async () => {
    if (!selectedItem || !stockInForm.quantity) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      const quantity = parseFloat(stockInForm.quantity);
      
      // Update local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === selectedItem.id 
            ? {
                ...item,
                total_stock: item.total_stock + quantity,
                available_stock: item.available_stock + quantity,
                stock_status: item.available_stock + quantity > item.reorder_point ? 'adequate' : item.stock_status
              }
            : item
        )
      );

      setStockInModalOpen(false);
      toast.success(`Đã nhập kho ${quantity} ${selectedItem.unit} - ${selectedItem.name}`);
    } catch (error) {
      console.error('Error processing stock in:', error);
      toast.error("Lỗi xử lý nhập kho");
    }
  };

  const handleExportReport = () => {
    try {
      // Create CSV content
      const headers = ["Mã", "Tên vật tư", "Loại", "Bảo quản", "Tồn kho", "Trạng thái", "Sắp hết hạn"];
      const csvContent = [
        headers.join(","),
        ...filteredItems.map(item => [
          item.code,
          `"${item.name}"`,
          item.category,
          item.storage_type,
          `${item.available_stock} ${item.unit}`,
          item.stock_status,
          item.expiring_soon > 0 ? `${item.expiring_soon} ${item.unit}` : "0"
        ].join(","))
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `bao-cao-kho-ton-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Đã xuất báo cáo thành công");
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error("Lỗi xuất báo cáo");
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
          <Dialog open={stockInModalOpen} onOpenChange={setStockInModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nhập kho
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nhập kho vật tư</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedItem && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium">{selectedItem.name}</p>
                    <p className="text-sm text-muted-foreground">Mã: {selectedItem.code}</p>
                    <p className="text-sm text-muted-foreground">Tồn kho hiện tại: {selectedItem.available_stock} {selectedItem.unit}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Số lượng nhập *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="0"
                      value={stockInForm.quantity}
                      onChange={(e) => setStockInForm(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitCost">Đơn giá</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      placeholder="0"
                      value={stockInForm.unitCost}
                      onChange={(e) => setStockInForm(prev => ({ ...prev, unitCost: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batchNumber">Số lô</Label>
                    <Input
                      id="batchNumber"
                      placeholder="LOT001"
                      value={stockInForm.batchNumber}
                      onChange={(e) => setStockInForm(prev => ({ ...prev, batchNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Hạn sử dụng</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={stockInForm.expiryDate}
                      onChange={(e) => setStockInForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="supplier">Nhà cung cấp</Label>
                  <Input
                    id="supplier"
                    placeholder="Tên nhà cung cấp"
                    value={stockInForm.supplier}
                    onChange={(e) => setStockInForm(prev => ({ ...prev, supplier: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Input
                    id="notes"
                    placeholder="Ghi chú thêm..."
                    value={stockInForm.notes}
                    onChange={(e) => setStockInForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleStockInSubmit} className="flex-1">
                    <Package className="h-4 w-4 mr-2" />
                    Xác nhận nhập kho
                  </Button>
                  <Button variant="outline" onClick={() => setStockInModalOpen(false)}>
                    Hủy
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
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
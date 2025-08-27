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
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Settings } from "lucide-react";
import { toast } from "sonner";

interface DQError {
  id: string;
  rule_id?: string;
  table_name: string;
  record_id?: string;
  field_name?: string;
  error_type: string;
  error_message: string;
  original_value?: string;
  suggested_value?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'fixed' | 'ignored';
  facility_id?: string;
  created_at: string;
  fixed_at?: string;
}

interface QualityScore {
  facility_id: string;
  table_name: string;
  score_date: string;
  total_records: number;
  error_count: number;
  quality_score: number;
}

const DataQuality = () => {
  const [errors, setErrors] = useState<DQError[]>([]);
  const [scores, setScores] = useState<QualityScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTable, setSelectedTable] = useState<string>("all");

  // Use realtime hooks
  const { data: realtimeErrors } = useRealtimeHealth({
    table: 'dq_errors',
    event: '*'
  });

  // Mock data quality errors
  const mockErrors: DQError[] = [
    {
      id: "1",
      table_name: "cases",
      record_id: "case_001",
      field_name: "diagnosis_date",
      error_type: "missing_value",
      error_message: "Thiếu ngày chẩn đoán",
      original_value: "",
      suggested_value: "2024-01-15",
      severity: "high",
      status: "open",
      facility_id: "BV Chợ Rẫy",
      created_at: new Date().toISOString()
    },
    {
      id: "2",
      table_name: "lab_results",
      record_id: "lab_002",
      field_name: "icd_code",
      error_type: "invalid_code",
      error_message: "Mã ICD không hợp lệ: Z999",
      original_value: "Z999",
      suggested_value: "Z00.0",
      severity: "medium",
      status: "open",
      facility_id: "BV Nguyễn Tri Phương",
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "3",
      table_name: "cases",
      record_id: "case_003",
      field_name: "age",
      error_type: "out_of_range",
      error_message: "Tuổi ngoài phạm vi hợp lý: 150",
      original_value: "150",
      suggested_value: "50",
      severity: "critical",
      status: "open",
      facility_id: "BV Nhi Đồng 1",
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: "4",
      table_name: "lab_results",
      record_id: "lab_004",
      field_name: "result_date",
      error_type: "late_report",
      error_message: "Báo cáo trễ hạn >24h",
      original_value: "2024-01-10",
      suggested_value: "",
      severity: "low",
      status: "fixed",
      facility_id: "BV 115",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      fixed_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "5",
      table_name: "cases",
      record_id: "case_005",
      field_name: "loinc_code",
      error_type: "missing_value",
      error_message: "Thiếu mã LOINC cho xét nghiệm",
      original_value: "",
      suggested_value: "33747-0",
      severity: "medium",
      status: "ignored",
      facility_id: "BV Chợ Rẫy",
      created_at: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  const mockScores: QualityScore[] = [
    {
      facility_id: "BV Chợ Rẫy",
      table_name: "cases",
      score_date: "2024-01-15",
      total_records: 1000,
      error_count: 25,
      quality_score: 97.5
    },
    {
      facility_id: "BV Nguyễn Tri Phương", 
      table_name: "cases",
      score_date: "2024-01-15",
      total_records: 500,
      error_count: 40,
      quality_score: 92.0
    },
    {
      facility_id: "BV Nhi Đồng 1",
      table_name: "lab_results", 
      score_date: "2024-01-15",
      total_records: 2000,
      error_count: 100,
      quality_score: 95.0
    }
  ];

  useEffect(() => {
    setErrors(mockErrors);
    setScores(mockScores);
    setLoading(false);
  }, []);

  // Update when realtime data changes
  useEffect(() => {
    if (realtimeErrors) {
      setErrors(realtimeErrors);
    }
  }, [realtimeErrors]);

  const fixError = async (errorId: string, suggestedValue: string) => {
    try {
      // TODO: Implement actual fix logic when RPC is available
      console.log('Fixing error:', errorId, suggestedValue);

      // Update local state
      setErrors(prev => prev.map(err => 
        err.id === errorId 
          ? { ...err, status: 'fixed' as const, fixed_at: new Date().toISOString() }
          : err
      ));

      toast.success("Đã sửa lỗi dữ liệu");
    } catch (error) {
      console.error('Error fixing data quality error:', error);
      toast.error("Lỗi sửa dữ liệu");
    }
  };

  const ignoreError = async (errorId: string) => {
    try {
      const { error } = await supabase
        .from('dq_errors')
        .update({ status: 'ignored' })
        .eq('id', errorId);

      if (error) throw error;

      // Update local state
      setErrors(prev => prev.map(err => 
        err.id === errorId ? { ...err, status: 'ignored' as const } : err
      ));

      toast.success("Đã bỏ qua lỗi");
    } catch (error) {
      console.error('Error ignoring error:', error);
      toast.error("Lỗi bỏ qua");
    }
  };

  const columns: ColumnDef<DQError>[] = [
    {
      accessorKey: "table_name",
      header: "Bảng",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("table_name")}</Badge>
      ),
    },
    {
      accessorKey: "field_name",
      header: "Trường",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("field_name") || "N/A"}</span>
      ),
    },
    {
      accessorKey: "error_type",
      header: "Loại lỗi",
      cell: ({ row }) => {
        const errorType = row.getValue("error_type") as string;
        const errorLabels = {
          missing_value: "Thiếu dữ liệu",
          invalid_code: "Mã không hợp lệ",
          out_of_range: "Ngoài phạm vi",
          late_report: "Báo cáo trễ"
        };
        return (
          <span className="text-sm">
            {errorLabels[errorType as keyof typeof errorLabels] || errorType}
          </span>
        );
      },
    },
    {
      accessorKey: "severity",
      header: "Mức độ",
      cell: ({ row }) => {
        const severity = row.getValue("severity") as string;
        const severityVariants = {
          low: "secondary",
          medium: "default", 
          high: "default",
          critical: "destructive"
        };
        const severityLabels = {
          low: "Thấp",
          medium: "Trung bình",
          high: "Cao",
          critical: "Nghiêm trọng"
        };
        return (
          <Badge variant={severityVariants[severity as keyof typeof severityVariants] as any}>
            {severityLabels[severity as keyof typeof severityLabels]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "error_message",
      header: "Mô tả lỗi",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("error_message")}</span>
      ),
    },
    {
      accessorKey: "original_value",
      header: "Giá trị gốc",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-red-600">
          {row.getValue("original_value") || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "suggested_value",
      header: "Đề xuất",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-green-600">
          {row.getValue("suggested_value") || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusVariants = {
          open: "destructive",
          fixed: "secondary", 
          ignored: "secondary"
        };
        const statusIcons = {
          open: AlertTriangle,
          fixed: CheckCircle,
          ignored: XCircle
        };
        const statusLabels = {
          open: "Mở",
          fixed: "Đã sửa",
          ignored: "Bỏ qua"
        };
        
        const Icon = statusIcons[status as keyof typeof statusIcons];
        
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <Badge variant={statusVariants[status as keyof typeof statusVariants] as any}>
              {statusLabels[status as keyof typeof statusLabels]}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "facility_id",
      header: "Cơ sở",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("facility_id") || "N/A"}</span>
      ),
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => {
        const error = row.original;
        
        if (error.status === 'open') {
          return (
            <div className="flex gap-2">
              {error.suggested_value && (
                <Button
                  size="sm"
                  onClick={() => fixError(error.id, error.suggested_value!)}
                >
                  Sửa
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => ignoreError(error.id)}
              >
                Bỏ qua
              </Button>
            </div>
          );
        }
        
        return (
          <span className="text-sm text-muted-foreground">
            {error.status === 'fixed' ? 'Đã sửa' : 'Đã bỏ qua'}
          </span>
        );
      },
    },
  ];

  const filteredErrors = errors.filter(error => {
    if (selectedSeverity !== "all" && error.severity !== selectedSeverity) return false;
    if (selectedStatus !== "all" && error.status !== selectedStatus) return false;
    if (selectedTable !== "all" && error.table_name !== selectedTable) return false;
    return true;
  });

  const tables = Array.from(new Set(errors.map(e => e.table_name)));
  
  // Calculate summary metrics
  const totalErrors = filteredErrors.length;
  const openErrors = filteredErrors.filter(e => e.status === 'open').length;
  const criticalErrors = filteredErrors.filter(e => e.severity === 'critical' && e.status === 'open').length;
  const avgQualityScore = scores.length > 0 
    ? scores.reduce((sum, s) => sum + s.quality_score, 0) / scores.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chất lượng dữ liệu</h1>
          <p className="text-muted-foreground">
            Giám sát và sửa lỗi dữ liệu
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Cấu hình quy tắc
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
            <CardTitle className="text-sm font-medium">Tổng lỗi</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErrors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lỗi mở</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{openErrors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lỗi nghiêm trọng</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalErrors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm DQ trung bình</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgQualityScore.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Scores by Facility */}
      <Card>
        <CardHeader>
          <CardTitle>Điểm chất lượng theo cơ sở</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scores.map((score, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium">{score.facility_id} - {score.table_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {score.total_records.toLocaleString()} bản ghi, {score.error_count} lỗi
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        score.quality_score >= 95 ? 'bg-green-500' :
                        score.quality_score >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${score.quality_score}%` }}
                    />
                  </div>
                  <Badge 
                    variant={
                      score.quality_score >= 95 ? "secondary" :
                      score.quality_score >= 90 ? "default" : "destructive"
                    }
                  >
                    {score.quality_score.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn bảng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bảng</SelectItem>
            {tables.map(table => (
              <SelectItem key={table} value={table}>{table}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn mức độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả mức độ</SelectItem>
            <SelectItem value="critical">Nghiêm trọng</SelectItem>
            <SelectItem value="high">Cao</SelectItem>
            <SelectItem value="medium">Trung bình</SelectItem>
            <SelectItem value="low">Thấp</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="open">Mở</SelectItem>
            <SelectItem value="fixed">Đã sửa</SelectItem>
            <SelectItem value="ignored">Bỏ qua</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredErrors}
            searchPlaceholder="Tìm kiếm lỗi dữ liệu..."
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DataQuality;
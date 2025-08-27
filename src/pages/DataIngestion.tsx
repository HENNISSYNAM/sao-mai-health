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
import { Upload, FileText, AlertCircle, CheckCircle, Clock, Download } from "lucide-react";
import { toast } from "sonner";

interface ETLJob {
  id: string;
  job_type: string;
  file_path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_rows: number;
  processed_rows: number;
  error_rows: number;
  retry_count: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface ColumnMapping {
  source_column: string;
  target_column: string;
  data_type: string;
  suggested_mapping?: string;
}

const DataIngestion = () => {
  const [jobs, setJobs] = useState<ETLJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobType, setSelectedJobType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [uploadStep, setUploadStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Use realtime hook for ETL queue
  const { data: realtimeJobs } = useRealtimeHealth({
    table: 'etl_queue',
    event: '*'
  });

  // Mock ETL jobs data
  const mockJobs: ETLJob[] = [
    {
      id: "1",
      job_type: "lab_import",
      file_path: "lab_results_2024_01.csv",
      status: "completed",
      progress: 100,
      total_rows: 5000,
      processed_rows: 4950,
      error_rows: 50,
      retry_count: 0,
      created_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: "2",
      job_type: "case_import",
      file_path: "cases_hcmc_2024.csv",
      status: "processing",
      progress: 65,
      total_rows: 2000,
      processed_rows: 1300,
      error_rows: 20,
      retry_count: 0,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      started_at: new Date(Date.now() - 1200000).toISOString()
    },
    {
      id: "3",
      job_type: "vaccine_import",
      file_path: "vaccination_data.csv",
      status: "failed",
      progress: 25,
      total_rows: 1000,
      processed_rows: 250,
      error_rows: 100,
      retry_count: 2,
      error_message: "Invalid date format in row 251",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      started_at: new Date(Date.now() - 6000000).toISOString()
    },
    {
      id: "4",
      job_type: "lab_import",
      file_path: "lab_pending.csv",
      status: "pending",
      progress: 0,
      total_rows: 0,
      processed_rows: 0,
      error_rows: 0,
      retry_count: 0,
      created_at: new Date(Date.now() - 300000).toISOString()
    }
  ];

  useEffect(() => {
    setJobs(mockJobs);
    setLoading(false);
  }, []);

  // Update when realtime data changes
  useEffect(() => {
    if (realtimeJobs) {
      setJobs(realtimeJobs);
    }
  }, [realtimeJobs]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`Đã chọn file: ${file.name}`);
      // Auto-advance to mapping step
      setTimeout(() => {
        generateColumnMappings(file);
        setUploadStep('mapping');
      }, 1000);
    }
  };

  const generateColumnMappings = (file: File) => {
    // Mock column mapping suggestions
    const mockMappings: ColumnMapping[] = [
      {
        source_column: "patient_id",
        target_column: "patient_id",
        data_type: "string",
        suggested_mapping: "patient_id"
      },
      {
        source_column: "test_date",
        target_column: "sample_date",
        data_type: "date",
        suggested_mapping: "sample_date"
      },
      {
        source_column: "result",
        target_column: "test_result",
        data_type: "string",
        suggested_mapping: "test_result"
      },
      {
        source_column: "lab_code",
        target_column: "laboratory_code",
        data_type: "string",
        suggested_mapping: "laboratory_code"
      }
    ];
    
    setColumnMappings(mockMappings);
  };

  const handleMappingComplete = () => {
    // Mock preview data
    const mockPreview = [
      { patient_id: "P001", sample_date: "2024-01-15", test_result: "Positive", laboratory_code: "LAB001" },
      { patient_id: "P002", sample_date: "2024-01-15", test_result: "Negative", laboratory_code: "LAB001" },
      { patient_id: "P003", sample_date: "2024-01-16", test_result: "Positive", laboratory_code: "LAB002" }
    ];
    
    setPreviewData(mockPreview);
    setUploadStep('preview');
    toast.success("Đã tạo preview dữ liệu");
  };

  const startImport = async () => {
    try {
      // TODO: Implement actual import logic using RPC
      const newJob: ETLJob = {
        id: Date.now().toString(),
        job_type: "lab_import",
        file_path: uploadedFile?.name,
        status: "pending",
        progress: 0,
        total_rows: previewData.length,
        processed_rows: 0,
        error_rows: 0,
        retry_count: 0,
        created_at: new Date().toISOString()
      };

      setJobs(prev => [newJob, ...prev]);
      
      // Reset wizard
      setUploadStep('upload');
      setUploadedFile(null);
      setColumnMappings([]);
      setPreviewData([]);
      
      toast.success("Đã bắt đầu import dữ liệu");
    } catch (error) {
      console.error('Error starting import:', error);
      toast.error("Lỗi bắt đầu import");
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      // TODO: Implement retry logic
      toast.success("Đã thêm vào hàng đợi retry");
    } catch (error) {
      console.error('Error retrying job:', error);
      toast.error("Lỗi retry job");
    }
  };

  const downloadErrorReport = async (jobId: string) => {
    try {
      // TODO: Generate and download error CSV
      toast.success("Đang tải báo cáo lỗi...");
    } catch (error) {
      console.error('Error downloading error report:', error);
      toast.error("Lỗi tải báo cáo");
    }
  };

  const columns: ColumnDef<ETLJob>[] = [
    {
      accessorKey: "job_type",
      header: "Loại công việc",
      cell: ({ row }) => {
        const jobType = row.getValue("job_type") as string;
        const jobLabels = {
          lab_import: "Import xét nghiệm",
          case_import: "Import ca bệnh",
          vaccine_import: "Import tiêm chủng"
        };
        return (
          <Badge variant="outline">
            {jobLabels[jobType as keyof typeof jobLabels] || jobType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "file_path",
      header: "File",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("file_path") || "N/A"}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusVariants = {
          pending: "secondary",
          processing: "default",
          completed: "secondary",
          failed: "destructive"
        };
        const statusIcons = {
          pending: Clock,
          processing: Clock,
          completed: CheckCircle,
          failed: AlertCircle
        };
        const statusLabels = {
          pending: "Chờ xử lý",
          processing: "Đang xử lý",
          completed: "Hoàn thành",
          failed: "Lỗi"
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
      accessorKey: "progress",
      header: "Tiến độ",
      cell: ({ row }) => {
        const progress = row.getValue("progress") as number;
        const status = row.original.status;
        
        if (status === 'pending') {
          return <span className="text-muted-foreground">Chưa bắt đầu</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm">{progress}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "processed_rows",
      header: "Dòng xử lý",
      cell: ({ row }) => {
        const processed = row.getValue("processed_rows") as number;
        const total = row.original.total_rows;
        const errors = row.original.error_rows;
        
        return (
          <div className="text-sm">
            <div>{processed.toLocaleString()} / {total.toLocaleString()}</div>
            {errors > 0 && (
              <div className="text-red-600">{errors} lỗi</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Thời gian tạo",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return (
          <div className="text-sm">
            {date.toLocaleDateString('vi-VN')} {date.toLocaleTimeString('vi-VN')}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => {
        const job = row.original;
        
        return (
          <div className="flex gap-2">
            {job.status === 'failed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => retryJob(job.id)}
              >
                Thử lại
              </Button>
            )}
            {job.error_rows > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadErrorReport(job.id)}
              >
                <Download className="h-3 w-3 mr-1" />
                Lỗi CSV
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const filteredJobs = jobs.filter(job => {
    if (selectedJobType !== "all" && job.job_type !== selectedJobType) return false;
    if (selectedStatus !== "all" && job.status !== selectedStatus) return false;
    return true;
  });

  const totalJobs = filteredJobs.length;
  const pendingJobs = filteredJobs.filter(j => j.status === 'pending').length;
  const processingJobs = filteredJobs.filter(j => j.status === 'processing').length;
  const failedJobs = filteredJobs.filter(j => j.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nhập dữ liệu</h1>
          <p className="text-muted-foreground">
            Import và xử lý dữ liệu từ CSV
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Import mới
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng công việc</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ xử lý</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang xử lý</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{processingJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lỗi</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedJobs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Import Wizard */}
      <Card>
        <CardHeader>
          <CardTitle>Wizard Import CSV</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadStep === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg mb-2">Kéo thả file CSV hoặc click để chọn</p>
                <p className="text-sm text-gray-500 mb-4">Hỗ trợ file .csv, tối đa 10MB</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Button>
                    Chọn file
                  </Button>
                </label>
              </div>
            </div>
          )}

          {uploadStep === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Ánh xạ cột dữ liệu</h3>
                <Badge variant="secondary">Bước 2/3</Badge>
              </div>
              
              <div className="grid gap-4">
                {columnMappings.map((mapping, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-center p-3 border rounded">
                    <div>
                      <label className="text-sm font-medium">Cột nguồn</label>
                      <div className="text-sm text-gray-600">{mapping.source_column}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Ánh xạ đến</label>
                      <Select value={mapping.target_column}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient_id">Patient ID</SelectItem>
                          <SelectItem value="sample_date">Ngày lấy mẫu</SelectItem>
                          <SelectItem value="test_result">Kết quả</SelectItem>
                          <SelectItem value="laboratory_code">Mã phòng xét nghiệm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Kiểu dữ liệu</label>
                      <div className="text-sm text-gray-600">{mapping.data_type}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => setUploadStep('upload')} variant="outline">
                  Quay lại
                </Button>
                <Button onClick={handleMappingComplete}>
                  Tiếp tục
                </Button>
              </div>
            </div>
          )}

          {uploadStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Preview dữ liệu (50 dòng đầu)</h3>
                <Badge variant="secondary">Bước 3/3</Badge>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewData[0] || {}).map(key => (
                          <th key={key} className="px-4 py-2 text-left text-sm font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="border-t">
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-4 py-2 text-sm">
                              {value as string}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => setUploadStep('mapping')} variant="outline">
                  Quay lại
                </Button>
                <Button onClick={startImport}>
                  Bắt đầu Import
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={selectedJobType} onValueChange={setSelectedJobType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="lab_import">Import xét nghiệm</SelectItem>
            <SelectItem value="case_import">Import ca bệnh</SelectItem>
            <SelectItem value="vaccine_import">Import tiêm chủng</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xử lý</SelectItem>
            <SelectItem value="processing">Đang xử lý</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="failed">Lỗi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredJobs}
            searchPlaceholder="Tìm kiếm công việc..."
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DataIngestion;
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Plus, FileText, Link, Upload } from "lucide-react";
import { useRealtimeHealth } from "@/hooks/useRealtimeHealth";
import { PatientDocumentUpload } from "@/components/PatientDocumentUpload";
import { PatientDocumentsList } from "@/components/PatientDocumentsList";

interface Patient {
  id: string;
  national_id?: string;
  full_name: string;
  date_of_birth: string;
  sex: 'M' | 'F';
  phone?: string;
  address?: string;
  mpi_confidence?: number;
  linked_patients?: string[];
  created_at: string;
}

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { data: patients, isConnected } = useRealtimeHealth<Patient>({
    table: 'cases',
    event: '*'
  });

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.full_name.toLowerCase().includes(searchLower) ||
      patient.national_id?.toLowerCase().includes(searchLower) ||
      patient.phone?.includes(searchTerm)
    );
  });

  const getMPIBadge = (confidence?: number) => {
    if (!confidence) return null;
    
    if (confidence >= 0.92) {
      return <Badge className="bg-success/10 text-success">Auto-linked</Badge>;
    } else if (confidence >= 0.85) {
      return <Badge className="bg-warning/10 text-warning">Review needed</Badge>;
    }
    return null;
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-900">Quản lý bệnh nhân</h1>
          <p className="text-text-500 mt-1">
            Master Patient Index với thuật toán Fellegi-Sunter
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
          <span className="text-sm text-text-500">
            {isConnected ? 'Realtime' : 'Offline'}
          </span>
          <Button className="gap-2 focus-ring">
            <Plus className="h-4 w-4" />
            Thêm bệnh nhân
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-500" />
              <Input
                placeholder="Tìm theo tên, CCCD, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus-ring"
              />
            </div>
            <Button variant="outline" className="gap-2 focus-ring">
              <FileText className="h-4 w-4" />
              MPI Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MPI Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-500">Tổng bệnh nhân</p>
                <p className="text-2xl font-bold text-text-900">{patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Link className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-text-500">Auto-linked</p>
                <p className="text-2xl font-bold text-text-900">
                  {patients.filter(p => p.mpi_confidence && p.mpi_confidence >= 0.92).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-text-500">Cần review</p>
                <p className="text-2xl font-bold text-text-900">
                  {patients.filter(p => p.mpi_confidence && p.mpi_confidence >= 0.85 && p.mpi_confidence < 0.92).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-text-500">Có liên kết</p>
                <p className="text-2xl font-bold text-text-900">
                  {patients.filter(p => p.linked_patients && p.linked_patients.length > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách bệnh nhân ({filteredPatients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-text-700">Họ tên</th>
                  <th className="text-left p-3 font-medium text-text-700">CCCD/CMND</th>
                  <th className="text-left p-3 font-medium text-text-700">Tuổi</th>
                  <th className="text-left p-3 font-medium text-text-700">Giới tính</th>
                  <th className="text-left p-3 font-medium text-text-700">SĐT</th>
                  <th className="text-left p-3 font-medium text-text-700">MPI Status</th>
                  <th className="text-left p-3 font-medium text-text-700">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-text-900">{patient.full_name}</p>
                        {patient.linked_patients && patient.linked_patients.length > 0 && (
                          <p className="text-xs text-text-500">
                            Liên kết với {patient.linked_patients.length} hồ sơ
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-text-700">
                      {patient.national_id || <span className="text-text-500">-</span>}
                    </td>
                    <td className="p-3 text-text-700">
                      {calculateAge(patient.date_of_birth)}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {patient.sex === 'M' ? 'Nam' : 'Nữ'}
                      </Badge>
                    </td>
                    <td className="p-3 text-text-700">
                      {patient.phone || <span className="text-text-500">-</span>}
                    </td>
                    <td className="p-3">
                      {getMPIBadge(patient.mpi_confidence)}
                    </td>
                    <td className="p-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPatient(patient)}
                            className="focus-ring"
                          >
                            Xem chi tiết
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Hồ sơ bệnh nhân</DialogTitle>
                          </DialogHeader>
                          {selectedPatient && (
                            <Tabs defaultValue="info" className="w-full">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="info">Thông tin</TabsTrigger>
                                <TabsTrigger value="documents">Tài liệu</TabsTrigger>
                                <TabsTrigger value="upload">
                                  <Upload className="h-4 w-4 mr-1" />
                                  Tải lên
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="info" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Họ tên</label>
                                    <p className="text-text-900">{selectedPatient.full_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-text-700">CCCD/CMND</label>
                                    <p className="text-text-900">{selectedPatient.national_id || '-'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Ngày sinh</label>
                                    <p className="text-text-900">
                                      {new Date(selectedPatient.date_of_birth).toLocaleDateString('vi-VN')}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Giới tính</label>
                                    <p className="text-text-900">
                                      {selectedPatient.sex === 'M' ? 'Nam' : 'Nữ'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Số điện thoại</label>
                                    <p className="text-text-900">{selectedPatient.phone || '-'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-text-700">MPI Confidence</label>
                                    <p className="text-text-900">
                                      {selectedPatient.mpi_confidence ? 
                                        `${(selectedPatient.mpi_confidence * 100).toFixed(1)}%` : '-'}
                                    </p>
                                  </div>
                                </div>
                                
                                {selectedPatient.address && (
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Địa chỉ</label>
                                    <p className="text-text-900">{selectedPatient.address}</p>
                                  </div>
                                )}

                                {selectedPatient.linked_patients && selectedPatient.linked_patients.length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Hồ sơ liên kết</label>
                                    <div className="mt-2 space-y-2">
                                      {selectedPatient.linked_patients.map((linkedId) => (
                                        <div key={linkedId} className="p-2 bg-muted/30 rounded-lg">
                                          <p className="text-sm text-text-700">Patient ID: {linkedId}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </TabsContent>

                              <TabsContent value="documents">
                                <PatientDocumentsList 
                                  patientId={selectedPatient.id} 
                                  refreshTrigger={refreshTrigger}
                                />
                              </TabsContent>

                              <TabsContent value="upload">
                                <PatientDocumentUpload
                                  patientId={selectedPatient.id}
                                  onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
                                />
                              </TabsContent>
                            </Tabs>
                          )}
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-500">
                      Không tìm thấy bệnh nhân nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
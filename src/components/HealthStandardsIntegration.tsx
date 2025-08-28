import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Shield, 
  Database, 
  Network, 
  FileText, 
  Users, 
  Link2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Download,
  Upload,
  Eye,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IntegrationStatus {
  id: string;
  system_type: string;
  system_name: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  last_sync?: string;
  configuration?: any;
}

export function HealthStandardsIntegration() {
  const [activeTab, setActiveTab] = useState('overview');
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-text-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      pending: 'secondary',
      error: 'destructive',
      inactive: 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-900">Tích hợp chuẩn y tế</h1>
          <p className="text-text-500 mt-1">
            HL7, FHIR, DICOM, ICD-10/11 và tích hợp VNeID, BHYT
          </p>
        </div>
        <Button className="gap-2">
          <Settings className="h-4 w-4" />
          Cấu hình
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="hl7">HL7</TabsTrigger>
          <TabsTrigger value="fhir">FHIR</TabsTrigger>
          <TabsTrigger value="dicom">DICOM</TabsTrigger>
          <TabsTrigger value="icd">ICD-10/11</TabsTrigger>
          <TabsTrigger value="national">Tích hợp VN</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Network className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-500">HL7 Messages</p>
                    <p className="text-2xl font-bold text-text-900">1,247</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <Database className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-text-500">FHIR Resources</p>
                    <p className="text-2xl font-bold text-text-900">3,891</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-info/10 rounded-lg">
                    <FileText className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-text-500">DICOM Studies</p>
                    <p className="text-2xl font-bold text-text-900">567</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Shield className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-text-500">VNeID Verified</p>
                    <p className="text-2xl font-bold text-text-900">892</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Tuân thủ bảo mật & an toàn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm">ISO 27001</span>
                  </div>
                  <Badge variant="default">Đạt chuẩn</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm">Luật An ninh mạng VN</span>
                  </div>
                  <Badge variant="default">Tuân thủ</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-sm">HIPAA (tham chiếu)</span>
                  </div>
                  <Badge variant="secondary">Đang xem xét</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm">GDPR</span>
                  </div>
                  <Badge variant="default">Tuân thủ</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái tích hợp hệ thống</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'HIS - Bệnh viện Trung ương', type: 'HIS', status: 'active', lastSync: '2 phút trước' },
                  { name: 'LIS - Xét nghiệm trung tâm', type: 'LIS', status: 'active', lastSync: '5 phút trước' },
                  { name: 'PACS - Chẩn đoán hình ảnh', type: 'PACS', status: 'pending', lastSync: '1 giờ trước' },
                  { name: 'VNeID - Định danh quốc gia', type: 'National', status: 'active', lastSync: '30 giây trước' },
                  { name: 'BHYT - Bảo hiểm y tế', type: 'National', status: 'active', lastSync: '1 phút trước' }
                ].map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(integration.status)}
                      <div>
                        <p className="font-medium text-text-900">{integration.name}</p>
                        <p className="text-sm text-text-500">{integration.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-text-500">Đồng bộ: {integration.lastSync}</span>
                      {getStatusBadge(integration.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HL7 Tab */}
        <TabsContent value="hl7" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>HL7 Message Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'ADT', name: 'Admission/Discharge/Transfer', count: 423 },
                    { type: 'ORU', name: 'Observation Result', count: 567 },
                    { type: 'ORM', name: 'Order Message', count: 234 },
                    { type: 'MDM', name: 'Medical Document Management', count: 89 },
                    { type: 'SIU', name: 'Scheduling Information', count: 156 },
                    { type: 'DFT', name: 'Detail Financial Transaction', count: 78 }
                  ].map((msgType) => (
                    <div key={msgType.type} className="flex items-center justify-between p-2 border border-border rounded">
                      <div>
                        <span className="font-medium">{msgType.type}</span>
                        <p className="text-sm text-text-500">{msgType.name}</p>
                      </div>
                      <Badge variant="outline">{msgType.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gửi HL7 Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại message" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADT">ADT - Admission/Discharge/Transfer</SelectItem>
                    <SelectItem value="ORU">ORU - Observation Result</SelectItem>
                    <SelectItem value="ORM">ORM - Order Message</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Nhập nội dung HL7 message..." className="min-h-[200px]" />
                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Upload className="h-4 w-4 mr-2" />
                    Gửi Message
                  </Button>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Xem trước
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FHIR Tab */}
        <TabsContent value="fhir" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>FHIR Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'Patient', count: 1247, status: 'active' },
                    { type: 'Observation', count: 2156, status: 'active' },
                    { type: 'DiagnosticReport', count: 567, status: 'active' },
                    { type: 'Procedure', count: 389, status: 'active' },
                    { type: 'Medication', count: 234, status: 'active' },
                    { type: 'Encounter', count: 678, status: 'active' },
                    { type: 'Organization', count: 45, status: 'active' },
                    { type: 'Practitioner', count: 123, status: 'active' }
                  ].map((resource) => (
                    <div key={resource.type} className="flex items-center justify-between p-2 border border-border rounded">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="font-medium">{resource.type}</span>
                      </div>
                      <Badge variant="outline">{resource.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FHIR Endpoint Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Base URL</label>
                  <Input value="https://api.example.com/fhir/R4" readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium">Version</label>
                  <Input value="R4" readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium">Authentication</label>
                  <Select value="oauth2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Cập nhật cấu hình
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DICOM Tab */}
        <TabsContent value="dicom" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>DICOM Studies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { modality: 'CT', name: 'Computed Tomography', count: 234, size: '45.2 GB' },
                    { modality: 'MR', name: 'Magnetic Resonance', count: 156, size: '78.9 GB' },
                    { modality: 'US', name: 'Ultrasound', count: 89, size: '12.3 GB' },
                    { modality: 'XR', name: 'X-Ray', count: 67, size: '8.1 GB' },
                    { modality: 'CR', name: 'Computed Radiography', count: 45, size: '5.4 GB' }
                  ].map((study) => (
                    <div key={study.modality} className="flex items-center justify-between p-3 border border-border rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{study.modality}</span>
                          <Badge variant="outline">{study.count}</Badge>
                        </div>
                        <p className="text-sm text-text-500">{study.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{study.size}</p>
                        <p className="text-xs text-text-500">Dung lượng</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PACS Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">AE Title</label>
                  <Input value="HOSPITAL_PACS" />
                </div>
                <div>
                  <label className="text-sm font-medium">Host</label>
                  <Input value="pacs.hospital.local" />
                </div>
                <div>
                  <label className="text-sm font-medium">Port</label>
                  <Input value="104" />
                </div>
                <div>
                  <label className="text-sm font-medium">Storage Path</label>
                  <Input value="/data/dicom/studies" />
                </div>
                <Button className="w-full">
                  <Link2 className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ICD Tab */}
        <TabsContent value="icd" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>ICD Code Management</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-500" />
                    <Input placeholder="Tìm kiếm mã ICD..." className="pl-10" />
                  </div>
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="icd-10">ICD-10</SelectItem>
                    <SelectItem value="icd-11">ICD-11</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {[
                  { code: 'A00-A09', version: 'ICD-10', title: 'Intestinal infectious diseases', category: 'Infectious diseases' },
                  { code: 'B00-B09', version: 'ICD-10', title: 'Viral infections characterized by skin and mucous membrane lesions', category: 'Infectious diseases' },
                  { code: 'C00-C97', version: 'ICD-10', title: 'Malignant neoplasms', category: 'Neoplasms' },
                  { code: 'E00-E89', version: 'ICD-10', title: 'Endocrine, nutritional and metabolic diseases', category: 'Endocrine diseases' },
                  { code: 'F00-F99', version: 'ICD-10', title: 'Mental, Behavioral and Neurodevelopmental disorders', category: 'Mental health' }
                ].map((icd, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded hover:bg-muted/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{icd.code}</Badge>
                        <Badge variant="secondary">{icd.version}</Badge>
                      </div>
                      <p className="font-medium mt-1">{icd.title}</p>
                      <p className="text-sm text-text-500">{icd.category}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* National Integration Tab */}
        <TabsContent value="national" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  VNeID Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-success/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="font-medium text-success">Kết nối thành công</span>
                  </div>
                  <p className="text-sm text-text-600">
                    Đã xác thực 892 người dùng qua VNeID
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">API Endpoint</label>
                  <Input value="https://api.vneid.gov.vn/v1" readOnly />
                </div>

                <div>
                  <label className="text-sm font-medium">Loại xác thực</label>
                  <Select value="level3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="level1">Cấp độ 1 - Cơ bản</SelectItem>
                      <SelectItem value="level2">Cấp độ 2 - Nâng cao</SelectItem>
                      <SelectItem value="level3">Cấp độ 3 - Cao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Cấu hình VNeID
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  BHYT Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-success/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="font-medium text-success">Kết nối thành công</span>
                  </div>
                  <p className="text-sm text-text-600">
                    Đã kiểm tra 756 thẻ BHYT hợp lệ
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Mã cơ sở KCB</label>
                  <Input value="79024" />
                </div>

                <div>
                  <label className="text-sm font-medium">Tỉnh/Thành phố</label>
                  <Select value="79">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="79">TP. Hồ Chí Minh</SelectItem>
                      <SelectItem value="01">Hà Nội</SelectItem>
                      <SelectItem value="48">Đà Nẵng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full">
                  <Link2 className="h-4 w-4 mr-2" />
                  Kiểm tra kết nối
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* HIS/LIS/PACS Integration */}
          <Card>
            <CardHeader>
              <CardTitle>Tích hợp HIS/LIS/PACS theo chuẩn Bộ Y tế</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { type: 'HIS', name: 'Hospital Information System', status: 'active', endpoint: 'his.hospital.local:8080' },
                  { type: 'LIS', name: 'Laboratory Information System', status: 'active', endpoint: 'lis.hospital.local:8081' },
                  { type: 'PACS', name: 'Picture Archiving and Communication System', status: 'pending', endpoint: 'pacs.hospital.local:104' }
                ].map((system) => (
                  <div key={system.type} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{system.type}</h3>
                      {getStatusBadge(system.status)}
                    </div>
                    <p className="text-sm text-text-500 mb-2">{system.name}</p>
                    <p className="text-xs text-text-400 mb-3">{system.endpoint}</p>
                    <Button size="sm" variant="outline" className="w-full">
                      Cấu hình
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
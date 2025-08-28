import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Search,
  Activity,
  Monitor,
  Server
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
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
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

  const standardsData = {
    'hl7-fhir-dicom': {
      title: 'HL7, FHIR, DICOM',
      icon: Network,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'Chuẩn trao đổi dữ liệu y tế quốc tế',
      stats: [
        { label: 'HL7 Messages', value: '1,247', trend: '+12%' },
        { label: 'FHIR Resources', value: '3,891', trend: '+8%' },
        { label: 'DICOM Studies', value: '567', trend: '+15%' },
      ]
    },
    'vneid-bhyt': {
      title: 'VNeID & BHYT',
      icon: Shield,
      color: 'text-success',
      bgColor: 'bg-success/10',
      description: 'Tích hợp định danh quốc gia và bảo hiểm y tế',
      stats: [
        { label: 'VNeID Verified', value: '892', trend: '+5%' },
        { label: 'BHYT Records', value: '2,156', trend: '+18%' },
        { label: 'Coverage Rate', value: '94.5%', trend: '+2.1%' },
      ]
    },
    'his-lis-pacs': {
      title: 'HIS/LIS/PACS',
      icon: Database,
      color: 'text-info',
      bgColor: 'bg-info/10',
      description: 'Tích hợp hệ thống thông tin bệnh viện',
      stats: [
        { label: 'HIS Connections', value: '15', trend: 'Stable' },
        { label: 'LIS Results', value: '4,523', trend: '+22%' },
        { label: 'PACS Images', value: '1,891', trend: '+11%' },
      ]
    }
  };

  const detailContent = {
    'hl7-fhir-dicom': (
      <div className="space-y-6">
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
              <CardTitle>FHIR Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: 'Patient', count: 1247 },
                  { type: 'Observation', count: 2156 },
                  { type: 'DiagnosticReport', count: 567 },
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>DICOM Studies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { modality: 'CT', count: 234, size: '45.2 GB' },
                { modality: 'MR', count: 156, size: '78.9 GB' },
                { modality: 'US', count: 89, size: '12.3 GB' },
                { modality: 'XR', count: 67, size: '8.1 GB' },
              ].map((study) => (
                <div key={study.modality} className="p-3 border border-border rounded text-center">
                  <p className="font-medium">{study.modality}</p>
                  <p className="text-sm text-text-500">{study.count} studies</p>
                  <p className="text-xs text-text-400">{study.size}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    ),
    'vneid-bhyt': (
      <div className="space-y-6">
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
            </CardContent>
          </Card>
        </div>
      </div>
    ),
    'his-lis-pacs': (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tích hợp HIS/LIS/PACS theo chuẩn Bộ Y tế</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: 'HIS', name: 'Hospital Information System', status: 'active', endpoint: 'his.hospital.local:8080', icon: Server },
                { type: 'LIS', name: 'Laboratory Information System', status: 'active', endpoint: 'lis.hospital.local:8081', icon: Activity },
                { type: 'PACS', name: 'Picture Archiving and Communication System', status: 'pending', endpoint: 'pacs.hospital.local:104', icon: Monitor }
              ].map((system) => {
                const IconComponent = system.icon;
                return (
                  <div key={system.type} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">{system.type}</h3>
                      {getStatusBadge(system.status)}
                    </div>
                    <p className="text-sm text-text-500 mb-2">{system.name}</p>
                    <p className="text-xs text-text-400 mb-3">{system.endpoint}</p>
                    <Button size="sm" variant="outline" className="w-full">
                      Cấu hình
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái đồng bộ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { system: 'HIS', lastSync: '2 phút trước', status: 'active', records: '1,247' },
                  { system: 'LIS', lastSync: '5 phút trước', status: 'active', records: '567' },
                  { system: 'PACS', lastSync: '1 giờ trước', status: 'pending', records: '234' },
                ].map((sync, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border border-border rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(sync.status)}
                      <div>
                        <p className="font-medium">{sync.system}</p>
                        <p className="text-sm text-text-500">{sync.records} bản ghi</p>
                      </div>
                    </div>
                    <span className="text-sm text-text-500">{sync.lastSync}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cấu hình nhanh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Cấu hình kết nối
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Import dữ liệu
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export báo cáo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Link2 className="h-4 w-4 mr-2" />
                Kiểm tra kết nối
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-900">Tích hợp chuẩn y tế</h1>
          <p className="text-text-500 mt-1">
            Giao diện thống nhất cho tất cả chuẩn y tế và tích hợp hệ thống
          </p>
        </div>
        <Button className="gap-2">
          <Settings className="h-4 w-4" />
          Cấu hình tổng thể
        </Button>
      </div>

      {/* Main Interactive Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(standardsData).map(([key, standard]) => {
          const IconComponent = standard.icon;
          return (
            <Card 
              key={key}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                selectedStandard === key 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedStandard(selectedStandard === key ? null : key)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${standard.bgColor}`}>
                    <IconComponent className={`h-5 w-5 ${standard.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{standard.title}</CardTitle>
                    <p className="text-sm text-text-500">{standard.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {standard.stats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-text-600">{stat.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-900">{stat.value}</span>
                        <Badge variant="outline" className="text-xs">
                          {stat.trend}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security Compliance Overview */}
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

      {/* Detailed Content */}
      {selectedStandard && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Chi tiết: {standardsData[selectedStandard as keyof typeof standardsData].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {detailContent[selectedStandard as keyof typeof detailContent]}
          </CardContent>
        </Card>
      )}

      {/* System Status Overview */}
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
    </div>
  );
}
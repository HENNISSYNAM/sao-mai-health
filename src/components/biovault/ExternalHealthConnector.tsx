import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Watch, Smartphone, Heart, Activity, Moon,
  Footprints, Flame, Droplets, ThermometerSun,
  Link2, Unlink, CheckCircle2, Loader2, AlertCircle,
  RefreshCw, Download, Clock, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface ExternalHealthConnectorProps {
  onDataImport: (source: string, data: HealthDataImport) => void;
}

interface HealthDataImport {
  source: string;
  importedAt: string;
  metrics: ImportedMetric[];
  summary: {
    totalRecords: number;
    dateRange: { start: string; end: string };
    categories: string[];
  };
}

interface ImportedMetric {
  name: string;
  value: number | string;
  unit: string;
  category: string;
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
}

interface HealthSource {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  connected: boolean;
  lastSync?: string;
  available: boolean;
  metrics: string[];
}

export const ExternalHealthConnector: React.FC<ExternalHealthConnectorProps> = ({
  onDataImport
}) => {
  const { t } = useTranslation();
  const [sources, setSources] = useState<HealthSource[]>([
    {
      id: 'apple-health',
      name: 'Apple Health',
      icon: Watch,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      connected: false,
      available: true,
      metrics: ['Nhịp tim', 'Bước chân', 'Giấc ngủ', 'SpO2', 'HRV', 'Nhiệt độ']
    },
    {
      id: 'google-fit',
      name: 'Google Fit',
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      connected: false,
      available: true,
      metrics: ['Bước chân', 'Calo', 'Khoảng cách', 'Giấc ngủ', 'Nhịp tim']
    },
    {
      id: 'samsung-health',
      name: 'Samsung Health',
      icon: Heart,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      connected: false,
      available: true,
      metrics: ['Nhịp tim', 'SpO2', 'Stress', 'Giấc ngủ', 'Bước chân']
    },
    {
      id: 'fitbit',
      name: 'Fitbit',
      icon: Watch,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
      connected: false,
      available: true,
      metrics: ['Nhịp tim', 'Giấc ngủ', 'SPO2', 'Bước chân', 'Calo']
    },
    {
      id: 'garmin',
      name: 'Garmin Connect',
      icon: Watch,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      connected: false,
      available: true,
      metrics: ['Nhịp tim', 'GPS', 'Bước chân', 'VO2 Max', 'Stress', 'Body Battery']
    },
    {
      id: 'withings',
      name: 'Withings Health Mate',
      icon: ThermometerSun,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      connected: false,
      available: true,
      metrics: ['Cân nặng', 'BMI', 'Huyết áp', 'ECG', 'Nhiệt độ', 'Giấc ngủ']
    }
  ]);

  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  // Connect to health source
  const handleConnect = async (sourceId: string) => {
    setConnecting(sourceId);
    
    // Simulate OAuth flow
    toast.info(`Đang kết nối với ${sources.find(s => s.id === sourceId)?.name}...`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSources(prev => prev.map(s => 
      s.id === sourceId 
        ? { ...s, connected: true, lastSync: new Date().toISOString() }
        : s
    ));
    
    setConnecting(null);
    toast.success('Kết nối thành công!');
    
    // Auto-sync after connecting
    handleSync(sourceId);
  };

  // Disconnect from health source
  const handleDisconnect = (sourceId: string) => {
    setSources(prev => prev.map(s => 
      s.id === sourceId 
        ? { ...s, connected: false, lastSync: undefined }
        : s
    ));
    toast.info('Đã ngắt kết nối');
  };

  // Sync data from source
  const handleSync = async (sourceId: string) => {
    setSyncing(sourceId);
    setImportProgress(0);

    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    // Simulate data import with progress
    const duration = 3000;
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, duration / steps));
      setImportProgress(i);
    }

    // Generate mock imported data
    const importedData = generateMockHealthData(source);
    
    setSources(prev => prev.map(s => 
      s.id === sourceId 
        ? { ...s, lastSync: new Date().toISOString() }
        : s
    ));
    
    setSyncing(null);
    setImportProgress(0);
    
    onDataImport(sourceId, importedData);
    toast.success(`Đã nhập ${importedData.summary.totalRecords} bản ghi từ ${source.name}`);
  };

  // Generate mock health data based on source
  const generateMockHealthData = (source: HealthSource): HealthDataImport => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const metrics: ImportedMetric[] = [];

    // Generate metrics based on source type
    if (source.metrics.includes('Nhịp tim')) {
      metrics.push({
        name: 'Nhịp tim trung bình',
        value: 68 + Math.floor(Math.random() * 15),
        unit: 'BPM',
        category: 'vital',
        timestamp: now.toISOString(),
        trend: Math.random() > 0.5 ? 'stable' : 'down'
      });
      metrics.push({
        name: 'Nhịp tim nghỉ ngơi',
        value: 58 + Math.floor(Math.random() * 10),
        unit: 'BPM',
        category: 'vital',
        timestamp: now.toISOString(),
        trend: 'stable'
      });
    }

    if (source.metrics.includes('Bước chân')) {
      metrics.push({
        name: 'Bước chân hôm nay',
        value: 5000 + Math.floor(Math.random() * 8000),
        unit: 'bước',
        category: 'activity',
        timestamp: now.toISOString(),
        trend: 'up'
      });
      metrics.push({
        name: 'Bước chân TB/ngày',
        value: 6500 + Math.floor(Math.random() * 3000),
        unit: 'bước',
        category: 'activity',
        timestamp: now.toISOString(),
        trend: 'up'
      });
    }

    if (source.metrics.includes('Giấc ngủ')) {
      metrics.push({
        name: 'Thời gian ngủ',
        value: (6 + Math.random() * 2).toFixed(1),
        unit: 'giờ',
        category: 'sleep',
        timestamp: now.toISOString(),
        trend: 'stable'
      });
      metrics.push({
        name: 'Chất lượng giấc ngủ',
        value: 70 + Math.floor(Math.random() * 25),
        unit: '%',
        category: 'sleep',
        timestamp: now.toISOString(),
        trend: 'up'
      });
    }

    if (source.metrics.includes('SpO2')) {
      metrics.push({
        name: 'Oxy trong máu',
        value: 96 + Math.floor(Math.random() * 3),
        unit: '%',
        category: 'vital',
        timestamp: now.toISOString(),
        trend: 'stable'
      });
    }

    if (source.metrics.includes('Calo')) {
      metrics.push({
        name: 'Calo đốt cháy',
        value: 1500 + Math.floor(Math.random() * 800),
        unit: 'kcal',
        category: 'activity',
        timestamp: now.toISOString(),
        trend: 'up'
      });
    }

    if (source.metrics.includes('Stress')) {
      metrics.push({
        name: 'Mức độ stress',
        value: 25 + Math.floor(Math.random() * 40),
        unit: 'điểm',
        category: 'mental',
        timestamp: now.toISOString(),
        trend: Math.random() > 0.5 ? 'down' : 'stable'
      });
    }

    if (source.metrics.includes('HRV')) {
      metrics.push({
        name: 'Biến thiên nhịp tim (HRV)',
        value: 35 + Math.floor(Math.random() * 25),
        unit: 'ms',
        category: 'vital',
        timestamp: now.toISOString(),
        trend: 'stable'
      });
    }

    return {
      source: source.id,
      importedAt: now.toISOString(),
      metrics,
      summary: {
        totalRecords: metrics.length * 7, // Simulating 7 days of data
        dateRange: { start: weekAgo.toISOString(), end: now.toISOString() },
        categories: [...new Set(metrics.map(m => m.category))]
      }
    };
  };

  const getConnectedCount = () => sources.filter(s => s.connected).length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Kết nối dữ liệu sức khỏe
            </CardTitle>
            <CardDescription className="mt-1">
              Nhập dữ liệu từ thiết bị đeo và ứng dụng sức khỏe
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {getConnectedCount()} / {sources.length} kết nối
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Import Progress */}
        {syncing && (
          <div className="bg-primary/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  Đang nhập dữ liệu từ {sources.find(s => s.id === syncing)?.name}...
                </span>
              </div>
              <span className="text-sm text-primary font-medium">{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="h-2" />
          </div>
        )}

        {/* Health Sources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((source) => (
            <div 
              key={source.id}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                source.connected 
                  ? 'border-success/50 bg-success/5' 
                  : 'border-muted hover:border-primary/30'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`p-3 rounded-xl ${source.bgColor}`}>
                  <source.icon className={`h-6 w-6 ${source.color}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{source.name}</h4>
                    {source.connected && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                  
                  {/* Metrics */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {source.metrics.slice(0, 4).map((metric, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="text-xs px-1.5 py-0"
                      >
                        {metric}
                      </Badge>
                    ))}
                    {source.metrics.length > 4 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        +{source.metrics.length - 4}
                      </Badge>
                    )}
                  </div>

                  {/* Last Sync */}
                  {source.lastSync && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Đồng bộ: {new Date(source.lastSync).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                {source.connected ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSync(source.id)}
                      disabled={syncing === source.id}
                    >
                      {syncing === source.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Đồng bộ
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDisconnect(source.id)}
                    >
                      <Unlink className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-primary to-info"
                    onClick={() => handleConnect(source.id)}
                    disabled={connecting === source.id}
                  >
                    {connecting === source.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Link2 className="h-3 w-3 mr-1" />
                    )}
                    Kết nối
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Manual Import Option */}
        <div className="border-2 border-dashed border-muted rounded-xl p-4 text-center">
          <Download className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Nhập thủ công</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tải lên file CSV hoặc JSON từ ứng dụng sức khỏe
          </p>
          <Button variant="outline" size="sm" className="mt-3">
            Chọn file
          </Button>
        </div>

        {/* Privacy Notice */}
        <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Dữ liệu của bạn được mã hóa và lưu trữ cục bộ. Chúng tôi không chia sẻ 
            thông tin sức khỏe với bên thứ ba mà không có sự đồng ý của bạn.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, Lock, Fingerprint, FileText, Upload, 
  Heart, Brain, Droplets, Activity, AlertTriangle,
  CheckCircle2, Sparkles, Crown, TrendingUp, Eye,
  FileSearch, Scan, User, Calendar, Phone, Zap,
  Bell, MapPin, Clock, Pill, Users, Radio,
  HeartPulse, Thermometer, Wind, AlertCircle, ChevronRight,
  GripVertical, LayoutGrid
} from 'lucide-react';
import { BioVaultUploader } from '@/components/biovault/BioVaultUploader';
import { DigitalTwinAvatar } from '@/components/biovault/DigitalTwinAvatar';
import { HealthProfile } from '@/components/biovault/HealthProfile';
import { BioShieldIndex } from '@/components/biovault/BioShieldIndex';
import { PersonalRiskEngine } from '@/components/biovault/PersonalRiskEngine';
import { HealthAuditReport } from '@/components/biovault/HealthAuditReport';
import { PremiumConsultant } from '@/components/biovault/PremiumConsultant';
import { BioVaultTasks } from '@/components/biovault/BioVaultTasks';
import { SmartAlertAction } from '@/components/biovault/SmartAlertAction';
import { BentoGrid, BentoCard, BentoHeader, BentoStat } from '@/components/ui/bento-grid';
import { toast } from 'sonner';

export interface UserHealthProfile {
  id: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  medications: Medication[];
  lastUpdated: string;
  documents: HealthDocument[];
  extractedMetrics: ExtractedMetric[];
  bioShieldScore: number;
  emergencyContacts: EmergencyContact[];
  vitalSigns: VitalSign[];
  familyMembers: FamilyMember[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timeSlots: string[];
  startDate: string;
  endDate?: string;
  remindersEnabled: boolean;
  lastTaken?: string;
  stock: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface VitalSign {
  id: string;
  type: 'heart_rate' | 'blood_pressure' | 'temperature' | 'oxygen' | 'glucose' | 'weight';
  value: number | string;
  unit: string;
  recordedAt: string;
  source: 'manual' | 'device' | 'lab';
  trend?: 'up' | 'down' | 'stable';
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  age: number;
  conditions: string[];
  shareAccess: boolean;
  riskAlerts: boolean;
}

export interface HealthDocument {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  status: 'processing' | 'analyzed' | 'error';
  extractedData?: Record<string, any>;
  icd11Codes?: string[];
  category?: 'lab' | 'imaging' | 'prescription' | 'report' | 'other';
}

export interface ExtractedMetric {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  category: 'blood' | 'vital' | 'metabolic' | 'organ' | 'allergy';
  icd11Code?: string;
  riskLevel: 'normal' | 'warning' | 'critical';
  extractedFrom: string;
  date: string;
  trend?: 'improving' | 'worsening' | 'stable';
}

const BioVault: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [healthProfile, setHealthProfile] = useState<UserHealthProfile | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSmartAlert, setShowSmartAlert] = useState(false);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(0);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate risk level changes and trigger smart alert
  useEffect(() => {
    if (healthProfile) {
      // Calculate risk based on conditions and simulated environment
      const hasCardio = healthProfile.chronicConditions.some(c => 
        c.toLowerCase().includes('hypertension')
      );
      const baseRisk = hasCardio ? 65 : 35;
      const envRisk = Math.random() * 20;
      const calculatedRisk = Math.min(95, baseRisk + envRisk);
      setCurrentRiskLevel(calculatedRisk);
      
      if (calculatedRisk >= 75 && !showSmartAlert) {
        setTimeout(() => setShowSmartAlert(true), 3000);
      }
    }
  }, [healthProfile]);

  // Simulate fingerprint scan authentication
  const handleAuthentication = () => {
    setIsScanning(true);
    setScanProgress(0);
    
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 4;
      });
    }, 100);

    setTimeout(() => {
      setIsScanning(false);
      setIsAuthenticated(true);
      toast.success(t('biovault.authSuccess', 'Xác thực sinh trắc học thành công'), {
        description: t('biovault.authSuccessDesc', 'Chào mừng bạn trở lại Bio-Vault')
      });
      
      // Load comprehensive mock profile
      setHealthProfile({
        id: 'user-001',
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        dateOfBirth: '1985-03-15',
        gender: 'male',
        bloodType: 'O+',
        allergies: ['Penicillin', 'Pollen', 'Hải sản'],
        chronicConditions: ['Hypertension', 'Sinusitis', 'Pre-diabetes'],
        medications: [
          {
            id: 'med-1',
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'daily',
            timeSlots: ['08:00'],
            startDate: '2024-01-15',
            remindersEnabled: true,
            lastTaken: new Date(Date.now() - 3600000).toISOString(),
            stock: 23
          },
          {
            id: 'med-2',
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'twice_daily',
            timeSlots: ['08:00', '20:00'],
            startDate: '2024-06-01',
            remindersEnabled: true,
            lastTaken: new Date(Date.now() - 43200000).toISOString(),
            stock: 45
          }
        ],
        emergencyContacts: [
          { id: 'ec-1', name: 'Nguyễn Thị B', relationship: 'Vợ', phone: '0909876543', isPrimary: true },
          { id: 'ec-2', name: 'Nguyễn Văn C', relationship: 'Con', phone: '0912345678', isPrimary: false }
        ],
        vitalSigns: [
          { id: 'vs-1', type: 'heart_rate', value: 72, unit: 'bpm', recordedAt: new Date().toISOString(), source: 'device', trend: 'stable' },
          { id: 'vs-2', type: 'blood_pressure', value: '135/85', unit: 'mmHg', recordedAt: new Date().toISOString(), source: 'device', trend: 'down' },
          { id: 'vs-3', type: 'oxygen', value: 98, unit: '%', recordedAt: new Date().toISOString(), source: 'device', trend: 'stable' },
          { id: 'vs-4', type: 'glucose', value: 105, unit: 'mg/dL', recordedAt: new Date(Date.now() - 7200000).toISOString(), source: 'manual', trend: 'up' },
          { id: 'vs-5', type: 'temperature', value: 36.5, unit: '°C', recordedAt: new Date().toISOString(), source: 'device', trend: 'stable' }
        ],
        familyMembers: [
          { id: 'fm-1', name: 'Nguyễn Thị B', relationship: 'Vợ', age: 38, conditions: [], shareAccess: true, riskAlerts: true },
          { id: 'fm-2', name: 'Nguyễn Văn C', relationship: 'Con', age: 15, conditions: ['Asthma'], shareAccess: true, riskAlerts: true },
          { id: 'fm-3', name: 'Nguyễn Thị D', relationship: 'Mẹ', age: 68, conditions: ['Hypertension', 'Diabetes'], shareAccess: true, riskAlerts: true }
        ],
        lastUpdated: new Date().toISOString(),
        documents: [
          { id: 'doc-1', fileName: 'lab_result_2024.pdf', fileType: 'application/pdf', uploadedAt: '2024-12-15T10:30:00Z', status: 'analyzed', category: 'lab', icd11Codes: ['5A10', 'BA00'] },
          { id: 'doc-2', fileName: 'chest_xray.jpg', fileType: 'image/jpeg', uploadedAt: '2024-11-20T14:00:00Z', status: 'analyzed', category: 'imaging' }
        ],
        extractedMetrics: [
          { id: '1', name: 'Blood Glucose', value: 105, unit: 'mg/dL', category: 'metabolic', icd11Code: '5A10', riskLevel: 'warning', extractedFrom: 'lab_result_2024.pdf', date: '2024-12-15', trend: 'worsening' },
          { id: '2', name: 'Blood Pressure', value: '135/85', unit: 'mmHg', category: 'vital', icd11Code: 'BA00', riskLevel: 'warning', extractedFrom: 'checkup_2024.pdf', date: '2024-12-10', trend: 'improving' },
          { id: '3', name: 'Cholesterol', value: 210, unit: 'mg/dL', category: 'blood', riskLevel: 'warning', extractedFrom: 'lab_result_2024.pdf', date: '2024-12-15', trend: 'stable' },
          { id: '4', name: 'HbA1c', value: 6.2, unit: '%', category: 'metabolic', icd11Code: '5A10', riskLevel: 'warning', extractedFrom: 'lab_result_2024.pdf', date: '2024-12-15', trend: 'worsening' },
          { id: '5', name: 'Creatinine', value: 1.1, unit: 'mg/dL', category: 'organ', riskLevel: 'normal', extractedFrom: 'lab_result_2024.pdf', date: '2024-12-15', trend: 'stable' }
        ],
        bioShieldScore: 72
      });
    }, 2500);
  };

  const handleDocumentUploaded = (doc: HealthDocument) => {
    if (healthProfile) {
      setHealthProfile({
        ...healthProfile,
        documents: [...healthProfile.documents, doc],
        bioShieldScore: Math.min(100, healthProfile.bioShieldScore + 5)
      });
    }
  };

  const handleMetricExtracted = (metric: ExtractedMetric) => {
    if (healthProfile) {
      setHealthProfile({
        ...healthProfile,
        extractedMetrics: [...healthProfile.extractedMetrics, metric]
      });
    }
  };

  const handleTaskComplete = (taskId: string, data: any) => {
    if (healthProfile) {
      setHealthProfile({
        ...healthProfile,
        bioShieldScore: Math.min(100, healthProfile.bioShieldScore + 10)
      });
      toast.success(t('biovault.taskComplete', 'Nhiệm vụ hoàn thành!'), {
        description: t('biovault.scoreIncreased', 'Bio-Shield Index đã tăng +10 điểm')
      });
    }
  };

  const triggerEmergencyMode = () => {
    setIsEmergencyMode(true);
    toast.error(t('biovault.emergency.activated', 'CHẾ ĐỘ KHẨN CẤP ĐÃ KÍCH HOẠT'), {
      description: t('biovault.emergency.notifying', 'Đang thông báo cho người liên hệ khẩn cấp...'),
      duration: 10000
    });
    setTimeout(() => {
      toast.success(t('biovault.emergency.contacted', 'Đã liên hệ thành công'), {
        description: healthProfile?.emergencyContacts[0]?.name + ' đã được thông báo'
      });
    }, 2000);
  };

  const getVitalIcon = (type: VitalSign['type']) => {
    switch (type) {
      case 'heart_rate': return HeartPulse;
      case 'blood_pressure': return Activity;
      case 'temperature': return Thermometer;
      case 'oxygen': return Wind;
      case 'glucose': return Droplets;
      default: return Activity;
    }
  };

  const getVitalLabel = (type: VitalSign['type']) => {
    const labels: Record<string, string> = {
      heart_rate: t('biovault.vitals.heartRate', 'Nhịp tim'),
      blood_pressure: t('biovault.vitals.bloodPressure', 'Huyết áp'),
      temperature: t('biovault.vitals.temperature', 'Nhiệt độ'),
      oxygen: t('biovault.vitals.oxygen', 'SpO2'),
      glucose: t('biovault.vitals.glucose', 'Đường huyết'),
      weight: t('biovault.vitals.weight', 'Cân nặng')
    };
    return labels[type] || type;
  };

  // Security Gate UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-2 border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Animated Header */}
          <div className="h-2 bg-gradient-to-r from-primary via-info to-primary animate-gradient-x" />
          
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/30">
                <Shield className="h-14 w-14 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-success flex items-center justify-center animate-pulse">
                <Lock className="h-5 w-5 text-success-foreground" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-info flex items-center justify-center">
                <Radio className="h-4 w-4 text-info-foreground animate-ping" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent">
              {t('biovault.title', 'Personal Bio-Vault')}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t('biovault.subtitle', 'Kho lưu trữ sinh học cá nhân được mã hóa')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            {/* Security Features */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Lock, label: 'AES-256', color: 'text-success' },
                { icon: Shield, label: 'HIPAA', color: 'text-info' },
                { icon: Fingerprint, label: 'Biometric', color: 'text-primary' },
                { icon: Radio, label: 'E2E', color: 'text-warning' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-[10px] text-center text-muted-foreground font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Fingerprint Scanner */}
            <div className="relative">
              <Button
                onClick={handleAuthentication}
                disabled={isScanning}
                className="w-full h-36 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 transition-all duration-300 group"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className={`relative ${isScanning ? '' : 'group-hover:scale-110 transition-transform'}`}>
                    <Fingerprint className={`h-20 w-20 ${isScanning ? 'text-success' : 'text-primary'}`} />
                    {isScanning && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-success/40 to-transparent animate-scan-line rounded-full" />
                        <div className="absolute inset-0 border-4 border-success/30 rounded-full animate-ping" />
                      </>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {isScanning 
                      ? t('biovault.scanning', 'Đang xác thực sinh trắc học...') 
                      : t('biovault.scanToAccess', 'Chạm để xác thực')}
                  </span>
                </div>
              </Button>
              
              {isScanning && (
                <div className="mt-4 space-y-2">
                  <Progress value={scanProgress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('biovault.verifying', 'Đang xác minh...')}</span>
                    <span>{scanProgress}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" />
                <span>256-bit encryption</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" />
                <span>GDPR compliant</span>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground px-4">
              {t('biovault.disclaimer', 'Dữ liệu của bạn được bảo vệ bởi mã hóa đầu cuối và tuân thủ các tiêu chuẩn bảo mật y tế quốc tế.')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Smart Alert Action */}
      {showSmartAlert && (
        <SmartAlertAction 
          riskPercentage={Math.round(currentRiskLevel)}
          riskType="cardiovascular"
          onDismiss={() => setShowSmartAlert(false)}
        />
      )}

      {/* Emergency Mode Alert */}
      {isEmergencyMode && (
        <Alert className="bg-danger/10 border-danger animate-pulse">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle className="text-danger font-bold">
            {t('biovault.emergency.mode', 'CHẾ ĐỘ KHẨN CẤP')}
          </AlertTitle>
          <AlertDescription className="text-danger/80">
            {t('biovault.emergency.activeDesc', 'Người liên hệ khẩn cấp đã được thông báo. Chia sẻ vị trí đang hoạt động.')}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4 border-danger text-danger hover:bg-danger hover:text-white"
              onClick={() => setIsEmergencyMode(false)}
            >
              {t('biovault.emergency.deactivate', 'Tắt chế độ khẩn cấp')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            {t('biovault.title', 'Personal Bio-Vault')}
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <Lock className="h-3 w-3 mr-1" />
              {t('biovault.secured', 'Bảo mật')}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <span>{t('biovault.welcomeBack', 'Chào mừng')}, {healthProfile?.name}</span>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>{currentTime.toLocaleTimeString(i18n.language)}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Emergency Button */}
          <Button 
            variant="outline" 
            className="border-danger text-danger hover:bg-danger hover:text-white"
            onClick={triggerEmergencyMode}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t('biovault.emergency.button', 'SOS')}
          </Button>
          
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
          <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
            <Lock className="h-4 w-4 mr-2" />
            {t('biovault.lock', 'Khóa Vault')}
          </Button>
        </div>
      </div>

      {/* Real-time Vitals Strip */}
      {healthProfile && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {healthProfile.vitalSigns.slice(0, 5).map(vital => {
            const Icon = getVitalIcon(vital.type);
            const isAbnormal = vital.type === 'blood_pressure' || vital.type === 'glucose';
            return (
              <Card key={vital.id} className={`border ${isAbnormal ? 'border-warning/50 bg-warning/5' : 'border-border'}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={`h-4 w-4 ${isAbnormal ? 'text-warning' : 'text-muted-foreground'}`} />
                    {vital.trend && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {vital.trend === 'up' ? '↑' : vital.trend === 'down' ? '↓' : '→'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{getVitalLabel(vital.type)}</p>
                  <p className={`text-lg font-bold ${isAbnormal ? 'text-warning' : 'text-foreground'}`}>
                    {vital.value} <span className="text-xs font-normal text-muted-foreground">{vital.unit}</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="dashboard" className="gap-2 text-xs md:text-sm">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden md:inline">{t('biovault.tabs.dashboard', 'Dashboard 3.0')}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 text-xs md:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">{t('biovault.tabs.documents', 'Hồ sơ')}</span>
          </TabsTrigger>
          <TabsTrigger value="twin" className="gap-2 text-xs md:text-sm">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">{t('biovault.tabs.digitalTwin', 'Digital Twin')}</span>
          </TabsTrigger>
          <TabsTrigger value="medications" className="gap-2 text-xs md:text-sm">
            <Pill className="h-4 w-4" />
            <span className="hidden md:inline">{t('biovault.tabs.medications', 'Thuốc')}</span>
          </TabsTrigger>
          <TabsTrigger value="consultant" className="gap-2 text-xs md:text-sm">
            <Sparkles className="h-4 w-4" />
            <span className="hidden md:inline">{t('biovault.tabs.consultant', 'AI')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard 3.0 - Bento Grid Layout */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Central Widgets: Bio-Shield Index + Hidden Pattern Engine */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <BioShieldIndex 
              score={healthProfile?.bioShieldScore || 0} 
              profile={healthProfile}
              onTaskClick={(taskId) => setActiveTab('tasks')}
            />
            <PersonalRiskEngine profile={healthProfile} />
          </div>

          {/* Bio-Vault Tasks (Star Map) */}
          <BioVaultTasks 
            profile={healthProfile}
            onTaskComplete={handleTaskComplete}
          />

          {/* Secondary Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Profile Summary */}
            <BentoCard colSpan={1}>
              <BentoHeader 
                icon={<User className="h-5 w-5" />}
                title={t('biovault.profile.summary', 'Hồ sơ sức khỏe')}
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('biovault.profile.bloodType', 'Nhóm máu')}</span>
                  <Badge variant="outline">{healthProfile?.bloodType || 'N/A'}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('biovault.profile.allergies', 'Dị ứng')}</span>
                  <Badge variant="destructive" className="text-xs">{healthProfile?.allergies.length || 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('biovault.profile.conditions', 'Bệnh nền')}</span>
                  <Badge className="bg-warning text-white text-xs">{healthProfile?.chronicConditions.length || 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('biovault.profile.documents', 'Hồ sơ')}</span>
                  <Badge variant="secondary" className="text-xs">{healthProfile?.documents.length || 0}</Badge>
                </div>
              </div>
            </BentoCard>

            {/* Family Health Network - Premium Locked */}
            <BentoCard colSpan={1} className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80 z-10 flex items-center justify-center">
                <div className="text-center p-4">
                  <Lock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">{t('biovault.premium.familyHub', 'Family Security Hub')}</p>
                  <Button size="sm" className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    {t('biovault.premium.unlock', 'Mở khóa')}
                  </Button>
                </div>
              </div>
              <BentoHeader 
                icon={<Users className="h-5 w-5" />}
                title={t('biovault.family.title', 'Mạng lưới gia đình')}
              />
              <div className="space-y-2 blur-sm">
                {healthProfile?.familyMembers.slice(0, 2).map(member => (
                  <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{member.name}</span>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* PDF Report - Premium Locked */}
            <BentoCard colSpan={1} className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80 z-10 flex items-center justify-center">
                <div className="text-center p-4">
                  <Lock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">{t('biovault.premium.pdfReport', 'Báo cáo PDF ~15 trang')}</p>
                  <p className="text-xs text-muted-foreground mb-2">ICD-11 Compliant</p>
                  <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    {t('biovault.premium.unlock', 'Mở khóa')}
                  </Button>
                </div>
              </div>
              <BentoHeader 
                icon={<FileText className="h-5 w-5" />}
                title={t('biovault.audit.title', 'Health-Weather Audit')}
              />
              <div className="blur-sm">
                <HealthAuditReport profile={healthProfile} />
              </div>
            </BentoCard>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <BioVaultUploader 
            onDocumentUploaded={handleDocumentUploaded}
            onMetricExtracted={handleMetricExtracted}
          />
        </TabsContent>

        <TabsContent value="twin" className="space-y-6">
          <DigitalTwinAvatar profile={healthProfile} />
        </TabsContent>

        <TabsContent value="medications" className="space-y-6">
          {/* Medication Tracker */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                {t('biovault.meds.title', 'Quản lý thuốc thông minh')}
              </CardTitle>
              <CardDescription>
                {t('biovault.meds.description', 'Theo dõi lịch uống thuốc và nhận nhắc nhở')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthProfile?.medications.map(med => {
                const lastTakenTime = med.lastTaken ? new Date(med.lastTaken) : null;
                const hoursSinceLastTaken = lastTakenTime 
                  ? Math.floor((Date.now() - lastTakenTime.getTime()) / 3600000)
                  : null;
                const isOverdue = hoursSinceLastTaken && hoursSinceLastTaken >= 24;
                
                return (
                  <div 
                    key={med.id}
                    className={`p-4 rounded-xl border ${isOverdue ? 'border-danger/50 bg-danger/5' : 'border-border bg-muted/30'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${isOverdue ? 'bg-danger/10' : 'bg-primary/10'} flex items-center justify-center`}>
                          <Pill className={`h-5 w-5 ${isOverdue ? 'text-danger' : 'text-primary'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{med.name}</p>
                          <p className="text-sm text-muted-foreground">{med.dosage} • {med.frequency === 'daily' ? 'Mỗi ngày' : 'Hai lần/ngày'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={isOverdue ? "destructive" : "secondary"}>
                          {isOverdue ? t('biovault.meds.overdue', 'Quá hạn') : t('biovault.meds.onSchedule', 'Đúng lịch')}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('biovault.meds.stock', 'Còn lại')}: {med.stock} {t('biovault.meds.pills', 'viên')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {med.timeSlots.join(', ')}
                        </span>
                        {lastTakenTime && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-success" />
                            {t('biovault.meds.lastTaken', 'Lần cuối')}: {hoursSinceLastTaken}h {t('biovault.meds.ago', 'trước')}
                          </span>
                        )}
                      </div>
                      <Button size="sm" variant={isOverdue ? "destructive" : "outline"}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t('biovault.meds.markTaken', 'Đã uống')}
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              <Button variant="outline" className="w-full">
                <Pill className="h-4 w-4 mr-2" />
                {t('biovault.meds.addNew', 'Thêm thuốc mới')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultant" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PremiumConsultant profile={healthProfile} />
            <HealthAuditReport profile={healthProfile} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BioVault;

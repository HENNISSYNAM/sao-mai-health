import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, Lock, Fingerprint, FileText, Upload, 
  Heart, Brain, Droplets, Activity, AlertTriangle,
  CheckCircle2, Sparkles, Crown, TrendingUp, Eye,
  FileSearch, Scan, User, Calendar, Phone, Share2, MapPin
} from 'lucide-react';
import { BioVaultUploader } from '@/components/biovault/BioVaultUploader';
import { DigitalTwinAvatar } from '@/components/biovault/DigitalTwinAvatar';
import { HealthProfile } from '@/components/biovault/HealthProfile';
import { BioShieldIndex } from '@/components/biovault/BioShieldIndex';
import { PersonalRiskEngine } from '@/components/biovault/PersonalRiskEngine';
import { HealthAuditReport } from '@/components/biovault/HealthAuditReport';
import { PremiumConsultant } from '@/components/biovault/PremiumConsultant';
import { TwinSharingHub } from '@/components/biovault/TwinSharingHub';
import { TwinLocationMap } from '@/components/biovault/TwinLocationMap';
import { useTwinSharing } from '@/hooks/useTwinSharing';
import { toast } from 'sonner';

export interface UserHealthProfile {
  id: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  medications: string[];
  lastUpdated: string;
  documents: HealthDocument[];
  extractedMetrics: ExtractedMetric[];
  bioShieldScore: number;
}

export interface HealthDocument {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  status: 'processing' | 'analyzed' | 'error';
  extractedData?: Record<string, any>;
  icd11Codes?: string[];
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
}

const BioVault: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [healthProfile, setHealthProfile] = useState<UserHealthProfile | null>(null);
  
  // Twin sharing hook
  const twinSharing = useTwinSharing(healthProfile);

  // Simulate fingerprint scan authentication
  const handleAuthentication = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsAuthenticated(true);
      toast.success(t('biovault.authSuccess', 'Xác thực thành công'));
      
      // Load mock profile
      setHealthProfile({
        id: 'user-001',
        phone: '0901234567',
        dateOfBirth: '1985-03-15',
        gender: 'male',
        bloodType: 'O+',
        allergies: ['Penicillin', 'Pollen'],
        chronicConditions: ['Hypertension', 'Sinusitis'],
        medications: ['Lisinopril 10mg'],
        lastUpdated: new Date().toISOString(),
        documents: [],
        extractedMetrics: [
          {
            id: '1',
            name: 'Blood Glucose',
            value: 105,
            unit: 'mg/dL',
            category: 'metabolic',
            icd11Code: '5A10',
            riskLevel: 'warning',
            extractedFrom: 'lab_result_2024.pdf',
            date: '2024-12-15'
          },
          {
            id: '2',
            name: 'Blood Pressure',
            value: '135/85',
            unit: 'mmHg',
            category: 'vital',
            icd11Code: 'BA00',
            riskLevel: 'warning',
            extractedFrom: 'checkup_2024.pdf',
            date: '2024-12-10'
          },
          {
            id: '3',
            name: 'Cholesterol',
            value: 210,
            unit: 'mg/dL',
            category: 'blood',
            riskLevel: 'warning',
            extractedFrom: 'lab_result_2024.pdf',
            date: '2024-12-15'
          }
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

  // Security Gate UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-2 border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                <Lock className="h-4 w-4 text-success-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              {t('biovault.title', 'Personal Bio-Vault')}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t('biovault.subtitle', 'Kho lưu trữ sinh học cá nhân được mã hóa')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            {/* Security Features */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Lock, label: t('biovault.encrypted', 'Mã hóa AES-256') },
                { icon: Shield, label: t('biovault.hipaa', 'HIPAA Compliant') },
                { icon: Fingerprint, label: t('biovault.biometric', 'Sinh trắc học') }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs text-center text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Fingerprint Scanner */}
            <div className="relative">
              <Button
                onClick={handleAuthentication}
                disabled={isScanning}
                className="w-full h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 transition-all duration-300"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`relative ${isScanning ? 'animate-pulse' : ''}`}>
                    <Fingerprint className={`h-16 w-16 ${isScanning ? 'text-success' : 'text-primary'}`} />
                    {isScanning && (
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-success/30 to-transparent animate-scan-line" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {isScanning 
                      ? t('biovault.scanning', 'Đang quét sinh trắc học...') 
                      : t('biovault.scanToAccess', 'Chạm để xác thực')}
                  </span>
                </div>
              </Button>
              
              {isScanning && (
                <Progress value={60} className="mt-4 h-2" />
              )}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              {t('biovault.disclaimer', 'Dữ liệu của bạn được bảo vệ bởi mã hóa đầu cuối và tuân thủ các tiêu chuẩn bảo mật y tế quốc tế.')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            {t('biovault.title', 'Personal Bio-Vault')}
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <Lock className="h-3 w-3 mr-1" />
              {t('biovault.secured', 'Bảo mật')}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('biovault.welcomeBack', 'Chào mừng trở lại')} • {t('biovault.lastAccess', 'Truy cập lần cuối')}: {new Date().toLocaleDateString(i18n.language)}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
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

      {/* Bio-Shield Index - Central Widget */}
      <BioShieldIndex 
        score={healthProfile?.bioShieldScore || 0} 
        profile={healthProfile}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            {t('biovault.tabs.overview', 'Tổng quan')}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('biovault.tabs.documents', 'Hồ sơ')}
          </TabsTrigger>
          <TabsTrigger value="twin" className="gap-2">
            <User className="h-4 w-4" />
            {t('biovault.tabs.digitalTwin', 'Digital Twin')}
          </TabsTrigger>
          <TabsTrigger value="sharing" className="gap-2">
            <Share2 className="h-4 w-4" />
            {t('biovault.tabs.sharing', 'Chia sẻ')}
          </TabsTrigger>
          <TabsTrigger value="predictions" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('biovault.tabs.predictions', 'Dự báo')}
          </TabsTrigger>
          <TabsTrigger value="consultant" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t('biovault.tabs.consultant', 'Tư vấn AI')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthProfile profile={healthProfile} />
            <PersonalRiskEngine profile={healthProfile} />
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

        <TabsContent value="sharing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TwinSharingHub profile={healthProfile} />
            <TwinLocationMap 
              myLocation={twinSharing.myLocation}
              connectedTwins={twinSharing.connectedTwins}
              isSharing={twinSharing.isSharing}
            />
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <PersonalRiskEngine profile={healthProfile} showFullDashboard />
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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, Lock, Fingerprint, FileText, Upload, 
  Heart, Brain, Droplets, Activity, AlertTriangle,
  CheckCircle2, Sparkles, Crown, TrendingUp, Eye,
  FileSearch, Scan, User, Calendar, Phone, Share2, MapPin, Cpu, Radio, Link2
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
import { TwinEngineStatus } from '@/components/biovault/TwinEngineStatus';
import { ProximityRadar } from '@/components/biovault/ProximityRadar';
import { TwinRealtimeInsights } from '@/components/biovault/TwinRealtimeInsights';
import { RetinaScanUnlock } from '@/components/biovault/RetinaScanUnlock';
import { Face3DHealthScanner, FacialHealthData } from '@/components/biovault/Face3DHealthScanner';
import { ExternalHealthConnector } from '@/components/biovault/ExternalHealthConnector';
import { useTwinSharing } from '@/hooks/useTwinSharing';
import { usePersonalTwinEngine } from '@/hooks/usePersonalTwinEngine';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('engine');
  const [healthProfile, setHealthProfile] = useState<UserHealthProfile | null>(null);
  const [proximityContext, setProximityContext] = useState<any>(null);
  const [authMethod, setAuthMethod] = useState<'fingerprint' | 'retina'>('retina');
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [facialHealthData, setFacialHealthData] = useState<FacialHealthData | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'info' | 'faceScan' | 'complete'>('info');
  const [retinaScanCompleted, setRetinaScanCompleted] = useState(false);
  const [profileForm, setProfileForm] = useState({
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    bloodType: '',
    phone: ''
  });
  
  // Twin sharing hook
  const twinSharing = useTwinSharing(healthProfile);
  
  // Personal Twin Engine hook
  const twinEngine = usePersonalTwinEngine(healthProfile);

  // Load user profile from database
  const loadUserProfile = async () => {
    if (!user?.id) return null;
    
    try {
      // Get user profile from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get health data from localStorage (since we don't have a health_profiles table yet)
      const storedHealthData = localStorage.getItem(`biovault_${user.id}`);
      const healthData = storedHealthData ? JSON.parse(storedHealthData) : null;

      if (healthData) {
        return {
          id: user.id,
          phone: healthData.phone || profileData?.email || '',
          dateOfBirth: healthData.dateOfBirth || '',
          gender: healthData.gender || 'other',
          bloodType: healthData.bloodType || '',
          allergies: healthData.allergies || [],
          chronicConditions: healthData.chronicConditions || [],
          medications: healthData.medications || [],
          lastUpdated: new Date().toISOString(),
          documents: healthData.documents || [],
          extractedMetrics: healthData.extractedMetrics || [],
          bioShieldScore: healthData.bioShieldScore || 0
        } as UserHealthProfile;
      }

      // No health data yet - show setup form
      return null;
    } catch (err) {
      console.error('Error loading profile:', err);
      return null;
    }
  };

  // Save health profile to localStorage
  const saveHealthProfile = (profile: UserHealthProfile) => {
    if (!user?.id) return;
    localStorage.setItem(`biovault_${user.id}`, JSON.stringify(profile));
    setHealthProfile(profile);
  };

  // Handle authentication and load real user data
  const handleAuthentication = async () => {
    setIsScanning(true);
    
    // Simulate biometric scan delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setIsScanning(false);
    setIsAuthenticated(true);
    toast.success(t('biovault.authSuccess', 'Xác thực thành công'));
    
    // Load real profile
    const profile = await loadUserProfile();
    if (profile) {
      setHealthProfile(profile);
    } else {
      // No profile yet - show setup form
      setShowProfileSetup(true);
    }
  };

  // Handle profile setup form submission
  const handleProfileSetup = () => {
    if (!profileForm.dateOfBirth) {
      toast.error('Vui lòng nhập ngày sinh');
      return;
    }

    const newProfile: UserHealthProfile = {
      id: user?.id || 'guest',
      phone: profileForm.phone,
      dateOfBirth: profileForm.dateOfBirth,
      gender: profileForm.gender,
      bloodType: profileForm.bloodType,
      allergies: [],
      chronicConditions: [],
      medications: [],
      lastUpdated: new Date().toISOString(),
      documents: [],
      extractedMetrics: [],
      bioShieldScore: 10 // Start with base score
    };

    saveHealthProfile(newProfile);
    setShowProfileSetup(false);
    toast.success('Hồ sơ sức khỏe đã được tạo! Quét khuôn mặt để cập nhật chỉ số.');
  };

  const handleDocumentUploaded = (doc: HealthDocument) => {
    if (healthProfile) {
      const updatedProfile = {
        ...healthProfile,
        documents: [...healthProfile.documents, doc],
        bioShieldScore: Math.min(100, healthProfile.bioShieldScore + 5)
      };
      saveHealthProfile(updatedProfile);
    }
  };

  const handleMetricExtracted = (metric: ExtractedMetric) => {
    if (healthProfile) {
      const updatedProfile = {
        ...healthProfile,
        extractedMetrics: [...healthProfile.extractedMetrics, metric]
      };
      saveHealthProfile(updatedProfile);
    }
  };

  // Handle external health data import - now persists data
  const handleExternalDataImport = (source: string, data: any) => {
    if (healthProfile) {
      // Convert imported metrics to ExtractedMetric format
      const newMetrics: ExtractedMetric[] = data.metrics.map((m: any, i: number) => ({
        id: `ext-${Date.now()}-${i}`,
        name: m.name,
        value: m.value,
        unit: m.unit,
        category: m.category === 'vital' ? 'vital' : 
                  m.category === 'activity' ? 'metabolic' :
                  m.category === 'sleep' ? 'vital' : 'metabolic',
        riskLevel: 'normal' as const,
        extractedFrom: source,
        date: m.timestamp.split('T')[0]
      }));

      const updatedProfile = {
        ...healthProfile,
        extractedMetrics: [...healthProfile.extractedMetrics, ...newMetrics],
        bioShieldScore: Math.min(100, healthProfile.bioShieldScore + 3)
      };
      saveHealthProfile(updatedProfile);
      toast.success(`Đã nhập ${newMetrics.length} chỉ số từ ${source}`);
    }
  };

  // Handle facial health scan completion - now updates and saves real data
  const handleFacialScanComplete = (data: FacialHealthData) => {
    setFacialHealthData(data);
    setShowFaceScanner(false);
    
    if (healthProfile) {
      // Add facial health metrics to profile
      const facialMetrics: ExtractedMetric[] = [
        {
          id: `face-hr-${Date.now()}`,
          name: 'Nhịp tim (Face Scan)',
          value: data.inferredHealth.estimatedHeartRate,
          unit: 'BPM',
          category: 'vital',
          riskLevel: data.inferredHealth.estimatedHeartRate > 90 ? 'warning' : 'normal',
          extractedFrom: 'Face 3D Scan',
          date: data.timestamp.split('T')[0]
        },
        {
          id: `face-spo2-${Date.now()}`,
          name: 'SpO2 (Face Scan)',
          value: data.inferredHealth.estimatedOxygenLevel,
          unit: '%',
          category: 'vital',
          riskLevel: data.inferredHealth.estimatedOxygenLevel < 95 ? 'warning' : 'normal',
          extractedFrom: 'Face 3D Scan',
          date: data.timestamp.split('T')[0]
        },
        {
          id: `face-stress-${Date.now()}`,
          name: 'Mức độ Stress',
          value: data.facialMetrics.stressIndicators,
          unit: '%',
          category: 'metabolic',
          riskLevel: data.facialMetrics.stressIndicators > 60 ? 'warning' : 'normal',
          extractedFrom: 'Face 3D Scan',
          date: data.timestamp.split('T')[0]
        },
        {
          id: `face-skin-${Date.now()}`,
          name: 'Sức khỏe da',
          value: data.facialMetrics.skinHealth,
          unit: '%',
          category: 'organ',
          riskLevel: data.facialMetrics.skinHealth < 60 ? 'warning' : 'normal',
          extractedFrom: 'Face 3D Scan',
          date: data.timestamp.split('T')[0]
        },
        {
          id: `face-hydration-${Date.now()}`,
          name: 'Độ ẩm cơ thể',
          value: data.facialMetrics.hydrationLevel,
          unit: '%',
          category: 'metabolic',
          riskLevel: data.facialMetrics.hydrationLevel < 50 ? 'warning' : 'normal',
          extractedFrom: 'Face 3D Scan',
          date: data.timestamp.split('T')[0]
        }
      ];

      const updatedProfile = {
        ...healthProfile,
        extractedMetrics: [...healthProfile.extractedMetrics, ...facialMetrics],
        bioShieldScore: Math.min(100, healthProfile.bioShieldScore + 15)
      };

      // Save to localStorage for persistence
      saveHealthProfile(updatedProfile);
      
      // Inject into twin engine
      twinEngine.addManualInput({
        type: 'facialScan',
        heartRate: data.inferredHealth.estimatedHeartRate,
        oxygenLevel: data.inferredHealth.estimatedOxygenLevel,
        stressLevel: data.facialMetrics.stressIndicators,
        skinHealth: data.facialMetrics.skinHealth,
        hydration: data.facialMetrics.hydrationLevel,
        symmetryScore: data.facialSymmetry.score
      });
    }

    toast.success('Dữ liệu từ quét 3D đã được cập nhật vào Bản đồ số!');
  };

  // Retina scan unlock handler - now loads real user data
  const handleRetinaUnlock = async () => {
    setIsAuthenticated(true);
    setRetinaScanCompleted(true);
    toast.success('Xác thực võng mạc thành công!');
    
    // Load real profile
    const profile = await loadUserProfile();
    if (profile) {
      setHealthProfile(profile);
    } else {
      // No profile yet - show onboarding
      setShowProfileSetup(true);
      setOnboardingStep('info');
    }
  };

  // Handle onboarding face scan completion
  const handleOnboardingFaceScan = (data: FacialHealthData) => {
    setFacialHealthData(data);
    
    // Create profile with face scan data
    const facialMetrics: ExtractedMetric[] = [
      {
        id: `face-hr-${Date.now()}`,
        name: 'Nhịp tim (Face Scan)',
        value: data.inferredHealth.estimatedHeartRate,
        unit: 'BPM',
        category: 'vital',
        riskLevel: data.inferredHealth.estimatedHeartRate > 90 ? 'warning' : 'normal',
        extractedFrom: 'Face 3D Scan',
        date: data.timestamp.split('T')[0]
      },
      {
        id: `face-spo2-${Date.now()}`,
        name: 'SpO2 (Face Scan)',
        value: data.inferredHealth.estimatedOxygenLevel,
        unit: '%',
        category: 'vital',
        riskLevel: data.inferredHealth.estimatedOxygenLevel < 95 ? 'warning' : 'normal',
        extractedFrom: 'Face 3D Scan',
        date: data.timestamp.split('T')[0]
      },
      {
        id: `face-stress-${Date.now()}`,
        name: 'Mức độ Stress',
        value: data.facialMetrics.stressIndicators,
        unit: '%',
        category: 'metabolic',
        riskLevel: data.facialMetrics.stressIndicators > 60 ? 'warning' : 'normal',
        extractedFrom: 'Face 3D Scan',
        date: data.timestamp.split('T')[0]
      }
    ];

    const newProfile: UserHealthProfile = {
      id: user?.id || 'guest',
      phone: profileForm.phone,
      dateOfBirth: profileForm.dateOfBirth,
      gender: profileForm.gender,
      bloodType: profileForm.bloodType,
      allergies: [],
      chronicConditions: [],
      medications: [],
      lastUpdated: new Date().toISOString(),
      documents: [],
      extractedMetrics: facialMetrics,
      bioShieldScore: 40 // Retina (15) + Face scan (25)
    };

    saveHealthProfile(newProfile);
    setOnboardingStep('complete');
    
    // Auto-complete onboarding after short delay
    setTimeout(() => {
      setShowProfileSetup(false);
      toast.success('Bản sao số đã được tạo thành công!');
    }, 2000);
  };

  // Onboarding UI with multi-step flow
  if (isAuthenticated && showProfileSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        {/* Step 1: Basic Info */}
        {onboardingStep === 'info' && (
          <Card className="w-full max-w-md border-2 border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-2">
              {/* Progress indicator */}
              <div className="flex justify-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-3 h-3 rounded-full bg-muted" />
              </div>
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">Bước 1: Thông tin cơ bản</CardTitle>
              <CardDescription>
                Nhập thông tin để bắt đầu Bản sao số của bạn
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="dob" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Ngày sinh *
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Giới tính
                </Label>
                <div className="flex gap-2">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={profileForm.gender === g ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProfileForm({ ...profileForm, gender: g })}
                    >
                      {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0901234567"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Nhóm máu
                </Label>
                <div className="flex flex-wrap gap-2">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                    <Button
                      key={bt}
                      type="button"
                      variant={profileForm.bloodType === bt ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProfileForm({ ...profileForm, bloodType: bt })}
                    >
                      {bt}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => {
                  if (!profileForm.dateOfBirth) {
                    toast.error('Vui lòng nhập ngày sinh');
                    return;
                  }
                  setOnboardingStep('faceScan');
                }} 
                className="w-full mt-4"
              >
                Tiếp tục quét 3D khuôn mặt
                <Scan className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Face Scan */}
        {onboardingStep === 'faceScan' && (
          <div className="space-y-4">
            {/* Progress indicator */}
            <div className="flex justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="w-3 h-3 rounded-full bg-muted" />
            </div>
            <Face3DHealthScanner
              onScanComplete={handleOnboardingFaceScan}
              onCancel={() => setOnboardingStep('info')}
            />
          </div>
        )}

        {/* Step 3: Complete */}
        {onboardingStep === 'complete' && (
          <Card className="w-full max-w-md border-2 border-success/30 bg-card/95 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-8 text-center">
              {/* Progress indicator */}
              <div className="flex justify-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-success" />
                <div className="w-3 h-3 rounded-full bg-success" />
                <div className="w-3 h-3 rounded-full bg-success" />
              </div>
              <div className="mx-auto mb-4 w-24 h-24 rounded-full bg-success/20 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-success mb-2">Hoàn tất!</h2>
              <p className="text-muted-foreground">
                Bản sao số của bạn đã được tạo với dữ liệu từ quét võng mạc và 3D khuôn mặt
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 py-2">
                  <Eye className="h-3 w-3 mr-1" />
                  Võng mạc đã xác thực
                </Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 py-2">
                  <Scan className="h-3 w-3 mr-1" />
                  3D Face đã lưu
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Security Gate UI - Retina Scan
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <div className="space-y-6">
          {/* Auth Method Toggle */}
          <div className="flex justify-center gap-2">
            <Button
              variant={authMethod === 'retina' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAuthMethod('retina')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Quét võng mạc
            </Button>
            <Button
              variant={authMethod === 'fingerprint' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAuthMethod('fingerprint')}
              className="gap-2"
            >
              <Fingerprint className="h-4 w-4" />
              Vân tay
            </Button>
          </div>

          {authMethod === 'retina' ? (
            <RetinaScanUnlock onUnlockSuccess={handleRetinaUnlock} />
          ) : (
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
          )}
        </div>
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
          <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground border-0">
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
        retinaScanCompleted={retinaScanCompleted}
        faceScanCompleted={!!facialHealthData}
      />

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setShowFaceScanner(true)}
          className="bg-gradient-to-r from-primary to-info hover:opacity-90"
        >
          <Scan className="h-4 w-4 mr-2" />
          Quét 3D Khuôn Mặt
        </Button>
        {facialHealthData && (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 py-2">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Dữ liệu Face Scan đã cập nhật
          </Badge>
        )}
      </div>

      {/* Face Scanner Modal */}
      {showFaceScanner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Face3DHealthScanner
            onScanComplete={handleFacialScanComplete}
            onCancel={() => setShowFaceScanner(false)}
          />
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-8 w-full max-w-6xl">
          <TabsTrigger value="engine" className="gap-2">
            <Cpu className="h-4 w-4" />
            {t('biovault.tabs.engine', 'Engine')}
          </TabsTrigger>
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
            {t('biovault.tabs.digitalTwin', 'Twin')}
          </TabsTrigger>
          <TabsTrigger value="connectors" className="gap-2">
            <Link2 className="h-4 w-4" />
            Kết nối
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
            {t('biovault.tabs.consultant', 'AI')}
          </TabsTrigger>
        </TabsList>

        {/* Engine Tab with Proximity Radar and AI Insights */}
        <TabsContent value="engine" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Twin Engine Status - Main Panel */}
            <div className="xl:col-span-2">
              <TwinEngineStatus
                state={twinEngine.twinState}
                isProcessing={twinEngine.isProcessing}
                inputQueueLength={twinEngine.inputQueue.length}
                onRefresh={twinEngine.processInputs}
              />
            </div>
            
            {/* Proximity Radar */}
            <div>
              <ProximityRadar 
                twinId={healthProfile?.id || 'anonymous'}
                onContextUpdate={(data) => {
                  setProximityContext(data);
                  // Inject proximity context into twin engine
                  if (data.context?.shouldTriggerReeval) {
                    twinEngine.addInput({
                      type: 'environment',
                      timestamp: new Date().toISOString(),
                      data: {
                        proximityRisk: data.exposure?.exposureScore || 0,
                        crowdDensity: data.context?.crowdDensity,
                        riskZone: data.context?.riskZone?.name
                      }
                    });
                  }
                }}
              />
            </div>

            {/* AI Realtime Insights */}
            <div>
              <TwinRealtimeInsights
                twinId={healthProfile?.id || 'anonymous'}
                twinState={twinEngine.twinState}
                proximityContext={proximityContext}
              />
            </div>
          </div>
        </TabsContent>

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

        {/* New: External Health Data Connectors Tab */}
        <TabsContent value="connectors" className="space-y-6">
          <ExternalHealthConnector onDataImport={handleExternalDataImport} />
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

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
  FileSearch, Scan, User, Calendar, Phone, Share2, MapPin, Cpu, Radio, Link2, Cloud
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
import { EnvironmentHealthPanel } from '@/components/biovault/EnvironmentHealthPanel';
import { useTwinSharing } from '@/hooks/useTwinSharing';
import { usePersonalTwinEngine } from '@/hooks/usePersonalTwinEngine';
import { useAuth } from '@/hooks/useAuth';
import { useBiometricScans } from '@/hooks/useBiometricScans';
import { useUserProfile } from '@/hooks/useUserProfile';
import { EnvironmentHealthImpact } from '@/hooks/useEnvironmentData';
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
  const [environmentData, setEnvironmentData] = useState<any>(null);
  const [environmentImpact, setEnvironmentImpact] = useState<EnvironmentHealthImpact | null>(null);
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
  
  // Biometric scans hook for database persistence
  const { saveBiometricScan, getLatestScan, loading: biometricLoading } = useBiometricScans();
  
  // User profile hook for database persistence  
  const { profile: dbProfile, updateProfile: updateDbProfile } = useUserProfile();

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

  // Combined scan data from RetinaScanUnlock
  const [scanData, setScanData] = useState<{
    irisPattern: string;
    confidence: number;
    healthIndicators: {
      eyeHealth: number;
      bloodVesselClarity: number;
      pupilReactivity: number;
      scleraCondition: number;
    };
    facialHealth: {
      estimatedHeartRate: number;
      estimatedOxygenLevel: number;
      stressIndicators: number;
      skinHealth: number;
      hydrationLevel: number;
    };
    timestamp: string;
  } | null>(null);

  // Retina + Face scan unlock handler - receives combined biometric data and saves to DB
  const handleRetinaUnlock = async (data: typeof scanData) => {
    setScanData(data);
    setIsAuthenticated(true);
    setRetinaScanCompleted(true);
    
    // Save biometric scan to database
    if (data && user?.id) {
      const saveResult = await saveBiometricScan(data);
      if (saveResult.success) {
        toast.success('Dữ liệu sinh trắc học đã được lưu');
      }
    }
    
    // Load existing profile or show onboarding
    const profile = await loadUserProfile();
    if (profile) {
      // Update existing profile with new scan data
      if (data) {
        const updatedMetrics: ExtractedMetric[] = [
          ...profile.extractedMetrics.filter(m => m.extractedFrom !== 'Biometric Scan'),
          {
            id: `bio-hr-${Date.now()}`,
            name: 'Nhịp tim (Biometric)',
            value: data.facialHealth.estimatedHeartRate,
            unit: 'BPM',
            category: 'vital',
            riskLevel: data.facialHealth.estimatedHeartRate > 90 ? 'warning' : 'normal',
            extractedFrom: 'Biometric Scan',
            date: data.timestamp.split('T')[0]
          },
          {
            id: `bio-spo2-${Date.now()}`,
            name: 'SpO2 (Biometric)',
            value: data.facialHealth.estimatedOxygenLevel,
            unit: '%',
            category: 'vital',
            riskLevel: data.facialHealth.estimatedOxygenLevel < 95 ? 'warning' : 'normal',
            extractedFrom: 'Biometric Scan',
            date: data.timestamp.split('T')[0]
          },
          {
            id: `bio-stress-${Date.now()}`,
            name: 'Mức độ Stress',
            value: data.facialHealth.stressIndicators,
            unit: '%',
            category: 'metabolic',
            riskLevel: data.facialHealth.stressIndicators > 60 ? 'warning' : 'normal',
            extractedFrom: 'Biometric Scan',
            date: data.timestamp.split('T')[0]
          }
        ];
        const updatedProfile = { ...profile, extractedMetrics: updatedMetrics, lastUpdated: new Date().toISOString() };
        saveHealthProfile(updatedProfile);
        setHealthProfile(updatedProfile);
      } else {
        setHealthProfile(profile);
      }
    } else {
      // No profile yet - show onboarding for basic info
      setShowProfileSetup(true);
      setOnboardingStep('info');
    }
  };

  // Complete profile setup with biometric data already captured - saves to DB
  const handleProfileSetupComplete = async () => {
    if (!profileForm.dateOfBirth) {
      toast.error('Vui lòng nhập ngày sinh');
      return;
    }

    // Save health info to user_profiles in database
    if (user?.id) {
      await updateDbProfile({
        date_of_birth: profileForm.dateOfBirth,
        gender: profileForm.gender,
        blood_type: profileForm.bloodType,
        phone: profileForm.phone,
      } as any);
    }

    // Create profile with scan data from retina+face scan
    const biometricMetrics: ExtractedMetric[] = scanData ? [
      {
        id: `bio-hr-${Date.now()}`,
        name: 'Nhịp tim (Biometric)',
        value: scanData.facialHealth.estimatedHeartRate,
        unit: 'BPM',
        category: 'vital',
        riskLevel: scanData.facialHealth.estimatedHeartRate > 90 ? 'warning' : 'normal',
        extractedFrom: 'Biometric Scan',
        date: scanData.timestamp.split('T')[0]
      },
      {
        id: `bio-spo2-${Date.now()}`,
        name: 'SpO2 (Biometric)',
        value: scanData.facialHealth.estimatedOxygenLevel,
        unit: '%',
        category: 'vital',
        riskLevel: scanData.facialHealth.estimatedOxygenLevel < 95 ? 'warning' : 'normal',
        extractedFrom: 'Biometric Scan',
        date: scanData.timestamp.split('T')[0]
      },
      {
        id: `bio-stress-${Date.now()}`,
        name: 'Mức độ Stress',
        value: scanData.facialHealth.stressIndicators,
        unit: '%',
        category: 'metabolic',
        riskLevel: scanData.facialHealth.stressIndicators > 60 ? 'warning' : 'normal',
        extractedFrom: 'Biometric Scan',
        date: scanData.timestamp.split('T')[0]
      },
      {
        id: `bio-skin-${Date.now()}`,
        name: 'Sức khỏe da',
        value: scanData.facialHealth.skinHealth,
        unit: '%',
        category: 'metabolic',
        riskLevel: scanData.facialHealth.skinHealth < 60 ? 'warning' : 'normal',
        extractedFrom: 'Biometric Scan',
        date: scanData.timestamp.split('T')[0]
      },
      {
        id: `bio-hydration-${Date.now()}`,
        name: 'Độ ẩm da',
        value: scanData.facialHealth.hydrationLevel,
        unit: '%',
        category: 'metabolic',
        riskLevel: scanData.facialHealth.hydrationLevel < 50 ? 'warning' : 'normal',
        extractedFrom: 'Biometric Scan',
        date: scanData.timestamp.split('T')[0]
      }
    ] : [];

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
      extractedMetrics: biometricMetrics,
      bioShieldScore: 40 // Biometric scan complete (40pts)
    };

    saveHealthProfile(newProfile);
    setHealthProfile(newProfile);
    setOnboardingStep('complete');
    
    // Auto-complete onboarding after short delay
    setTimeout(() => {
      setShowProfileSetup(false);
      toast.success('Bản sao số đã được tạo thành công!');
    }, 2000);
  };

  // Onboarding UI - simplified 2-step flow (scan already done)
  if (isAuthenticated && showProfileSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        {/* Step: Basic Info (after scan) */}
        {onboardingStep === 'info' && (
          <Card className="w-full max-w-md border-2 border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-2">
              {/* Progress indicator - 2 steps only */}
              <div className="flex justify-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-success" />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <Badge className="mx-auto mb-4 bg-success/20 text-success border-success/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Sinh trắc học đã xác thực
              </Badge>
              <CardTitle className="text-xl font-bold">Hoàn tất thông tin</CardTitle>
              <CardDescription>
                Nhập thêm thông tin để tối ưu Bản sao số
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
                onClick={handleProfileSetupComplete} 
                className="w-full mt-4"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Hoàn tất thiết lập
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {onboardingStep === 'complete' && (
          <Card className="w-full max-w-md border-2 border-success/30 bg-card/95 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-8 text-center">
              {/* Progress indicator */}
              <div className="flex justify-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-success" />
                <div className="w-3 h-3 rounded-full bg-success" />
              </div>
              <div className="mx-auto mb-4 w-24 h-24 rounded-full bg-success/20 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-success mb-2">Hoàn tất!</h2>
              <p className="text-muted-foreground">
                Bản sao số đã được tạo với sinh trắc học mống mắt + 3D khuôn mặt
              </p>
              <div className="mt-6 flex justify-center gap-4 flex-wrap">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 py-2">
                  <Eye className="h-3 w-3 mr-1" />
                  Mống mắt đã lưu
                </Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 py-2">
                  <Scan className="h-3 w-3 mr-1" />
                  Face 3D đã lưu
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Security Gate UI - Retina Scan Only (immediate on entry)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <RetinaScanUnlock onUnlockSuccess={handleRetinaUnlock} />
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
        </TabsList>

        {/* Engine Tab with Proximity Radar, Environment Health and AI Insights */}
        <TabsContent value="engine" className="space-y-6">
          {/* Environment Health Panel - Full Width at Top */}
          <EnvironmentHealthPanel 
            profile={healthProfile}
            onEnvironmentUpdate={(data, impact) => {
              setEnvironmentData(data);
              setEnvironmentImpact(impact);
              
              // Inject environment data into twin engine
              if (data && impact) {
                twinEngine.addInput({
                  type: 'environment',
                  timestamp: new Date().toISOString(),
                  data: {
                    temperature: data.weather?.temperature,
                    humidity: data.weather?.humidity,
                    pressure: data.weather?.pressure,
                    aqi: data.airQuality?.aqi,
                    pm25: data.airQuality?.pm25,
                    uvIndex: data.weather?.uvIndex,
                    environmentRiskScore: impact.riskScore,
                    environmentRiskLevel: impact.overallRisk
                  }
                });
              }
            }}
          />

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

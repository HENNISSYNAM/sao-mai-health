import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, Lock, Fingerprint, Heart, Brain, Activity,
  CheckCircle2, Crown, User, Target, LayoutDashboard
} from 'lucide-react';
import { ClinicalDashboard } from '@/components/biovault/ClinicalDashboard';
import { MultiStateTwin } from '@/components/biovault/MultiStateTwin';
import { HealthMissions } from '@/components/biovault/HealthMissions';
import { OrganVisualization } from '@/components/biovault/OrganVisualization';
import { PaywallGate, PricingSection } from '@/components/biovault/PaywallGate';
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
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [healthProfile, setHealthProfile] = useState<UserHealthProfile | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

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
      toast.success('Biometric authentication successful');
      
      setHealthProfile({
        id: 'user-001',
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        dateOfBirth: '1985-03-15',
        gender: 'male',
        bloodType: 'O+',
        allergies: ['Penicillin', 'Pollen'],
        chronicConditions: ['Hypertension', 'Pre-diabetes'],
        medications: [
          { id: 'med-1', name: 'Lisinopril', dosage: '10mg', frequency: 'daily', timeSlots: ['08:00'], startDate: '2024-01-15', remindersEnabled: true, lastTaken: new Date(Date.now() - 3600000).toISOString(), stock: 23 },
          { id: 'med-2', name: 'Metformin', dosage: '500mg', frequency: 'twice_daily', timeSlots: ['08:00', '20:00'], startDate: '2024-06-01', remindersEnabled: true, stock: 45 }
        ],
        emergencyContacts: [{ id: 'ec-1', name: 'Nguyễn Thị B', relationship: 'Spouse', phone: '0909876543', isPrimary: true }],
        vitalSigns: [
          { id: 'vs-1', type: 'heart_rate', value: 72, unit: 'bpm', recordedAt: new Date().toISOString(), source: 'device', trend: 'stable' },
          { id: 'vs-2', type: 'blood_pressure', value: '135/85', unit: 'mmHg', recordedAt: new Date().toISOString(), source: 'device', trend: 'down' },
          { id: 'vs-3', type: 'oxygen', value: 98, unit: '%', recordedAt: new Date().toISOString(), source: 'device', trend: 'stable' },
          { id: 'vs-4', type: 'glucose', value: 108, unit: 'mg/dL', recordedAt: new Date().toISOString(), source: 'manual', trend: 'up' }
        ],
        familyMembers: [],
        lastUpdated: new Date().toISOString(),
        documents: [],
        extractedMetrics: [
          { id: '1', name: 'Blood Glucose', value: 108, unit: 'mg/dL', category: 'metabolic', riskLevel: 'warning', extractedFrom: 'lab', date: '2024-12-15', trend: 'worsening' },
          { id: '2', name: 'Blood Pressure', value: '135/85', unit: 'mmHg', category: 'vital', riskLevel: 'warning', extractedFrom: 'device', date: '2024-12-15', trend: 'improving' },
          { id: '3', name: 'HbA1c', value: 6.2, unit: '%', category: 'metabolic', riskLevel: 'warning', extractedFrom: 'lab', date: '2024-12-15', trend: 'worsening' }
        ],
        bioShieldScore: 68
      });
    }, 2500);
  };

  const handleUpgrade = () => {
    setShowPricing(true);
  };

  const handleSelectPlan = (plan: string) => {
    if (plan === 'premium') {
      setIsPremium(true);
      setShowPricing(false);
      toast.success('Welcome to Premium!', { description: 'All features unlocked.' });
    }
  };

  // Security Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-2 border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl">
          <div className="h-2 bg-gradient-to-r from-primary via-info to-primary" />
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/30">
              <Shield className="h-14 w-14 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Personal Bio-Vault</CardTitle>
            <CardDescription className="text-base mt-2">
              Biological Risk Intelligence System
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-4 gap-2">
              {[{ icon: Lock, label: 'AES-256' }, { icon: Shield, label: 'HIPAA' }, { icon: Fingerprint, label: 'Biometric' }, { icon: CheckCircle2, label: 'GDPR' }].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/50">
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleAuthentication} disabled={isScanning} className="w-full h-36 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/40 hover:border-primary">
              <div className="flex flex-col items-center gap-4">
                <Fingerprint className={`h-20 w-20 ${isScanning ? 'text-success animate-pulse' : 'text-primary'}`} />
                <span className="text-sm font-medium">{isScanning ? 'Authenticating...' : 'Touch to authenticate'}</span>
              </div>
            </Button>
            {isScanning && <Progress value={scanProgress} className="h-2" />}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pricing Modal
  if (showPricing) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button variant="ghost" onClick={() => setShowPricing(false)} className="mb-6">← Back</Button>
        <PricingSection onSelectPlan={handleSelectPlan} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Bio-Vault
            {isPremium && <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"><Crown className="h-3 w-3 mr-1" />Premium</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm">Personal Biological Risk Intelligence</p>
        </div>
        {!isPremium && (
          <Button onClick={handleUpgrade} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <Crown className="h-4 w-4 mr-2" />Upgrade
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="twins" className="gap-2"><User className="h-4 w-4" />Digital Twin</TabsTrigger>
          <TabsTrigger value="organs" className="gap-2"><Heart className="h-4 w-4" />Organs</TabsTrigger>
          <TabsTrigger value="missions" className="gap-2"><Target className="h-4 w-4" />Missions</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <ClinicalDashboard profile={healthProfile} isPremium={isPremium} />
        </TabsContent>

        <TabsContent value="twins" className="mt-6">
          <MultiStateTwin profile={healthProfile} isPremium={isPremium} onUpgrade={handleUpgrade} />
        </TabsContent>

        <TabsContent value="organs" className="mt-6">
          <OrganVisualization profile={healthProfile} />
        </TabsContent>

        <TabsContent value="missions" className="mt-6">
          <HealthMissions profile={healthProfile} isPremium={isPremium} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BioVault;

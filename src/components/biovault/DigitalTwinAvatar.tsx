import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  User, Heart, Brain, Activity, Droplets, 
  AlertTriangle, CheckCircle2, Info, Zap, Wind,
  Eye, Ear, Bone
} from 'lucide-react';
import type { UserHealthProfile, ExtractedMetric } from '@/pages/BioVault';

interface DigitalTwinAvatarProps {
  profile: UserHealthProfile | null;
}

interface BodyPoint {
  id: string;
  label: string;
  labelVi: string;
  icon: React.ElementType;
  x: number;
  y: number;
  category: 'vital' | 'organ' | 'metabolic';
  conditions?: string[];
  riskLevel: 'normal' | 'warning' | 'critical';
}

export const DigitalTwinAvatar: React.FC<DigitalTwinAvatarProps> = ({ profile }) => {
  const { t, i18n } = useTranslation();
  const [selectedPoint, setSelectedPoint] = useState<BodyPoint | null>(null);

  // Define body sensitivity points based on profile
  const getBodyPoints = (): BodyPoint[] => {
    const hasHypertension = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('huyết áp')
    );
    const hasSinusitis = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('sinusitis') || c.toLowerCase().includes('viêm xoang')
    );
    const hasAsthma = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('asthma') || c.toLowerCase().includes('hen')
    );
    const hasDiabetes = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('tiểu đường')
    );

    return [
      {
        id: 'brain',
        label: 'Brain',
        labelVi: 'Não',
        icon: Brain,
        x: 50,
        y: 8,
        category: 'organ',
        conditions: hasHypertension ? ['Stroke risk elevated'] : [],
        riskLevel: hasHypertension ? 'warning' : 'normal'
      },
      {
        id: 'sinus',
        label: 'Sinuses',
        labelVi: 'Xoang',
        icon: Wind,
        x: 50,
        y: 12,
        category: 'organ',
        conditions: hasSinusitis ? ['Chronic sinusitis', 'Weather sensitive'] : [],
        riskLevel: hasSinusitis ? 'warning' : 'normal'
      },
      {
        id: 'heart',
        label: 'Heart',
        labelVi: 'Tim',
        icon: Heart,
        x: 45,
        y: 32,
        category: 'vital',
        conditions: hasHypertension ? ['Hypertension', 'BP: 135/85'] : [],
        riskLevel: hasHypertension ? 'warning' : 'normal'
      },
      {
        id: 'lungs',
        label: 'Lungs',
        labelVi: 'Phổi',
        icon: Wind,
        x: 55,
        y: 30,
        category: 'organ',
        conditions: hasAsthma ? ['Asthma', 'Air quality sensitive'] : [],
        riskLevel: hasAsthma ? 'warning' : 'normal'
      },
      {
        id: 'liver',
        label: 'Liver',
        labelVi: 'Gan',
        icon: Activity,
        x: 42,
        y: 42,
        category: 'metabolic',
        conditions: [],
        riskLevel: 'normal'
      },
      {
        id: 'pancreas',
        label: 'Pancreas',
        labelVi: 'Tụy',
        icon: Droplets,
        x: 58,
        y: 45,
        category: 'metabolic',
        conditions: hasDiabetes ? ['Pre-diabetes', 'Glucose: 105 mg/dL'] : [],
        riskLevel: hasDiabetes ? 'warning' : 'normal'
      },
      {
        id: 'blood',
        label: 'Blood',
        labelVi: 'Máu',
        icon: Droplets,
        x: 50,
        y: 55,
        category: 'metabolic',
        conditions: profile?.bloodType ? [`Type: ${profile.bloodType}`] : [],
        riskLevel: 'normal'
      }
    ];
  };

  const bodyPoints = getBodyPoints();
  const warningPoints = bodyPoints.filter(p => p.riskLevel !== 'normal');

  const getRiskColor = (level: BodyPoint['riskLevel']) => {
    switch (level) {
      case 'critical': return 'text-danger bg-danger/20 border-danger';
      case 'warning': return 'text-warning bg-warning/20 border-warning';
      default: return 'text-success bg-success/20 border-success';
    }
  };

  const getPulseColor = (level: BodyPoint['riskLevel']) => {
    switch (level) {
      case 'critical': return 'bg-danger';
      case 'warning': return 'bg-warning';
      default: return 'bg-success';
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {t('biovault.digitalTwin.title', 'Bản sao số (Digital Twin)')}
        </CardTitle>
        <CardDescription>
          {t('biovault.digitalTwin.description', 'Bản đồ sức khỏe cá nhân với các điểm nhạy cảm')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Body Avatar */}
          <div className="lg:col-span-2 relative">
            <div className="relative aspect-[3/4] max-h-[500px] bg-gradient-to-b from-primary/5 to-transparent rounded-2xl border border-border overflow-hidden">
              {/* Human Body Silhouette */}
              <svg viewBox="0 0 100 120" className="w-full h-full">
                {/* Simple body outline */}
                <defs>
                  <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.1 }} />
                  </linearGradient>
                </defs>
                
                {/* Head */}
                <ellipse cx="50" cy="12" rx="10" ry="11" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                
                {/* Neck */}
                <rect x="46" y="22" width="8" height="6" fill="url(#bodyGradient)" />
                
                {/* Torso */}
                <path d="M32 28 L68 28 L70 65 L60 70 L60 90 L40 90 L40 70 L30 65 Z" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                
                {/* Arms */}
                <path d="M32 28 L20 55 L24 56 L34 35" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                <path d="M68 28 L80 55 L76 56 L66 35" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                
                {/* Legs */}
                <path d="M40 90 L38 115 L44 115 L48 90" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                <path d="M60 90 L62 115 L56 115 L52 90" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
              </svg>

              {/* Sensitivity Points */}
              {bodyPoints.map(point => (
                <Tooltip key={point.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSelectedPoint(point)}
                      className={`
                        absolute transform -translate-x-1/2 -translate-y-1/2
                        w-8 h-8 rounded-full border-2 flex items-center justify-center
                        transition-all duration-300 hover:scale-125 z-10
                        ${getRiskColor(point.riskLevel)}
                        ${selectedPoint?.id === point.id ? 'ring-4 ring-primary/30 scale-125' : ''}
                      `}
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    >
                      <point.icon className="h-4 w-4" />
                      
                      {/* Pulse animation for warning/critical */}
                      {point.riskLevel !== 'normal' && (
                        <span className={`absolute inset-0 rounded-full animate-ping ${getPulseColor(point.riskLevel)} opacity-30`} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {i18n.language === 'vi' ? point.labelVi : point.label}
                      </p>
                      {point.conditions.length > 0 && (
                        <ul className="text-xs text-muted-foreground">
                          {point.conditions.map((c, i) => (
                            <li key={i}>• {c}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-muted-foreground">{t('biovault.digitalTwin.normal', 'Bình thường')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-muted-foreground">{t('biovault.digitalTwin.attention', 'Cần chú ý')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-danger" />
                  <span className="text-muted-foreground">{t('biovault.digitalTwin.critical', 'Nguy hiểm')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="space-y-4">
            {/* Selected Point Details */}
            {selectedPoint && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getRiskColor(selectedPoint.riskLevel)}`}>
                      <selectedPoint.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {i18n.language === 'vi' ? selectedPoint.labelVi : selectedPoint.label}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={getRiskColor(selectedPoint.riskLevel)}
                      >
                        {selectedPoint.riskLevel === 'normal' 
                          ? t('biovault.digitalTwin.healthy', 'Khỏe mạnh')
                          : selectedPoint.riskLevel === 'warning'
                          ? t('biovault.digitalTwin.monitoring', 'Theo dõi')
                          : t('biovault.digitalTwin.urgent', 'Khẩn cấp')}
                      </Badge>
                    </div>
                  </div>

                  {selectedPoint.conditions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {t('biovault.digitalTwin.conditions', 'Tình trạng')}
                      </p>
                      {selectedPoint.conditions.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-warning" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Warning Summary */}
            <Card className="bg-warning/5 border-warning/30">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  {t('biovault.digitalTwin.sensitiveAreas', 'Vùng nhạy cảm')}
                </h4>
                
                {warningPoints.length > 0 ? (
                  <div className="space-y-2">
                    {warningPoints.map(point => (
                      <button
                        key={point.id}
                        onClick={() => setSelectedPoint(point)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg bg-background/50 hover:bg-background transition-colors text-left"
                      >
                        <point.icon className="h-4 w-4 text-warning" />
                        <span className="text-sm flex-1">
                          {i18n.language === 'vi' ? point.labelVi : point.label}
                        </span>
                        <Badge variant="outline" className="text-xs border-warning text-warning">
                          {point.conditions.length} {t('biovault.digitalTwin.issues', 'vấn đề')}
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('biovault.digitalTwin.allNormal', 'Tất cả các chỉ số bình thường')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Summary */}
            {profile && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium text-foreground">
                    {t('biovault.digitalTwin.profileSummary', 'Tóm tắt hồ sơ')}
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('biovault.bloodType', 'Nhóm máu')}</span>
                      <span className="font-medium">{profile.bloodType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('biovault.allergies', 'Dị ứng')}</span>
                      <span className="font-medium">{profile.allergies.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('biovault.conditions', 'Bệnh nền')}</span>
                      <span className="font-medium">{profile.chronicConditions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('biovault.medications', 'Thuốc')}</span>
                      <span className="font-medium">{profile.medications.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

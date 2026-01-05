import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, Heart, Brain, Activity, Droplets, 
  AlertTriangle, CheckCircle2, Info, Zap, Wind,
  Eye, Ear, Bone, TrendingUp, TrendingDown, Minus,
  Calendar, Clock, Target, Sparkles, BarChart3,
  ThermometerSun, Waves, HeartPulse, Stethoscope
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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
  healthScore: number;
  recommendations?: string[];
}

interface SymptomLog {
  id: string;
  symptom: string;
  severity: 1 | 2 | 3 | 4 | 5;
  bodyPart: string;
  recordedAt: Date;
  notes?: string;
}

export const DigitalTwinAvatar: React.FC<DigitalTwinAvatarProps> = ({ profile }) => {
  const { t, i18n } = useTranslation();
  const [selectedPoint, setSelectedPoint] = useState<BodyPoint | null>(null);
  const [activeView, setActiveView] = useState<'body' | 'timeline' | 'symptoms'>('body');
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([
    { id: '1', symptom: 'Đau đầu', severity: 2, bodyPart: 'brain', recordedAt: new Date(Date.now() - 86400000), notes: 'Sau khi làm việc máy tính' },
    { id: '2', symptom: 'Nghẹt mũi', severity: 3, bodyPart: 'sinus', recordedAt: new Date(Date.now() - 172800000), notes: 'Khi thời tiết thay đổi' },
    { id: '3', symptom: 'Khó thở nhẹ', severity: 2, bodyPart: 'lungs', recordedAt: new Date(Date.now() - 259200000) },
  ]);

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
      c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('tiểu đường') || c.toLowerCase().includes('pre-diabetes')
    );

    return [
      {
        id: 'brain',
        label: 'Brain & Nervous System',
        labelVi: 'Não & Hệ thần kinh',
        icon: Brain,
        x: 50,
        y: 8,
        category: 'organ',
        conditions: hasHypertension ? ['Stroke risk elevated', 'Headache sensitivity'] : [],
        riskLevel: hasHypertension ? 'warning' : 'normal',
        healthScore: hasHypertension ? 72 : 95,
        recommendations: hasHypertension 
          ? ['Theo dõi huyết áp thường xuyên', 'Giảm stress', 'Ngủ đủ giấc 7-8 tiếng']
          : []
      },
      {
        id: 'sinus',
        label: 'Sinuses',
        labelVi: 'Xoang',
        icon: Wind,
        x: 50,
        y: 13,
        category: 'organ',
        conditions: hasSinusitis ? ['Chronic sinusitis', 'Weather sensitive', 'Allergen reactive'] : [],
        riskLevel: hasSinusitis ? 'warning' : 'normal',
        healthScore: hasSinusitis ? 65 : 90,
        recommendations: hasSinusitis 
          ? ['Xịt mũi sinh lý hàng ngày', 'Tránh không khí lạnh đột ngột', 'Uống đủ nước']
          : []
      },
      {
        id: 'eyes',
        label: 'Eyes',
        labelVi: 'Mắt',
        icon: Eye,
        x: 44,
        y: 11,
        category: 'organ',
        conditions: [],
        riskLevel: 'normal',
        healthScore: 88,
        recommendations: ['Kiểm tra mắt định kỳ', 'Nghỉ mắt khi làm việc máy tính']
      },
      {
        id: 'ears',
        label: 'Ears',
        labelVi: 'Tai',
        icon: Ear,
        x: 56,
        y: 10,
        category: 'organ',
        conditions: [],
        riskLevel: 'normal',
        healthScore: 92,
        recommendations: []
      },
      {
        id: 'heart',
        label: 'Cardiovascular System',
        labelVi: 'Hệ tim mạch',
        icon: Heart,
        x: 45,
        y: 32,
        category: 'vital',
        conditions: hasHypertension ? ['Hypertension Stage 1', 'BP: 135/85', 'Heart rate: 72 bpm'] : [],
        riskLevel: hasHypertension ? 'warning' : 'normal',
        healthScore: hasHypertension ? 68 : 92,
        recommendations: hasHypertension 
          ? ['Uống thuốc huyết áp đúng giờ', 'Hạn chế muối', 'Tập thể dục 30 phút/ngày']
          : []
      },
      {
        id: 'lungs',
        label: 'Respiratory System',
        labelVi: 'Hệ hô hấp',
        icon: Waves,
        x: 55,
        y: 30,
        category: 'organ',
        conditions: hasAsthma ? ['Asthma', 'Air quality sensitive', 'SpO2: 98%'] : ['SpO2: 98%'],
        riskLevel: hasAsthma ? 'warning' : 'normal',
        healthScore: hasAsthma ? 70 : 95,
        recommendations: hasAsthma 
          ? ['Mang theo thuốc xịt', 'Đeo khẩu trang khi AQI > 100', 'Tránh khói bụi']
          : []
      },
      {
        id: 'stomach',
        label: 'Digestive System',
        labelVi: 'Hệ tiêu hóa',
        icon: Activity,
        x: 50,
        y: 42,
        category: 'organ',
        conditions: [],
        riskLevel: 'normal',
        healthScore: 85,
        recommendations: ['Ăn uống điều độ', 'Tránh đồ ăn nhiều dầu mỡ']
      },
      {
        id: 'liver',
        label: 'Liver',
        labelVi: 'Gan',
        icon: Activity,
        x: 42,
        y: 40,
        category: 'metabolic',
        conditions: [],
        riskLevel: 'normal',
        healthScore: 82,
        recommendations: ['Hạn chế rượu bia', 'Kiểm tra men gan định kỳ']
      },
      {
        id: 'pancreas',
        label: 'Pancreas & Metabolic',
        labelVi: 'Tụy & Chuyển hóa',
        icon: Droplets,
        x: 58,
        y: 43,
        category: 'metabolic',
        conditions: hasDiabetes ? ['Pre-diabetes', 'Glucose: 105 mg/dL', 'HbA1c: 6.2%'] : [],
        riskLevel: hasDiabetes ? 'warning' : 'normal',
        healthScore: hasDiabetes ? 65 : 90,
        recommendations: hasDiabetes 
          ? ['Kiểm soát đường huyết', 'Hạn chế carb', 'Tập thể dục đều đặn']
          : []
      },
      {
        id: 'kidneys',
        label: 'Kidneys',
        labelVi: 'Thận',
        icon: Droplets,
        x: 50,
        y: 48,
        category: 'organ',
        conditions: ['Creatinine: 1.1 mg/dL'],
        riskLevel: 'normal',
        healthScore: 88,
        recommendations: ['Uống đủ 2L nước/ngày', 'Hạn chế muối']
      },
      {
        id: 'blood',
        label: 'Blood & Immune',
        labelVi: 'Máu & Miễn dịch',
        icon: HeartPulse,
        x: 50,
        y: 55,
        category: 'metabolic',
        conditions: profile?.bloodType ? [`Blood Type: ${profile.bloodType}`, 'Cholesterol: 210 mg/dL'] : [],
        riskLevel: 'warning',
        healthScore: 75,
        recommendations: ['Kiểm soát cholesterol', 'Bổ sung omega-3']
      },
      {
        id: 'bones',
        label: 'Musculoskeletal',
        labelVi: 'Xương khớp',
        icon: Bone,
        x: 35,
        y: 60,
        category: 'organ',
        conditions: [],
        riskLevel: 'normal',
        healthScore: 90,
        recommendations: ['Bổ sung canxi', 'Tập vận động nhẹ']
      }
    ];
  };

  const bodyPoints = getBodyPoints();
  const warningPoints = bodyPoints.filter(p => p.riskLevel !== 'normal');
  
  // Calculate overall health score
  const overallHealthScore = Math.round(
    bodyPoints.reduce((sum, p) => sum + p.healthScore, 0) / bodyPoints.length
  );

  // Animate scores on mount
  useEffect(() => {
    bodyPoints.forEach(point => {
      let current = 0;
      const target = point.healthScore;
      const interval = setInterval(() => {
        current += 2;
        if (current >= target) {
          clearInterval(interval);
          setAnimatedScores(prev => ({ ...prev, [point.id]: target }));
        } else {
          setAnimatedScores(prev => ({ ...prev, [point.id]: current }));
        }
      }, 20);
    });
  }, []);

  // Mock health timeline data
  const healthTimelineData = [
    { month: 'Jan', brain: 85, heart: 75, metabolic: 70 },
    { month: 'Feb', brain: 82, heart: 78, metabolic: 68 },
    { month: 'Mar', brain: 80, heart: 76, metabolic: 65 },
    { month: 'Apr', brain: 78, heart: 72, metabolic: 67 },
    { month: 'May', brain: 75, heart: 70, metabolic: 64 },
    { month: 'Jun', brain: 73, heart: 68, metabolic: 65 },
    { month: 'Jul', brain: 72, heart: 70, metabolic: 66 },
    { month: 'Aug', brain: 74, heart: 72, metabolic: 68 },
    { month: 'Sep', brain: 76, heart: 74, metabolic: 67 },
    { month: 'Oct', brain: 75, heart: 73, metabolic: 66 },
    { month: 'Nov', brain: 73, heart: 70, metabolic: 65 },
    { month: 'Dec', brain: 72, heart: 68, metabolic: 65 }
  ];

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

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  const getSeverityLabel = (severity: number) => {
    const labels = ['', t('biovault.symptoms.mild', 'Nhẹ'), t('biovault.symptoms.moderate', 'Trung bình'), t('biovault.symptoms.noticeable', 'Đáng chú ý'), t('biovault.symptoms.severe', 'Nghiêm trọng'), t('biovault.symptoms.critical', 'Nguy hiểm')];
    return labels[severity] || '';
  };

  return (
    <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('biovault.digitalTwin.title', 'Bản sao số (Digital Twin)')}
            </CardTitle>
            <CardDescription>
              {t('biovault.digitalTwin.description', 'Bản đồ sức khỏe cá nhân với các điểm nhạy cảm')}
            </CardDescription>
          </div>
          
          {/* Overall Health Score */}
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(overallHealthScore)}`}>
              {overallHealthScore}%
            </div>
            <p className="text-xs text-muted-foreground">{t('biovault.digitalTwin.overallHealth', 'Sức khỏe tổng thể')}</p>
          </div>
        </div>

        {/* View Toggle */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="body" className="gap-2">
              <User className="h-4 w-4" />
              {t('biovault.digitalTwin.bodyMap', 'Bản đồ cơ thể')}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('biovault.digitalTwin.timeline', 'Lịch sử')}
            </TabsTrigger>
            <TabsTrigger value="symptoms" className="gap-2">
              <Stethoscope className="h-4 w-4" />
              {t('biovault.digitalTwin.symptoms', 'Triệu chứng')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {activeView === 'body' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Body Avatar */}
            <div className="lg:col-span-2 relative">
              <div className="relative aspect-[3/4] max-h-[500px] bg-gradient-to-b from-primary/5 to-transparent rounded-2xl border border-border overflow-hidden">
                {/* Human Body Silhouette - Enhanced */}
                <svg viewBox="0 0 100 120" className="w-full h-full">
                  <defs>
                    <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.4 }} />
                      <stop offset="50%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
                      <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.1 }} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {/* Head */}
                  <ellipse cx="50" cy="12" rx="10" ry="11" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" filter="url(#glow)" />
                  
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
                  
                  {/* Internal organ outlines */}
                  <ellipse cx="50" cy="35" rx="8" ry="6" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.5" />
                  <ellipse cx="50" cy="48" rx="10" ry="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.5" />
                </svg>

                {/* Sensitivity Points */}
                {bodyPoints.map(point => (
                  <Tooltip key={point.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSelectedPoint(point)}
                        className={`
                          absolute transform -translate-x-1/2 -translate-y-1/2
                          w-9 h-9 rounded-full border-2 flex items-center justify-center
                          transition-all duration-300 hover:scale-125 z-10
                          ${getRiskColor(point.riskLevel)}
                          ${selectedPoint?.id === point.id ? 'ring-4 ring-primary/30 scale-125' : ''}
                        `}
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      >
                        <point.icon className="h-4 w-4" />
                        
                        {point.riskLevel !== 'normal' && (
                          <span className={`absolute inset-0 rounded-full animate-ping ${getPulseColor(point.riskLevel)} opacity-30`} />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {i18n.language === 'vi' ? point.labelVi : point.label}
                          </p>
                          <Badge variant="outline" className={getScoreColor(point.healthScore)}>
                            {point.healthScore}%
                          </Badge>
                        </div>
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
              {selectedPoint ? (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${getRiskColor(selectedPoint.riskLevel)}`}>
                        <selectedPoint.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {i18n.language === 'vi' ? selectedPoint.labelVi : selectedPoint.label}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${getScoreColor(selectedPoint.healthScore)}`}>
                            {animatedScores[selectedPoint.id] || 0}%
                          </span>
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
                    </div>

                    <Progress value={selectedPoint.healthScore} className="h-2" />

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

                    {selectedPoint.recommendations && selectedPoint.recommendations.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {t('biovault.digitalTwin.recommendations', 'Khuyến nghị')}
                        </p>
                        {selectedPoint.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-3 w-3 text-success" />
                            <span className="text-muted-foreground">{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-8 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {t('biovault.digitalTwin.selectPoint', 'Chọn một điểm trên cơ thể để xem chi tiết')}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Warning Summary */}
              <Card className="bg-warning/5 border-warning/30">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    {t('biovault.digitalTwin.sensitiveAreas', 'Vùng nhạy cảm')} ({warningPoints.length})
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
                          <span className={`text-sm font-medium ${getScoreColor(point.healthScore)}`}>
                            {point.healthScore}%
                          </span>
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

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="bg-muted/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{bodyPoints.length}</p>
                    <p className="text-xs text-muted-foreground">{t('biovault.digitalTwin.trackedOrgans', 'Cơ quan theo dõi')}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-warning">{warningPoints.length}</p>
                    <p className="text-xs text-muted-foreground">{t('biovault.digitalTwin.needAttention', 'Cần chú ý')}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeView === 'timeline' && (
          <div className="space-y-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={healthTimelineData}>
                  <defs>
                    <linearGradient id="brainGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--danger))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--danger))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="metabolicGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} domain={[50, 100]} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="brain" stroke="hsl(var(--primary))" fill="url(#brainGradient)" strokeWidth={2} name={t('biovault.digitalTwin.brain', 'Thần kinh')} />
                  <Area type="monotone" dataKey="heart" stroke="hsl(var(--danger))" fill="url(#heartGradient)" strokeWidth={2} name={t('biovault.digitalTwin.heart', 'Tim mạch')} />
                  <Area type="monotone" dataKey="metabolic" stroke="hsl(var(--warning))" fill="url(#metabolicGradient)" strokeWidth={2} name={t('biovault.digitalTwin.metabolic', 'Chuyển hóa')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">{t('biovault.digitalTwin.brain', 'Thần kinh')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <span className="text-sm text-muted-foreground">{t('biovault.digitalTwin.heart', 'Tim mạch')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-sm text-muted-foreground">{t('biovault.digitalTwin.metabolic', 'Chuyển hóa')}</span>
              </div>
            </div>
          </div>
        )}

        {activeView === 'symptoms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                {t('biovault.symptoms.title', 'Nhật ký triệu chứng')}
              </h4>
              <Button size="sm" variant="outline">
                <Stethoscope className="h-4 w-4 mr-2" />
                {t('biovault.symptoms.addNew', 'Thêm triệu chứng')}
              </Button>
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {symptomLogs.map(log => (
                  <Card key={log.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            log.severity >= 4 ? 'border-danger text-danger' :
                            log.severity >= 3 ? 'border-warning text-warning' :
                            'border-muted-foreground text-muted-foreground'
                          }>
                            {getSeverityLabel(log.severity)}
                          </Badge>
                          <span className="font-medium">{log.symptom}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {log.recordedAt.toLocaleDateString(i18n.language)}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground">{log.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

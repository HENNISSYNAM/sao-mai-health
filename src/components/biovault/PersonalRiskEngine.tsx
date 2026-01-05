import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, AlertTriangle, Brain, Cloud, Thermometer,
  Droplets, Wind, Activity, Clock, MapPin, Zap, Bell,
  ChevronRight, BarChart3, Shield, Target, Sparkles,
  Calendar, TrendingDown, Minus, Radio, Eye, Navigation
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ComposedChart, Bar } from 'recharts';
import type { UserHealthProfile } from '@/pages/BioVault';

interface PersonalRiskEngineProps {
  profile: UserHealthProfile | null;
  showFullDashboard?: boolean;
}

interface RiskPrediction {
  id: string;
  condition: string;
  conditionVi: string;
  probability: number;
  timeframe: string;
  timeframeVi: string;
  triggers: { en: string; vi: string }[];
  recommendation: string;
  recommendationVi: string;
  trend: 'rising' | 'falling' | 'stable';
  historicalData: { time: string; risk: number }[];
}

interface EnvironmentData {
  pressure: number;
  humidity: number;
  temperature: number;
  aqi: number;
  uvIndex: number;
  windSpeed: number;
  pm25: number;
  pollen: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

interface PatternRule {
  id: string;
  name: string;
  nameVi: string;
  formula: string;
  isActive: boolean;
  matchCount: number;
  lastTriggered?: Date;
}

export const PersonalRiskEngine: React.FC<PersonalRiskEngineProps> = ({ 
  profile, 
  showFullDashboard = false 
}) => {
  const { t, i18n } = useTranslation();
  const [environment, setEnvironment] = useState<EnvironmentData>({
    pressure: 1008,
    humidity: 88,
    temperature: 32,
    aqi: 85,
    uvIndex: 7,
    windSpeed: 12,
    pm25: 45,
    pollen: 'high',
    lastUpdated: new Date()
  });
  const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePatterns, setActivePatterns] = useState<PatternRule[]>([]);
  const [riskTrendData, setRiskTrendData] = useState<any[]>([]);

  // Simulate real-time environment updates
  useEffect(() => {
    const interval = setInterval(() => {
      setEnvironment(prev => ({
        ...prev,
        pressure: prev.pressure + (Math.random() - 0.5) * 2,
        humidity: Math.max(60, Math.min(95, prev.humidity + (Math.random() - 0.5) * 3)),
        temperature: Math.max(28, Math.min(38, prev.temperature + (Math.random() - 0.5) * 0.5)),
        aqi: Math.max(50, Math.min(150, prev.aqi + (Math.random() - 0.5) * 5)),
        lastUpdated: new Date()
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Pattern rules engine
  const patternRules: PatternRule[] = [
    {
      id: 'cardiovascular_storm',
      name: 'Cardiovascular Storm Warning',
      nameVi: 'Cảnh báo bão tim mạch',
      formula: 'IF (P < 1010 hPa) AND (H > 85%) AND (hasCardiovascular)',
      isActive: true,
      matchCount: 23
    },
    {
      id: 'sinusitis_flare',
      name: 'Sinusitis Flare Prediction',
      nameVi: 'Dự báo viêm xoang tái phát',
      formula: 'IF (ΔP > 5 hPa/6h) OR (Pollen = HIGH) AND (hasSinusitis)',
      isActive: true,
      matchCount: 45
    },
    {
      id: 'asthma_trigger',
      name: 'Asthma Trigger Detection',
      nameVi: 'Phát hiện kích hoạt hen suyễn',
      formula: 'IF (AQI > 75) OR (PM2.5 > 35) AND (hasAsthma)',
      isActive: true,
      matchCount: 18
    },
    {
      id: 'diabetes_risk',
      name: 'Glucose Spike Prediction',
      nameVi: 'Dự báo tăng đường huyết',
      formula: 'IF (Stress > 70%) OR (Sleep < 6h) AND (hasDiabetes)',
      isActive: true,
      matchCount: 31
    },
    {
      id: 'heat_vulnerability',
      name: 'Heat Vulnerability Index',
      nameVi: 'Chỉ số nhạy cảm nhiệt',
      formula: 'IF (T > 35°C) AND (UV > 7) AND (Age > 60)',
      isActive: true,
      matchCount: 12
    }
  ];

  // Generate 24h risk trend data
  useEffect(() => {
    const data = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - (23 - i));
      
      // Simulate risk patterns based on time of day
      const baseRisk = 40;
      const timeOfDay = hour.getHours();
      let riskModifier = 0;
      
      // Higher risk during pressure drops (morning/evening)
      if (timeOfDay >= 6 && timeOfDay <= 9) riskModifier += 15;
      if (timeOfDay >= 17 && timeOfDay <= 20) riskModifier += 10;
      
      return {
        time: `${hour.getHours().toString().padStart(2, '0')}:00`,
        cardiovascular: baseRisk + riskModifier + Math.random() * 15,
        respiratory: baseRisk - 5 + riskModifier + Math.random() * 10,
        metabolic: baseRisk - 10 + Math.random() * 12,
        overall: baseRisk + riskModifier / 2 + Math.random() * 8
      };
    });
    setRiskTrendData(data);
  }, []);

  // Hidden Pattern Engine analysis
  useEffect(() => {
    if (!profile) return;

    const analyzePatterns = async () => {
      setIsAnalyzing(true);
      await new Promise(r => setTimeout(r, 1500));

      const newPredictions: RiskPrediction[] = [];
      const triggeredPatterns: PatternRule[] = [];

      // Check chronic conditions
      const hasCardiovascular = profile.chronicConditions.some(c => 
        c.toLowerCase().includes('hypertension') || 
        c.toLowerCase().includes('heart') ||
        c.toLowerCase().includes('huyết áp') ||
        c.toLowerCase().includes('tim')
      );

      const hasSinusitis = profile.chronicConditions.some(c => 
        c.toLowerCase().includes('sinusitis') || 
        c.toLowerCase().includes('viêm xoang')
      );

      const hasAsthma = profile.chronicConditions.some(c => 
        c.toLowerCase().includes('asthma') || 
        c.toLowerCase().includes('hen')
      );

      const hasDiabetes = profile.chronicConditions.some(c => 
        c.toLowerCase().includes('diabetes') || 
        c.toLowerCase().includes('tiểu đường') ||
        c.toLowerCase().includes('pre-diabetes')
      );

      // Rule 1: Cardiovascular Storm
      if (environment.pressure < 1010 && environment.humidity > 85 && hasCardiovascular) {
        newPredictions.push({
          id: 'cardio-1',
          condition: 'Cardiovascular Risk',
          conditionVi: 'Rủi ro tim mạch',
          probability: Math.min(95, 75 + (1010 - environment.pressure) * 2),
          timeframe: 'Next 12 hours',
          timeframeVi: '12 giờ tới',
          triggers: [
            { en: `Low pressure: ${environment.pressure.toFixed(1)} hPa`, vi: `Áp suất thấp: ${environment.pressure.toFixed(1)} hPa` },
            { en: `High humidity: ${environment.humidity}%`, vi: `Độ ẩm cao: ${environment.humidity}%` },
            { en: 'History of hypertension', vi: 'Tiền sử huyết áp cao' },
            { en: 'Blood pressure trend: elevated', vi: 'Xu hướng huyết áp: tăng' }
          ],
          recommendation: 'Limit strenuous activities, take medication on time, monitor blood pressure every 4 hours',
          recommendationVi: 'Hạn chế hoạt động gắng sức, uống thuốc đúng giờ, đo huyết áp mỗi 4 tiếng',
          trend: 'rising',
          historicalData: Array.from({ length: 12 }, (_, i) => ({
            time: `${i * 2}h`,
            risk: 50 + Math.sin(i / 2) * 20 + Math.random() * 10
          }))
        });
        triggeredPatterns.push(patternRules[0]);
      }

      // Rule 2: Sinusitis Flare
      if (hasSinusitis && (environment.pressure < 1012 || environment.pollen === 'high')) {
        newPredictions.push({
          id: 'sinus-1',
          condition: 'Sinusitis Flare-up',
          conditionVi: 'Viêm xoang tái phát',
          probability: 80,
          timeframe: 'Next 12 hours',
          timeframeVi: '12 giờ tới',
          triggers: [
            { en: `Pressure drop: ${environment.pressure.toFixed(1)} hPa`, vi: `Áp suất giảm: ${environment.pressure.toFixed(1)} hPa` },
            { en: `Pollen level: ${environment.pollen}`, vi: `Mức phấn hoa: ${environment.pollen === 'high' ? 'cao' : environment.pollen === 'medium' ? 'trung bình' : 'thấp'}` },
            { en: 'Chronic sinusitis history', vi: 'Tiền sử viêm xoang mãn tính' },
            { en: 'Weather change detected', vi: 'Phát hiện thay đổi thời tiết' }
          ],
          recommendation: 'Use saline nasal spray, avoid sudden cold air, keep face warm, stay hydrated',
          recommendationVi: 'Xịt mũi sinh lý, tránh không khí lạnh đột ngột, giữ ấm vùng mặt, uống đủ nước',
          trend: 'stable',
          historicalData: Array.from({ length: 12 }, (_, i) => ({
            time: `${i * 2}h`,
            risk: 60 + Math.cos(i / 3) * 15 + Math.random() * 8
          }))
        });
        triggeredPatterns.push(patternRules[1]);
      }

      // Rule 3: Asthma Trigger
      if (hasAsthma && (environment.aqi > 75 || environment.pm25 > 35)) {
        newPredictions.push({
          id: 'asthma-1',
          condition: 'Asthma Attack Risk',
          conditionVi: 'Nguy cơ cơn hen suyễn',
          probability: Math.min(85, 65 + (environment.aqi - 75) / 2),
          timeframe: 'Next 6 hours',
          timeframeVi: '6 giờ tới',
          triggers: [
            { en: `Air Quality Index: ${environment.aqi}`, vi: `Chỉ số chất lượng không khí: ${environment.aqi}` },
            { en: `PM2.5: ${environment.pm25} µg/m³`, vi: `PM2.5: ${environment.pm25} µg/m³` },
            { en: 'Asthma history on record', vi: 'Tiền sử hen suyễn trong hồ sơ' }
          ],
          recommendation: 'Carry rescue inhaler, wear N95 mask outdoors, limit outdoor activities 11am-3pm',
          recommendationVi: 'Mang theo thuốc xịt cắt cơn, đeo khẩu trang N95 khi ra ngoài, hạn chế hoạt động ngoài trời 11h-15h',
          trend: 'rising',
          historicalData: Array.from({ length: 12 }, (_, i) => ({
            time: `${i * 2}h`,
            risk: 45 + Math.sin(i / 4) * 25 + Math.random() * 10
          }))
        });
        triggeredPatterns.push(patternRules[2]);
      }

      // Rule 4: Diabetes Risk
      if (hasDiabetes && environment.temperature > 32) {
        newPredictions.push({
          id: 'diabetes-1',
          condition: 'Glucose Instability',
          conditionVi: 'Đường huyết không ổn định',
          probability: 55,
          timeframe: 'During peak heat hours',
          timeframeVi: 'Trong giờ nắng gắt',
          triggers: [
            { en: `High temperature: ${environment.temperature}°C`, vi: `Nhiệt độ cao: ${environment.temperature}°C` },
            { en: 'Pre-diabetes condition', vi: 'Tình trạng tiền tiểu đường' },
            { en: 'Heat stress may affect glucose', vi: 'Stress nhiệt ảnh hưởng đường huyết' }
          ],
          recommendation: 'Check glucose more frequently, stay hydrated, avoid high-sugar drinks',
          recommendationVi: 'Kiểm tra đường huyết thường xuyên hơn, uống đủ nước, tránh đồ uống nhiều đường',
          trend: 'stable',
          historicalData: Array.from({ length: 12 }, (_, i) => ({
            time: `${i * 2}h`,
            risk: 40 + Math.sin(i / 3) * 10 + Math.random() * 5
          }))
        });
        triggeredPatterns.push(patternRules[3]);
      }

      // Check for allergy triggers
      if (profile.allergies.some(a => a.toLowerCase().includes('pollen')) && environment.pollen === 'high') {
        newPredictions.push({
          id: 'allergy-1',
          condition: 'Allergy Flare Risk',
          conditionVi: 'Nguy cơ dị ứng bùng phát',
          probability: 70,
          timeframe: 'Outdoor exposure',
          timeframeVi: 'Khi tiếp xúc ngoài trời',
          triggers: [
            { en: 'High pollen count', vi: 'Mức phấn hoa cao' },
            { en: 'Pollen allergy in profile', vi: 'Dị ứng phấn hoa trong hồ sơ' }
          ],
          recommendation: 'Take antihistamines preventively, wear mask outdoors, shower after outdoor activities',
          recommendationVi: 'Uống thuốc kháng histamine phòng ngừa, đeo khẩu trang ngoài trời, tắm sau khi hoạt động ngoài trời',
          trend: 'stable',
          historicalData: Array.from({ length: 12 }, (_, i) => ({
            time: `${i * 2}h`,
            risk: 55 + Math.random() * 15
          }))
        });
      }

      setActivePatterns(triggeredPatterns);
      setPredictions(newPredictions);
      setIsAnalyzing(false);
    };

    analyzePatterns();
  }, [profile, environment.pressure, environment.aqi, environment.pollen, t]);

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return 'text-danger bg-danger/10 border-danger/30';
    if (prob >= 50) return 'text-warning bg-warning/10 border-warning/30';
    return 'text-info bg-info/10 border-info/30';
  };

  const getTrendIcon = (trend: RiskPrediction['trend']) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-4 w-4 text-danger" />;
      case 'falling': return <TrendingDown className="h-4 w-4 text-success" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Radar chart data for multi-factor risk assessment
  const radarData = [
    { factor: i18n.language === 'vi' ? 'Tim mạch' : 'Cardiovascular', score: predictions.find(p => p.id.includes('cardio'))?.probability || 30, fullMark: 100 },
    { factor: i18n.language === 'vi' ? 'Hô hấp' : 'Respiratory', score: predictions.find(p => p.id.includes('asthma') || p.id.includes('sinus'))?.probability || 25, fullMark: 100 },
    { factor: i18n.language === 'vi' ? 'Chuyển hóa' : 'Metabolic', score: predictions.find(p => p.id.includes('diabetes'))?.probability || 20, fullMark: 100 },
    { factor: i18n.language === 'vi' ? 'Dị ứng' : 'Allergy', score: predictions.find(p => p.id.includes('allergy'))?.probability || 35, fullMark: 100 },
    { factor: i18n.language === 'vi' ? 'Môi trường' : 'Environmental', score: Math.min(100, environment.aqi), fullMark: 100 }
  ];

  return (
    <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          {t('biovault.riskEngine.title', 'Hidden Pattern Engine')}
          <Badge variant="outline" className="ml-2 text-xs animate-pulse">
            <Radio className="h-3 w-3 mr-1" />
            {t('biovault.riskEngine.realtime', 'Thời gian thực')}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>{t('biovault.riskEngine.description', 'Dự báo rủi ro cá nhân hóa dựa trên hồ sơ y tế và dữ liệu môi trường')}</span>
          <span className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {environment.lastUpdated.toLocaleTimeString(i18n.language)}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Environment Data - Enhanced */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { icon: Cloud, label: t('biovault.env.pressure', 'Áp suất'), value: `${environment.pressure.toFixed(0)}`, unit: 'hPa', warning: environment.pressure < 1010 },
            { icon: Droplets, label: t('biovault.env.humidity', 'Độ ẩm'), value: `${environment.humidity}`, unit: '%', warning: environment.humidity > 85 },
            { icon: Thermometer, label: t('biovault.env.temp', 'Nhiệt độ'), value: `${environment.temperature}`, unit: '°C', warning: environment.temperature > 35 },
            { icon: Wind, label: 'AQI', value: environment.aqi.toString(), unit: '', warning: environment.aqi > 75 },
            { icon: Zap, label: 'UV', value: environment.uvIndex.toString(), unit: '', warning: environment.uvIndex > 7 },
            { icon: Wind, label: 'PM2.5', value: environment.pm25.toString(), unit: 'µg/m³', warning: environment.pm25 > 35 },
            { icon: Activity, label: t('biovault.env.wind', 'Gió'), value: `${environment.windSpeed}`, unit: 'km/h', warning: false },
            { icon: MapPin, label: t('biovault.env.location', 'Vị trí'), value: 'HCMC', unit: '', warning: false }
          ].map((item, i) => (
            <div 
              key={i} 
              className={`p-2 rounded-xl text-center transition-all ${
                item.warning ? 'bg-warning/10 border border-warning/30 animate-pulse' : 'bg-muted/50'
              }`}
            >
              <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.warning ? 'text-warning' : 'text-muted-foreground'}`} />
              <p className="text-[10px] text-muted-foreground truncate">{item.label}</p>
              <p className={`font-semibold text-sm ${item.warning ? 'text-warning' : 'text-foreground'}`}>
                {item.value}<span className="text-[10px] font-normal ml-0.5">{item.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Active Predictions */}
        {predictions.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                {t('biovault.riskEngine.activePredictions', 'Cảnh báo rủi ro cá nhân hóa')}
                <Badge variant="destructive" className="ml-2">{predictions.length}</Badge>
              </h4>
              <Button variant="outline" size="sm">
                <Bell className="h-3 w-3 mr-2" />
                {t('biovault.riskEngine.manageAlerts', 'Quản lý')}
              </Button>
            </div>

            {predictions.map((pred) => (
              <Alert 
                key={pred.id} 
                className={`${getProbabilityColor(pred.probability)} border-2 transition-all hover:shadow-lg`}
              >
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {i18n.language === 'vi' ? pred.conditionVi : pred.condition}
                    {getTrendIcon(pred.trend)}
                  </span>
                  <Badge className={getProbabilityColor(pred.probability)}>
                    {pred.probability}%
                  </Badge>
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-3">
                  <p className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('biovault.riskEngine.timeframe', 'Khung thời gian')}: <strong>{i18n.language === 'vi' ? pred.timeframeVi : pred.timeframe}</strong>
                  </p>
                  
                  <div className="text-sm">
                    <p className="font-medium mb-1">{t('biovault.riskEngine.triggers', 'Yếu tố kích hoạt')}:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {pred.triggers.map((trigger, j) => (
                        <li key={j}>{i18n.language === 'vi' ? trigger.vi : trigger.en}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Mini risk chart */}
                  {showFullDashboard && (
                    <div className="h-16 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={pred.historicalData}>
                          <Area 
                            type="monotone" 
                            dataKey="risk" 
                            stroke={pred.probability >= 70 ? 'hsl(var(--danger))' : 'hsl(var(--warning))'} 
                            fill={pred.probability >= 70 ? 'hsl(var(--danger)/0.2)' : 'hsl(var(--warning)/0.2)'} 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-background/50 text-sm">
                    <p className="font-medium flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-success" />
                      {t('biovault.riskEngine.recommendation', 'Khuyến nghị')}:
                    </p>
                    <p className="text-muted-foreground">{i18n.language === 'vi' ? pred.recommendationVi : pred.recommendation}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Bell className="h-3 w-3 mr-2" />
                      {t('biovault.riskEngine.setReminder', 'Đặt nhắc nhở')}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Navigation className="h-3 w-3 mr-2" />
                      {t('biovault.riskEngine.safeRoute', 'Lộ trình an toàn')}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-primary mx-auto animate-pulse mb-3" />
            <p className="text-muted-foreground">
              {t('biovault.riskEngine.analyzing', 'Đang phân tích quy luật ẩn...')}
            </p>
            <Progress value={60} className="w-48 mx-auto mt-4" />
          </div>
        ) : (
          <div className="text-center py-8 text-success">
            <Shield className="h-12 w-12 mx-auto mb-3" />
            <p className="font-medium">{t('biovault.riskEngine.noRisks', 'Không phát hiện rủi ro cao')}</p>
            <p className="text-sm text-muted-foreground">
              {t('biovault.riskEngine.noRisksDesc', 'Điều kiện môi trường hiện tại phù hợp với hồ sơ sức khỏe của bạn')}
            </p>
          </div>
        )}

        {/* Full Dashboard Mode */}
        {showFullDashboard && (
          <>
            {/* Multi-Factor Risk Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-border">
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-primary" />
                  {t('biovault.riskEngine.multiFactor', 'Đánh giá đa yếu tố')}
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="factor" 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Radar
                        name={t('biovault.riskEngine.riskScore', 'Điểm rủi ro')}
                        dataKey="score"
                        stroke="hsl(var(--warning))"
                        fill="hsl(var(--warning)/0.3)"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 24h Risk Trend */}
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {t('biovault.riskEngine.riskTrend', 'Xu hướng rủi ro 24h')}
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={riskTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        interval={3}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="overall" 
                        fill="hsl(var(--primary)/0.2)" 
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name={t('biovault.riskEngine.overall', 'Tổng thể')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cardiovascular" 
                        stroke="hsl(var(--danger))" 
                        strokeWidth={1.5}
                        dot={false}
                        name={t('biovault.riskEngine.cardiovascular', 'Tim mạch')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="respiratory" 
                        stroke="hsl(var(--info))" 
                        strokeWidth={1.5}
                        dot={false}
                        name={t('biovault.riskEngine.respiratory', 'Hô hấp')}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Active Pattern Rules */}
            <div className="pt-4 border-t border-border">
              <h4 className="font-medium flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('biovault.riskEngine.activePatterns', 'Quy luật đang hoạt động')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {patternRules.map(rule => {
                  const isTriggered = activePatterns.some(p => p.id === rule.id);
                  return (
                    <div 
                      key={rule.id}
                      className={`p-3 rounded-xl border ${
                        isTriggered ? 'border-warning bg-warning/5' : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {i18n.language === 'vi' ? rule.nameVi : rule.name}
                        </span>
                        <Badge variant={isTriggered ? 'destructive' : 'secondary'} className="text-xs">
                          {isTriggered ? t('biovault.riskEngine.triggered', 'Kích hoạt') : t('biovault.riskEngine.monitoring', 'Theo dõi')}
                        </Badge>
                      </div>
                      <code className="text-xs text-muted-foreground block bg-background/50 p-2 rounded">
                        {rule.formula}
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('biovault.riskEngine.matchCount', 'Khớp')}: {rule.matchCount} {t('biovault.riskEngine.times', 'lần')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Pattern Formula Display - Compact */}
        {!showFullDashboard && (
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              {t('biovault.riskEngine.formula', 'Công thức phát hiện quy luật')}
            </h5>
            <code className="text-xs text-muted-foreground block">
              IF (P &lt; 1010 hPa) AND (H &gt; 85%) AND (hasCardiovascular) → ALERT
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              {activePatterns.length} {t('biovault.riskEngine.patternsActive', 'quy luật đang kích hoạt')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, AlertTriangle, Brain, Cloud, Thermometer,
  Droplets, Wind, Activity, Clock, MapPin, Zap, Bell,
  ChevronRight, BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { UserHealthProfile } from '@/types/health';

interface PersonalRiskEngineProps {
  profile: UserHealthProfile | null;
  showFullDashboard?: boolean;
  environmentData?: EnvironmentData | null;
}

interface RiskPrediction {
  condition: string;
  probability: number;
  timeframe: string;
  triggers: string[];
  recommendation: string;
}

interface EnvironmentData {
  pressure: number;
  humidity: number;
  temperature: number;
  aqi: number;
  uvIndex: number;
  windSpeed: number;
}

export const PersonalRiskEngine: React.FC<PersonalRiskEngineProps> = ({ 
  profile, 
  showFullDashboard = false,
  environmentData: externalEnvData = null
}) => {
  const { t, i18n } = useTranslation();
  const [environment, setEnvironment] = useState<EnvironmentData>({
    pressure: 1008,
    humidity: 88,
    temperature: 32,
    aqi: 85,
    uvIndex: 7,
    windSpeed: 12
  });

  // Use real environment data when available from props
  useEffect(() => {
    if (externalEnvData) {
      setEnvironment(externalEnvData);
    }
  }, [externalEnvData]);
  const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Simulate Hidden Pattern Engine analysis
  useEffect(() => {
    if (!profile) return;

    const analyzePatterns = async () => {
      setIsAnalyzing(true);
      await new Promise(r => setTimeout(r, 1500));

      const newPredictions: RiskPrediction[] = [];

      // Rule: Pressure < 1010 hPa + Humidity > 85% + Cardiovascular history
      const hasCardiovascular = profile.chronicConditions.some(c => 
        c.toLowerCase().includes('hypertension') || 
        c.toLowerCase().includes('heart') ||
        c.toLowerCase().includes('huyết áp') ||
        c.toLowerCase().includes('tim')
      );

      if (environment.pressure < 1010 && environment.humidity > 85 && hasCardiovascular) {
        newPredictions.push({
          condition: t('biovault.predictions.cardiovascularRisk', 'Rủi ro tim mạch'),
          probability: 75,
          timeframe: t('biovault.predictions.next12h', '12 giờ tới'),
          triggers: [
            `${t('biovault.predictions.lowPressure', 'Áp suất thấp')}: ${environment.pressure} hPa`,
            `${t('biovault.predictions.highHumidity', 'Độ ẩm cao')}: ${environment.humidity}%`,
            t('biovault.predictions.historyHypertension', 'Tiền sử huyết áp cao')
          ],
          recommendation: t('biovault.predictions.cardiovascularRec', 'Hạn chế hoạt động gắng sức, uống thuốc đúng giờ, theo dõi huyết áp thường xuyên')
        });
      }

      // Rule: Sinusitis + Weather changes
      const hasSinusitis = profile.chronicConditions.some(c => 
        c.toLowerCase().includes('sinusitis') || 
        c.toLowerCase().includes('viêm xoang')
      );

      if (hasSinusitis && environment.pressure < 1012) {
        newPredictions.push({
          condition: t('biovault.predictions.sinusitisFlare', 'Viêm xoang tái phát'),
          probability: 80,
          timeframe: t('biovault.predictions.next12h', '12 giờ tới'),
          triggers: [
            `${t('biovault.predictions.pressureDrop', 'Áp suất giảm')}: ${environment.pressure} hPa`,
            t('biovault.predictions.weatherChange', 'Thay đổi thời tiết đột ngột'),
            t('biovault.predictions.chronicSinusitis', 'Tiền sử viêm xoang mãn tính')
          ],
          recommendation: t('biovault.predictions.sinusitisRec', 'Xịt mũi sinh lý, tránh không khí lạnh đột ngột, giữ ấm vùng mặt')
        });
      }

      // Rule: Asthma + High AQI
      const hasAsthma = profile.chronicConditions.some(c => 
        c.toLowerCase().includes('asthma') || 
        c.toLowerCase().includes('hen')
      );

      if (hasAsthma && environment.aqi > 75) {
        newPredictions.push({
          condition: t('biovault.predictions.asthmaFlare', 'Cơn hen suyễn'),
          probability: 65,
          timeframe: t('biovault.predictions.next6h', '6 giờ tới'),
          triggers: [
            `${t('biovault.predictions.airQuality', 'Chất lượng không khí')}: AQI ${environment.aqi}`,
            t('biovault.predictions.dustLevel', 'Bụi mịn PM2.5 cao'),
            t('biovault.predictions.asthmaHistory', 'Tiền sử hen suyễn')
          ],
          recommendation: t('biovault.predictions.asthmaRec', 'Mang theo thuốc xịt, đeo khẩu trang N95, hạn chế ra ngoài')
        });
      }

      // General high temperature warning for elderly
      if (environment.temperature > 35 && profile.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear();
        if (age > 60) {
          newPredictions.push({
            condition: t('biovault.predictions.heatStroke', 'Sốc nhiệt'),
            probability: 45,
            timeframe: t('biovault.predictions.peakHours', 'Giờ cao điểm 11h-15h'),
            triggers: [
              `${t('biovault.predictions.highTemp', 'Nhiệt độ cao')}: ${environment.temperature}°C`,
              t('biovault.predictions.elderlySensitive', 'Nhóm tuổi nhạy cảm'),
              `UV Index: ${environment.uvIndex}`
            ],
            recommendation: t('biovault.predictions.heatRec', 'Uống đủ nước, tránh nắng trực tiếp, ở trong phòng mát')
          });
        }
      }

      setPredictions(newPredictions);
      setIsAnalyzing(false);
    };

    analyzePatterns();
  }, [profile, environment, t]);

  // Mock historical data for charts
  const historicalData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    risk: Math.round(Math.max(20, Math.min(90, 50 + Math.sin(i / 4) * 30 + Math.random() * 10))),
    pressure: Math.round(1013 - Math.sin(i / 6) * 5 + Math.random() * 2)
  }));

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return 'text-danger bg-danger/10 border-danger/30';
    if (prob >= 50) return 'text-warning bg-warning/10 border-warning/30';
    return 'text-info bg-info/10 border-info/30';
  };

  return (
    <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          {t('biovault.riskEngine.title', 'Hidden Pattern Engine')}
          <Badge variant="outline" className="ml-2 text-xs">
            {t('biovault.riskEngine.realtime', 'Thời gian thực')}
          </Badge>
        </CardTitle>
        <CardDescription>
          {t('biovault.riskEngine.description', 'Dự báo rủi ro cá nhân hóa dựa trên hồ sơ y tế và dữ liệu môi trường')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Environment Data */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { icon: Cloud, label: t('biovault.env.pressure', 'Áp suất'), value: `${Math.round(environment.pressure)} hPa`, warning: environment.pressure < 1010 },
            { icon: Droplets, label: t('biovault.env.humidity', 'Độ ẩm'), value: `${Math.round(environment.humidity)}%`, warning: environment.humidity > 85 },
            { icon: Thermometer, label: t('biovault.env.temp', 'Nhiệt độ'), value: `${Math.round(environment.temperature)}°C`, warning: environment.temperature > 35 },
            { icon: Wind, label: 'AQI', value: Math.round(environment.aqi).toString(), warning: environment.aqi > 75 },
            { icon: Zap, label: 'UV', value: Math.round(environment.uvIndex).toString(), warning: environment.uvIndex > 7 },
            { icon: MapPin, label: t('biovault.env.location', 'Vị trí'), value: '10.77, 106.69', warning: false }
          ].map((item, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-xl text-center ${
                item.warning ? 'bg-warning/10 border border-warning/30' : 'bg-muted/50'
              }`}
            >
              <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.warning ? 'text-warning' : 'text-muted-foreground'}`} />
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`font-semibold text-sm ${item.warning ? 'text-warning' : 'text-foreground'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Active Predictions */}
        {predictions.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {t('biovault.riskEngine.activePredictions', 'Cảnh báo rủi ro cá nhân hóa')}
            </h4>

            {predictions.map((pred, i) => (
              <Alert 
                key={i} 
                className={`${getProbabilityColor(pred.probability)} border-2`}
              >
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{pred.condition}</span>
                  <Badge className={getProbabilityColor(pred.probability)}>
                    {pred.probability}% {t('biovault.riskEngine.probability', 'xác suất')}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-3">
                  <p className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('biovault.riskEngine.timeframe', 'Khung thời gian')}: <strong>{pred.timeframe}</strong>
                  </p>
                  
                  <div className="text-sm">
                    <p className="font-medium mb-1">{t('biovault.riskEngine.triggers', 'Yếu tố kích hoạt')}:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {pred.triggers.map((trigger, j) => (
                        <li key={j}>{trigger}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-background/50 text-sm">
                    <p className="font-medium flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-success" />
                      {t('biovault.riskEngine.recommendation', 'Khuyến nghị')}:
                    </p>
                    <p className="text-muted-foreground">{pred.recommendation}</p>
                  </div>

                  <Button size="sm" variant="outline" className="mt-2">
                    <Bell className="h-3 w-3 mr-2" />
                    {t('biovault.riskEngine.setReminder', 'Đặt nhắc nhở')}
                  </Button>
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
          </div>
        ) : (
          <div className="text-center py-8 text-success">
            <Activity className="h-12 w-12 mx-auto mb-3" />
            <p className="font-medium">{t('biovault.riskEngine.noRisks', 'Không phát hiện rủi ro cao')}</p>
            <p className="text-sm text-muted-foreground">
              {t('biovault.riskEngine.noRisksDesc', 'Điều kiện môi trường hiện tại phù hợp với hồ sơ sức khỏe của bạn')}
            </p>
          </div>
        )}

        {/* Risk Trend Chart */}
        {showFullDashboard && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t('biovault.riskEngine.riskTrend', 'Xu hướng rủi ro 24h')}
            </h4>
            
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
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
                    dataKey="risk" 
                    stroke="hsl(var(--warning))" 
                    fill="url(#riskGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pattern Formula Display */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border">
          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {t('biovault.riskEngine.formula', 'Công thức phát hiện quy luật')}
          </h5>
          <code className="text-xs text-muted-foreground block">
            IF (Pressure &lt; 1010 hPa) + (Humidity &gt; 85%) + (User has cardiovascular history)
            <br />
            → TRIGGER "Personalized Cardiovascular Risk Alert"
          </code>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Timer, CheckCircle2, X, Heart, Brain, Wind,
  Cloud, Droplets, ThermometerSun, Sun, Moon,
  Sunrise, Sunset, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Crown, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { toast } from 'sonner';
import type { UserHealthProfile } from '@/pages/BioVault';

interface SimulationTimelineProps {
  profile: UserHealthProfile | null;
  onComplete: (data: any) => void;
  onCancel: () => void;
}

interface ForecastPoint {
  hour: number;
  time: string;
  pressure: number;
  humidity: number;
  temperature: number;
  heartRisk: number;
  sinusRisk: number;
  overallHealth: number;
  period: 'night' | 'morning' | 'afternoon' | 'evening';
}

export const SimulationTimeline: React.FC<SimulationTimelineProps> = ({ 
  profile, 
  onComplete, 
  onCancel 
}) => {
  const { t, i18n } = useTranslation();
  const [currentHour, setCurrentHour] = useState([0]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);

  // Generate 24h forecast data
  useEffect(() => {
    const generateForecast = () => {
      const now = new Date();
      const data: ForecastPoint[] = [];

      for (let i = 0; i < 24; i++) {
        const hour = (now.getHours() + i) % 24;
        
        // Simulate realistic weather patterns
        const isNight = hour >= 22 || hour < 6;
        const isMorning = hour >= 6 && hour < 12;
        const isAfternoon = hour >= 12 && hour < 18;
        
        // Pressure drops in evening, rises in morning
        const basePressure = 1008;
        const pressureVariation = isMorning ? 3 : isAfternoon ? -2 : -4;
        const pressure = basePressure + pressureVariation + (Math.random() - 0.5) * 2;

        // Humidity peaks at night and early morning
        const baseHumidity = 75;
        const humidityVariation = isNight ? 15 : isMorning ? 10 : -5;
        const humidity = Math.min(95, baseHumidity + humidityVariation + Math.random() * 5);

        // Temperature peaks in afternoon
        const baseTemp = 28;
        const tempVariation = isAfternoon ? 6 : isMorning ? 2 : -2;
        const temperature = baseTemp + tempVariation + Math.random() * 2;

        // Calculate risks based on profile
        const hasCardio = profile?.chronicConditions.some(c => 
          c.toLowerCase().includes('hypertension')
        );
        const hasSinus = profile?.chronicConditions.some(c => 
          c.toLowerCase().includes('sinusitis')
        );

        const heartRisk = hasCardio 
          ? Math.min(95, 40 + (pressure < 1008 ? 25 : 0) + (humidity > 85 ? 20 : 0) + Math.random() * 10)
          : 20 + Math.random() * 15;

        const sinusRisk = hasSinus
          ? Math.min(90, 35 + (Math.abs(1010 - pressure) * 3) + (humidity > 80 ? 15 : 0) + Math.random() * 10)
          : 15 + Math.random() * 10;

        const overallHealth = Math.max(30, 100 - (heartRisk * 0.4 + sinusRisk * 0.3 + Math.random() * 10));

        data.push({
          hour: i,
          time: `${hour.toString().padStart(2, '0')}:00`,
          pressure,
          humidity,
          temperature,
          heartRisk,
          sinusRisk,
          overallHealth,
          period: isNight ? 'night' : isMorning ? 'morning' : isAfternoon ? 'afternoon' : 'evening'
        });
      }

      return data;
    };

    setTimeout(() => {
      setForecast(generateForecast());
      setIsGenerating(false);
    }, 2000);
  }, [profile]);

  const selectedPoint = forecast[currentHour[0]] || forecast[0];

  const getPeriodIcon = (period: string) => {
    switch (period) {
      case 'night': return Moon;
      case 'morning': return Sunrise;
      case 'afternoon': return Sun;
      case 'evening': return Sunset;
      default: return Sun;
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-danger';
    if (risk >= 50) return 'text-warning';
    return 'text-success';
  };

  const getRiskBg = (risk: number) => {
    if (risk >= 70) return 'bg-danger/10 border-danger/30';
    if (risk >= 50) return 'bg-warning/10 border-warning/30';
    return 'bg-success/10 border-success/30';
  };

  const handleComplete = () => {
    toast.success(t('biovault.tasks.simulation.success', 'Timeline đã được kích hoạt'), {
      description: t('biovault.tasks.simulation.description', 'Bạn có thể xem trạng thái cơ thể trong 24h tới')
    });
    onComplete({
      forecast,
      generatedAt: new Date().toISOString()
    });
  };

  if (isGenerating) {
    return (
      <Card className="mt-4 border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-card to-transparent">
        <CardContent className="py-12 text-center">
          <div className="relative mx-auto w-24 h-24">
            <Timer className="h-24 w-24 text-primary animate-spin" />
          </div>
          <p className="text-sm text-primary font-medium mt-4">
            {t('biovault.tasks.simulation.generating', 'Đang tạo dự báo 24 giờ...')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const PeriodIcon = selectedPoint ? getPeriodIcon(selectedPoint.period) : Sun;

  return (
    <Card className="mt-4 border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-card to-amber-500/5 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="h-5 w-5 text-primary" />
            {t('biovault.tasks.simulation.title', 'Simulation Timeline')}
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timeline Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('biovault.tasks.simulation.now', 'Hiện tại')}</span>
            <span className="font-medium text-foreground flex items-center gap-2">
              <PeriodIcon className="h-4 w-4" />
              {selectedPoint?.time || '--:--'}
            </span>
            <span className="text-muted-foreground">+24h</span>
          </div>
          <Slider
            value={currentHour}
            onValueChange={setCurrentHour}
            max={23}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {['00:00', '06:00', '12:00', '18:00', '24:00'].map((time, i) => (
              <span key={i}>{time}</span>
            ))}
          </div>
        </div>

        {/* Weather Forecast */}
        {selectedPoint && (
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded-xl text-center border ${selectedPoint.pressure < 1008 ? 'border-warning bg-warning/10' : 'border-border bg-muted/50'}`}>
              <Cloud className={`h-4 w-4 mx-auto ${selectedPoint.pressure < 1008 ? 'text-warning' : 'text-primary'}`} />
              <p className="text-xs text-muted-foreground mt-1">{t('biovault.env.pressure', 'Áp suất')}</p>
              <p className={`font-bold text-sm ${selectedPoint.pressure < 1008 ? 'text-warning' : 'text-foreground'}`}>
                {selectedPoint.pressure.toFixed(0)} hPa
              </p>
            </div>
            <div className={`p-2 rounded-xl text-center border ${selectedPoint.humidity > 85 ? 'border-warning bg-warning/10' : 'border-border bg-muted/50'}`}>
              <Droplets className={`h-4 w-4 mx-auto ${selectedPoint.humidity > 85 ? 'text-warning' : 'text-info'}`} />
              <p className="text-xs text-muted-foreground mt-1">{t('biovault.env.humidity', 'Độ ẩm')}</p>
              <p className={`font-bold text-sm ${selectedPoint.humidity > 85 ? 'text-warning' : 'text-foreground'}`}>
                {selectedPoint.humidity.toFixed(0)}%
              </p>
            </div>
            <div className="p-2 rounded-xl text-center border border-border bg-muted/50">
              <ThermometerSun className="h-4 w-4 mx-auto text-danger" />
              <p className="text-xs text-muted-foreground mt-1">{t('biovault.env.temp', 'Nhiệt độ')}</p>
              <p className="font-bold text-sm text-foreground">{selectedPoint.temperature.toFixed(0)}°C</p>
            </div>
          </div>
        )}

        {/* Body State Preview */}
        {selectedPoint && (
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-3 rounded-xl text-center border ${getRiskBg(selectedPoint.heartRisk)}`}>
              <Heart className={`h-5 w-5 mx-auto ${getRiskColor(selectedPoint.heartRisk)}`} />
              <p className="text-xs text-muted-foreground mt-1">{t('biovault.simulation.heart', 'Tim mạch')}</p>
              <p className={`text-xl font-bold ${getRiskColor(selectedPoint.heartRisk)}`}>
                {selectedPoint.heartRisk.toFixed(0)}%
              </p>
              <Badge variant="outline" className={`text-[10px] ${getRiskColor(selectedPoint.heartRisk)}`}>
                {selectedPoint.heartRisk >= 70 ? 'Cao' : selectedPoint.heartRisk >= 50 ? 'TB' : 'Thấp'}
              </Badge>
            </div>
            <div className={`p-3 rounded-xl text-center border ${getRiskBg(selectedPoint.sinusRisk)}`}>
              <Wind className={`h-5 w-5 mx-auto ${getRiskColor(selectedPoint.sinusRisk)}`} />
              <p className="text-xs text-muted-foreground mt-1">{t('biovault.simulation.sinus', 'Xoang')}</p>
              <p className={`text-xl font-bold ${getRiskColor(selectedPoint.sinusRisk)}`}>
                {selectedPoint.sinusRisk.toFixed(0)}%
              </p>
              <Badge variant="outline" className={`text-[10px] ${getRiskColor(selectedPoint.sinusRisk)}`}>
                {selectedPoint.sinusRisk >= 70 ? 'Cao' : selectedPoint.sinusRisk >= 50 ? 'TB' : 'Thấp'}
              </Badge>
            </div>
            <div className={`p-3 rounded-xl text-center border ${getRiskBg(100 - selectedPoint.overallHealth)}`}>
              <Brain className={`h-5 w-5 mx-auto ${selectedPoint.overallHealth >= 70 ? 'text-success' : selectedPoint.overallHealth >= 50 ? 'text-warning' : 'text-danger'}`} />
              <p className="text-xs text-muted-foreground mt-1">{t('biovault.simulation.overall', 'Tổng thể')}</p>
              <p className={`text-xl font-bold ${selectedPoint.overallHealth >= 70 ? 'text-success' : selectedPoint.overallHealth >= 50 ? 'text-warning' : 'text-danger'}`}>
                {selectedPoint.overallHealth.toFixed(0)}%
              </p>
              <Badge variant="outline" className={`text-[10px] ${selectedPoint.overallHealth >= 70 ? 'text-success' : selectedPoint.overallHealth >= 50 ? 'text-warning' : 'text-danger'}`}>
                {selectedPoint.overallHealth >= 70 ? 'Tốt' : selectedPoint.overallHealth >= 50 ? 'TB' : 'Kém'}
              </Badge>
            </div>
          </div>
        )}

        {/* 24h Risk Chart */}
        <div className="h-40 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast}>
              <defs>
                <linearGradient id="heartRiskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--danger))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--danger))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="sinusRiskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={5} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <ReferenceLine x={selectedPoint?.time} stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" />
              <Area 
                type="monotone" 
                dataKey="heartRisk" 
                stroke="hsl(var(--danger))" 
                fill="url(#heartRiskGradient)"
                name={t('biovault.simulation.heart', 'Tim mạch')}
              />
              <Area 
                type="monotone" 
                dataKey="sinusRisk" 
                stroke="hsl(var(--warning))" 
                fill="url(#sinusRiskGradient)"
                name={t('biovault.simulation.sinus', 'Xoang')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Risk Warning */}
        {forecast.length > 0 && (
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">{t('biovault.simulation.peakRisk', 'Thời điểm rủi ro cao nhất')}:</p>
            <div className="flex items-center gap-4">
              {(() => {
                const peakHeart = forecast.reduce((max, p) => p.heartRisk > max.heartRisk ? p : max, forecast[0]);
                const peakSinus = forecast.reduce((max, p) => p.sinusRisk > max.sinusRisk ? p : max, forecast[0]);
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-danger" />
                      <span className="text-sm font-medium">{peakHeart.time}</span>
                      <Badge variant="destructive" className="text-xs">{peakHeart.heartRisk.toFixed(0)}%</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium">{peakSinus.time}</span>
                      <Badge className="bg-warning text-white text-xs">{peakSinus.sinusRisk.toFixed(0)}%</Badge>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <Button onClick={handleComplete} className="w-full">
          <Zap className="h-4 w-4 mr-2" />
          {t('biovault.tasks.simulation.activate', 'Kích hoạt Timeline')}
        </Button>
      </CardContent>
    </Card>
  );
};

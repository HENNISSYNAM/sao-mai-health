import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Shield, Wind, Gauge, Thermometer, 
  MapPin, ArrowRight, Activity 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrokeRiskEngine } from '@/hooks/useStrokeRiskEngine';

export function DiseaseIntelligenceSummary() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const initRef = useRef(false);

  const {
    userData,
    environment,
    riskAssessment,
    isLoading,
    envLoading,
    fetchGPS,
    fetchEnvironment,
  } = useStrokeRiskEngine();

  // One-shot fetch: get GPS then environment data once
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    (async () => {
      const gps = await fetchGPS();
      if (gps) {
        await fetchEnvironment(gps.lat, gps.lon);
      }
    })();
  }, []);

  const loading = isLoading || envLoading;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return { text: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', label: isVi ? 'Cao' : 'High' };
      case 'MEDIUM': return { text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', label: isVi ? 'TB' : 'Med' };
      default: return { text: 'text-success', bg: 'bg-success/10', border: 'border-success/30', label: isVi ? 'Thấp' : 'Low' };
    }
  };

  const getAqiColor = (aqi: number | null) => {
    if (!aqi) return { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted', label: '--' };
    if (aqi <= 50) return { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-300 dark:border-emerald-700', label: isVi ? 'Tốt' : 'Good' };
    if (aqi <= 100) return { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-300 dark:border-amber-700', label: isVi ? 'TB' : 'Fair' };
    if (aqi <= 150) return { text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-300 dark:border-orange-700', label: isVi ? 'Kém' : 'Poor' };
    return { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300 dark:border-red-700', label: isVi ? 'Xấu' : 'Bad' };
  };

  const risk = getRiskColor(riskAssessment.risk_level);
  const aqiInfo = getAqiColor(environment.aqi);

  const topRiskFactors = useMemo(() => {
    const factors: string[] = [];
    if (environment.aqi && environment.aqi > 100)
      factors.push(isVi ? 'Ô nhiễm không khí cao' : 'High air pollution');
    if (environment.temperature && environment.temperature > 35)
      factors.push(isVi ? 'Nhiệt độ cao' : 'High temperature');
    if (environment.humidity && environment.humidity > 80)
      factors.push(isVi ? 'Độ ẩm cao' : 'High humidity');
    if (environment.pressure && (environment.pressure < 990 || environment.pressure > 1020))
      factors.push(isVi ? 'Áp suất bất thường' : 'Abnormal pressure');
    return factors.slice(0, 3);
  }, [environment, isVi]);

  const gpsAccuracyLabel = useMemo(() => {
    if (!userData.gpsAccuracy) return null;
    if (userData.gpsAccuracy <= 20) return isVi ? 'Tốt' : 'Good';
    if (userData.gpsAccuracy <= 50) return isVi ? 'Khá' : 'Fair';
    return isVi ? 'Kém' : 'Poor';
  }, [userData.gpsAccuracy, isVi]);

  if (loading && !environment.temperature) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </Card>
    );
  }

  const kpis = [
    {
      icon: Shield,
      label: isVi ? 'Rủi ro' : 'Risk',
      value: `${riskAssessment.risk_score}`,
      unit: '/100',
      badge: risk.label,
      colorText: risk.text,
      colorBg: risk.bg,
      borderColor: risk.border,
    },
    {
      icon: Wind,
      label: 'AQI',
      value: environment.aqi != null ? `${environment.aqi}` : '--',
      badge: aqiInfo.label,
      colorText: aqiInfo.text,
      colorBg: aqiInfo.bg,
      borderColor: aqiInfo.border,
    },
    {
      icon: Gauge,
      label: isVi ? 'Áp suất' : 'Pressure',
      value: environment.pressure != null ? `${Math.round(environment.pressure)}` : '--',
      unit: 'hPa',
      colorText: 'text-purple-500',
      colorBg: 'bg-purple-500/10',
    },
    {
      icon: Thermometer,
      label: isVi ? 'Nhiệt độ' : 'Temp',
      value: environment.temperature != null ? `${environment.temperature.toFixed(1)}°` : '--',
      badge: environment.humidity != null ? `💧${Math.round(environment.humidity)}%` : undefined,
      colorText: 'text-orange-500',
      colorBg: 'bg-orange-500/10',
    },
  ];

  return (
    <Card className="p-4 space-y-3 border-2 border-primary/10 bg-gradient-to-br from-primary/[0.02] to-transparent">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm truncate">
            {isVi ? 'Tình báo Dịch tễ' : 'Disease Intelligence'}
          </h3>
          <Badge variant="outline" className={cn("text-[10px] shrink-0", risk.text, risk.border)}>
            {risk.label}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1 shrink-0 text-primary"
          onClick={() => navigate('/stroke-risk')}
        >
          {isVi ? 'Chi tiết' : 'Details'}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              "rounded-xl p-3 border transition-colors",
              kpi.colorBg,
              kpi.borderColor || 'border-transparent'
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <kpi.icon className={cn("h-3.5 w-3.5", kpi.colorText)} />
              <span className="text-[11px] text-muted-foreground font-medium">{kpi.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn("text-lg font-bold", kpi.colorText)}>{kpi.value}</span>
              {kpi.unit && <span className="text-[10px] text-muted-foreground">{kpi.unit}</span>}
            </div>
            {kpi.badge && (
              <span className={cn("text-[10px] font-medium", kpi.colorText)}>{kpi.badge}</span>
            )}
          </div>
        ))}
      </div>

      {/* Top risk factors — only show when risk is not LOW */}
      {topRiskFactors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topRiskFactors.map(factor => (
            <span
              key={factor}
              className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", risk.bg, risk.text, `border ${risk.border}`)}
            >
              {factor}
            </span>
          ))}
        </div>
      )}

      {/* GPS Location */}
      {userData.gps && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {userData.gps.lat.toFixed(4)}, {userData.gps.lon.toFixed(4)}
          </span>
          {gpsAccuracyLabel && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
              gpsAccuracyLabel === (isVi ? 'Tốt' : 'Good') ? 'bg-success/10 text-success' :
              gpsAccuracyLabel === (isVi ? 'Khá' : 'Fair') ? 'bg-warning/10 text-warning' :
              'bg-destructive/10 text-destructive'
            )}>
              {isVi ? 'GPS:' : 'GPS:'} {gpsAccuracyLabel} (±{Math.round(userData.gpsAccuracy!)}m)
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

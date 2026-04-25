import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { 
  Activity, Wind, Thermometer, Droplets, Gauge,
  AlertTriangle, TrendingUp, TrendingDown, MapPin, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskStatsPanelProps {
  stats: {
    totalZones: number;
    highRiskZones: number;
    criticalZones?: number;
    avgAqi: number;
    avgTemperature: number;
    avgHumidity: number;
    avgPressure: number;
    lastUpdate: string;
  };
  className?: string;
}

const RiskStatsPanel: React.FC<RiskStatsPanelProps> = ({ stats, className }) => {
  const { t } = useTranslation();

  const getAqiStatus = (aqi: number) => {
    if (aqi <= 50) return { label: t('epiIntel.kpi.aqiGood'), color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' };
    if (aqi <= 100) return { label: t('epiIntel.kpi.aqiModerate'), color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' };
    if (aqi <= 150) return { label: t('epiIntel.kpi.aqiUnhealthy'), color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/30' };
    return { label: t('epiIntel.kpi.aqiBad'), color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30' };
  };

  const getTempStatus = (temp: number) => {
    if (temp <= 25) return { label: t('epiIntel.statsPanel.tempCool'), color: 'text-info' };
    if (temp <= 30) return { label: t('epiIntel.statsPanel.tempWarm'), color: 'text-success' };
    if (temp <= 35) return { label: t('epiIntel.statsPanel.tempHot'), color: 'text-warning' };
    return { label: t('epiIntel.statsPanel.tempVeryHot'), color: 'text-danger' };
  };

  const aqiStatus = getAqiStatus(stats.avgAqi);
  const tempStatus = getTempStatus(stats.avgTemperature);

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-2 border-border hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t('epiIntel.statsPanel.zones')}</span>
        </div>
        <div className="text-2xl font-bold">{stats.totalZones}</div>
        <div className="flex items-center gap-1 mt-1">
          <Activity className="h-3 w-3 text-success" />
          <span className="text-[10px] text-muted-foreground">{t('epiIntel.statsPanel.monitoring')}</span>
        </div>
      </Card>

      <Card className={cn(
        "p-4 border-2 transition-colors",
        stats.highRiskZones > 0 
          ? "bg-gradient-to-br from-danger/10 to-transparent border-danger/30" 
          : "bg-gradient-to-br from-success/5 to-transparent border-border"
      )}>
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-2 rounded-lg", stats.highRiskZones > 0 ? "bg-danger/20" : "bg-success/10")}>
            <AlertTriangle className={cn("h-4 w-4", stats.highRiskZones > 0 ? "text-danger" : "text-success")} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t('epiIntel.statsPanel.highRisk')}</span>
        </div>
        <div className={cn("text-2xl font-bold", stats.highRiskZones > 0 && "text-danger")}>
          {stats.highRiskZones}
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "mt-1 text-[10px]",
            stats.highRiskZones > 0 ? "border-danger/50 text-danger" : "border-success/50 text-success"
          )}
        >
          {stats.highRiskZones > 0 ? t('epiIntel.statsPanel.needsAttention') : t('epiIntel.statsPanel.safe')}
        </Badge>
      </Card>

      <Card className={cn("p-4 border-2", aqiStatus.bg, aqiStatus.border)}>
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-2 rounded-lg", aqiStatus.bg)}>
            <Wind className={cn("h-4 w-4", aqiStatus.color)} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t('epiIntel.statsPanel.airQuality')}</span>
        </div>
        <div className={cn("text-2xl font-bold", aqiStatus.color)}>
          {stats.avgAqi.toFixed(0)}
        </div>
        <Badge variant="outline" className={cn("mt-1 text-[10px]", aqiStatus.color, aqiStatus.border)}>
          AQI - {aqiStatus.label}
        </Badge>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-secondary/5 to-transparent border-2 border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-secondary/10">
            <Thermometer className="h-4 w-4 text-secondary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t('epiIntel.statsPanel.temperature')}</span>
        </div>
        <div className="text-2xl font-bold">{stats.avgTemperature.toFixed(1)}°</div>
        <div className="flex items-center gap-1 mt-1">
          {stats.avgTemperature > 32 ? (
            <TrendingUp className="h-3 w-3 text-danger" />
          ) : (
            <TrendingDown className="h-3 w-3 text-info" />
          )}
          <span className={cn("text-[10px]", tempStatus.color)}>{tempStatus.label}</span>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-info/5 to-transparent border-2 border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-info/10">
            <Droplets className="h-4 w-4 text-info" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t('epiIntel.statsPanel.humidityLabel')}</span>
        </div>
        <div className="text-2xl font-bold">{stats.avgHumidity.toFixed(0)}%</div>
        <span className="text-[10px] text-muted-foreground">
          {stats.avgHumidity > 80 ? t('epiIntel.statsPanel.humidityHigh') : stats.avgHumidity > 60 ? t('epiIntel.statsPanel.humidityMedium') : t('epiIntel.statsPanel.humidityLow')}
        </span>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-transparent border-2 border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Gauge className="h-4 w-4 text-purple-500" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t('epiIntel.statsPanel.pressureLabel')}</span>
        </div>
        <div className="text-2xl font-bold">{stats.avgPressure.toFixed(0)}</div>
        <span className="text-[10px] text-muted-foreground">hPa</span>
      </Card>
    </div>
  );
};

export default RiskStatsPanel;

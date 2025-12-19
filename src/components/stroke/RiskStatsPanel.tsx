import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Wind, 
  Thermometer, 
  Droplets, 
  Gauge,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskStatsPanelProps {
  stats: {
    totalZones: number;
    highRiskZones: number;
    avgAqi: number;
    avgTemperature: number;
    avgHumidity: number;
    avgPressure: number;
    lastUpdate: string;
  };
  className?: string;
}

const RiskStatsPanel: React.FC<RiskStatsPanelProps> = ({ stats, className }) => {
  const getAqiStatus = (aqi: number) => {
    if (aqi <= 50) return { label: 'Tốt', color: 'text-success', bg: 'bg-success/10' };
    if (aqi <= 100) return { label: 'TB', color: 'text-warning', bg: 'bg-warning/10' };
    if (aqi <= 150) return { label: 'Kém', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { label: 'Xấu', color: 'text-danger', bg: 'bg-danger/10' };
  };

  const aqiStatus = getAqiStatus(stats.avgAqi);

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3", className)}>
      {/* Total Zones */}
      <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Khu vực</span>
        </div>
        <div className="text-2xl font-bold">{stats.totalZones}</div>
        <Badge variant="secondary" className="mt-1 text-[10px]">
          Đang theo dõi
        </Badge>
      </Card>

      {/* High Risk Zones */}
      <Card className={cn(
        "p-3 border-border/50",
        stats.highRiskZones > 0 ? "bg-danger/5" : "bg-card/50 backdrop-blur-sm"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className={cn("h-4 w-4", stats.highRiskZones > 0 ? "text-danger" : "text-muted-foreground")} />
          <span className="text-xs text-muted-foreground">Nguy cơ cao</span>
        </div>
        <div className={cn("text-2xl font-bold", stats.highRiskZones > 0 && "text-danger")}>
          {stats.highRiskZones}
        </div>
        <Badge variant={stats.highRiskZones > 0 ? "destructive" : "secondary"} className="mt-1 text-[10px]">
          {stats.highRiskZones > 0 ? 'Cần chú ý' : 'An toàn'}
        </Badge>
      </Card>

      {/* AQI */}
      <Card className={cn("p-3 border-border/50", aqiStatus.bg)}>
        <div className="flex items-center gap-2 mb-1">
          <Wind className={cn("h-4 w-4", aqiStatus.color)} />
          <span className="text-xs text-muted-foreground">AQI TB</span>
        </div>
        <div className={cn("text-2xl font-bold", aqiStatus.color)}>
          {stats.avgAqi.toFixed(0)}
        </div>
        <Badge variant="outline" className={cn("mt-1 text-[10px]", aqiStatus.color)}>
          {aqiStatus.label}
        </Badge>
      </Card>

      {/* Temperature */}
      <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Thermometer className="h-4 w-4 text-orange-500" />
          <span className="text-xs text-muted-foreground">Nhiệt độ</span>
        </div>
        <div className="text-2xl font-bold">
          {stats.avgTemperature.toFixed(1)}°
        </div>
        <div className="flex items-center gap-1 mt-1">
          {stats.avgTemperature > 33 ? (
            <TrendingUp className="h-3 w-3 text-danger" />
          ) : (
            <TrendingDown className="h-3 w-3 text-info" />
          )}
          <span className="text-[10px] text-muted-foreground">
            {stats.avgTemperature > 33 ? 'Nóng' : stats.avgTemperature > 28 ? 'Ấm' : 'Mát'}
          </span>
        </div>
      </Card>

      {/* Humidity */}
      <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Droplets className="h-4 w-4 text-info" />
          <span className="text-xs text-muted-foreground">Độ ẩm</span>
        </div>
        <div className="text-2xl font-bold">{stats.avgHumidity.toFixed(0)}%</div>
        <span className="text-[10px] text-muted-foreground">
          {stats.avgHumidity > 80 ? 'Cao' : stats.avgHumidity > 60 ? 'TB' : 'Thấp'}
        </span>
      </Card>

      {/* Pressure */}
      <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="h-4 w-4 text-purple-500" />
          <span className="text-xs text-muted-foreground">Áp suất</span>
        </div>
        <div className="text-2xl font-bold">{stats.avgPressure.toFixed(0)}</div>
        <span className="text-[10px] text-muted-foreground">hPa</span>
      </Card>
    </div>
  );
};

export default RiskStatsPanel;

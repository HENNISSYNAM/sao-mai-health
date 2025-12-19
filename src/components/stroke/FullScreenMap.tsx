import React from 'react';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment } from '@/hooks/useStrokeRiskEngine';
import { Thermometer, Wind, Gauge, Droplets, MapPin, Navigation } from 'lucide-react';

interface FullScreenMapProps {
  gps: { lat: number; lon: number } | null;
  environment: EnvironmentData;
  riskAssessment: RiskAssessment;
  isBlurred?: boolean;
  className?: string;
}

const FullScreenMap: React.FC<FullScreenMapProps> = ({
  gps,
  environment,
  riskAssessment,
  isBlurred = false,
  className
}) => {
  const lat = gps?.lat || 10.7769;
  const lon = gps?.lon || 106.7009;

  // Risk zone styling
  const getRiskGlow = (level: string) => {
    switch (level) {
      case 'HIGH': return 'shadow-[0_0_120px_60px_rgba(239,68,68,0.5)]';
      case 'MEDIUM': return 'shadow-[0_0_100px_50px_rgba(245,158,11,0.4)]';
      default: return 'shadow-[0_0_80px_40px_rgba(34,197,94,0.3)]';
    }
  };

  const getRiskBorder = (level: string) => {
    switch (level) {
      case 'HIGH': return 'border-red-500';
      case 'MEDIUM': return 'border-amber-500';
      default: return 'border-emerald-500';
    }
  };

  // Windy embed URL with location
  const windyUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=11&overlay=pm25&product=cams&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&marker=true&message=true`;

  return (
    <div className={cn(
      "absolute inset-0 transition-all duration-700 overflow-hidden",
      isBlurred && "scale-[1.02] brightness-[0.3] blur-sm",
      className
    )}>
      {/* Windy Map Embed */}
      <iframe
        src={windyUrl}
        className="absolute inset-0 w-full h-full border-0"
        style={{ minHeight: '100vh', minWidth: '100vw' }}
        allow="geolocation"
        title="Windy Weather Map"
      />

      {/* Dark gradient overlay for better UI visibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30 pointer-events-none" />

      {/* Risk zone overlay */}
      {gps && !isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {/* Risk zone circle */}
          <div className={cn(
            "absolute rounded-full border-2 border-dashed transition-all duration-1000 animate-pulse",
            getRiskBorder(riskAssessment.risk_level),
            getRiskGlow(riskAssessment.risk_level),
            riskAssessment.risk_level === 'HIGH' ? 'w-80 h-80' :
            riskAssessment.risk_level === 'MEDIUM' ? 'w-64 h-64' : 'w-48 h-48'
          )} />
          
          {/* Center marker */}
          <div className="relative z-20">
            <div className="w-5 h-5 bg-blue-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
          
          {/* Coordinate display */}
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-4 py-2 bg-card/95 backdrop-blur-xl rounded-full border border-border/50 shadow-2xl">
              <Navigation className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-mono text-foreground">
                {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Weather overlay widgets */}
      {!isBlurred && (
        <div className="absolute top-4 left-4 flex flex-col gap-3 z-20">
          {/* Temperature Card */}
          {environment.temperature !== null && (
            <div className="px-5 py-4 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl min-w-[140px] animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Thermometer className="h-4 w-4 text-orange-400" />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Nhiệt độ</span>
              </div>
              <div className="text-4xl font-bold text-foreground">{environment.temperature?.toFixed(0)}<span className="text-2xl">°C</span></div>
            </div>
          )}

          {/* Air Quality Card */}
          {environment.aqi !== null && (
            <div className={cn(
              "px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl min-w-[140px] animate-fade-in",
              environment.aqi > 150 ? "bg-red-500/90 border-red-400" :
              environment.aqi > 100 ? "bg-amber-500/90 border-amber-400" :
              environment.aqi > 50 ? "bg-yellow-500/90 border-yellow-400" :
              "bg-emerald-500/90 border-emerald-400"
            )} style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-white/20">
                  <Wind className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs text-white/80 uppercase tracking-wider font-medium">Chất lượng KK</span>
              </div>
              <div className="text-4xl font-bold text-white">{environment.aqi}</div>
              <div className="text-sm font-medium mt-1 text-white/90">
                {environment.aqi <= 50 ? 'Tốt' : 
                 environment.aqi <= 100 ? 'Trung bình' :
                 environment.aqi <= 150 ? 'Nhạy cảm' : 'Không tốt'}
              </div>
            </div>
          )}

          {/* Pressure Card */}
          {environment.pressure !== null && (
            <div className="px-5 py-4 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl min-w-[140px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-teal-500/20">
                  <Gauge className="h-4 w-4 text-teal-400" />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Áp suất</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{environment.pressure?.toFixed(0)} <span className="text-lg font-normal text-muted-foreground">hPa</span></div>
            </div>
          )}

          {/* Humidity Card */}
          {environment.humidity !== null && (
            <div className="px-5 py-4 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl min-w-[140px] animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Droplets className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Độ ẩm</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{environment.humidity?.toFixed(0)}<span className="text-lg">%</span></div>
            </div>
          )}
        </div>
      )}

      {/* Data source label */}
      {!isBlurred && (
        <div className="absolute bottom-4 left-4 px-4 py-2 bg-card/90 backdrop-blur-md rounded-xl border border-border/30 z-20">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Data • Windy.com
          </span>
        </div>
      )}

      {/* Location badge */}
      {!isBlurred && gps && (
        <div className="absolute top-4 right-4 px-4 py-2 bg-card/90 backdrop-blur-md rounded-xl border border-border/30 z-20">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="h-3 w-3 text-blue-400" />
            Vị trí của bạn
          </span>
        </div>
      )}
    </div>
  );
};

export default FullScreenMap;

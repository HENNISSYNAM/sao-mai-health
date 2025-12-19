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
  // Risk zone color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-danger/30 border-danger';
      case 'MEDIUM': return 'bg-warning/30 border-warning';
      default: return 'bg-success/30 border-success';
    }
  };

  const getRiskGlow = (level: string) => {
    switch (level) {
      case 'HIGH': return 'shadow-[0_0_100px_50px_rgba(239,68,68,0.3)]';
      case 'MEDIUM': return 'shadow-[0_0_80px_40px_rgba(245,158,11,0.25)]';
      default: return 'shadow-[0_0_60px_30px_rgba(34,197,94,0.2)]';
    }
  };

  // Use OpenStreetMap static tile (no API key needed)
  const lat = gps?.lat || 10.7769;
  const lon = gps?.lon || 106.7009;
  const zoom = gps ? 13 : 11;

  return (
    <div className={cn(
      "absolute inset-0 transition-all duration-700 overflow-hidden",
      isBlurred && "scale-[1.02] brightness-[0.4]",
      className
    )}>
      {/* Map Background - Dark themed with gradient */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: `
            linear-gradient(135deg, 
              hsl(210 40% 8%) 0%, 
              hsl(210 50% 12%) 30%,
              hsl(199 40% 15%) 70%,
              hsl(210 40% 10%) 100%
            )
          `
        }}
      />
      
      {/* Map grid pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{ 
          backgroundImage: `
            radial-gradient(circle at ${50 + (lon - 106.7) * 10}% ${50 - (lat - 10.77) * 10}%, 
              rgba(59, 130, 246, 0.4) 0%, 
              transparent 50%
            ),
            linear-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px'
        }}
      />
      
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/60" />

      {/* Animated grid overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* GPS Location Indicator */}
      {gps && !isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Risk zone circle */}
          <div className={cn(
            "absolute rounded-full border-2 border-dashed transition-all duration-1000",
            getRiskColor(riskAssessment.risk_level),
            getRiskGlow(riskAssessment.risk_level),
            riskAssessment.risk_level === 'HIGH' ? 'w-80 h-80' :
            riskAssessment.risk_level === 'MEDIUM' ? 'w-64 h-64' : 'w-48 h-48'
          )} style={{ animation: 'pulse 3s infinite' }} />
          
          {/* Pulse rings */}
          <div className="absolute w-32 h-32 rounded-full border border-info/50 animate-ping" />
          <div className="absolute w-24 h-24 rounded-full border-2 border-info/30 animate-pulse" />
          
          {/* Center marker */}
          <div className="relative">
            <div className="w-6 h-6 bg-info rounded-full border-4 border-white shadow-2xl flex items-center justify-center">
              <Navigation className="h-3 w-3 text-white" />
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs bg-card/90 px-3 py-1 rounded-full text-muted-foreground border border-border/50 shadow-lg">
                {gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Weather overlay widgets - Enhanced */}
      {!isBlurred && (
        <div className="absolute top-4 left-4 flex flex-col gap-3 z-10">
          {/* Temperature Card */}
          {environment.temperature !== null && (
            <div className="px-5 py-4 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl min-w-[140px] animate-fade-in">
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
              environment.aqi > 150 ? "bg-danger/30 border-danger/50" :
              environment.aqi > 100 ? "bg-warning/30 border-warning/50" :
              environment.aqi > 50 ? "bg-yellow-500/20 border-yellow-500/50" :
              "bg-success/20 border-success/50"
            )} style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  environment.aqi > 100 ? "bg-warning/30" : "bg-purple-500/20"
                )}>
                  <Wind className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Chất lượng KK</span>
              </div>
              <div className="text-4xl font-bold">{environment.aqi}</div>
              <div className={cn(
                "text-sm font-medium mt-1",
                environment.aqi <= 50 ? 'text-success' : 
                environment.aqi <= 100 ? 'text-yellow-500' :
                environment.aqi <= 150 ? 'text-warning' : 'text-danger'
              )}>
                {environment.aqi <= 50 ? 'Tốt' : 
                 environment.aqi <= 100 ? 'Trung bình' :
                 environment.aqi <= 150 ? 'Nhạy cảm' : 'Không tốt'}
              </div>
            </div>
          )}

          {/* Pressure Card */}
          {environment.pressure !== null && (
            <div className="px-5 py-4 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl min-w-[140px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
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
            <div className="px-5 py-4 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl min-w-[140px] animate-fade-in" style={{ animationDelay: '0.3s' }}>
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
        <div className="absolute bottom-4 right-4 px-4 py-2 bg-card/80 backdrop-blur-md rounded-xl border border-border/30 z-10">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live Data • Tomorrow.io • IQAir
          </span>
        </div>
      )}

      {/* Location badge */}
      {!isBlurred && gps && (
        <div className="absolute top-4 right-4 px-4 py-2 bg-card/80 backdrop-blur-md rounded-xl border border-border/30 z-10">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="h-3 w-3 text-info" />
            Vị trí của bạn
          </span>
        </div>
      )}
    </div>
  );
};

export default FullScreenMap;

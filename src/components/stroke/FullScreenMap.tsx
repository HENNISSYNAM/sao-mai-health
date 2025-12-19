import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment, GPSPoint } from '@/hooks/useStrokeRiskEngine';
import { Thermometer, Wind, Gauge, Droplets, MapPin, Navigation, Crosshair, Activity } from 'lucide-react';

interface FullScreenMapProps {
  gps: { lat: number; lon: number } | null;
  gpsHistory?: GPSPoint[];
  gpsAccuracy?: number | null;
  environment: EnvironmentData;
  riskAssessment: RiskAssessment;
  isBlurred?: boolean;
  isTracking?: boolean;
  devicePressure?: number | null;
  className?: string;
}

const FullScreenMap: React.FC<FullScreenMapProps> = ({
  gps,
  gpsHistory = [],
  gpsAccuracy,
  environment,
  riskAssessment,
  isBlurred = false,
  isTracking = false,
  devicePressure,
  className
}) => {
  const lat = gps?.lat || 10.7769;
  const lon = gps?.lon || 106.7009;

  // Get unique GPS points for display (deduplicate by rounding coordinates)
  const uniqueGPSPoints = useMemo(() => {
    const seen = new Set<string>();
    return gpsHistory.filter(point => {
      const key = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(-20); // Show last 20 unique points
  }, [gpsHistory]);

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

  // Display pressure - prefer device barometer, fallback to API
  const displayPressure = devicePressure || environment.pressure;

  // Windy embed URL with location and PM2.5 overlay
  const windyUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=13&overlay=pm25&product=cams&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&marker=true&message=true`;

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

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30 pointer-events-none" />

      {/* GPS Trail - show recent positions */}
      {!isBlurred && uniqueGPSPoints.length > 1 && (
        <div className="absolute inset-0 pointer-events-none z-5">
          {uniqueGPSPoints.slice(0, -1).map((point, index) => {
            const opacity = 0.3 + (index / uniqueGPSPoints.length) * 0.5;
            const size = 6 + (index / uniqueGPSPoints.length) * 4;
            return (
              <div
                key={point.id}
                className="absolute w-2 h-2 rounded-full bg-blue-400"
                style={{
                  left: `${50 + (point.lon - lon) * 100}%`,
                  top: `${50 - (point.lat - lat) * 100}%`,
                  opacity,
                  width: size,
                  height: size,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            );
          })}
        </div>
      )}

      {/* Risk zone overlay with current position */}
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
          
          {/* GPS Accuracy circle */}
          {gpsAccuracy && gpsAccuracy < 100 && (
            <div 
              className="absolute rounded-full border border-blue-400/30 bg-blue-400/10"
              style={{
                width: Math.min(gpsAccuracy * 2, 200),
                height: Math.min(gpsAccuracy * 2, 200)
              }}
            />
          )}
          
          {/* Center marker - current position */}
          <div className="relative z-20">
            <div className="w-6 h-6 bg-blue-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center animate-pulse">
              <Crosshair className="w-3 h-3 text-white" />
            </div>
            {/* Pulse animation */}
            <div className="absolute inset-0 w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-30" />
          </div>
          
          {/* Coordinate & accuracy display */}
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-card/95 backdrop-blur-xl rounded-full border border-border/50 shadow-2xl">
              <Navigation className="h-4 w-4 text-blue-400 animate-pulse" />
              <span className="text-sm font-mono text-foreground">
                {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}
              </span>
            </div>
            {gpsAccuracy && (
              <div className="text-xs text-muted-foreground bg-card/80 px-3 py-1 rounded-full">
                Độ chính xác: ±{gpsAccuracy.toFixed(0)}m
              </div>
            )}
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

          {/* Pressure Card - with barometer indicator */}
          {displayPressure !== null && (
            <div className="px-5 py-4 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl min-w-[140px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-teal-500/20">
                  <Gauge className="h-4 w-4 text-teal-400" />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Áp suất</span>
                {devicePressure && (
                  <span className="text-[10px] bg-teal-500/30 text-teal-300 px-1.5 py-0.5 rounded-full">
                    Barometer
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-foreground">{displayPressure?.toFixed(0)} <span className="text-lg font-normal text-muted-foreground">hPa</span></div>
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

      {/* Data source & tracking status */}
      {!isBlurred && (
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-20">
          <div className="px-4 py-2 bg-card/90 backdrop-blur-md rounded-xl border border-border/30">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Data • Windy • Tomorrow.io • OpenWeather
            </span>
          </div>
          {isTracking && (
            <div className="px-4 py-2 bg-blue-500/20 backdrop-blur-md rounded-xl border border-blue-500/30">
              <span className="text-xs text-blue-300 flex items-center gap-2">
                <Activity className="w-3 h-3 animate-pulse" />
                GPS Tracking Active • {gpsHistory?.length || 0} points
              </span>
            </div>
          )}
        </div>
      )}

      {/* Location badge */}
      {!isBlurred && gps && (
        <div className="absolute top-4 right-4 px-4 py-2 bg-card/90 backdrop-blur-md rounded-xl border border-border/30 z-20">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="h-3 w-3 text-blue-400" />
            Đang theo dõi vị trí
          </span>
        </div>
      )}
    </div>
  );
};

export default FullScreenMap;

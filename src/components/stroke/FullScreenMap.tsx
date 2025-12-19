import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment, GPSPoint } from '@/hooks/useStrokeRiskEngine';
import { Thermometer, Wind, Gauge, Droplets, Navigation, Crosshair, Activity, Radio, Sun } from 'lucide-react';

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
      case 'HIGH': return 'shadow-[0_0_120px_60px_rgba(239,68,68,0.4)]';
      case 'MEDIUM': return 'shadow-[0_0_100px_50px_rgba(245,158,11,0.3)]';
      default: return 'shadow-[0_0_80px_40px_rgba(34,197,94,0.2)]';
    }
  };

  const getRiskBorder = (level: string) => {
    switch (level) {
      case 'HIGH': return 'border-red-500/60';
      case 'MEDIUM': return 'border-amber-500/60';
      default: return 'border-emerald-500/60';
    }
  };

  // Display pressure - prefer device barometer, fallback to API
  const displayPressure = devicePressure || environment.pressure;

  // Get AQI color and label
  const getAQIInfo = (aqi: number | null) => {
    if (aqi === null) return { color: 'bg-muted', label: '--', textColor: 'text-muted-foreground' };
    if (aqi <= 50) return { color: 'bg-emerald-500', label: 'Tốt', textColor: 'text-white' };
    if (aqi <= 100) return { color: 'bg-yellow-500', label: 'Trung bình', textColor: 'text-black' };
    if (aqi <= 150) return { color: 'bg-orange-500', label: 'Nhạy cảm', textColor: 'text-white' };
    if (aqi <= 200) return { color: 'bg-red-500', label: 'Không tốt', textColor: 'text-white' };
    return { color: 'bg-purple-600', label: 'Nguy hiểm', textColor: 'text-white' };
  };

  const aqiInfo = getAQIInfo(environment.aqi);

  // Windy embed URL with PM2.5 overlay and dark theme
  const windyUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=12&overlay=pm25&product=cams&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&marker=true&message=true`;

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

      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/30 pointer-events-none" />

      {/* GPS Trail - show recent positions */}
      {!isBlurred && uniqueGPSPoints.length > 1 && (
        <div className="absolute inset-0 pointer-events-none z-5">
          {uniqueGPSPoints.slice(0, -1).map((point, index) => {
            const opacity = 0.2 + (index / uniqueGPSPoints.length) * 0.6;
            const size = 4 + (index / uniqueGPSPoints.length) * 4;
            return (
              <div
                key={point.id}
                className="absolute rounded-full bg-blue-400"
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
            "absolute rounded-full border-2 border-dashed transition-all duration-1000",
            getRiskBorder(riskAssessment.risk_level),
            getRiskGlow(riskAssessment.risk_level),
            riskAssessment.risk_level === 'HIGH' ? 'w-72 h-72 animate-pulse' :
            riskAssessment.risk_level === 'MEDIUM' ? 'w-56 h-56' : 'w-44 h-44'
          )} />
          
          {/* GPS Accuracy circle */}
          {gpsAccuracy && gpsAccuracy < 150 && (
            <div 
              className="absolute rounded-full border border-blue-400/20 bg-blue-400/5"
              style={{
                width: Math.min(gpsAccuracy * 1.5, 180),
                height: Math.min(gpsAccuracy * 1.5, 180)
              }}
            />
          )}
          
          {/* Center marker - current position */}
          <div className="relative z-20">
            <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <Crosshair className="w-2.5 h-2.5 text-white" />
            </div>
            {/* Pulse animation */}
            <div className="absolute inset-0 w-5 h-5 bg-blue-500 rounded-full animate-ping opacity-40" />
          </div>
        </div>
      )}

      {/* Coordinate display - bottom center */}
      {gps && !isBlurred && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
          <div className="flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur-xl rounded-full border border-border/30 shadow-xl">
            <Navigation className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-sm font-mono text-foreground">
              {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}
            </span>
          </div>
          {gpsAccuracy && (
            <div className="text-xs text-muted-foreground bg-card/70 px-3 py-1 rounded-full backdrop-blur-sm">
              Độ chính xác: ±{gpsAccuracy.toFixed(0)}m
            </div>
          )}
        </div>
      )}

      {/* Left panel - Environmental data cards */}
      {!isBlurred && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
          {/* Air Quality Card - Prominent */}
          {environment.aqi !== null && (
            <div className={cn(
              "px-4 py-3 rounded-2xl shadow-xl backdrop-blur-xl min-w-[130px] animate-fade-in",
              aqiInfo.color
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Wind className="h-4 w-4" style={{ color: aqiInfo.textColor === 'text-white' ? 'white' : 'black' }} />
                <span className={cn("text-xs uppercase tracking-wider font-medium", aqiInfo.textColor === 'text-white' ? 'text-white/80' : 'text-black/70')}>
                  Chất lượng KK
                </span>
              </div>
              <div className={cn("text-4xl font-bold", aqiInfo.textColor)}>{environment.aqi}</div>
              <div className={cn("text-sm font-medium", aqiInfo.textColor === 'text-white' ? 'text-white/90' : 'text-black/80')}>
                {aqiInfo.label}
              </div>
            </div>
          )}

          {/* Temperature Card */}
          {environment.temperature !== null && (
            <div className="px-4 py-3 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 shadow-xl min-w-[130px] animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 mb-1">
                <Thermometer className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Nhiệt độ</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{environment.temperature?.toFixed(0)}<span className="text-xl">°C</span></div>
            </div>
          )}

          {/* Pressure Card - with barometer indicator */}
          {displayPressure !== null && (
            <div className="px-4 py-3 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 shadow-xl min-w-[130px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="h-4 w-4 text-teal-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Áp suất</span>
                {devicePressure && (
                  <span className="text-[9px] bg-teal-500/30 text-teal-300 px-1.5 py-0.5 rounded-full">
                    Sensor
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-foreground">{displayPressure?.toFixed(0)} <span className="text-base font-normal text-muted-foreground">hPa</span></div>
            </div>
          )}

          {/* Humidity Card */}
          {environment.humidity !== null && (
            <div className="px-4 py-3 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 shadow-xl min-w-[130px] animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Độ ẩm</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{environment.humidity?.toFixed(0)}<span className="text-lg">%</span></div>
            </div>
          )}

          {/* UV Index Card */}
          {environment.uvIndex !== null && (
            <div className="px-4 py-3 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 shadow-xl min-w-[130px] animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 mb-1">
                <Sun className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">UV Index</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{environment.uvIndex?.toFixed(0)}</div>
            </div>
          )}
        </div>
      )}

      {/* Tracking status badge - top right */}
      {!isBlurred && isTracking && (
        <div className="absolute top-4 right-4 z-20 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur-xl rounded-full border border-border/30 shadow-xl">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-foreground">Đang theo dõi</span>
          </div>
        </div>
      )}

      {/* Data source badge - bottom left */}
      {!isBlurred && (
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-20">
          <div className="px-3 py-1.5 bg-card/80 backdrop-blur-md rounded-lg border border-border/20">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Data • Windy • Tomorrow.io • OpenWeather
            </span>
          </div>
          {isTracking && gpsHistory.length > 0 && (
            <div className="px-3 py-1.5 bg-blue-500/20 backdrop-blur-md rounded-lg border border-blue-500/20">
              <span className="text-[10px] text-blue-300 flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                GPS Tracking • {gpsHistory.length} điểm
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FullScreenMap;

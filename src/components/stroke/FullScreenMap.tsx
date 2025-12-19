import React from 'react';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment, GPSPoint } from '@/hooks/useStrokeRiskEngine';
import { Thermometer, Wind, Gauge, Droplets, Navigation, Activity, Radio, Clock, MapPin } from 'lucide-react';
import UserLocationMap from './UserLocationMap';

interface FullScreenMapProps {
  gps: { lat: number; lon: number } | null;
  gpsHistory?: GPSPoint[];
  gpsAccuracy?: number | null;
  environment: EnvironmentData;
  riskAssessment: RiskAssessment;
  isBlurred?: boolean;
  isTracking?: boolean;
  devicePressure?: number | null;
  outdoorMinutes?: number;
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
  outdoorMinutes = 0,
  className
}) => {
  // Get AQI color and label
  const getAQIInfo = (aqi: number | null) => {
    if (aqi === null) return { color: 'bg-muted', label: '--', textColor: 'text-muted-foreground' };
    if (aqi <= 50) return { color: 'bg-emerald-500', label: 'Tốt', textColor: 'text-white' };
    if (aqi <= 100) return { color: 'bg-yellow-500', label: 'TB', textColor: 'text-black' };
    if (aqi <= 150) return { color: 'bg-orange-500', label: 'Nhạy cảm', textColor: 'text-white' };
    if (aqi <= 200) return { color: 'bg-red-500', label: 'Xấu', textColor: 'text-white' };
    return { color: 'bg-purple-600', label: 'Nguy hiểm', textColor: 'text-white' };
  };

  const aqiInfo = getAQIInfo(environment.aqi);

  // Display pressure - prefer device barometer
  const displayPressure = devicePressure || environment.pressure;

  // Format outdoor time
  const formatOutdoorTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  return (
    <div className={cn(
      "absolute inset-0 transition-all duration-700 overflow-hidden",
      isBlurred && "scale-[1.02] brightness-[0.3] blur-sm",
      className
    )}>
      {/* MapLibre Map with user location */}
      <UserLocationMap
        gps={gps}
        gpsHistory={gpsHistory}
        gpsAccuracy={gpsAccuracy}
        riskLevel={riskAssessment.risk_level}
      />

      {/* Top gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/60 to-transparent pointer-events-none" />

      {/* Left panel - Compact environmental data */}
      {!isBlurred && (
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-20">
          {/* Risk Score Badge */}
          <div className={cn(
            "px-3 py-2 rounded-xl shadow-xl backdrop-blur-xl animate-fade-in",
            riskAssessment.risk_level === 'HIGH' ? 'bg-red-500' :
            riskAssessment.risk_level === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
          )}>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-white" />
              <span className="text-xs text-white/80 uppercase tracking-wider">Nguy cơ</span>
            </div>
            <div className="text-3xl font-bold text-white">{riskAssessment.risk_score}<span className="text-lg">/100</span></div>
          </div>

          {/* AQI Card */}
          {environment.aqi !== null && (
            <div className={cn(
              "px-3 py-2 rounded-xl shadow-xl backdrop-blur-xl animate-fade-in",
              aqiInfo.color
            )} style={{ animationDelay: '0.05s' }}>
              <div className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5" style={{ color: aqiInfo.textColor === 'text-white' ? 'white' : 'black' }} />
                <span className={cn("text-[10px] uppercase tracking-wider", aqiInfo.textColor === 'text-white' ? 'text-white/80' : 'text-black/70')}>AQI</span>
              </div>
              <div className={cn("text-2xl font-bold", aqiInfo.textColor)}>{environment.aqi}</div>
            </div>
          )}

          {/* Outdoor Time Card */}
          {outdoorMinutes > 0 && (
            <div className="px-3 py-2 bg-blue-500/90 backdrop-blur-xl rounded-xl shadow-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-white" />
                <span className="text-[10px] text-white/80 uppercase tracking-wider">Ngoài trời</span>
              </div>
              <div className="text-xl font-bold text-white">{formatOutdoorTime(outdoorMinutes)}</div>
            </div>
          )}

          {/* Temperature */}
          {environment.temperature !== null && (
            <div className="px-3 py-2 bg-card/85 backdrop-blur-xl rounded-xl border border-border/20 shadow-xl animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-[10px] text-muted-foreground uppercase">Nhiệt độ</span>
              </div>
              <div className="text-xl font-bold text-foreground">{environment.temperature?.toFixed(0)}°C</div>
            </div>
          )}

          {/* Pressure */}
          {displayPressure !== null && (
            <div className="px-3 py-2 bg-card/85 backdrop-blur-xl rounded-xl border border-border/20 shadow-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-[10px] text-muted-foreground uppercase">Áp suất</span>
                {devicePressure && <span className="text-[8px] bg-teal-500/30 text-teal-300 px-1 rounded">📱</span>}
              </div>
              <div className="text-xl font-bold text-foreground">{displayPressure?.toFixed(0)} hPa</div>
            </div>
          )}

          {/* Humidity */}
          {environment.humidity !== null && (
            <div className="px-3 py-2 bg-card/85 backdrop-blur-xl rounded-xl border border-border/20 shadow-xl animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] text-muted-foreground uppercase">Độ ẩm</span>
              </div>
              <div className="text-xl font-bold text-foreground">{environment.humidity?.toFixed(0)}%</div>
            </div>
          )}
        </div>
      )}

      {/* GPS Position Card - Fixed bottom center */}
      {gps && !isBlurred && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 shadow-xl">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Vị trí của bạn</div>
              <div className="text-sm font-mono text-foreground">
                {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}
              </div>
              {gpsAccuracy && (
                <div className="text-[10px] text-muted-foreground">±{gpsAccuracy.toFixed(0)}m</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tracking status badge - top right */}
      {!isBlurred && isTracking && (
        <div className="absolute top-4 right-4 z-20 animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/90 backdrop-blur-xl rounded-full shadow-xl">
            <Radio className="h-3.5 w-3.5 text-white animate-pulse" />
            <span className="text-xs font-medium text-white">Live</span>
            <span className="text-[10px] text-white/70">{gpsHistory.length} điểm</span>
          </div>
        </div>
      )}

      {/* Data source badge - bottom left */}
      {!isBlurred && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className="px-2.5 py-1 bg-card/70 backdrop-blur-md rounded-lg border border-border/20">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Windy • Tomorrow.io
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullScreenMap;

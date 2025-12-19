import React from 'react';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment, GPSPoint } from '@/hooks/useStrokeRiskEngine';
import { Thermometer, Wind, Gauge, Droplets, Activity, Radio, Clock, MapPin, Home, TreePine } from 'lucide-react';

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
  isOutdoor?: boolean;
  locationConfidence?: number;
  safeOutdoorMinutes?: number;
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
  isOutdoor = true,
  locationConfidence = 50,
  safeOutdoorMinutes = 120,
  className
}) => {
  const lat = gps?.lat || 10.7769;
  const lon = gps?.lon || 106.7009;

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
  const displayPressure = devicePressure || environment.pressure;

  const formatOutdoorTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  // Windy embed URL với marker, webcams, và spot vị trí
  const windyUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=15&overlay=pm25&product=cams&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&marker=true&message=true&webcams=true&spot=${lat},${lon}`;

  return (
    <div className={cn(
      "absolute inset-0 transition-all duration-700 overflow-hidden",
      isBlurred && "scale-[1.02] brightness-[0.3] blur-sm",
      className
    )}>
      {/* Windy Map với định vị sẵn có */}
      <iframe
        src={windyUrl}
        className="absolute inset-0 w-full h-full border-0"
        style={{ minHeight: '100vh', minWidth: '100vw' }}
        allow="geolocation"
        title="Windy Weather Map"
      />

      {/* Top gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/50 to-transparent pointer-events-none z-15" />

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

          {/* Location Type & Outdoor Time Card */}
          <div className={cn(
            "px-3 py-2 backdrop-blur-xl rounded-xl shadow-xl animate-fade-in",
            isOutdoor 
              ? outdoorMinutes >= safeOutdoorMinutes ? 'bg-red-500/90' : 'bg-blue-500/90'
              : 'bg-slate-500/90'
          )} style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-1.5">
              {isOutdoor ? (
                <TreePine className="h-3.5 w-3.5 text-white" />
              ) : (
                <Home className="h-3.5 w-3.5 text-white" />
              )}
              <span className="text-[10px] text-white/80 uppercase tracking-wider">
                {isOutdoor ? 'Ngoài trời' : 'Trong nhà'}
              </span>
              {locationConfidence >= 70 && (
                <span className="text-[8px] bg-white/20 px-1 rounded">
                  {locationConfidence}%
                </span>
              )}
            </div>
            {isOutdoor && outdoorMinutes > 0 && (
              <div className="mt-1">
                <div className="text-xl font-bold text-white">{formatOutdoorTime(outdoorMinutes)}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        outdoorMinutes >= safeOutdoorMinutes ? 'bg-red-300' : 'bg-white'
                      )}
                      style={{ width: `${Math.min(100, (outdoorMinutes / safeOutdoorMinutes) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-white/70">
                    {safeOutdoorMinutes}p
                  </span>
                </div>
              </div>
            )}
            {!isOutdoor && (
              <div className="text-sm text-white/70 mt-0.5">Không tính thời gian</div>
            )}
          </div>

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

      {/* Tracking status badge - top center (avoid Windy controls at top-right) */}
      {!isBlurred && isTracking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
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

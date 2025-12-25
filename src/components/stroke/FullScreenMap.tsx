import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment, GPSPoint } from '@/hooks/useStrokeRiskEngine';
import type { MapAction } from '@/hooks/useHandGestureController';
import { Thermometer, Wind, Gauge, Droplets, Radio, MapPin, Home, TreePine, Eye, EyeOff, Loader2, X, LayoutDashboard, ZoomIn, ZoomOut, Move, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeocodedLocation {
  address: string;
  district: string;
  city: string;
  full_address: string;
  area_type: string;
}

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
  mapCommand?: { action: MapAction; timestamp: number } | null;
  onViewStatistics?: () => void;
  showStatisticsButton?: boolean;
  className?: string;
}

// Memoized stable coordinates to prevent unnecessary re-renders
const useStableCoords = (gps: { lat: number; lon: number } | null) => {
  const prevRef = useRef<{ lat: number; lon: number } | null>(null);
  
  return useMemo(() => {
    if (!gps) return null;
    // Only update if moved more than ~10m
    if (prevRef.current) {
      const latDiff = Math.abs(gps.lat - prevRef.current.lat);
      const lonDiff = Math.abs(gps.lon - prevRef.current.lon);
      if (latDiff < 0.0001 && lonDiff < 0.0001) {
        return prevRef.current;
      }
    }
    prevRef.current = gps;
    return gps;
  }, [gps?.lat, gps?.lon]);
};

const FullScreenMapInner: React.FC<FullScreenMapProps> = ({
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
  mapCommand,
  onViewStatistics,
  showStatisticsButton = false,
  className
}) => {
  const [showAQILayer, setShowAQILayer] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false); // Collapsed by default
  const [mapKey, setMapKey] = useState(0);
  const [geocodedLocation, setGeocodedLocation] = useState<GeocodedLocation | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(11);
  const [mapOffset, setMapOffset] = useState({ lat: 0, lon: 0 });
  const [gestureActionFeedback, setGestureActionFeedback] = useState<string | null>(null);
  const lastGeocodedRef = useRef<string>('');
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMapCommandRef = useRef<number>(0);
  
  // Use stable coordinates to reduce re-renders
  const stableGps = useStableCoords(gps);
  const baseLatLon = stableGps || { lat: 10.7769, lon: 106.7009 };
  const lat = baseLatLon.lat + mapOffset.lat;
  const lon = baseLatLon.lon + mapOffset.lon;

  // Handle gesture-based map commands
  useEffect(() => {
    if (!mapCommand || mapCommand.timestamp === lastMapCommandRef.current) return;
    lastMapCommandRef.current = mapCommand.timestamp;

    const { action } = mapCommand;
    let feedbackText: string | null = null;

    switch (action) {
      case 'zoom_in':
        setZoomLevel(prev => Math.min(prev + 1, 18));
        setMapKey(prev => prev + 1); // Force iframe reload
        feedbackText = '🔍+ Phóng to';
        break;
      case 'zoom_out':
        setZoomLevel(prev => Math.max(prev - 1, 3));
        setMapKey(prev => prev + 1);
        feedbackText = '🔍- Thu nhỏ';
        break;
      case 'pan_left':
        setMapOffset(prev => ({ ...prev, lon: prev.lon - 0.005 }));
        setMapKey(prev => prev + 1);
        feedbackText = '← Sang trái';
        break;
      case 'pan_right':
        setMapOffset(prev => ({ ...prev, lon: prev.lon + 0.005 }));
        setMapKey(prev => prev + 1);
        feedbackText = '→ Sang phải';
        break;
      case 'pan_up':
        setMapOffset(prev => ({ ...prev, lat: prev.lat + 0.005 }));
        setMapKey(prev => prev + 1);
        feedbackText = '↑ Lên trên';
        break;
      case 'pan_down':
        setMapOffset(prev => ({ ...prev, lat: prev.lat - 0.005 }));
        setMapKey(prev => prev + 1);
        feedbackText = '↓ Xuống dưới';
        break;
      case 'pause':
        feedbackText = '✊ Tạm dừng';
        break;
    }

    if (feedbackText) {
      setGestureActionFeedback(feedbackText);
      setTimeout(() => setGestureActionFeedback(null), 800);
    }
  }, [mapCommand]);

  // Geocode GPS to address using AI - with debouncing
  const geocodeLocation = useCallback(async (lat: number, lon: number) => {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`; // Less precision = less API calls
    if (lastGeocodedRef.current === key) return;
    
    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-location', {
        body: { lat, lon }
      });
      
      if (!error && data?.success) {
        lastGeocodedRef.current = key;
        setGeocodedLocation({
          address: data.address,
          district: data.district,
          city: data.city,
          full_address: data.full_address,
          area_type: data.area_type
        });
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Geocode when GPS changes - with longer debounce to reduce stuttering
  useEffect(() => {
    if (stableGps) {
      // Clear any pending geocode
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
      // Debounce geocoding by 2 seconds
      geocodeTimeoutRef.current = setTimeout(() => {
        geocodeLocation(stableGps.lat, stableGps.lon);
      }, 2000);
      return () => {
        if (geocodeTimeoutRef.current) {
          clearTimeout(geocodeTimeoutRef.current);
        }
      };
    }
  }, [stableGps, geocodeLocation]);

  // Toggle AQI layer with forced reload
  const toggleAQILayer = () => {
    setShowAQILayer(prev => !prev);
    setMapKey(prev => prev + 1); // Increment to force iframe remount
  };

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

  // Windy embed URL - use different overlay and product for AQI
  // pm25 overlay with cams product shows PM2.5 pollution data
  // menu=false hides the layer picker, detail=false hides detail panel
  const overlay = showAQILayer ? 'pm25' : 'wind';
  const product = showAQILayer ? 'cams' : 'ecmwf';
  const windyUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=${zoomLevel}&overlay=${overlay}&product=${product}&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&marker=true&message=false&menu=false&detail=false`;

  return (
    <div className={cn(
      "absolute inset-0 transition-all duration-700 overflow-hidden",
      isBlurred && "scale-[1.02] brightness-[0.3] blur-sm",
      className
    )}>
      {/* Windy Map - key forces complete reload when switching layers */}
      <iframe
        key={`windy-map-${mapKey}`}
        src={windyUrl}
        className="absolute inset-0 w-full h-full border-0"
        style={{ minHeight: '100vh', minWidth: '100vw' }}
        allow="geolocation"
        title={showAQILayer ? "Windy AQI Map" : "Windy Weather Map"}
      />

      {/* Top gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/50 to-transparent pointer-events-none z-15" />

      {/* Gesture Action Feedback - Center screen */}
      {gestureActionFeedback && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-fade-in pointer-events-none">
          <div className="px-6 py-3 bg-black/70 backdrop-blur-md rounded-2xl text-white text-lg font-semibold shadow-2xl">
            {gestureActionFeedback}
          </div>
        </div>
      )}
      {/* Top left controls - Panel toggle and Statistics button */}
      {!isBlurred && !showDataPanel && (
        <div className="absolute top-4 left-4 z-20 animate-fade-in flex flex-col gap-2">
          <button
            onClick={() => setShowDataPanel(true)}
            className="bg-card/90 backdrop-blur-xl rounded-xl shadow-xl border border-border/20 p-3 hover:bg-card transition-all active:scale-95"
          >
            <LayoutDashboard className="h-5 w-5 text-foreground" />
          </button>
          
          {/* Statistics button - below panel toggle when panel is closed */}
          {showStatisticsButton && onViewStatistics && (
            <Button 
              onClick={onViewStatistics} 
              className="bg-slate-800/90 hover:bg-slate-700 text-white shadow-lg backdrop-blur-sm border border-slate-600/50 px-3 py-2"
              size="sm"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Thống kê
            </Button>
          )}
        </div>
      )}
      {/* Left panel - Environment data - Collapsible */}
      {!isBlurred && showDataPanel && (
        <div className="absolute top-4 left-4 z-20 animate-fade-in flex flex-col gap-2">
          <div className="bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/20 overflow-hidden w-[140px]">
            {/* Close button */}
            <button 
              onClick={() => setShowDataPanel(false)}
              className="absolute top-1 right-1 z-10 p-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
            
            {/* Data Grid */}
            <div className="divide-y divide-border/30">
              {/* AQI - Clickable - Always show */}
              <button
                onClick={toggleAQILayer}
                className={cn(
                  "w-full px-3 py-2 text-left transition-all",
                  showAQILayer ? aqiInfo.color : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wind className={cn("h-3.5 w-3.5", showAQILayer ? "text-white" : "text-purple-400")} />
                    <span className={cn("text-[10px] uppercase", showAQILayer ? "text-white/80" : "text-muted-foreground")}>PM2.5</span>
                  </div>
                  {showAQILayer ? (
                    <Eye className="h-3 w-3 text-white" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </div>
                <div className={cn("text-lg font-bold", showAQILayer ? "text-white" : "text-foreground")}>
                  {environment.aqi !== null ? environment.aqi : (environment.pm25 !== null ? environment.pm25 : '--')}
                </div>
                {environment.aqi !== null && (
                  <div className={cn("text-[9px]", showAQILayer ? "text-white/70" : "text-muted-foreground")}>{aqiInfo.label}</div>
                )}
              </button>

              {/* Location Type & Outdoor Time */}
              <div className={cn(
                "px-3 py-2",
                isOutdoor 
                  ? outdoorMinutes >= safeOutdoorMinutes ? 'bg-red-500/90' : 'bg-blue-500/90'
                  : ''
              )}>
                <div className="flex items-center gap-1.5">
                  {isOutdoor ? (
                    <TreePine className={cn("h-3.5 w-3.5", isOutdoor ? "text-white" : "text-slate-400")} />
                  ) : (
                    <Home className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span className={cn("text-[10px] uppercase", isOutdoor ? "text-white/80" : "text-muted-foreground")}>
                    {isOutdoor ? 'Ngoài trời' : 'Trong nhà'}
                  </span>
                  {locationConfidence >= 70 && (
                    <span className={cn("text-[8px] px-1 rounded ml-auto", isOutdoor ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                      {locationConfidence}%
                    </span>
                  )}
                </div>
                {isOutdoor && outdoorMinutes > 0 ? (
                  <div className="mt-0.5">
                    <div className="text-lg font-bold text-white">{formatOutdoorTime(outdoorMinutes)}</div>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            outdoorMinutes >= safeOutdoorMinutes ? 'bg-red-300' : 'bg-white'
                          )}
                          style={{ width: `${Math.min(100, (outdoorMinutes / safeOutdoorMinutes) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-white/70">{safeOutdoorMinutes}p</span>
                    </div>
                  </div>
                ) : !isOutdoor ? (
                  <div className="text-xs text-muted-foreground mt-0.5">Không tính</div>
                ) : null}
              </div>

              {/* Temperature & Humidity Row - Always show */}
              <div className="px-3 py-2 flex gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-orange-400" />
                    <span className="text-[9px] text-muted-foreground">°C</span>
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {environment.temperature !== null ? `${environment.temperature.toFixed(0)}°` : '--'}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-blue-400" />
                    <span className="text-[9px] text-muted-foreground">%</span>
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {environment.humidity !== null ? `${environment.humidity.toFixed(0)}%` : '--'}
                  </div>
                </div>
              </div>

              {/* Pressure - Always show */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-teal-400" />
                  <span className="text-[9px] text-muted-foreground">hPa</span>
                  {devicePressure && <span className="text-[8px] ml-1">📱</span>}
                </div>
                <div className="text-base font-bold text-foreground">
                  {displayPressure !== null ? displayPressure.toFixed(0) : '--'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Statistics button - below panel when panel is open */}
          {showStatisticsButton && onViewStatistics && (
            <Button 
              onClick={onViewStatistics} 
              className="bg-slate-800/90 hover:bg-slate-700 text-white shadow-lg backdrop-blur-sm border border-slate-600/50 px-3 py-2 w-[140px]"
              size="sm"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Thống kê
            </Button>
          )}
        </div>
      )}

      {/* GPS Position Card - Fixed bottom center with AI geocoded address */}
      {gps && !isBlurred && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 animate-fade-in max-w-[90vw]">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 shadow-xl">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full shrink-0">
              {isGeocoding ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Vị trí của bạn</div>
              {geocodedLocation ? (
                <>
                  <div className="text-sm font-medium text-foreground truncate max-w-[250px]">
                    {geocodedLocation.address}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {geocodedLocation.district && (
                      <span>{geocodedLocation.district}</span>
                    )}
                    {geocodedLocation.city && (
                      <span className="text-blue-500 font-medium">{geocodedLocation.city}</span>
                    )}
                    {geocodedLocation.area_type && geocodedLocation.area_type !== 'Không xác định' && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 rounded">
                        {geocodedLocation.area_type}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm font-mono text-foreground">
                  {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}
                </div>
              )}
              {gpsAccuracy && (
                <div className="text-[10px] text-muted-foreground">±{gpsAccuracy.toFixed(0)}m</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tracking status badge - top center */}
      {!isBlurred && isTracking && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500 backdrop-blur-xl rounded-full shadow-xl">
            <Radio className="h-4 w-4 text-white animate-pulse" />
            <span className="text-sm font-semibold text-white">Live</span>
            <span className="text-xs text-white/80">{gpsHistory.length} điểm</span>
          </div>
        </div>
      )}

      {/* AQI Map mode indicator */}
      {!isBlurred && showAQILayer && (
        <div className="absolute top-16 left-4 z-20 animate-fade-in">
          <div className={cn(
            "px-3 py-1.5 rounded-lg shadow-lg border",
            aqiInfo.color,
            "border-white/20"
          )}>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-white" />
              <span className="text-xs font-semibold text-white">Bản đồ ô nhiễm PM2.5</span>
            </div>
            <p className="text-[10px] text-white/80 mt-0.5">Bấm AQI để tắt</p>
          </div>
        </div>
      )}

      {/* Data source badge - bottom left */}
      {!isBlurred && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className="px-2.5 py-1 bg-card/70 backdrop-blur-md rounded-lg border border-border/20">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Windy • {showAQILayer ? 'CAMS PM2.5' : 'ECMWF Wind'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize the entire component to prevent unnecessary re-renders
const FullScreenMap = memo(FullScreenMapInner, (prevProps, nextProps) => {
  // Custom comparison - only re-render when significant changes occur
  const gpsChanged = prevProps.gps?.lat !== nextProps.gps?.lat || 
                     prevProps.gps?.lon !== nextProps.gps?.lon;
  const envChanged = prevProps.environment.aqi !== nextProps.environment.aqi ||
                     prevProps.environment.temperature !== nextProps.environment.temperature ||
                     prevProps.environment.humidity !== nextProps.environment.humidity ||
                     prevProps.environment.pressure !== nextProps.environment.pressure;
  const trackingChanged = prevProps.isTracking !== nextProps.isTracking;
  const blurChanged = prevProps.isBlurred !== nextProps.isBlurred;
  const outdoorChanged = prevProps.isOutdoor !== nextProps.isOutdoor ||
                         prevProps.outdoorMinutes !== nextProps.outdoorMinutes;
  
  // Return true if props are EQUAL (no re-render needed)
  return !gpsChanged && !envChanged && !trackingChanged && !blurChanged && !outdoorChanged;
});

export default FullScreenMap;

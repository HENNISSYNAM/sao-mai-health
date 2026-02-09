import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment, GPSPoint } from '@/hooks/useStrokeRiskEngine';
import type { MapAction } from '@/hooks/useHandGestureController';
import { Thermometer, Wind, Gauge, Droplets, Radio, MapPin, Home, TreePine, Eye, EyeOff, Loader2, X, LayoutDashboard, ZoomIn, ZoomOut, Move, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapHandControlLayer } from './MapHandControlLayer';
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Use stable coordinates to reduce re-renders
  const stableGps = useStableCoords(gps);
  const baseLatLon = stableGps || { lat: 10.7769, lon: 106.7009 };
  const lat = baseLatLon.lat + mapOffset.lat;
  const lon = baseLatLon.lon + mapOffset.lon;

  // Immediate map update - no batching for real-time response
  const updateMapNow = useCallback((offsetDelta: { lat: number; lon: number } | null, zoomDelta: number) => {
    if (offsetDelta) {
      setMapOffset(prev => ({
        lat: prev.lat + offsetDelta.lat,
        lon: prev.lon + offsetDelta.lon
      }));
    }
    if (zoomDelta !== 0) {
      setZoomLevel(prev => Math.min(18, Math.max(3, prev + zoomDelta)));
    }
    // Reload iframe with new position
    setMapKey(prev => prev + 1);
  }, []);

  // Handle gesture-based map commands - IMMEDIATE response
  useEffect(() => {
    if (!mapCommand || mapCommand.timestamp === lastMapCommandRef.current) return;
    lastMapCommandRef.current = mapCommand.timestamp;

    const { action } = mapCommand;
    let feedbackText: string | null = null;
    const panStep = 0.004; // Pan step size

    // Execute immediately - no batching
    switch (action) {
      case 'zoom_in':
        updateMapNow(null, 1);
        feedbackText = '🔍+ Zoom';
        break;
      case 'zoom_out':
        updateMapNow(null, -1);
        feedbackText = '🔍- Zoom';
        break;
      case 'pan_left':
        updateMapNow({ lat: 0, lon: -panStep }, 0);
        feedbackText = '←';
        break;
      case 'pan_right':
        updateMapNow({ lat: 0, lon: panStep }, 0);
        feedbackText = '→';
        break;
      case 'pan_up':
        updateMapNow({ lat: panStep, lon: 0 }, 0);
        feedbackText = '↑';
        break;
      case 'pan_down':
        updateMapNow({ lat: -panStep, lon: 0 }, 0);
        feedbackText = '↓';
        break;
      case 'toggle_layer':
        setShowAQILayer(prev => !prev);
        setMapKey(prev => prev + 1);
        feedbackText = showAQILayer ? '🌬️ Gió' : '💨 PM2.5';
        break;
      case 'reset_view':
        setMapOffset({ lat: 0, lon: 0 });
        setZoomLevel(11);
        setMapKey(prev => prev + 1);
        feedbackText = '📍 Reset';
        break;
      case 'pause':
        feedbackText = '✊';
        break;
    }

    // Brief feedback
    if (feedbackText) {
      setGestureActionFeedback(feedbackText);
      setTimeout(() => setGestureActionFeedback(null), 300);
    }
  }, [mapCommand, updateMapNow, showAQILayer]);

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

  // Hand cursor map controls
  const handleHandPan = useCallback((deltaX: number, deltaY: number) => {
    const panFactor = 0.00005; // Convert pixel delta to lat/lon
    setMapOffset(prev => ({
      lat: prev.lat - deltaY * panFactor,
      lon: prev.lon + deltaX * panFactor,
    }));
    setMapKey(prev => prev + 1);
  }, []);

  const handleHandZoom = useCallback((delta: number) => {
    setZoomLevel(prev => Math.min(18, Math.max(3, prev + delta)));
    setMapKey(prev => prev + 1);
  }, []);

  const handleHandContextMenu = useCallback((x: number, y: number) => {
    // Toggle layer on right click
    setShowAQILayer(prev => !prev);
    setMapKey(prev => prev + 1);
  }, []);

  return (
    <div 
      ref={mapContainerRef}
      className={cn(
        "absolute inset-0 transition-all duration-700 overflow-hidden",
        isBlurred && "scale-[1.02] brightness-[0.3] blur-sm",
        className
      )}
    >
      {/* Windy Map - key forces complete reload when switching layers */}
      <iframe
        key={`windy-map-${mapKey}`}
        src={windyUrl}
        className="absolute inset-0 w-full h-full border-0"
        style={{ minHeight: '100vh', minWidth: '100vw' }}
        allow="geolocation"
        title={showAQILayer ? "Windy AQI Map" : "Windy Weather Map"}
      />
      
      {/* Hand Control Layer - pluggable input layer */}
      {!isBlurred && (
        <MapHandControlLayer
          containerRef={mapContainerRef}
          onPan={handleHandPan}
          onZoom={handleHandZoom}
          onContextMenu={handleHandContextMenu}
        />
      )}

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
      {/* Top left controls - IG Story-style minimal icons */}
      {!isBlurred && !showDataPanel && (
        <div className="absolute top-16 left-4 z-20 animate-fade-in flex items-center gap-2">
          <button
            onClick={() => setShowDataPanel(true)}
            className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-all active:scale-95"
          >
            <LayoutDashboard className="h-4 w-4 text-white" />
          </button>
          
          {showStatisticsButton && onViewStatistics && (
            <button
              onClick={onViewStatistics}
              className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-all active:scale-95"
            >
              <BarChart3 className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      )}
      {/* Left panel - IG Story-style compact vertical stack */}
      {!isBlurred && showDataPanel && (
        <div className="absolute top-16 left-4 z-20 animate-fade-in">
          <div className="flex flex-col gap-1.5">
            {/* Close button */}
            <button 
              onClick={() => setShowDataPanel(false)}
              className="w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-all active:scale-95 self-start"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* AQI Pill - Clickable */}
            <button
              onClick={toggleAQILayer}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-95",
                showAQILayer ? aqiInfo.color : "bg-black/40 hover:bg-black/60"
              )}
            >
              <Wind className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">
                {environment.aqi !== null ? environment.aqi : (environment.pm25 || '--')}
              </span>
              {showAQILayer ? (
                <Eye className="h-3 w-3 text-white/70" />
              ) : (
                <EyeOff className="h-3 w-3 text-white/50" />
              )}
            </button>

            {/* Weather Row - Temp & Humidity */}
            <div className="flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <Thermometer className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">
                {environment.temperature !== null ? `${environment.temperature.toFixed(0)}°` : '--'}
              </span>
              <div className="w-px h-4 bg-white/20" />
              <Droplets className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">
                {environment.humidity !== null ? `${environment.humidity.toFixed(0)}%` : '--'}
              </span>
            </div>

            {/* Pressure Pill */}
            <div className="flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <Gauge className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-semibold text-white">
                {displayPressure !== null ? `${displayPressure.toFixed(0)} hPa` : '--'}
              </span>
            </div>

            {/* Location Type Pill */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md border border-white/10",
              isOutdoor 
                ? outdoorMinutes >= safeOutdoorMinutes ? 'bg-red-500/80' : 'bg-blue-500/80'
                : 'bg-black/40'
            )}>
              {isOutdoor ? (
                <TreePine className="h-4 w-4 text-white" />
              ) : (
                <Home className="h-4 w-4 text-white" />
              )}
              <span className="text-sm font-semibold text-white">
                {isOutdoor ? (outdoorMinutes > 0 ? formatOutdoorTime(outdoorMinutes) : 'Ngoài trời') : 'Trong nhà'}
              </span>
            </div>

            {/* Statistics button */}
            {showStatisticsButton && onViewStatistics && (
              <button
                onClick={onViewStatistics}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700/80 hover:bg-slate-600/80 backdrop-blur-md rounded-full border border-white/10 transition-all active:scale-95"
              >
                <BarChart3 className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">Thống kê</span>
              </button>
            )}
          </div>
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

      {/* Tracking status badge - top right (next to home button) - Enhanced with weather data */}
      {!isBlurred && isTracking && (
        <div className="absolute top-3 right-16 z-20 animate-fade-in">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500 backdrop-blur-xl rounded-full shadow-xl">
            <Radio className="h-3 w-3 text-white animate-pulse" />
            <span className="text-xs font-semibold text-white">Live</span>
            <span className="text-[10px] text-white/80">{gpsHistory.length}</span>
            
            {/* Divider */}
            <div className="w-px h-3.5 bg-white/30" />
            
            {/* Temperature */}
            <div className="flex items-center gap-0.5">
              <Thermometer className="h-2.5 w-2.5 text-white/90" />
              <span className="text-[10px] font-medium text-white">
                {environment.temperature !== null ? `${environment.temperature.toFixed(0)}°` : '--'}
              </span>
            </div>
            
            {/* Humidity */}
            <div className="flex items-center gap-0.5">
              <Droplets className="h-2.5 w-2.5 text-white/90" />
              <span className="text-[10px] font-medium text-white">
                {environment.humidity !== null ? `${environment.humidity.toFixed(0)}%` : '--'}
              </span>
            </div>
            
            {/* Pressure */}
            {displayPressure && (
              <div className="flex items-center gap-0.5">
                <Gauge className="h-2.5 w-2.5 text-white/90" />
                <span className="text-[10px] font-medium text-white">
                  {displayPressure.toFixed(0)}
                </span>
              </div>
            )}
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

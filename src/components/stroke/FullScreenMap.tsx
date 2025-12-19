import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment } from '@/hooks/useStrokeRiskEngine';
import { Thermometer, Wind, Gauge, Droplets, MapPin, Navigation } from 'lucide-react';

// Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoiaG9hbmd0aGFpIiwiYSI6ImNtNTZ4eXNsbjA2cW8yaXB2Z3B3NWRtNHkifQ.MPSQqJBIKRdwXsscwI9xYezMggaBUJqp';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const lat = gps?.lat || 10.7769;
  const lon = gps?.lon || 106.7009;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Remove existing map if any
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lon, lat],
      zoom: 13,
      pitch: 60,
      bearing: -17.6,
      antialias: true,
      attributionControl: false
    });

    // Resize map to fit container
    map.current.on('load', () => {
      map.current?.resize();
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'bottom-right'
    );

    // Add atmosphere effect
    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(15, 15, 25)',
        'high-color': 'rgb(25, 25, 50)',
        'horizon-blend': 0.15,
        'star-intensity': 0.2
      });

      // Add 3D buildings
      const layers = map.current?.getStyle()?.layers;
      if (layers) {
        const labelLayerId = layers.find(
          (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
        )?.id;

        map.current?.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 12,
            paint: {
              'fill-extrusion-color': '#1a1a2e',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.7
            }
          },
          labelLayerId
        );
      }
    });

    // Handle window resize
    const handleResize = () => map.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map center when GPS changes
  useEffect(() => {
    if (map.current && gps) {
      map.current.flyTo({
        center: [gps.lon, gps.lat],
        zoom: 14,
        duration: 2000
      });

      // Update or create marker
      if (marker.current) {
        marker.current.setLngLat([gps.lon, gps.lat]);
      } else {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'gps-marker';
        el.innerHTML = `
          <div class="marker-pulse"></div>
          <div class="marker-dot"></div>
        `;
        
        marker.current = new mapboxgl.Marker(el)
          .setLngLat([gps.lon, gps.lat])
          .addTo(map.current);
      }
    }
  }, [gps]);

  // Risk zone color
  const getRiskGlow = (level: string) => {
    switch (level) {
      case 'HIGH': return 'shadow-[0_0_100px_50px_rgba(239,68,68,0.4)]';
      case 'MEDIUM': return 'shadow-[0_0_80px_40px_rgba(245,158,11,0.3)]';
      default: return 'shadow-[0_0_60px_30px_rgba(34,197,94,0.25)]';
    }
  };

  const getRiskBorder = (level: string) => {
    switch (level) {
      case 'HIGH': return 'border-red-500';
      case 'MEDIUM': return 'border-amber-500';
      default: return 'border-emerald-500';
    }
  };

  return (
    <div className={cn(
      "absolute inset-0 transition-all duration-700 overflow-hidden",
      isBlurred && "scale-[1.02] brightness-[0.3] blur-sm",
      className
    )}>
      {/* Mapbox Container */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '100vh', minWidth: '100vw' }}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/40 pointer-events-none" />

      {/* Risk zone overlay */}
      {gps && !isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {/* Risk zone circle */}
          <div className={cn(
            "absolute rounded-full border-2 border-dashed transition-all duration-1000 animate-pulse",
            getRiskBorder(riskAssessment.risk_level),
            getRiskGlow(riskAssessment.risk_level),
            riskAssessment.risk_level === 'HIGH' ? 'w-72 h-72' :
            riskAssessment.risk_level === 'MEDIUM' ? 'w-56 h-56' : 'w-40 h-40'
          )} />
          
          {/* Coordinate display */}
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur-xl rounded-full border border-border/50 shadow-2xl">
              <Navigation className="h-4 w-4 text-info animate-pulse" />
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
              environment.aqi > 150 ? "bg-red-500/30 border-red-500/50" :
              environment.aqi > 100 ? "bg-amber-500/30 border-amber-500/50" :
              environment.aqi > 50 ? "bg-yellow-500/20 border-yellow-500/50" :
              "bg-emerald-500/20 border-emerald-500/50"
            )} style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  environment.aqi > 100 ? "bg-amber-500/30" : "bg-purple-500/20"
                )}>
                  <Wind className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Chất lượng KK</span>
              </div>
              <div className="text-4xl font-bold">{environment.aqi}</div>
              <div className={cn(
                "text-sm font-medium mt-1",
                environment.aqi <= 50 ? 'text-emerald-400' : 
                environment.aqi <= 100 ? 'text-yellow-400' :
                environment.aqi <= 150 ? 'text-amber-400' : 'text-red-400'
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
        <div className="absolute bottom-4 left-4 px-4 py-2 bg-card/80 backdrop-blur-md rounded-xl border border-border/30 z-20">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Data • Mapbox • Tomorrow.io
          </span>
        </div>
      )}

      {/* Location badge */}
      {!isBlurred && gps && (
        <div className="absolute top-4 right-4 px-4 py-2 bg-card/80 backdrop-blur-md rounded-xl border border-border/30 z-20">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="h-3 w-3 text-info" />
            Vị trí của bạn
          </span>
        </div>
      )}

      {/* Custom marker styles */}
      <style>{`
        .mapboxgl-map {
          width: 100% !important;
          height: 100% !important;
        }
        .mapboxgl-canvas {
          width: 100% !important;
          height: 100% !important;
        }
        .mapboxgl-ctrl-bottom-right {
          bottom: 80px !important;
          right: 10px !important;
        }
        .gps-marker {
          position: relative;
          width: 24px;
          height: 24px;
        }
        .marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(59, 130, 246, 0.5);
        }
        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: marker-pulse 2s ease-out infinite;
        }
        @keyframes marker-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default FullScreenMap;

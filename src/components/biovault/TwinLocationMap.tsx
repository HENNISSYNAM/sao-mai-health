import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Navigation, Users, Maximize2, 
  RefreshCw, Target, Shield
} from 'lucide-react';
import type { SharedTwin } from '@/hooks/useTwinSharing';

interface TwinLocationMapProps {
  myLocation: { lat: number; lng: number } | null;
  connectedTwins: SharedTwin[];
  isSharing: boolean;
}

export const TwinLocationMap: React.FC<TwinLocationMapProps> = ({
  myLocation,
  connectedTwins,
  isSharing
}) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate map bounds to fit all points
  const getBounds = () => {
    const points: { lat: number; lng: number }[] = [];
    
    if (myLocation) points.push(myLocation);
    connectedTwins.forEach(twin => {
      if (twin.location.lat && twin.location.lng) {
        points.push({ lat: twin.location.lat, lng: twin.location.lng });
      }
    });

    if (points.length === 0) {
      return { center: { lat: 10.8231, lng: 106.6297 }, zoom: 12 }; // Default: HCMC
    }

    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    
    return {
      center: {
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
      },
      zoom: 14
    };
  };

  const bounds = getBounds();

  const getRiskColor = (level: SharedTwin['healthSummary']['riskLevel']) => {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Map coordinate to pixel position (simplified for demo)
  const latLngToPixel = (lat: number, lng: number, containerWidth: number, containerHeight: number) => {
    const latRange = 0.05; // Approximate range in degrees
    const lngRange = 0.05;
    
    const centerLat = bounds.center.lat;
    const centerLng = bounds.center.lng;
    
    const x = ((lng - centerLng + lngRange / 2) / lngRange) * containerWidth;
    const y = ((centerLat + latRange / 2 - lat) / latRange) * containerHeight;
    
    return { 
      x: Math.max(20, Math.min(containerWidth - 20, x)),
      y: Math.max(20, Math.min(containerHeight - 20, y))
    };
  };

  if (!isSharing) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Bản đồ vị trí</h3>
          <p className="text-sm text-muted-foreground">
            Bắt đầu chia sẻ để xem vị trí của bạn và những người đã kết nối
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Bản đồ Twin
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {connectedTwins.length + 1}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Map Container */}
        <div 
          ref={mapContainerRef}
          className={`relative bg-gradient-to-br from-primary/5 via-background to-info/5 ${
            isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-80'
          }`}
        >
          {/* Grid overlay for map effect */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px'
            }}
          />

          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {myLocation && connectedTwins.map((twin) => {
              if (!twin.location.lat || !twin.location.lng) return null;
              
              const containerRect = mapContainerRef.current?.getBoundingClientRect();
              const width = containerRect?.width || 400;
              const height = containerRect?.height || 320;
              
              const myPos = latLngToPixel(myLocation.lat, myLocation.lng, width, height);
              const twinPos = latLngToPixel(twin.location.lat, twin.location.lng, width, height);
              
              return (
                <g key={twin.id}>
                  <line
                    x1={myPos.x}
                    y1={myPos.y}
                    x2={twinPos.x}
                    y2={twinPos.y}
                    stroke={getRiskColor(twin.healthSummary.riskLevel)}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.5"
                  />
                  {/* Distance label */}
                  <text
                    x={(myPos.x + twinPos.x) / 2}
                    y={(myPos.y + twinPos.y) / 2 - 5}
                    className="text-xs fill-muted-foreground"
                    textAnchor="middle"
                  >
                    {calculateDistance(
                      myLocation.lat, myLocation.lng,
                      twin.location.lat, twin.location.lng
                    ).toFixed(1)} km
                  </text>
                </g>
              );
            })}
          </svg>

          {/* My Location Marker */}
          {myLocation && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
              style={{
                left: '50%',
                top: '50%'
              }}
            >
              {/* Pulse ring */}
              <div className="absolute inset-0 w-12 h-12 -m-3 rounded-full bg-primary/30 animate-ping" />
              
              {/* Marker */}
              <div className="relative w-10 h-10 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center">
                <Navigation className="h-4 w-4 text-white" />
              </div>
              
              {/* Label */}
              <div className="absolute top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <Badge className="bg-primary text-primary-foreground shadow-lg">
                  Bạn
                </Badge>
              </div>
            </div>
          )}

          {/* Connected Twin Markers */}
          {connectedTwins.map((twin, index) => {
            if (!twin.location.lat || !twin.location.lng) return null;
            
            const containerRect = mapContainerRef.current?.getBoundingClientRect();
            const width = containerRect?.width || 400;
            const height = containerRect?.height || 320;
            
            // Distribute twins around the center
            const angle = (index * (360 / Math.max(connectedTwins.length, 1))) * (Math.PI / 180);
            const radius = 80;
            const offsetX = Math.cos(angle) * radius;
            const offsetY = Math.sin(angle) * radius;

            return (
              <div
                key={twin.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 group"
                style={{
                  left: `calc(50% + ${offsetX}px)`,
                  top: `calc(50% + ${offsetY}px)`
                }}
              >
                {/* Risk pulse */}
                {twin.healthSummary.riskLevel !== 'low' && (
                  <div 
                    className="absolute inset-0 w-10 h-10 -m-2 rounded-full animate-ping opacity-30"
                    style={{ backgroundColor: getRiskColor(twin.healthSummary.riskLevel) }}
                  />
                )}
                
                {/* Marker */}
                <div 
                  className="relative w-10 h-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: getRiskColor(twin.healthSummary.riskLevel) }}
                >
                  <span className="text-white font-bold text-sm">
                    {twin.name.slice(-2)}
                  </span>
                </div>
                
                {/* Info popup on hover */}
                <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  <div className="bg-card border rounded-lg shadow-xl p-3 min-w-[160px]">
                    <div className="font-medium text-sm mb-1">{twin.name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Shield className="h-3 w-3" />
                      Bio-Shield: {twin.healthSummary.bioShieldScore}%
                    </div>
                    {twin.healthSummary.chronicConditions.length > 0 && (
                      <div className="text-xs">
                        <span className="text-warning">
                          ⚠ {twin.healthSummary.chronicConditions[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Label */}
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <Badge 
                    variant="outline"
                    className="bg-background/95 shadow text-xs"
                    style={{ borderColor: getRiskColor(twin.healthSummary.riskLevel) }}
                  >
                    {twin.name}
                  </Badge>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur rounded-lg p-3 shadow-lg">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span>Khỏe mạnh</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span>Cần chú ý</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <span>Rủi ro cao</span>
              </div>
            </div>
          </div>

          {/* Update indicator */}
          <div className="absolute top-4 right-4">
            <Badge variant="outline" className="bg-background/95 backdrop-blur">
              <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
              Cập nhật trực tiếp
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

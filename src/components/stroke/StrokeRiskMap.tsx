import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

interface RiskZone {
  id: string;
  district_id: string;
  lat: number;
  lon: number;
  risk_level: string;
  risk_score: number;
  aqi: number;
  pm25: number;
  temperature: number;
  humidity: number;
  pressure: number;
  ai_analysis: string;
  predicted_at: string;
}

interface StrokeRiskMapProps {
  onZoneSelect?: (zone: RiskZone | null) => void;
  selectedCity?: 'hcmc' | 'hanoi' | 'all';
  className?: string;
}

// City centers
const CITIES = {
  hcmc: { center: [10.7769, 106.7009] as [number, number], zoom: 11 },
  hanoi: { center: [21.0285, 105.8542] as [number, number], zoom: 11 },
  all: { center: [16.0, 106.0] as [number, number], zoom: 6 }
};

// Hanoi districts
const HANOI_DISTRICTS = [
  { id: 'hoan-kiem', name: 'Hoàn Kiếm', lat: 21.0285, lon: 105.8542 },
  { id: 'ba-dinh', name: 'Ba Đình', lat: 21.0358, lon: 105.8185 },
  { id: 'dong-da', name: 'Đống Đa', lat: 21.0179, lon: 105.8280 },
  { id: 'hai-ba-trung', name: 'Hai Bà Trưng', lat: 20.9999, lon: 105.8580 },
  { id: 'cau-giay', name: 'Cầu Giấy', lat: 21.0330, lon: 105.7880 },
  { id: 'thanh-xuan', name: 'Thanh Xuân', lat: 20.9930, lon: 105.8180 },
  { id: 'hoang-mai', name: 'Hoàng Mai', lat: 20.9780, lon: 105.8650 },
  { id: 'long-bien', name: 'Long Biên', lat: 21.0450, lon: 105.9080 },
  { id: 'tay-ho', name: 'Tây Hồ', lat: 21.0720, lon: 105.8235 },
  { id: 'nam-tu-liem', name: 'Nam Từ Liêm', lat: 21.0180, lon: 105.7580 },
];

// Map controller for centering
function MapController({ city }: { city: 'hcmc' | 'hanoi' | 'all' }) {
  const map = useMap();
  
  useEffect(() => {
    const { center, zoom } = CITIES[city];
    map.setView(center, zoom, { animate: true });
  }, [city, map]);
  
  return null;
}

const getRiskColor = (level: string, score: number): string => {
  switch (level) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH': return '#f97316';
    case 'MEDIUM': return '#eab308';
    case 'LOW': return '#22c55e';
    default: return '#6b7280';
  }
};

const getRiskOpacity = (score: number): number => {
  return Math.min(0.8, 0.3 + (score / 100) * 0.5);
};

const StrokeRiskMap: React.FC<StrokeRiskMapProps> = ({ 
  onZoneSelect, 
  selectedCity = 'hcmc',
  className 
}) => {
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRiskData = async () => {
    try {
      const { data, error } = await supabase
        .from('stroke_risk_predictions')
        .select('*')
        .gte('valid_until', new Date().toISOString())
        .order('predicted_at', { ascending: false });

      if (error) throw error;

      // Get unique latest predictions per district
      const latestByDistrict = new Map<string, RiskZone>();
      (data || []).forEach((zone: any) => {
        if (!latestByDistrict.has(zone.district_id)) {
          latestByDistrict.set(zone.district_id, zone);
        }
      });

      setRiskZones(Array.from(latestByDistrict.values()));
    } catch (error) {
      console.error('Error fetching risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    fetchRiskData();

    const channel = supabase
      .channel('stroke_risk_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stroke_risk_predictions' },
        () => {
          fetchRiskData();
        }
      )
      .subscribe();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchRiskData, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Generate simulated zones for Hanoi if no real data
  const allZones = useMemo(() => {
    const hanoiZones: RiskZone[] = HANOI_DISTRICTS.map(d => ({
      id: `sim-${d.id}`,
      district_id: d.id,
      lat: d.lat,
      lon: d.lon,
      risk_level: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
      risk_score: Math.floor(20 + Math.random() * 60),
      aqi: Math.floor(50 + Math.random() * 100),
      pm25: Math.floor(20 + Math.random() * 50),
      temperature: 25 + Math.random() * 10,
      humidity: 60 + Math.random() * 30,
      pressure: 1010 + Math.random() * 10,
      ai_analysis: `Khu vực ${d.name} có điều kiện môi trường ổn định.`,
      predicted_at: new Date().toISOString()
    }));

    // Combine real HCMC data with simulated Hanoi data
    return [...riskZones, ...hanoiZones.filter(hz => 
      !riskZones.some(rz => rz.district_id === hz.district_id)
    )];
  }, [riskZones]);

  // Filter zones by city
  const filteredZones = useMemo(() => {
    if (selectedCity === 'all') return allZones;
    if (selectedCity === 'hanoi') {
      return allZones.filter(z => HANOI_DISTRICTS.some(d => d.id === z.district_id));
    }
    return allZones.filter(z => !HANOI_DISTRICTS.some(d => d.id === z.district_id));
  }, [allZones, selectedCity]);

  return (
    <div className={cn("relative w-full h-full rounded-xl overflow-hidden", className)}>
      <MapContainer
        center={CITIES[selectedCity].center}
        zoom={CITIES[selectedCity].zoom}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <MapController city={selectedCity} />
        
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {filteredZones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lon]}
            radius={zone.risk_score > 50 ? 3000 : 2000}
            pathOptions={{
              color: getRiskColor(zone.risk_level, zone.risk_score),
              fillColor: getRiskColor(zone.risk_level, zone.risk_score),
              fillOpacity: getRiskOpacity(zone.risk_score),
              weight: 2
            }}
            eventHandlers={{
              click: () => onZoneSelect?.(zone)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">{zone.district_id}</span>
                  <Badge 
                    variant={zone.risk_level === 'HIGH' || zone.risk_level === 'CRITICAL' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {zone.risk_score}/100
                  </Badge>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>AQI: {zone.aqi}</p>
                  <p>PM2.5: {zone.pm25} µg/m³</p>
                  <p>Nhiệt độ: {zone.temperature?.toFixed(1)}°C</p>
                  <p>Áp suất: {zone.pressure?.toFixed(0)} hPa</p>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Đang tải dữ liệu...</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 border border-border/50 z-10">
        <p className="text-xs font-medium mb-2">Mức nguy cơ</p>
        <div className="space-y-1">
          {[
            { level: 'LOW', label: 'Thấp', color: '#22c55e' },
            { level: 'MEDIUM', label: 'Trung bình', color: '#eab308' },
            { level: 'HIGH', label: 'Cao', color: '#f97316' },
            { level: 'CRITICAL', label: 'Rất cao', color: '#dc2626' }
          ].map(item => (
            <div key={item.level} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StrokeRiskMap;

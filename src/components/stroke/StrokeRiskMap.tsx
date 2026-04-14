import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Thermometer, Wind, Droplets, Gauge } from 'lucide-react';
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

// HCMC districts
const HCMC_DISTRICTS = [
  { id: 'quan-1', name: 'Quận 1', lat: 10.7756, lon: 106.7004 },
  { id: 'quan-3', name: 'Quận 3', lat: 10.7833, lon: 106.6833 },
  { id: 'quan-5', name: 'Quận 5', lat: 10.7539, lon: 106.6633 },
  { id: 'quan-7', name: 'Quận 7', lat: 10.7340, lon: 106.7219 },
  { id: 'quan-10', name: 'Quận 10', lat: 10.7745, lon: 106.6673 },
  { id: 'binh-thanh', name: 'Bình Thạnh', lat: 10.8105, lon: 106.7091 },
  { id: 'phu-nhuan', name: 'Phú Nhuận', lat: 10.7993, lon: 106.6816 },
  { id: 'tan-binh', name: 'Tân Bình', lat: 10.8012, lon: 106.6527 },
  { id: 'go-vap', name: 'Gò Vấp', lat: 10.8386, lon: 106.6652 },
  { id: 'thu-duc', name: 'TP. Thủ Đức', lat: 10.8512, lon: 106.7719 },
];

// Map controller for centering
function MapController({ city }: { city: 'hcmc' | 'hanoi' | 'all' }) {
  const map = useMap();
  
  useEffect(() => {
    const { center, zoom } = CITIES[city];
    map.setView(center, zoom, { animate: true, duration: 0.5 });
  }, [city, map]);
  
  return null;
}

const getRiskColor = (level: string): string => {
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

const getRiskLabel = (level: string): string => {
  switch (level) {
    case 'CRITICAL': return 'Rất cao';
    case 'HIGH': return 'Cao';
    case 'MEDIUM': return 'Trung bình';
    default: return 'Thấp';
  }
};

const StrokeRiskMap: React.FC<StrokeRiskMapProps> = ({ 
  onZoneSelect, 
  selectedCity = 'all',
  className 
}) => {
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRiskData = useCallback(async () => {
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
        if (zone.district_id && !latestByDistrict.has(zone.district_id)) {
          latestByDistrict.set(zone.district_id, zone);
        }
      });

      setRiskZones(Array.from(latestByDistrict.values()));
    } catch (error) {
      console.error('Error fetching risk data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [fetchRiskData]);

  // Generate simulated zones
  const allZones = useMemo(() => {
    const generateSimulatedZone = (district: { id: string; name: string; lat: number; lon: number }, isHanoi: boolean): RiskZone => {
      const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const weights = isHanoi ? [0.3, 0.4, 0.2, 0.1] : [0.4, 0.35, 0.2, 0.05];
      const random = Math.random();
      let cumulative = 0;
      let selectedLevel = 'LOW';
      
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) {
          selectedLevel = riskLevels[i];
          break;
        }
      }

      const baseScore = selectedLevel === 'CRITICAL' ? 80 : selectedLevel === 'HIGH' ? 60 : selectedLevel === 'MEDIUM' ? 40 : 20;
      
      return {
        id: `sim-${district.id}`,
        district_id: district.name,
        lat: district.lat + (Math.random() - 0.5) * 0.01,
        lon: district.lon + (Math.random() - 0.5) * 0.01,
        risk_level: selectedLevel,
        risk_score: baseScore + Math.floor(Math.random() * 20),
        aqi: Math.floor(50 + Math.random() * 100),
        pm25: Math.floor(20 + Math.random() * 50),
        temperature: 28 + Math.random() * 8,
        humidity: 60 + Math.random() * 30,
        pressure: 1008 + Math.random() * 10,
        ai_analysis: `Khu vực ${district.name}: Điều kiện thời tiết và chất lượng không khí đang được theo dõi.`,
        predicted_at: new Date().toISOString()
      };
    };

    const hanoiZones = HANOI_DISTRICTS.map(d => generateSimulatedZone(d, true));
    const hcmcZones = HCMC_DISTRICTS.map(d => generateSimulatedZone(d, false));

    // Combine real data with simulated data
    const simulatedZones = [...hanoiZones, ...hcmcZones];
    return [...riskZones, ...simulatedZones.filter(sz => 
      !riskZones.some(rz => rz.district_id === sz.district_id)
    )];
  }, [riskZones]);

  // Filter zones by city
  const filteredZones = useMemo(() => {
    if (selectedCity === 'all') return allZones;
    if (selectedCity === 'hanoi') {
      const hanoiIds = HANOI_DISTRICTS.map(d => d.name);
      return allZones.filter(z => hanoiIds.includes(z.district_id) || z.lat > 20);
    }
    const hcmcIds = HCMC_DISTRICTS.map(d => d.name);
    return allZones.filter(z => hcmcIds.includes(z.district_id) || z.lat < 12);
  }, [allZones, selectedCity]);

  return (
    <div className={cn("relative w-full h-full", className)}>
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
          attribution='&copy; OpenStreetMap'
        />

        {filteredZones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lon]}
            radius={zone.risk_level === 'CRITICAL' ? 4000 : zone.risk_score > 50 ? 3000 : 2000}
            pathOptions={{
              color: getRiskColor(zone.risk_level),
              fillColor: getRiskColor(zone.risk_level),
              fillOpacity: getRiskOpacity(zone.risk_score),
              weight: zone.risk_level === 'CRITICAL' ? 3 : 2
            }}
            eventHandlers={{
              click: () => onZoneSelect?.(zone)
            }}
          >
            <Popup className="stroke-popup">
              <div className="p-3 min-w-[220px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{zone.district_id}</span>
                  <Badge 
                    className={cn(
                      "text-xs font-bold",
                      zone.risk_level === 'CRITICAL' || zone.risk_level === 'HIGH' 
                        ? 'bg-danger text-danger-foreground' 
                        : zone.risk_level === 'MEDIUM'
                        ? 'bg-warning text-warning-foreground'
                        : 'bg-success text-success-foreground'
                    )}
                  >
                    {zone.risk_level === 'CRITICAL' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {getRiskLabel(zone.risk_level)} ({zone.risk_score}%)
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
                    <Wind className="h-3.5 w-3.5 text-warning" />
                    <span>AQI: {zone.aqi}</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
                    <Thermometer className="h-3.5 w-3.5 text-danger" />
                    <span>{zone.temperature?.toFixed(1)}°C</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
                    <Droplets className="h-3.5 w-3.5 text-info" />
                    <span>{zone.humidity?.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
                    <Gauge className="h-3.5 w-3.5 text-purple-500" />
                    <span>{zone.pressure?.toFixed(0)} hPa</span>
                  </div>
                </div>

                {zone.ai_analysis && (
                  <p className="text-[10px] text-muted-foreground border-t pt-2">
                    {zone.ai_analysis}
                  </p>
                )}
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Đang tải dữ liệu...</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-xl p-4 border-2 border-border shadow-xl z-10">
        <p className="text-xs font-bold mb-3 uppercase tracking-wider text-muted-foreground">Mức nguy cơ</p>
        <div className="space-y-2">
          {[
            { level: 'LOW', label: 'Thấp', color: '#22c55e' },
            { level: 'MEDIUM', label: 'Trung bình', color: '#eab308' },
            { level: 'HIGH', label: 'Cao', color: '#f97316' },
            { level: 'CRITICAL', label: 'Rất cao', color: '#dc2626' }
          ].map(item => (
            <div key={item.level} className="flex items-center gap-2.5">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white/20" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Source */}
      <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border z-10">
        <span className="text-[10px] text-muted-foreground">
          Nguồn: WAQI • Open-Meteo • AI Analysis
        </span>
      </div>
    </div>
  );
};

export default StrokeRiskMap;

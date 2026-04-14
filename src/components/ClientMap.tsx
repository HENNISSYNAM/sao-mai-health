import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Layers, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CaseGeo {
  id: string;
  lat: number;
  lng: number;
  diagnosis: string;
  reported_at: string;
}

// Heatmap layer component
const HeatmapLayer: React.FC<{ points: CaseGeo[], showHeatmap: boolean }> = ({ points, showHeatmap }) => {
  const map = useMap();

  useEffect(() => {
    if (!showHeatmap) return;

    const heatPoints = points.map(point => [point.lat, point.lng, 1] as [number, number, number]);
    
    if (heatPoints.length > 0) {
      // @ts-ignore - leaflet.heat typing issues
      const heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.0: 'blue',
          0.3: 'cyan',
          0.5: 'lime',
          0.7: 'yellow',
          1.0: 'red'
        }
      }).addTo(map);

      return () => {
        map.removeLayer(heatLayer);
      };
    }
  }, [map, points, showHeatmap]);

  return null;
};

export const ClientMap: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<number>(7); // Days
  const [diseaseFilter, setDiseaseFilter] = useState<string>('all');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Mock data since cases_geo view doesn't exist
  const mockCasesGeo: CaseGeo[] = [
    {
      id: '1',
      lat: 10.7769,
      lng: 106.7009,
      diagnosis: 'Sốt xuất huyết',
      reported_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      lat: 10.7829,
      lng: 106.6951,
      diagnosis: 'COVID-19',
      reported_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      lat: 10.7719,
      lng: 106.7056,
      diagnosis: 'Tay chân miệng',
      reported_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      lat: 10.7689,
      lng: 106.6957,
      diagnosis: 'Sốt xuất huyết',
      reported_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      lat: 10.7799,
      lng: 106.7029,
      diagnosis: 'Sởi',
      reported_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '6',
      lat: 10.7849,
      lng: 106.6989,
      diagnosis: 'Sốt xuất huyết',
      reported_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Query for cases geo data
  const { data: casesGeo = [], isLoading, error } = useQuery({
    queryKey: ['cases-geo', dateFilter, diseaseFilter],
    queryFn: async () => {
      // In real implementation, this would fetch from cases_geo view
      // For now, return mock data filtered by date and disease
      const cutoffDate = new Date(Date.now() - dateFilter * 24 * 60 * 60 * 1000);
      
      return mockCasesGeo.filter(case_ => {
        const caseDate = new Date(case_.reported_at);
        const dateMatch = caseDate >= cutoffDate;
        const diseaseMatch = diseaseFilter === 'all' || case_.diagnosis === diseaseFilter;
        return dateMatch && diseaseMatch;
      });
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('cases-geo-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments' // Using appointments as proxy since cases table doesn't exist
        },
        () => {
          // Invalidate query when cases change
          queryClient.invalidateQueries({ queryKey: ['cases-geo'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const uniqueDiseases = Array.from(new Set(mockCasesGeo.map(c => c.diagnosis)));

  const getDiseaseColor = (diagnosis: string): string => {
    const colors: Record<string, string> = {
      'Sốt xuất huyết': '#ef4444',
      'COVID-19': '#f97316',
      'Tay chân miệng': '#eab308',
      'Sởi': '#8b5cf6',
      'default': '#64748b'
    };
    return colors[diagnosis] || colors.default;
  };

  const createCustomMarker = (diagnosis: string) => {
    const color = getDiseaseColor(diagnosis);
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-marker',
      iconSize: [15, 15],
      iconAnchor: [7.5, 7.5]
    });
  };

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải bản đồ...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-destructive">Lỗi khi tải dữ liệu bản đồ</div>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full">
      {/* Map Controls */}
      <Card className="absolute top-4 left-4 z-[1000] min-w-[280px]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Bộ lọc</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Thời gian</label>
              <Select value={dateFilter.toString()} onValueChange={(value) => setDateFilter(parseInt(value))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 ngày</SelectItem>
                  <SelectItem value="3">3 ngày</SelectItem>
                  <SelectItem value="7">7 ngày</SelectItem>
                  <SelectItem value="14">14 ngày</SelectItem>
                  <SelectItem value="30">30 ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Bệnh</label>
              <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {uniqueDiseases.map(disease => (
                    <SelectItem key={disease} value={disease}>
                      {disease}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showHeatmap ? "default" : "outline"}
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="flex-1"
            >
              <Layers className="h-3 w-3 mr-1" />
              Heatmap
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDateFilter(7);
                setDiseaseFilter('all');
                setShowHeatmap(false);
              }}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tổng ca:</span>
              <Badge variant="secondary">{casesGeo.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disease Legend */}
      <Card className="absolute top-4 right-4 z-[1000]">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Chú thích</span>
          </div>
          {uniqueDiseases.map(disease => (
            <div key={disease} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: getDiseaseColor(disease) }}
              />
              <span className="text-xs">{disease}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Map */}
      <MapContainer
        center={[10.7769, 106.7009]} // Ho Chi Minh City
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Heatmap Layer */}
        <HeatmapLayer points={casesGeo} showHeatmap={showHeatmap} />
        
        {/* Marker Cluster Group */}
        {!showHeatmap && (
          <MarkerClusterGroup
            chunkedLoading
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            maxClusterRadius={50}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: `<div style="background: #3b82f6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 12px; font-weight: bold;">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              });
            }}
          >
            {casesGeo.map((case_) => (
              <Marker
                key={case_.id}
                position={[case_.lat, case_.lng]}
                icon={createCustomMarker(case_.diagnosis)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-semibold text-sm mb-2">{case_.diagnosis}</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID ca:</span>
                        <span>{case_.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tọa độ:</span>
                        <span>{case_.lat.toFixed(4)}, {case_.lng.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Báo cáo:</span>
                        <span>{new Date(case_.reported_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </div>
  );
};
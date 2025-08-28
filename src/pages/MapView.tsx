import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Map, MapPin, Activity, Clock } from 'lucide-react';
import { useHealthRealtime } from '@/contexts/HealthRealtimeContext';
import * as h3 from 'h3-js';

// MapLibre GL imports (conditional)
let maplibregl: any = null;
const loadMapLibre = async () => {
  if (!maplibregl) {
    const module: any = await import('maplibre-gl');
    await import('maplibre-gl/dist/maplibre-gl.css');
    maplibregl = module?.default || module;
  }
  return maplibregl;
};

interface Prediction {
  id: string;
  h3?: string;
  predicted: number;
  label: string;
  lat: number;
  lon: number;
  created_at: string;
  model_version?: string;
}

interface FormData {
  lat: string;
  lon: string;
  owner_id: string;
  features: string;
}

// Utility functions
const sha256Hex = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const getColorForPrediction = (predicted: number): string => {
  if (predicted < 60) return 'hsl(142, 71%, 45%)'; // green
  if (predicted < 80) return 'hsl(48, 96%, 53%)'; // yellow
  return 'hsl(0, 72%, 51%)'; // red
};

const getLabelForPrediction = (predicted: number): string => {
  if (predicted < 60) return 'low';
  if (predicted < 80) return 'medium';
  return 'high';
};

// HCMC Districts data based on the reference map
const hcmcDistricts = [
  { id: 1, name: 'Quận 1', center: [106.7009, 10.7756] },
  { id: 2, name: 'Quận 2', center: [106.7314, 10.7474] },
  { id: 3, name: 'Quận 3', center: [106.6917, 10.7756] },
  { id: 4, name: 'Quận 4', center: [106.7028, 10.7556] },
  { id: 5, name: 'Quận 5', center: [106.6814, 10.7556] },
  { id: 6, name: 'Quận 6', center: [106.6486, 10.7556] },
  { id: 7, name: 'Quận 7', center: [106.7219, 10.7356] },
  { id: 8, name: 'Quận 8', center: [106.6714, 10.7356] },
  { id: 9, name: 'Quận 9', center: [106.8019, 10.7756] },
  { id: 10, name: 'Quận 10', center: [106.6714, 10.7756] },
  { id: 11, name: 'Quận 11', center: [106.6514, 10.7656] },
  { id: 12, name: 'Quận 12', center: [106.6514, 10.8756] },
  { id: 'bt', name: 'Q. Bình Tân', center: [106.6019, 10.7656] },
  { id: 'tb', name: 'Q. Tân Bình', center: [106.6519, 10.8156] },
  { id: 'pn', name: 'Q. Phú Nhuận', center: [106.6919, 10.7956] },
  { id: 'gv', name: 'Q. Gò Vấp', center: [106.6819, 10.8456] },
  { id: 'bd', name: 'Q. Bình Dương', center: [106.7519, 10.8156] },
  { id: 'tp', name: 'Q. Tân Phú', center: [106.6319, 10.7956] },
  { id: 'bc', name: 'H. Bình Chánh', center: [106.5919, 10.7156] },
  { id: 'cc', name: 'H. Củ Chi', center: [106.4919, 10.7756] },
  { id: 'hm', name: 'H. Hóc Môn', center: [106.5919, 10.8756] },
  { id: 'nbe', name: 'H. Nhà Bè', center: [106.7319, 10.7056] },
  { id: 'cg', name: 'H. Cần Giờ', center: [106.9519, 10.4156] }
];

const getDistrictName = (lat: number, lon: number): string => {
  // Simple distance-based district assignment
  let minDistance = Infinity;
  let closestDistrict = 'Unknown';
  
  hcmcDistricts.forEach(district => {
    const distance = Math.sqrt(
      Math.pow(lat - district.center[1], 2) + 
      Math.pow(lon - district.center[0], 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestDistrict = district.name;
    }
  });
  
  return closestDistrict;
};

export default function MapView() {
  const { predictions, latestByCell, isConnected, loading, lastTick } = useHealthRealtime()
  
  const [formData, setFormData] = useState<FormData>({
    lat: '10.7756', // More central HCMC coordinates  
    lon: '106.7009',
    owner_id: '',
    features: '{}'
  })
  const [showMap, setShowMap] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapSource = useRef<any>(null);

  // Map data updates when predictions change
  useEffect(() => {
    if (showMap && mapSource.current) {
      updateMapData(Array.from(latestByCell.values()))
    }
  }, [latestByCell, showMap])

  // Map initialization
  useEffect(() => {
    if (showMap && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [showMap]);

  const initializeMap = async () => {
    try {
      await loadMapLibre();
      
      map.current = new maplibregl.Map({
        container: mapContainer.current!,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [106.7009, 10.7756], // Central HCMC
        zoom: 11.5 // Adjusted for better HCMC coverage
      });

      map.current.on('load', () => {
        // Add predictions source
        map.current.addSource('predictions', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        // Add circle layer for predictions
        map.current.addLayer({
          id: 'prediction-circles',
          type: 'circle',
          source: 'predictions',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'predicted'],
              50, 8,
              100, 16
            ],
            'circle-color': [
              'case',
              ['<', ['get', 'predicted'], 60], 'hsl(142, 71%, 45%)',
              ['<', ['get', 'predicted'], 80], 'hsl(48, 96%, 53%)',
              'hsl(0, 72%, 51%)'
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });

        mapSource.current = map.current.getSource('predictions');
        updateMapData(Array.from(latestByCell.values()));
      });

      map.current.on('error', (e: any) => {
        console.error('Map error:', e);
        toast({
          title: 'Bản đồ không khả dụng',
          description: 'Không tải được style hoặc nguồn dữ liệu bản đồ',
        });
      });
    } catch (error) {
      console.error('Map initialization failed:', error);
      toast({
        title: "Bản đồ không khả dụng",
        description: "Tiếp tục sử dụng danh sách hotspots",
        variant: "default"
      });
    }
  };

  const updateMapData = (data: Prediction[]) => {
    if (!mapSource.current) return;

    const features = data.map(pred => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [pred.lon, pred.lat]
      },
      properties: {
        predicted: pred.predicted,
        label: pred.label,
        h3: pred.h3,
      }
    }));

    mapSource.current.setData({
      type: 'FeatureCollection',
      features
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate inputs
      const lat = parseFloat(formData.lat);
      const lon = parseFloat(formData.lon);
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Tọa độ không hợp lệ');
      }

      let features;
      try {
        features = JSON.parse(formData.features);
      } catch {
        throw new Error('Features JSON không hợp lệ');
      }

      // Hash owner_id
      const hashed_owner_id = await sha256Hex(formData.owner_id);
      
      // Calculate H3 and district
      const h3Cell = h3.latLngToCell(lat, lon, 8);
      const district = getDistrictName(lat, lon);
      
      // Mock prediction will be handled by the global context
      toast({
        title: "Dự đoán demo",
        description: `${district} | H3: ${h3Cell.slice(0, 6)}... | Predicted: Mock`,
      });

      // Reset form
      setFormData(prev => ({ ...prev, owner_id: '', features: '{}' }));

    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get top hotspots from global state
  const topHotspots = React.useMemo(() => {
    return Array.from(latestByCell.values())
      .sort((a, b) => b.predicted - a.predicted)
      .slice(0, 10)
  }, [latestByCell])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Real-time Predictions HCMC</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {isConnected ? "Live" : "Offline"}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {lastTick}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Control & Hotspots */}
          <div className="space-y-6">
            {/* Event Input Form */}
            <Card className="rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Nhập Sự Kiện
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lat">Latitude</Label>
                      <Input
                        id="lat"
                        type="number"
                        step="any"
                        value={formData.lat}
                        onChange={(e) => setFormData(prev => ({ ...prev, lat: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lon">Longitude</Label>
                      <Input
                        id="lon"
                        type="number"
                        step="any"
                        value={formData.lon}
                        onChange={(e) => setFormData(prev => ({ ...prev, lon: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="owner_id">Owner ID</Label>
                    <Input
                      id="owner_id"
                      value={formData.owner_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_id: e.target.value }))}
                      placeholder="Sẽ được hash bằng SHA256"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="features">Features (JSON)</Label>
                    <Textarea
                      id="features"
                      value={formData.features}
                      onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                      placeholder='{"key": "value"}'
                      rows={3}
                    />
                  </div>
                  
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? 'Đang gửi...' : 'Dự đoán & Ghi'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Top Hotspots */}
            <Card className="rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle>Top Hotspots</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topHotspots.map((hotspot, index) => (
                      <div
                        key={hotspot.h3 || hotspot.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-mono">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <span>H3: {(hotspot.h3 || 'none').slice(0, 8)}...</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(hotspot.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" style={{ color: getColorForPrediction(hotspot.predicted) }}>
                            {hotspot.predicted}
                          </div>
                          <div className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
                            {hotspot.label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Map */}
          <div className="space-y-6">
            {/* Map Toggle */}
            <Card className="rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Bản đồ dự đoán
                  </div>
                  <Switch
                    checked={showMap}
                    onCheckedChange={setShowMap}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showMap ? (
                  <div 
                    ref={mapContainer} 
                    className="w-full h-96 rounded-lg border bg-muted"
                  />
                ) : (
                  <div className="w-full h-96 rounded-lg border bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Map className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Bật công tắc để hiển thị bản đồ
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
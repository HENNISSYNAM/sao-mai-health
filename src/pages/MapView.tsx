import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Map, MapPin, Activity, Clock } from 'lucide-react';
import * as h3 from 'h3-js';

// MapLibre GL imports (conditional)
let maplibregl: any = null;
const loadMapLibre = async () => {
  if (!maplibregl) {
    const module = await import('maplibre-gl');
    await import('maplibre-gl/dist/maplibre-gl.css');
    maplibregl = module.default;
  }
  return maplibregl;
};

interface Prediction {
  h3: string;
  predicted: number;
  label: string;
  lat: number;
  lon: number;
  created_at: string;
  model_version: string;
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

export default function MapView() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [formData, setFormData] = useState<FormData>({
    lat: '10.77689',
    lon: '106.70098',
    owner_id: '',
    features: '{}'
  });
  const [showMap, setShowMap] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapSource = useRef<any>(null);

  // Initialize data and realtime subscription
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Generate mock initial data for demo
        const mockPredictions: Prediction[] = Array.from({ length: 10 }, (_, i) => {
          const lat = 10.77689 + (Math.random() - 0.5) * 0.1;
          const lon = 106.70098 + (Math.random() - 0.5) * 0.1;
          const predicted = Math.floor(Math.random() * 45) + 55;
          return {
            h3: h3.latLngToCell(lat, lon, 8),
            predicted,
            label: getLabelForPrediction(predicted),
            lat,
            lon,
            created_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            model_version: 'mock-v1'
          };
        });

        setPredictions(mockPredictions);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error loading predictions:', error);
        toast({
          title: "Lỗi tải dữ liệu",
          description: "Đang sử dụng dữ liệu demo",
          variant: "default"
        });
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    // Setup realtime subscription (for future use when table exists)
    const channel = supabase
      .channel('predictions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'predictions'
        },
        (payload) => {
          console.log('New prediction received:', payload);
          // Handle real predictions when table exists
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        center: [106.70098, 10.77689],
        zoom: 11
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

        // Add circle layer
        map.current.addLayer({
          id: 'prediction-circles',
          type: 'circle',
          source: 'predictions',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'predicted'],
              50, 6,
              100, 12
            ],
            'circle-color': [
              'case',
              ['<', ['get', 'predicted'], 60], 'hsl(142, 71%, 45%)',
              ['<', ['get', 'predicted'], 80], 'hsl(48, 96%, 53%)',
              'hsl(0, 72%, 51%)'
            ],
            'circle-opacity': 0.6,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        });

        mapSource.current = map.current.getSource('predictions');
        updateMapData(predictions);
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
        h3: pred.h3
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
      
      // Calculate H3
      const h3Cell = h3.latLngToCell(lat, lon, 8);
      
      // Prepare event
      const event = {
        lat,
        lon,
        observed_at: new Date().toISOString(),
        features: {
          ...features,
          hashed_owner_id
        }
      };

      // Mock prediction (since no backend specified)
      const mockPredicted = Math.floor(Math.random() * 45) + 55; // 55-99
      const mockPrediction: Prediction = {
        h3: h3Cell,
        predicted: mockPredicted,
        label: getLabelForPrediction(mockPredicted),
        lat,
        lon,
        created_at: new Date().toISOString(),
        model_version: 'mock'
      };

      // Add to local state (simulating realtime)
      setPredictions(prev => [mockPrediction, ...prev.slice(0, 199)]);
      setLastUpdate(new Date());

      // Update map if visible
      if (showMap && mapSource.current) {
        updateMapData([mockPrediction, ...predictions]);
      }

      toast({
        title: "Đã gửi dự đoán",
        description: `H3: ${h3Cell.slice(0, 6)}... | Predicted: ${mockPredicted}`,
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

  // Get top hotspots (grouped by h3, latest per h3)
  const topHotspots = React.useMemo(() => {
    const grouped = predictions.reduce((acc, pred) => {
      if (!acc[pred.h3] || new Date(pred.created_at) > new Date(acc[pred.h3].created_at)) {
        acc[pred.h3] = pred;
      }
      return acc;
    }, {} as Record<string, Prediction>);

    return Object.values(grouped)
      .sort((a, b) => b.predicted - a.predicted)
      .slice(0, 10);
  }, [predictions]);

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
            <Badge variant="outline" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </Badge>
            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {lastUpdate.toLocaleTimeString()}
              </div>
            )}
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
                        key={hotspot.h3}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-mono">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-medium">
                              H3: {hotspot.h3.slice(0, 8)}...
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(hotspot.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {hotspot.predicted.toFixed(1)}
                            </div>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: getColorForPrediction(hotspot.predicted),
                                color: getColorForPrediction(hotspot.predicted)
                              }}
                            >
                              {hotspot.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {topHotspots.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        Chưa có dữ liệu hotspots
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Map Panel */}
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Map Panel
                  </CardTitle>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-map"
                      checked={showMap}
                      onCheckedChange={setShowMap}
                    />
                    <Label htmlFor="show-map">Hiển thị bản đồ</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showMap ? (
                  <div
                    ref={mapContainer}
                    className="w-full h-96 rounded-lg overflow-hidden"
                  />
                ) : (
                  <div className="w-full h-96 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Bật bản đồ để xem trực quan</p>
                      <p className="text-sm">Hoạt động hoàn chỉnh mà không cần bản đồ</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle>Thống Kê</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {predictions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tổng dự đoán
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {new Set(predictions.map(p => p.h3)).size}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      H3 cells
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
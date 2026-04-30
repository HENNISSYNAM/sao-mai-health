import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Map, Layers, ThermometerSun, CloudRain, Users, 
  Activity, AlertTriangle, MousePointerClick, Loader2, Shield
} from 'lucide-react';
import { getICD11Display } from '@/lib/icd11';
import { getNearestRegion, getRegionDisplayName } from '@/lib/geography';
import { useUserRiskScorer, type UserMapDot } from '@/hooks/useUserRiskScorer';

mapboxgl.accessToken =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoiaGVubmlzc3luYW0iLCJhIjoiY21nOWVkOHU4MDZlMTJub3BmbzFuMnNyeiJ9.zZ3ieYtNL9mxuGMMXND0tw';

interface CasePoint {
  id: string;
  lat: number;
  lng: number;
  disease: string;
  date: string;
  riskScore?: number;
  isCommunityAlert?: boolean;
  icon?: string;
  description?: string;
  photoUrl?: string;
}

interface LayerConfig {
  disease: boolean;
  population: boolean;
  weather: boolean;
}

interface ClickPrediction {
  lat: number;
  lng: number;
  loading: boolean;
  result?: {
    riskScore: number;
    riskLevel: string;
    topDiseases: Array<{ disease: string; count: number }>;
    prediction: string;
  };
}

export function GlobalSurveillanceMap() {
  const { t, i18n } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [cases, setCases] = useState<CasePoint[]>([]);
  const [showClustering, setShowClustering] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [layers, setLayers] = useState<LayerConfig>({ 
    disease: true, 
    population: false, 
    weather: false 
  });
  const [clickPrediction, setClickPrediction] = useState<ClickPrediction | null>(null);
  const [zoomLevel, setZoomLevel] = useState(4);
  const [showUserDots, setShowUserDots] = useState(true);
  const { mapUsers, myRisk, isLoading: riskLoading, fetchMapUsers } = useUserRiskScorer();
  const userMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Fetch case data + community alerts
  useEffect(() => {
    const fetchCases = async () => {
      try {
        // Fetch case_events
        const { data, error } = await supabase
          .from('case_events')
          .select('id, lat, lon, disease_code, occurred_at')
          .not('lat', 'is', null)
          .not('lon', 'is', null)
          .order('occurred_at', { ascending: false })
          .limit(500);

        let casePoints: CasePoint[] = [];
        
        if (!error && data) {
          casePoints = data.map(c => ({
            id: c.id,
            lat: c.lat!,
            lng: c.lon!,
            disease: c.disease_code,
            date: c.occurred_at
          }));
        }

        // Fetch community alerts
        try {
          const { data: alerts, error: alertsErr } = await supabase
            .from('community_alerts' as any)
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(200);

          if (!alertsErr && alerts) {
            const alertPoints: CasePoint[] = (alerts as any[]).map(a => ({
              id: a.id,
              lat: a.lat,
              lng: a.lng,
              disease: a.category || 'community_alert',
              date: a.created_at,
              riskScore: a.severity === 'critical' ? 90 : a.severity === 'high' ? 75 : a.severity === 'medium' ? 55 : 35,
              isCommunityAlert: true,
              icon: a.icon,
              description: a.description,
              photoUrl: a.photo_url,
            }));
            casePoints = [...alertPoints, ...casePoints];
          }
        } catch (e) {
          console.error('Error fetching community alerts:', e);
        }

        if (casePoints.length > 0) {
          setCases(casePoints);
        } else {
          // Generate mock data for demo
          const mockCases: CasePoint[] = [];
          const regions = [
            { lat: 10.8231, lng: 106.6297, name: 'HCMC' },
            { lat: 21.0285, lng: 105.8542, name: 'Hanoi' },
            { lat: 16.0544, lng: 108.2022, name: 'Da Nang' },
            { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
            { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
            { lat: -6.2088, lng: 106.8456, name: 'Jakarta' }
          ];

          regions.forEach((region, ri) => {
            for (let i = 0; i < 50; i++) {
              mockCases.push({
                id: `mock-${ri}-${i}`,
                lat: region.lat + (Math.random() - 0.5) * 0.5,
                lng: region.lng + (Math.random() - 0.5) * 0.5,
                disease: ['dengue', 'covid19', 'malaria', 'influenza'][Math.floor(Math.random() * 4)],
                date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                riskScore: Math.floor(Math.random() * 50) + 50
              });
            }
          });

          setCases(mockCases);
        }
      } catch (error) {
        console.error('Error fetching cases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();

    // Realtime subscription for new community alerts
    const channel = supabase
      .channel('community-alerts-map')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_alerts'
      }, (payload) => {
        const a = payload.new as any;
        if (a.lat && a.lng) {
          const newPoint: CasePoint = {
            id: a.id,
            lat: a.lat,
            lng: a.lng,
            disease: a.category || 'community_alert',
            date: a.created_at,
            riskScore: a.severity === 'critical' ? 90 : a.severity === 'high' ? 75 : 55,
            isCommunityAlert: true,
            icon: a.icon,
            description: a.description,
            photoUrl: a.photo_url,
          };
          setCases(prev => [newPoint, ...prev]);
          toast({
            title: `${a.icon || '🚨'} Cảnh báo cộng đồng mới`,
            description: a.description?.slice(0, 80) || a.category,
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [106.6297, 10.8231], // HCMC default
      zoom: 4,
      projection: 'globe'
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Track zoom level
    map.current.on('zoom', () => {
      setZoomLevel(Math.floor(map.current!.getZoom()));
    });

    // Click handler for prediction
    map.current.on('click', handleMapClick);

    map.current.on('load', () => {
      // Add atmosphere for globe view
      map.current!.setFog({
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      });

      updateMapLayers();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map when data or settings change
  useEffect(() => {
    if (map.current?.isStyleLoaded()) {
      updateMapLayers();
    }
  }, [cases, showClustering, showHeatmap, layers]);

  // Render user dots on map
  useEffect(() => {
    if (!map.current || !showUserDots) {
      // Remove existing user markers
      userMarkersRef.current.forEach(m => m.remove());
      userMarkersRef.current = [];
      return;
    }

    // Clear old markers
    userMarkersRef.current.forEach(m => m.remove());
    userMarkersRef.current = [];

    mapUsers.forEach((u: UserMapDot) => {
      const el = document.createElement('div');
      const color = u.riskLevel === 'high' ? '#ef4444' : u.riskLevel === 'medium' ? '#f59e0b' : '#22c55e';
      el.style.cssText = `
        width: 12px; height: 12px; border-radius: 50%;
        background: ${color}; border: 2px solid white;
        box-shadow: 0 0 6px ${color}80;
        cursor: pointer; transition: transform 0.2s;
      `;
      el.title = `User #${u.userId.slice(-4)} | Risk: ${u.riskLevel} | Age: ${u.ageGroup || 'N/A'}`;
      el.onmouseenter = () => { el.style.transform = 'scale(1.8)'; };
      el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

      const marker = new mapboxgl.Marker(el)
        .setLngLat([u.lng, u.lat])
        .setPopup(new mapboxgl.Popup({ offset: 10 }).setHTML(`
          <div class="p-2 text-xs">
            <div class="font-bold mb-1">👤 User #${u.userId.slice(-4)}</div>
            <div>Risk: <span style="color:${color};font-weight:bold">${u.riskLevel}</span></div>
            <div>Age: ${u.ageGroup || 'N/A'}</div>
          </div>
        `))
        .addTo(map.current!);

      userMarkersRef.current.push(marker);
    });
  }, [mapUsers, showUserDots]);

  const updateMapLayers = useCallback(() => {
    if (!map.current || cases.length === 0) return;

    // Remove existing layers
    ['cases-cluster', 'cases-cluster-count', 'cases-unclustered', 'cases-heat', 'weather-layer'].forEach(id => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
    });

    // Remove existing sources
    ['cases', 'weather'].forEach(id => {
      if (map.current!.getSource(id)) map.current!.removeSource(id);
    });

    // Create GeoJSON features
    const features = cases.map(c => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [c.lng, c.lat]
      },
      properties: {
        id: c.id,
        disease: c.disease,
        date: c.date,
        riskScore: c.riskScore || 50,
        isCommunityAlert: c.isCommunityAlert || false,
        icon: c.icon || '',
        description: c.description || '',
        photoUrl: c.photoUrl || ''
      }
    }));

    // Add source with clustering
    map.current!.addSource('cases', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
      cluster: showClustering,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    if (layers.disease) {
      if (showHeatmap) {
        // Heatmap layer
        map.current!.addLayer({
          id: 'cases-heat',
          type: 'heatmap',
          source: 'cases',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'riskScore'], 0, 0, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
            'heatmap-opacity': 0.7,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0, 0, 255, 0)',
              0.2, 'rgb(0, 255, 0)',
              0.4, 'rgb(255, 255, 0)',
              0.6, 'rgb(255, 128, 0)',
              1, 'rgb(255, 0, 0)'
            ]
          }
        });
      } else if (showClustering) {
        // Cluster circles
        map.current!.addLayer({
          id: 'cases-cluster',
          type: 'circle',
          source: 'cases',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step', ['get', 'point_count'],
              '#51bbd6', 10,
              '#f1f075', 50,
              '#f28cb1', 100,
              '#e55e5e'
            ],
            'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 30, 100, 40],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });

        // Cluster count labels
        map.current!.addLayer({
          id: 'cases-cluster-count',
          type: 'symbol',
          source: 'cases',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#fff'
          }
        });

        // Unclustered points
        map.current!.addLayer({
          id: 'cases-unclustered',
          type: 'circle',
          source: 'cases',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match', ['get', 'disease'],
              'dengue', '#ef4444',
              'covid19', '#3b82f6',
              'malaria', '#22c55e',
              'influenza', '#eab308',
              'community_alert', '#f97316',
              'food_poisoning', '#a855f7',
              'flood', '#06b6d4',
              'pollution', '#6b7280',
              'animal_bite', '#dc2626',
              'hand_foot_mouth', '#f59e0b',
              'measles', '#ec4899',
              '#6b7280'
            ],
            'circle-radius': [
              'case',
              ['get', 'isCommunityAlert'], 12,
              8
            ],
            'circle-stroke-width': [
              'case',
              ['get', 'isCommunityAlert'], 3,
              2
            ],
            'circle-stroke-color': [
              'case',
              ['get', 'isCommunityAlert'], '#f97316',
              '#fff'
            ]
          }
        });

        // Add click handler for community alert popups
        map.current!.on('click', 'cases-unclustered', (e: any) => {
          const feature = e.features?.[0];
          if (!feature) return;
          const props = feature.properties;
          if (props.isCommunityAlert === true || props.isCommunityAlert === 'true') {
            const coords = feature.geometry.coordinates.slice();
            let html = `<div class="p-3 min-w-[220px]">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">${props.icon || '🚨'}</span>
                <span class="font-bold text-sm">Cảnh báo cộng đồng</span>
              </div>
              <p class="text-xs text-gray-700 mb-2">${props.description || ''}</p>`;
            if (props.photoUrl) {
              html += `<img src="${props.photoUrl}" class="w-full h-24 object-cover rounded mb-2" />`;
            }
            html += `<p class="text-xs text-gray-500">${new Date(props.date).toLocaleString('vi-VN')}</p></div>`;
            
            new mapboxgl.Popup({ closeButton: true })
              .setLngLat(coords)
              .setHTML(html)
              .addTo(map.current!);
          }
        });
      }
    }

    // Add weather layer if enabled
    if (layers.weather) {
      // Simulated weather data (in production, fetch from weather API)
      const weatherPoints = [
        { lat: 10.8, lng: 106.6, temp: 32, humidity: 85 },
        { lat: 21.0, lng: 105.8, temp: 28, humidity: 70 },
        { lat: 13.7, lng: 100.5, temp: 34, humidity: 75 }
      ];

      weatherPoints.forEach((wp, i) => {
        const el = document.createElement('div');
        el.className = 'weather-marker';
        el.innerHTML = `
          <div class="bg-card/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-lg border border-border">
            <div class="flex items-center gap-1 text-xs">
              <span class="text-warning">${wp.temp}°C</span>
              <span class="text-muted-foreground">|</span>
              <span class="text-primary">${wp.humidity}%</span>
            </div>
          </div>
        `;
        new mapboxgl.Marker(el).setLngLat([wp.lng, wp.lat]).addTo(map.current!);
      });
    }
  }, [cases, showClustering, showHeatmap, layers]);

  const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
    const { lngLat } = e;
    
    setClickPrediction({
      lat: lngLat.lat,
      lng: lngLat.lng,
      loading: true
    });

    try {
      const { data, error } = await supabase.functions.invoke('predict-disease-risk', {
        body: { lat: lngLat.lat, lon: lngLat.lng }
      });

      if (error) throw error;

      const region = getNearestRegion(lngLat.lat, lngLat.lng, 'city');
      const regionName = region ? getRegionDisplayName(region, i18n.language as 'en' | 'vi') : '';

      setClickPrediction({
        lat: lngLat.lat,
        lng: lngLat.lng,
        loading: false,
        result: {
          riskScore: data.riskScore || 50,
          riskLevel: data.riskLevel || 'MEDIUM',
          topDiseases: data.topDiseases || [],
          prediction: data.prediction || ''
        }
      });

      toast({
        title: t('maps.prediction.title'),
        description: `${regionName} - ${t('maps.prediction.riskScore')}: ${data.riskScore}/100`
      });

      // Add marker at click location
      if (popupRef.current) popupRef.current.remove();
      
      popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false })
        .setLngLat([lngLat.lng, lngLat.lat])
        .setHTML(`
          <div class="p-3 min-w-[200px]">
            <h3 class="font-bold text-sm mb-2">${t('maps.prediction.title')}</h3>
            <p class="text-xs text-gray-600 mb-2">${regionName}</p>
            <div class="flex justify-between items-center">
              <span class="text-xs">${t('maps.prediction.riskScore')}:</span>
              <span class="font-bold ${data.riskScore > 70 ? 'text-red-500' : data.riskScore > 50 ? 'text-yellow-500' : 'text-green-500'}">${data.riskScore}/100</span>
            </div>
          </div>
        `)
        .addTo(map.current!);
    } catch (error) {
      console.error('Prediction error:', error);
      setClickPrediction({
        lat: lngLat.lat,
        lng: lngLat.lng,
        loading: false
      });
      toast({
        title: t('common.error'),
        variant: 'destructive'
      });
    }
  };

  const toggleLayer = (layer: keyof LayerConfig) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl h-[600px]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            {t('maps.title')}
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Clustering toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="clustering"
                checked={showClustering}
                onCheckedChange={setShowClustering}
              />
              <Label htmlFor="clustering" className="text-sm">{t('maps.clustering')}</Label>
            </div>

            {/* Heatmap toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="heatmap"
                checked={showHeatmap}
                onCheckedChange={setShowHeatmap}
              />
              <Label htmlFor="heatmap" className="text-sm">{t('maps.heatmap')}</Label>
            </div>

            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              {cases.length} {t('maps.cases')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative">
        {/* Map container */}
        <div ref={mapContainer} className="w-full h-[500px]" />

        {/* Layer controls overlay */}
        <div className="absolute top-4 left-4 z-10">
          <Card className="bg-card/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {t('maps.layers.disease')}
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => toggleLayer('disease')}
                  className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${layers.disease ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {t('maps.layers.disease')}
                </button>
                
                <button
                  onClick={() => toggleLayer('population')}
                  className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${layers.population ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                >
                  <Users className="h-3 w-3" />
                  {t('maps.layers.population')}
                </button>
                
                <button
                  onClick={() => toggleLayer('weather')}
                  className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${layers.weather ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                >
                  <ThermometerSun className="h-3 w-3" />
                  {t('maps.layers.weather')}
                </button>

                <button
                  onClick={() => setShowUserDots(!showUserDots)}
                  className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${showUserDots ? 'bg-success/10 text-success' : 'text-muted-foreground'}`}
                >
                  <Shield className="h-3 w-3" />
                  Users ({mapUsers.length})
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Click to predict hint */}
        <div className="absolute bottom-4 left-4 z-10">
          <Badge variant="secondary" className="gap-1 bg-card/90 backdrop-blur-sm">
            <MousePointerClick className="h-3 w-3" />
            {t('maps.prediction.clickToPredict')}
          </Badge>
        </div>

        {/* Zoom level indicator */}
        <div className="absolute bottom-4 right-4 z-10">
          <Badge variant="outline" className="bg-card/90 backdrop-blur-sm">
            Zoom: {zoomLevel}
          </Badge>
        </div>

        {/* Prediction result panel */}
        {clickPrediction && clickPrediction.result && (
          <div className="absolute top-4 right-4 z-10 w-64">
            <Card className="bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  {t('maps.prediction.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${
                    clickPrediction.result.riskScore > 70 ? 'text-danger' :
                    clickPrediction.result.riskScore > 50 ? 'text-warning' : 'text-success'
                  }`}>
                    {clickPrediction.result.riskScore}/100
                  </p>
                  <Badge variant={
                    clickPrediction.result.riskLevel === 'HIGH' ? 'destructive' :
                    clickPrediction.result.riskLevel === 'MEDIUM' ? 'default' : 'secondary'
                  }>
                    {clickPrediction.result.riskLevel}
                  </Badge>
                </div>

                {clickPrediction.result.topDiseases.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">{t('maps.prediction.topDiseases')}:</p>
                    <div className="space-y-1">
                      {clickPrediction.result.topDiseases.slice(0, 3).map((d, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{getICD11Display(d.disease, i18n.language as 'en' | 'vi')}</span>
                          <span className="font-semibold">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setClickPrediction(null)}
                >
                  {t('common.close')}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading overlay for prediction */}
        {clickPrediction?.loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">{t('maps.aiAgent.processing')}</p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-border bg-muted/30">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-muted-foreground">{t('maps.riskLevel')}:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>{t('diseases.dengue')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>{t('diseases.covid19')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>{t('diseases.malaria')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>{t('diseases.influenza')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

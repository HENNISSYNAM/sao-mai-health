import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Map, MapPin, Activity, Clock, AlertTriangle, TrendingUp, FileText, User, Stethoscope } from 'lucide-react';
import * as h3 from 'h3-js';
import { GlobalAIAssistant } from '@/components/GlobalAIAssistant';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Mapbox GL imports
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiaGVubmlzc3luYW0iLCJhIjoiY21nOWVkOHU4MDZlMTJub3BmbzFuMnNyeiJ9.zZ3ieYtNL9mxuGMMXND0tw';
interface Prediction {
  h3: string;
  predicted: number;
  label: string;
  lat: number;
  lon: number;
  created_at: string;
  model_version: string;
  district?: string;
  caseData?: any; // Store full case event data
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
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
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
const hcmcDistricts = [{
  id: 1,
  name: 'Quận 1',
  center: [106.7009, 10.7756]
}, {
  id: 2,
  name: 'Quận 2',
  center: [106.7314, 10.7474]
}, {
  id: 3,
  name: 'Quận 3',
  center: [106.6917, 10.7756]
}, {
  id: 4,
  name: 'Quận 4',
  center: [106.7028, 10.7556]
}, {
  id: 5,
  name: 'Quận 5',
  center: [106.6814, 10.7556]
}, {
  id: 6,
  name: 'Quận 6',
  center: [106.6486, 10.7556]
}, {
  id: 7,
  name: 'Quận 7',
  center: [106.7219, 10.7356]
}, {
  id: 8,
  name: 'Quận 8',
  center: [106.6714, 10.7356]
}, {
  id: 9,
  name: 'Quận 9',
  center: [106.8019, 10.7756]
}, {
  id: 10,
  name: 'Quận 10',
  center: [106.6714, 10.7756]
}, {
  id: 11,
  name: 'Quận 11',
  center: [106.6514, 10.7656]
}, {
  id: 12,
  name: 'Quận 12',
  center: [106.6514, 10.8756]
}, {
  id: 'bt',
  name: 'Q. Bình Tân',
  center: [106.6019, 10.7656]
}, {
  id: 'tb',
  name: 'Q. Tân Bình',
  center: [106.6519, 10.8156]
}, {
  id: 'pn',
  name: 'Q. Phú Nhuận',
  center: [106.6919, 10.7956]
}, {
  id: 'gv',
  name: 'Q. Gò Vấp',
  center: [106.6819, 10.8456]
}, {
  id: 'bd',
  name: 'Q. Bình Dương',
  center: [106.7519, 10.8156]
}, {
  id: 'tp',
  name: 'Q. Tân Phú',
  center: [106.6319, 10.7956]
}, {
  id: 'bc',
  name: 'H. Bình Chánh',
  center: [106.5919, 10.7156]
}, {
  id: 'cc',
  name: 'H. Củ Chi',
  center: [106.4919, 10.7756]
}, {
  id: 'hm',
  name: 'H. Hóc Môn',
  center: [106.5919, 10.8756]
}, {
  id: 'nbe',
  name: 'H. Nhà Bè',
  center: [106.7319, 10.7056]
}, {
  id: 'cg',
  name: 'H. Cần Giờ',
  center: [106.9519, 10.4156]
}];
const getDistrictName = (lat: number, lon: number): string => {
  // Simple distance-based district assignment
  let minDistance = Infinity;
  let closestDistrict = 'Unknown';
  hcmcDistricts.forEach(district => {
    const distance = Math.sqrt(Math.pow(lat - district.center[1], 2) + Math.pow(lon - district.center[0], 2));
    if (distance < minDistance) {
      minDistance = distance;
      closestDistrict = district.name;
    }
  });
  return closestDistrict;
};
export default function MapView() {
  const {
    t,
    i18n
  } = useTranslation();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [formData, setFormData] = useState<FormData>({
    lat: '10.7756',
    lon: '106.7009',
    owner_id: '',
    features: '{}'
  });
  const [showMap, setShowMap] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzingCase, setAnalyzingCase] = useState(false);
  const [mapPrompt, setMapPrompt] = useState('');
  const [processingMapCommand, setProcessingMapCommand] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapSource = useRef<any>(null);
  const mapMarkers = useRef<any[]>([]);
  const mapLayers = useRef<any[]>([]);

  // Initialize data and realtime subscription
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load real case events from database
        const {
          data: caseEvents,
          error
        } = await supabase.from('case_events').select('*').order('occurred_at', {
          ascending: false
        }).limit(100);
        if (error) {
          console.error('Error loading case events:', error);
          // Generate mock data as fallback
          const mockPredictions: Prediction[] = Array.from({
            length: 15
          }, (_, i) => {
            const lat = 10.7756 + (Math.random() - 0.5) * 0.2;
            const lon = 106.7009 + (Math.random() - 0.5) * 0.3;
            const predicted = Math.floor(Math.random() * 45) + 55;
            const district = getDistrictName(lat, lon);
            return {
              h3: h3.latLngToCell(lat, lon, 8),
              predicted,
              label: getLabelForPrediction(predicted),
              lat,
              lon,
              district,
              created_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
              model_version: 'hcmc-v1'
            };
          });
          setPredictions(mockPredictions);
        } else {
          // Convert case events to predictions format
          const casePredictions: Prediction[] = caseEvents.filter((event: any) => event.lat && event.lon).map((event: any) => {
            // Calculate risk based on disease code and nearby cases
            let predicted = 50;
            if (event.disease_code === 'dengue') predicted = 75;else if (event.disease_code === 'covid19') predicted = 85;else if (event.disease_code === 'tcm') predicted = 60;
            const district = getDistrictName(event.lat, event.lon);
            return {
              h3: h3.latLngToCell(event.lat, event.lon, 8),
              predicted,
              label: getLabelForPrediction(predicted),
              lat: event.lat,
              lon: event.lon,
              district,
              created_at: event.occurred_at,
              model_version: 'case-data-v1',
              caseData: event // Store full case data
            };
          });
          setPredictions(casePredictions);
          toast({
            title: t("maps.toast.dataLoaded"),
            description: t("maps.toast.casesDisplayed", {
              count: casePredictions.length
            })
          });
        }
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: t("maps.toast.loadError"),
          description: t("maps.toast.usingDemo"),
          variant: "default"
        });
      } finally {
        setLoading(false);
      }
    };
    initializeData();

    // Setup realtime subscription for case_events
    const caseChannel = supabase.channel('case-events-realtime').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'case_events'
    }, payload => {
      console.log('New case event received:', payload);
      const newCase = payload.new as any;
      if (newCase.lat && newCase.lon) {
        // Calculate risk based on disease
        let predicted = 50;
        if (newCase.disease_code === 'dengue') predicted = 75;else if (newCase.disease_code === 'covid19') predicted = 85;else if (newCase.disease_code === 'tcm') predicted = 60;
        const district = getDistrictName(newCase.lat, newCase.lon);
        const newPrediction: Prediction = {
          h3: h3.latLngToCell(newCase.lat, newCase.lon, 8),
          predicted,
          label: getLabelForPrediction(predicted),
          lat: newCase.lat,
          lon: newCase.lon,
          district,
          created_at: newCase.occurred_at,
          model_version: 'realtime-v1',
          caseData: newCase
        };

        // Add to predictions and update map
        setPredictions(prev => [newPrediction, ...prev]);
        setLastUpdate(new Date());
        toast({
          title: t("maps.toast.newCase"),
          description: `${newCase.disease_code} - ${district}`
        });

        // Update map if it's initialized
        if (map.current && mapSource.current) {
          updateMapData([newPrediction, ...predictions]);
        }
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(caseChannel);
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
      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [106.7009, 10.7756],
        // Central HCMC
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
            'circle-radius': ['interpolate', ['linear'], ['get', 'predicted'], 50, 8, 100, 16],
            'circle-color': ['case', ['<', ['get', 'predicted'], 60], 'hsl(142, 71%, 45%)', ['<', ['get', 'predicted'], 80], 'hsl(48, 96%, 53%)', 'hsl(0, 72%, 51%)'],
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });

        // Add click handler for markers
        map.current.on('click', 'prediction-circles', (e: any) => {
          const features = e.features;
          if (features && features.length > 0) {
            const clickedFeature = features[0];
            const h3Id = clickedFeature.properties.h3;

            // Find the full prediction data
            const prediction = predictions.find(p => p.h3 === h3Id);
            if (prediction?.caseData) {
              handleCaseClick(prediction.caseData);
            }
          }
        });

        // Change cursor on hover
        map.current.on('mouseenter', 'prediction-circles', () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'prediction-circles', () => {
          map.current.getCanvas().style.cursor = '';
        });
        mapSource.current = map.current.getSource('predictions');
        updateMapData(predictions);
      });
    } catch (error) {
      console.error('Map initialization failed:', error);
      toast({
        title: t("maps.mapNotAvailable"),
        description: t("maps.usingHotspotList"),
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
        district: pred.district
      }
    }));
    mapSource.current.setData({
      type: 'FeatureCollection',
      features
    });
  };
  const handleCaseClick = async (caseData: any) => {
    setSelectedCase(caseData);
    setAiAnalysis('');
    setAnalyzingCase(true);
    try {
      // Prepare case information for AI analysis
      const caseInfo = {
        disease: caseData.disease_code,
        symptoms: caseData.symptoms,
        age: caseData.patient_age_bucket,
        gender: caseData.patient_gender,
        date: caseData.occurred_at
      };

      // Call AI for medical analysis
      const {
        data,
        error
      } = await supabase.functions.invoke('surveillance-ai', {
        body: {
          messages: [{
            role: 'user',
            content: `Bạn là một bác sĩ có kinh nghiệm. Hãy phân tích ca bệnh sau và đưa ra đề xuất bằng ngôn ngữ đơn giản, dễ hiểu:

Bệnh: ${caseInfo.disease}
Triệu chứng: ${JSON.stringify(caseInfo.symptoms)}
Tuổi: ${caseInfo.age || 'Không rõ'}
Giới tính: ${caseInfo.gender || 'Không rõ'}

Hãy cung cấp:
1. Phân tích tình trạng bệnh (giải thích đơn giản)
2. Mức độ nghiêm trọng
3. Lời khuyên chăm sóc
4. Dấu hiệu cần đến bệnh viện ngay`
          }]
        }
      });
      if (error) throw error;
      setAiAnalysis(data.reply || 'Không thể phân tích ca bệnh này.');
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiAnalysis('Lỗi khi phân tích ca bệnh. Vui lòng thử lại.');
    } finally {
      setAnalyzingCase(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setPredictionResult(null);
    try {
      // Validate inputs
      const lat = parseFloat(formData.lat);
      const lon = parseFloat(formData.lon);
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error(t("maps.toast.invalidCoordinates"));
      }

      // Validate GPS range for HCMC
      if (lat < 10.3 || lat > 11.2 || lon < 106.3 || lon > 107.1) {
        toast({
          title: t("common.warning"),
          description: t("maps.toast.outsideArea"),
          variant: "default"
        });
      }
      console.log('Calling AI prediction for:', {
        lat,
        lon
      });

      // Call AI prediction API
      const {
        data,
        error
      } = await supabase.functions.invoke('predict-disease-risk', {
        body: {
          lat,
          lon
        }
      });
      if (error) throw error;
      console.log('Prediction result:', data);
      setPredictionResult(data);

      // Create prediction object for map
      const h3Cell = h3.latLngToCell(lat, lon, 8);
      const district = getDistrictName(lat, lon);
      const newPrediction: Prediction = {
        h3: h3Cell,
        predicted: data.riskScore || 50,
        label: data.riskLevel === 'CAO' ? 'high' : data.riskLevel === 'TRUNG BÌNH' ? 'medium' : 'low',
        lat,
        lon,
        district,
        created_at: new Date().toISOString(),
        model_version: 'ai-regression-v1'
      };

      // Add to predictions
      setPredictions(prev => [newPrediction, ...prev.slice(0, 199)]);
      setLastUpdate(new Date());

      // Update map if visible
      if (showMap && mapSource.current) {
        updateMapData([newPrediction, ...predictions]);
      }
      toast({
        title: t("maps.toast.predictionComplete"),
        description: `${district} | ${t("maps.risk")}: ${data.riskLevel} (${data.riskScore}/100)`
      });
    } catch (error) {
      console.error('Prediction error:', error);
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.error"),
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle map agent commands
  const handleMapPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapPrompt.trim()) return;
    setProcessingMapCommand(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('map-agent', {
        body: {
          prompt: mapPrompt
        }
      });
      if (error) throw error;
      if (data?.commands) {
        executeMapCommands(data.commands);
        toast({
          title: t("maps.toast.commandProcessed"),
          description: t("maps.toast.actionsExecuted", {
            count: data.commands.length
          })
        });
      }
      setMapPrompt('');
    } catch (error: any) {
      console.error('Map agent error:', error);
      toast({
        title: t("common.error"),
        description: error.message || t("common.error"),
        variant: "destructive"
      });
    } finally {
      setProcessingMapCommand(false);
    }
  };

  // Execute map commands from AI
  const executeMapCommands = (commands: any[]) => {
    if (!map.current) {
      toast({
        title: t("common.error"),
        description: t("maps.toast.enableMapFirst"),
        variant: "destructive"
      });
      return;
    }
    commands.forEach(cmd => {
      try {
        switch (cmd.cmd) {
          case 'add-marker':
            const marker = new mapboxgl.Marker({
              color: cmd.color || 'red'
            }).setLngLat([cmd.lng, cmd.lat]).setPopup(new mapboxgl.Popup().setHTML(`<strong>${cmd.label || 'Marker'}</strong>`)).addTo(map.current);
            mapMarkers.current.push(marker);
            break;
          case 'add-circle':
            const circleId = `circle-${Date.now()}-${Math.random()}`;
            const radiusInMeters = (cmd.radius_km || 1) * 1000;
            map.current.addSource(circleId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [cmd.lng, cmd.lat]
                },
                properties: {}
              }
            });
            map.current.addLayer({
              id: circleId,
              type: 'circle',
              source: circleId,
              paint: {
                'circle-radius': radiusInMeters / Math.cos(cmd.lat * Math.PI / 180) / 0.075,
                'circle-color': cmd.color || 'red',
                'circle-opacity': 0.3,
                'circle-stroke-width': 2,
                'circle-stroke-color': cmd.color || 'red',
                'circle-stroke-opacity': 0.8
              }
            });
            mapLayers.current.push(circleId);
            break;
          case 'add-heatmap':
            if (cmd.points && cmd.points.length > 0) {
              const heatmapId = `heatmap-${Date.now()}`;
              map.current.addSource(heatmapId, {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features: cmd.points.map((p: any) => ({
                    type: 'Feature',
                    geometry: {
                      type: 'Point',
                      coordinates: [p.lng, p.lat]
                    },
                    properties: {
                      intensity: p.intensity || 1
                    }
                  }))
                }
              });
              map.current.addLayer({
                id: heatmapId,
                type: 'heatmap',
                source: heatmapId,
                paint: {
                  'heatmap-weight': ['get', 'intensity'],
                  'heatmap-intensity': 1,
                  'heatmap-radius': 30,
                  'heatmap-opacity': 0.7
                }
              });
              mapLayers.current.push(heatmapId);
            }
            break;
          case 'add-route':
            if (cmd.points && cmd.points.length > 1) {
              const routeId = `route-${Date.now()}`;
              map.current.addSource(routeId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: cmd.points.map((p: any) => [p.lng, p.lat])
                  },
                  properties: {}
                }
              });
              map.current.addLayer({
                id: routeId,
                type: 'line',
                source: routeId,
                paint: {
                  'line-color': cmd.color || 'blue',
                  'line-width': 4,
                  'line-opacity': 0.8
                }
              });
              mapLayers.current.push(routeId);
            }
            break;
          case 'clear':
            // Remove all markers
            mapMarkers.current.forEach(m => m.remove());
            mapMarkers.current = [];

            // Remove all layers
            mapLayers.current.forEach(layerId => {
              if (map.current.getLayer(layerId)) {
                map.current.removeLayer(layerId);
              }
              if (map.current.getSource(layerId)) {
                map.current.removeSource(layerId);
              }
            });
            mapLayers.current = [];
            break;
          case 'fit-bounds':
            if (cmd.bounds) {
              map.current.fitBounds(cmd.bounds, {
                padding: 50
              });
            }
            break;
        }
      } catch (error) {
        console.error('Error executing command:', cmd, error);
      }
    });
  };

  // Get top hotspots (grouped by h3, latest per h3)
  const topHotspots = React.useMemo(() => {
    const grouped = predictions.reduce((acc, pred) => {
      if (!acc[pred.h3] || new Date(pred.created_at) > new Date(acc[pred.h3].created_at)) {
        acc[pred.h3] = pred;
      }
      return acc;
    }, {} as Record<string, Prediction>);
    return Object.values(grouped).sort((a, b) => b.predicted - a.predicted).slice(0, 10);
  }, [predictions]);
  return <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t("maps.title")}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {t("dashboard.live")}
            </Badge>
            {lastUpdate && <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {lastUpdate.toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
              </div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Control & Hotspots */}
          <div className="space-y-6">
            {/* AI Map Agent */}
            <Card className="rounded-2xl shadow-lg border-2 border-purple-500/20">
              <CardHeader className="bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  {t("maps.aiAgent.title")}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("maps.aiAgent.placeholder")}
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleMapPrompt} className="space-y-4">
                  <div>
                    <Textarea id="mapPrompt" value={mapPrompt} onChange={e => setMapPrompt(e.target.value)} placeholder={t("maps.aiAgent.placeholder")} className="min-h-[80px]" />
                  </div>
                  
                  <Button type="submit" disabled={processingMapCommand || !mapPrompt.trim()} className="w-full h-12 text-base font-semibold bg-purple-500 hover:bg-purple-600">
                    {processingMapCommand ? <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        {t("maps.aiAgent.processing")}
                      </> : <>
                        <Map className="h-4 w-4 mr-2" />
                        {t("maps.aiAgent.execute")}
                      </>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* AI Prediction Form - Simplified */}
            <Card className="rounded-2xl shadow-lg border-2 border-primary/20">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {t("maps.prediction.title")}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("maps.prediction.clickToPredict")}
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lat" className="text-sm font-semibold">
                        {t("maps.prediction.latPlaceholder")} <span className="text-destructive">*</span>
                      </Label>
                      <Input id="lat" type="number" step="any" value={formData.lat} onChange={e => setFormData(prev => ({
                      ...prev,
                      lat: e.target.value
                    }))} required className="font-mono" placeholder="10.7756" />
                    </div>
                    <div>
                      <Label htmlFor="lon" className="text-sm font-semibold">
                        {t("maps.prediction.lonPlaceholder")} <span className="text-destructive">*</span>
                      </Label>
                      <Input id="lon" type="number" step="any" value={formData.lon} onChange={e => setFormData(prev => ({
                      ...prev,
                      lon: e.target.value
                    }))} required className="font-mono" placeholder="106.7009" />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90">
                    {submitting ? <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        {t("maps.aiAgent.processing")}
                      </> : <>
                        <Activity className="h-4 w-4 mr-2" />
                        {t("maps.prediction.submit")}
                      </>}
                  </Button>

                  {/* Prediction Result */}
                  {predictionResult && <div className={`mt-4 p-4 rounded-lg border-2 ${predictionResult.riskLevel === 'CAO' ? 'bg-destructive/5 border-destructive' : predictionResult.riskLevel === 'TRUNG BÌNH' ? 'bg-yellow-500/5 border-yellow-500' : 'bg-green-500/5 border-green-500'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{t("maps.prediction.result")}</h4>
                        <Badge variant={predictionResult.riskLevel === 'CAO' ? 'destructive' : predictionResult.riskLevel === 'TRUNG BÌNH' ? 'default' : 'secondary'} className="text-sm">
                          {predictionResult.riskLevel}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("maps.prediction.riskScore")}:</span>
                          <span className="font-bold">{predictionResult.riskScore}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("maps.cases")}:</span>
                          <span className="font-semibold">{predictionResult.nearbyCases} {t("common.cases")}</span>
                        </div>
                      </div>

                      {predictionResult.topDiseases?.length > 0 && <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold mb-2">{t("maps.prediction.topDiseases")}:</p>
                          <div className="space-y-1">
                            {predictionResult.topDiseases.map((d: any) => <div key={d.disease} className="flex justify-between text-xs">
                                <span>{t(`diseases.${d.disease}`, {
                            defaultValue: d.disease
                          }) as string}</span>
                                <span className="font-semibold">{d.count} {t("common.cases")}</span>
                              </div>)}
                          </div>
                        </div>}

                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {predictionResult.prediction}
                        </p>
                      </div>
                    </div>}
                </form>
              </CardContent>
            </Card>

            {/* Top Hotspots */}
            
          </div>

          {/* Right Column: Map Panel */}
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    {t("maps.title")}
                  </CardTitle>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="show-map" checked={showMap} onCheckedChange={setShowMap} />
                    <Label htmlFor="show-map">{showMap ? t("maps.disableMap") : t("maps.enableMap")}</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showMap ? <div ref={mapContainer} className="w-full h-96 rounded-lg overflow-hidden" /> : <div className="w-full h-96 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("maps.enableMap")}</p>
                    </div>
                  </div>}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Thống Kê Dịch Bệnh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DiseaseStatsPanel />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Case Detail Modal */}
      {selectedCase && <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <FileText className="h-6 w-6 text-primary" />
                {t("maps.caseDetail.title")} & {t("maps.caseDetail.aiAnalysis")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Case Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t("maps.caseDetail.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">{t("maps.caseDetail.disease")}:</span>
                      <Badge className="ml-2">{t(`diseases.${selectedCase.disease_code}`, {
                      defaultValue: selectedCase.disease_code
                    }) as string}</Badge>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">{t("maps.caseDetail.date")}:</span>
                      <span className="ml-2">{new Date(selectedCase.occurred_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">{t("maps.caseDetail.age")}/{t("maps.caseDetail.gender")}:</span>
                      <span className="ml-2">{selectedCase.patient_age_bucket || 'N/A'} / {selectedCase.patient_gender || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">{t("geography.location")}:</span>
                      <span className="ml-2">{selectedCase.ward_id}, {selectedCase.district_id}</span>
                    </div>
                  </div>

                  {selectedCase.symptoms && <div className="mt-4">
                      <span className="text-sm font-medium text-muted-foreground block mb-2">{t("maps.caseDetail.symptoms")}:</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedCase.symptoms).filter(([_, value]) => value === true).map(([key]) => <Badge key={key} variant="secondary">{key}</Badge>)}
                      </div>
                    </div>}
                </CardContent>
              </Card>

              {/* AI Analysis */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    {t("maps.caseDetail.aiAnalysis")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {analyzingCase ? <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                      <div className="text-center text-sm text-muted-foreground mt-4">
                        {t("maps.caseDetail.analyzing")}
                      </div>
                    </div> : aiAnalysis ? <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {aiAnalysis}
                      </div>
                    </div> : <div className="text-muted-foreground italic text-center py-4">
                      {t("common.noData")}
                    </div>}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedCase(null)}>
                {t("common.close")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>}

      {/* Global AI Assistant */}
      <GlobalAIAssistant />
    </div>;
}

// New Component for Disease Statistics
function DiseaseStatsPanel() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const {
          data: caseEvents
        } = await supabase.from('case_events').select('*').order('occurred_at', {
          ascending: false
        }).limit(200);
        const {
          data: alerts
        } = await supabase.from('alerts').select('*').eq('status', 'open');

        // Calculate statistics
        const totalCases = caseEvents?.length || 0;
        const todayCases = caseEvents?.filter(c => {
          const today = new Date().toISOString().split('T')[0];
          return c.occurred_at?.startsWith(today);
        }).length || 0;

        // Group by disease
        const diseaseStats: Record<string, number> = {};
        caseEvents?.forEach(c => {
          if (c.disease_code) {
            diseaseStats[c.disease_code] = (diseaseStats[c.disease_code] || 0) + 1;
          }
        });

        // Top diseases
        const topDiseases = Object.entries(diseaseStats).sort(([, a], [, b]) => b - a).slice(0, 3);

        // Group by district
        const districtStats: Record<string, number> = {};
        caseEvents?.forEach(c => {
          if (c.district_id) {
            districtStats[c.district_id] = (districtStats[c.district_id] || 0) + 1;
          }
        });
        const topDistricts = Object.entries(districtStats).sort(([, a], [, b]) => b - a).slice(0, 3);
        setStats({
          totalCases,
          todayCases,
          openAlerts: alerts?.length || 0,
          topDiseases,
          topDistricts
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    // Realtime subscription
    const channel = supabase.channel('stats-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'case_events'
    }, () => {
      fetchStats();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  if (loading) {
    return <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>;
  }
  if (!stats) {
    return <div className="text-center text-muted-foreground">Không có dữ liệu</div>;
  }
  return <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-primary/5 rounded-lg">
          <div className="text-2xl font-bold text-primary">{stats.totalCases}</div>
          <div className="text-xs text-muted-foreground">Tổng ca</div>
        </div>
        <div className="text-center p-3 bg-blue-500/5 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.todayCases}</div>
          <div className="text-xs text-muted-foreground">Hôm nay</div>
        </div>
        <div className="text-center p-3 bg-destructive/5 rounded-lg">
          <div className="text-2xl font-bold text-destructive">{stats.openAlerts}</div>
          <div className="text-xs text-muted-foreground">Cảnh báo</div>
        </div>
      </div>

      {/* Top Diseases */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Bệnh phổ biến nhất:
        </div>
        {stats.topDiseases.map(([disease, count]: [string, number]) => <div key={disease} className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-sm font-medium">{disease}</span>
            <Badge variant="secondary">{count} ca</Badge>
          </div>)}
      </div>

      {/* Top Districts */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4" />
          Ổ bệnh chính:
        </div>
        {stats.topDistricts.map(([district, count]: [string, number]) => <div key={district} className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="text-sm font-medium">{district}</span>
            <Badge variant="destructive">{count} ca</Badge>
          </div>)}
      </div>
    </div>;
}
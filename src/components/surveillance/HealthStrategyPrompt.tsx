import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, X, Send, TrendingUp, Zap, MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

export interface ProvinceRisk {
  name: string;
  id: string;
  risk: number;
  avgRisk: number;
  maxRisk: number;
  nodeCount: number;
  newsIntensity: number;
  confidence: number;
  predictedCases: number;
  riskLevel: string;
  trend: string;
}

export interface HotspotProvinceAgg {
  name: string;
  id: string;
  diseaseRisk: number;
  newsIntensity: number;
  confidence: number;
  hotspotCount: number;
  avgRisk: number;
  maxRisk: number;
  topDisease: string;
}

interface HealthStrategyPromptProps {
  onForecastResult: (geojson: any, meta: any, provinceRisks: ProvinceRisk[]) => void;
  onClear: () => void;
  mapInteracting?: boolean;
  clickedProvince?: any;
  mapMode?: string;
}

// Point-in-polygon (ray casting)
function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInFeature(lat: number, lng: number, feature: any): boolean {
  const geom = feature.geometry;
  if (geom.type === 'Polygon') {
    return geom.coordinates.some((ring: number[][]) => pointInPolygon(lat, lng, ring));
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some((poly: number[][][]) =>
      poly.some((ring: number[][]) => pointInPolygon(lat, lng, ring))
    );
  }
  return false;
}

// Check if point is inside Vietnam boundary (any province polygon)
export function isInsideVietnam(lat: number, lng: number, provincesGeoJSON: any): boolean {
  for (const province of provincesGeoJSON.features) {
    if (pointInFeature(lat, lng, province)) return true;
  }
  return false;
}

// Find nearest province centroid for border-snapping
function getNearestProvinceCentroid(lat: number, lng: number, provincesGeoJSON: any): { lat: number; lng: number; name: string; id: string } | null {
  let nearest: any = null;
  let minDist = Infinity;
  for (const f of provincesGeoJSON.features) {
    // Approximate centroid from first coordinate ring
    const coords = f.geometry.type === 'MultiPolygon'
      ? f.geometry.coordinates[0][0]
      : f.geometry.coordinates[0];
    if (!coords || coords.length === 0) continue;
    const cLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
    const cLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
    const dist = Math.sqrt((lat - cLat) ** 2 + (lng - cLng) ** 2);
    if (dist < minDist) { minDist = dist; nearest = { lat: cLat, lng: cLng, name: f.properties.name, id: f.properties.id || f.properties.name }; }
  }
  // 5km ≈ ~0.045 degrees
  return minDist < 0.045 ? nearest : null;
}

// Province density profiles for weighted hotspot placement
const provinceWeights: Record<string, { population_density: number; urban_index: number }> = {
  'Ho Chi Minh': { population_density: 4363, urban_index: 0.95 },
  'Hanoi': { population_density: 2398, urban_index: 0.85 },
  'Da Nang': { population_density: 805, urban_index: 0.80 },
  'Hai Phong': { population_density: 1273, urban_index: 0.70 },
  'Can Tho': { population_density: 885, urban_index: 0.65 },
  'Binh Duong': { population_density: 912, urban_index: 0.60 },
  'Dong Nai': { population_density: 525, urban_index: 0.55 },
  'Khanh Hoa': { population_density: 240, urban_index: 0.50 },
  'Thanh Hoa': { population_density: 310, urban_index: 0.25 },
  'Nghe An': { population_density: 195, urban_index: 0.20 },
  'Gia Lai': { population_density: 96, urban_index: 0.15 },
  'Dak Lak': { population_density: 145, urban_index: 0.18 },
  'Lao Cai': { population_density: 108, urban_index: 0.12 },
  'Ha Giang': { population_density: 105, urban_index: 0.10 },
};

// Spatially validate and snap hotspots to province boundaries, weighted by population
export function spatialFilterHotspots(
  hotspots: any[],
  provincesGeoJSON: any
): { valid: any[]; provinceAgg: HotspotProvinceAgg[] } {
  const provinceMap = new Map<string, { name: string; diseaseRisks: number[]; newsRisks: number[]; diseases: string[]; count: number }>();
  const valid: any[] = [];

  for (const h of hotspots) {
    let lat = Number(h.center_lat);
    let lng = Number(h.center_lng);
    if (isNaN(lat) || isNaN(lng)) continue;

    // Check if inside Vietnam
    let insideProvince: string | null = null;
    for (const province of provincesGeoJSON.features) {
      if (pointInFeature(lat, lng, province)) {
        insideProvince = province.properties.id || province.properties.name;
        const pid = insideProvince!;
        if (!provinceMap.has(pid)) {
          provinceMap.set(pid, { name: province.properties.name, diseaseRisks: [], newsRisks: [], diseases: [], count: 0 });
        }
        break;
      }
    }

    if (!insideProvince) {
      // Try snap if within 5km of border
      const snap = getNearestProvinceCentroid(lat, lng, provincesGeoJSON);
      if (snap) {
        lat = snap.lat;
        lng = snap.lng;
        insideProvince = snap.id;
        if (!provinceMap.has(snap.id)) {
          provinceMap.set(snap.id, { name: snap.name, diseaseRisks: [], newsRisks: [], diseases: [], count: 0 });
        }
      } else {
        continue; // Discard — outside Vietnam
      }
    }

    const isNews = h.user_density === 0 || h.prediction_data?.inference?.includes('news');
    const sevScore: Record<string, number> = { critical: 95, high: 75, medium: 50, low: 25 };
    const risk = sevScore[h.severity] || 50;

    // Weight by population density and urban index — reduce in low-density provinces
    const pName = provinceMap.get(insideProvince!)?.name || insideProvince || '';
    const pw = provinceWeights[pName] || { population_density: 200, urban_index: 0.3 };
    const densityWeight = Math.min(1, pw.population_density / 1000); // normalize: 1000+ = full weight
    const urbanWeight = pw.urban_index;
    const placementScore = 0.6 * densityWeight + 0.4 * urbanWeight;
    // Skip rendering in very low-density provinces (score < 0.15)
    if (placementScore < 0.15 && risk < 60) continue;

    const pData = provinceMap.get(insideProvince!)!;
    if (isNews) {
      pData.newsRisks.push(risk);
    } else {
      pData.diseaseRisks.push(risk);
    }
    pData.diseases.push(h.disease_code || 'other');
    pData.count++;

    valid.push({ ...h, center_lat: lat, center_lng: lng, _isNews: isNews, _provinceId: insideProvince, _risk: risk, _placementScore: placementScore });
  }

  // Compute province aggregation
  const provinceAgg: HotspotProvinceAgg[] = [];
  for (const [id, data] of provinceMap.entries()) {
    const allRisks = [...data.diseaseRisks, ...data.newsRisks];
    const dAvg = data.diseaseRisks.length > 0 ? data.diseaseRisks.reduce((a, b) => a + b, 0) / data.diseaseRisks.length : 0;
    const nAvg = data.newsRisks.length > 0 ? data.newsRisks.reduce((a, b) => a + b, 0) / data.newsRisks.length : 0;
    const avgRisk = allRisks.length > 0 ? Math.round(allRisks.reduce((a, b) => a + b, 0) / allRisks.length) : 0;
    const maxRisk = allRisks.length > 0 ? Math.max(...allRisks) : 0;
    const totalSignals = data.diseaseRisks.length + data.newsRisks.length;
    const confidence = Math.min(100, Math.round(30 + totalSignals * 10));
    // Find most common disease
    const diseaseFreq: Record<string, number> = {};
    data.diseases.forEach(d => { diseaseFreq[d] = (diseaseFreq[d] || 0) + 1; });
    const topDisease = Object.entries(diseaseFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';

    provinceAgg.push({
      name: data.name, id,
      diseaseRisk: Math.round(dAvg),
      newsIntensity: Math.round(nAvg),
      confidence,
      hotspotCount: data.count,
      avgRisk,
      maxRisk,
      topDisease,
    });
  }
  provinceAgg.sort((a, b) => b.hotspotCount - a.hotspotCount);

  return { valid, provinceAgg };
}

// Compute province-level risk from forecast nodes
function computeProvinceRisks(
  forecastGeoJSON: any,
  provincesGeoJSON: any
): { provinceRisks: ProvinceRisk[]; enrichedProvinces: any } {
  const provinceMap = new Map<string, { 
    name: string; id: string; risks: number[]; 
    predictedCases: number[]; trends: string[]; confidences: number[];
  }>();

  for (const node of forecastGeoJSON.features) {
    const [lng, lat] = node.geometry.coordinates;
    const risk = node.properties.risk;
    const predicted = node.properties.predicted_cases || 0;
    const trend = node.properties.trend || 'stable';
    const confidence = node.properties.confidence || 50;

    for (const province of provincesGeoJSON.features) {
      if (pointInFeature(lat, lng, province)) {
        const pid = province.properties.id || province.properties.name;
        if (!provinceMap.has(pid)) {
          provinceMap.set(pid, { name: province.properties.name, id: pid, risks: [], predictedCases: [], trends: [], confidences: [] });
        }
        const pd = provinceMap.get(pid)!;
        pd.risks.push(risk);
        pd.predictedCases.push(predicted);
        pd.trends.push(trend);
        pd.confidences.push(confidence);
        break;
      }
    }
  }

  const totalNodes = forecastGeoJSON.features.length;
  const provinceRisks: ProvinceRisk[] = [];

  for (const [id, data] of provinceMap.entries()) {
    const avg = data.risks.reduce((a, b) => a + b, 0) / data.risks.length;
    const max = Math.max(...data.risks);
    const density = Math.min(data.risks.length / Math.max(totalNodes * 0.2, 1), 1);
    const compositeRisk = Math.round(0.6 * avg + 0.3 * max + 0.1 * density * 100);
    const totalPredicted = data.predictedCases.reduce((a, b) => a + b, 0);
    const avgConfidence = Math.round(data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length);
    
    // Majority vote for trend
    const trendCounts: Record<string, number> = {};
    data.trends.forEach(t => { trendCounts[t] = (trendCounts[t] || 0) + 1; });
    const trend = Object.entries(trendCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'stable';

    // Risk level classification
    const riskLevel = totalPredicted > 300 ? 'critical' : totalPredicted > 150 ? 'high' : totalPredicted >= 50 ? 'medium' : 'low';

    provinceRisks.push({
      name: data.name, id,
      risk: Math.min(compositeRisk, 100),
      avgRisk: Math.round(avg),
      maxRisk: max,
      nodeCount: data.risks.length,
      newsIntensity: 0,
      confidence: avgConfidence,
      predictedCases: totalPredicted,
      riskLevel,
      trend,
    });
  }

  provinceRisks.sort((a, b) => b.predictedCases - a.predictedCases);

  const enrichedFeatures = provincesGeoJSON.features.map((f: any) => {
    const pid = f.properties.id || f.properties.name;
    const pr = provinceRisks.find(p => p.id === pid);
    return {
      ...f,
      properties: {
        ...f.properties,
        province_risk: pr?.risk ?? 0,
        avg_risk: pr?.avgRisk ?? 0,
        max_risk: pr?.maxRisk ?? 0,
        node_count: pr?.nodeCount ?? 0,
        predicted_cases: pr?.predictedCases ?? 0,
        risk_level: pr?.riskLevel ?? 'low',
        confidence: pr?.confidence ?? 0,
        trend: pr?.trend ?? 'stable',
        has_data: !!pr,
      },
    };
  });

  return {
    provinceRisks,
    enrichedProvinces: { type: 'FeatureCollection', features: enrichedFeatures },
  };
}

interface DynamicSuggestion {
  text: string;
  disease: string;
  region: string;
  spike: number;
}

export const HealthStrategyPrompt: React.FC<HealthStrategyPromptProps> = ({
  onForecastResult,
  onClear,
  mapInteracting = false,
  clickedProvince = null,
  mapMode = 'forecast',
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [provinceRanking, setProvinceRanking] = useState<ProvinceRisk[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<DynamicSuggestion[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [aiMode, setAiMode] = useState<'cloud' | 'local' | 'lightweight' | null>(null);
  const provincesCache = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const diseaseLabels: Record<string, string> = {
    dengue: 'sốt xuất huyết', covid19: 'COVID-19', tcm: 'tay chân miệng',
    influenza: 'cúm mùa', measles: 'sởi', ari: 'viêm hô hấp', tuberculosis: 'lao', rabies: 'dại',
  };

  const regionLabels: Record<string, string> = {
    'Ho Chi Minh': 'TP.HCM', 'Hanoi': 'Hà Nội', 'Da Nang': 'Đà Nẵng',
    'Can Tho': 'Cần Thơ', 'Hai Phong': 'Hải Phòng',
  };

  // Fetch dynamic suggestions from Supabase
  const fetchSuggestions = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from('health_news_articles')
        .select('disease_type, location, severity')
        .gte('published_at', sevenDaysAgo)
        .not('disease_type', 'is', null)
        .order('published_at', { ascending: false })
        .limit(200);

      if (!data || data.length === 0) return;

      // Group by disease+region, count as "spike"
      const groups = new Map<string, { disease: string; region: string; count: number; highSev: number }>();
      for (const row of data) {
        const d = row.disease_type?.toLowerCase() || 'other';
        const r = row.location || 'Việt Nam';
        const key = `${d}|${r}`;
        if (!groups.has(key)) groups.set(key, { disease: d, region: r, count: 0, highSev: 0 });
        const g = groups.get(key)!;
        g.count++;
        if (row.severity === 'high' || row.severity === 'critical') g.highSev++;
      }

      // Sort by spike (count + severity boost)
      const sorted = [...groups.values()]
        .map(g => ({ ...g, spike: g.count + g.highSev * 2 }))
        .sort((a, b) => b.spike - a.spike)
        .slice(0, 4);

      const templates = [
        (d: string, r: string) => `Dự báo ${d} tại ${r} 14 ngày tới`,
        (d: string, _r: string) => `Nguy cơ ${d} toàn quốc tuần tới`,
        (d: string, r: string) => `Cảnh báo ${d} khu vực ${r}`,
        (d: string, r: string) => `Phân tích ${d} ${r} 7 ngày`,
      ];

      const newSuggestions: DynamicSuggestion[] = sorted.map((g, i) => {
        const dLabel = diseaseLabels[g.disease] || g.disease;
        const rLabel = regionLabels[g.region] || g.region;
        return {
          text: templates[i % templates.length](dLabel, rLabel),
          disease: g.disease,
          region: g.region,
          spike: g.spike,
        };
      });

      setSuggestions(newSuggestions);
    } catch (e) {
      console.warn('Failed to fetch suggestions:', e);
    }
  }, []);

  // Fetch suggestions on mount + every 10 minutes
  useEffect(() => {
    fetchSuggestions();
    suggestionsTimerRef.current = setInterval(fetchSuggestions, 10 * 60 * 1000);
    return () => { if (suggestionsTimerRef.current) clearInterval(suggestionsTimerRef.current); };
  }, [fetchSuggestions]);

  // Global "/" key to expand
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isExpanded && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        setInputFocused(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExpanded]);

  // Click outside to collapse
  useEffect(() => {
    if (!isExpanded) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setInputFocused(false);
      }
    };
    // Delay to avoid immediate collapse
    const timer = setTimeout(() => document.addEventListener('mousedown', onClick), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', onClick); };
  }, [isExpanded]);

  // Auto-collapse when map is interacting
  useEffect(() => {
    if (mapInteracting && isExpanded && !prompt.trim() && !isLoading) {
      setInputFocused(false);
    }
  }, [mapInteracting, isExpanded, prompt, isLoading]);

  const loadProvinces = async (): Promise<any> => {
    if (provincesCache.current) return provincesCache.current;
    const res = await fetch('/maps/vietnam-provinces.geojson');
    const data = await res.json();
    provincesCache.current = data;
    return data;
  };

  // Debounce prompt for auto-trigger
  const debouncedPrompt = useDebounce(prompt, 400);

  const handleSubmit = useCallback(async (text?: string) => {
    const finalText = (text || prompt).trim();
    if (!finalText || isLoading) return;

    setIsLoading(true);
    setAiMode(null);
    try {
      // Fire forecast engine + ai-interpret in parallel (ai-interpret is for enrichment/summary)
      const [forecastRes, aiRes, provincesData] = await Promise.all([
        supabase.functions.invoke('health-strategy-engine', { body: { prompt: finalText } }),
        supabase.functions.invoke('ai-interpret', { body: { query: finalText, max_tokens: 200 } }).catch(() => null),
        loadProvinces(),
      ]);

      // Capture AI mode from interpret response (never blocks forecast)
      const detectedMode = aiRes?.data?.aiMode || 'cloud';
      setAiMode(detectedMode);

      if (forecastRes.error) throw forecastRes.error;
      if (!forecastRes.data?.success) throw new Error(forecastRes.data?.error || 'Unknown error');

      const { geojson, meta, provincePredictions } = forecastRes.data;

      if (!geojson || !geojson.features || !Array.isArray(geojson.features)) {
        console.error('[STRATEGY] Invalid GeoJSON returned:', geojson);
        throw new Error('GeoJSON không hợp lệ');
      }

      const { provinceRisks, enrichedProvinces } = computeProvinceRisks(geojson, provincesData);

      setLastResult({ ...forecastRes.data, enrichedProvinces, provinceRisks, provincePredictions });
      setProvinceRanking(provinceRisks.slice(0, 5));
      onForecastResult(geojson, { ...meta, enrichedProvinces, provinceRisks, provincePredictions }, provinceRisks);

      const highRisk = provinceRisks.filter(p => p.risk >= 75).length;
      const modeLabel = detectedMode === 'cloud' ? '☁️' : detectedMode === 'local' ? '🖥️' : '⚡';
      toast.success(`${modeLabel} Phân tích ${provinceRisks.length} tỉnh thành`, {
        description: `${highRisk} tỉnh nguy cơ cao • AI: ${detectedMode === 'cloud' ? 'Cloud' : detectedMode === 'local' ? 'Local' : 'Lightweight'}`,
      });
    } catch (err: any) {
      console.error('[STRATEGY] Error:', err);
      toast.error('Không thể tạo dự báo', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, onForecastResult]);

  // Auto-submit on debounced prompt change (only if prompt is long enough)
  useEffect(() => {
    if (debouncedPrompt.trim().length >= 10 && !isLoading && !lastResult) {
      handleSubmit(debouncedPrompt);
    }
  }, [debouncedPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleClear = () => {
    setPrompt('');
    setLastResult(null);
    setProvinceRanking([]);
    setAiMode(null);
    onClear();
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return 'text-destructive';
    if (risk >= 50) return 'text-warning';
    return 'text-success';
  };

  const getRiskBg = (risk: number) => {
    if (risk >= 80) return 'bg-destructive/10';
    if (risk >= 50) return 'bg-warning/10';
    return 'bg-success/10';
  };

  const showSuggestions = isExpanded && inputFocused && !prompt && !lastResult && !mapInteracting && suggestions.length > 0;

  // ===== COLLAPSED STATE: Floating circular icon =====
  if (!isExpanded && !lastResult) {
    return (
      <button
        onClick={handleExpand}
        className="h-10 w-10 md:h-11 md:w-11 rounded-full bg-card/70 backdrop-blur-md border border-border/40 shadow-lg flex items-center justify-center hover:bg-card/90 hover:scale-110 transition-all duration-200 group"
        title="Mở dự báo chiến lược (nhấn /)"
      >
        <Zap className="h-4.5 w-4.5 text-primary group-hover:text-foreground transition-colors" />
      </button>
    );
  }

  // ===== EXPANDED / HAS RESULT STATE =====
  return (
    <div ref={containerRef} className="relative w-[85vw] max-w-[40vw] min-w-[280px] md:min-w-[320px]">
      {/* Input bar */}
      <div className="relative flex items-center">
        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Dự báo dịch bệnh chiến lược..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setTimeout(() => setInputFocused(false), 150)}
          disabled={isLoading}
          className="w-full pl-9 pr-20 h-9 md:h-10 rounded-full bg-card/90 backdrop-blur-xl border border-border/50 shadow-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60 disabled:opacity-50"
        />
        {/* AI Mode indicator */}
        {aiMode && lastResult && (
          <Badge
            variant="outline"
            className={`absolute left-9 top-1/2 -translate-y-1/2 text-[8px] px-1.5 py-0 pointer-events-none ${
              aiMode === 'cloud' ? 'text-primary border-primary/40 bg-primary/5' :
              aiMode === 'local' ? 'text-warning border-warning/40 bg-warning/5' :
              'text-muted-foreground border-border bg-muted/20'
            }`}
          >
            {aiMode === 'cloud' ? '☁️ Cloud AI' : aiMode === 'local' ? '🖥️ Local AI' : '⚡ Lightweight'}
          </Badge>
        )}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {lastResult && (
            <button onClick={handleClear} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {!lastResult && !isLoading && (
            <button onClick={() => { setIsExpanded(false); setInputFocused(false); }} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <X className="h-3 w-3" />
            </button>
          )}
          <Button
            size="icon"
            className="h-6 w-6 md:h-7 md:w-7 rounded-full"
            onClick={() => handleSubmit()}
            disabled={!prompt.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Dynamic suggestions */}
      {showSuggestions && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Xu hướng 7 ngày</span>
              <span className="text-[8px] text-muted-foreground/50 ml-auto">nhấn / để mở</span>
            </div>
            <div className="flex flex-col gap-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setPrompt(s.text); inputRef.current?.focus(); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30 hover:bg-primary/10 text-left transition-colors border border-transparent hover:border-border/30 group"
                >
                  <span className="text-[11px] text-muted-foreground group-hover:text-foreground flex-1">{s.text}</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 text-primary/70">{s.spike} tin</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Province prediction ranking panel — only visible when province is clicked */}
      {lastResult && !isLoading && clickedProvince && provinceRanking.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg p-3 space-y-2">
            {/* Clicked province header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {clickedProvince.name} — {lastResult.meta?.prediction?.forecastDays || 14} ngày
                </span>
              </div>
              <button onClick={() => { /* parent handles clearing clickedProvince */ }} className="p-1 rounded-full hover:bg-muted/50">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>🌧 {Math.round((lastResult.meta?.weather?.rain_index || 0) * 100)}%</span>
              <span>💧 {Math.round((lastResult.meta?.weather?.humidity || 0) * 100)}%</span>
              <span>📈 Mùa vụ {lastResult.meta?.seasonality || '—'}%</span>
              <span>🏭 AQI {lastResult.meta?.aqi || '—'}</span>
            </div>

            {/* Total prediction summary */}
            {lastResult.meta?.prediction && (
              <div className={`flex flex-col gap-1.5 px-2.5 py-2 rounded-lg border ${
                lastResult.meta.prediction.riskLevel === 'critical' ? 'bg-destructive/10 border-destructive/30' :
                lastResult.meta.prediction.riskLevel === 'high' ? 'bg-destructive/5 border-destructive/20' :
                lastResult.meta.prediction.riskLevel === 'medium' ? 'bg-warning/10 border-warning/30' :
                'bg-success/10 border-success/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">{lastResult.meta.prediction.totalPredicted}</span>
                    <span className="text-[10px] text-muted-foreground">ca dự báo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {lastResult.meta?.region_scope && lastResult.meta.region_scope !== 'vietnam' && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 text-primary/70">
                        {lastResult.meta.region_scope === 'asean' ? '🌏 ASEAN' : lastResult.meta.region_scope === 'china' ? '🇨🇳 China' : '🔗 Xuyên biên giới'}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                      lastResult.meta.prediction.riskLevel === 'critical' ? 'text-destructive border-destructive/40' :
                      lastResult.meta.prediction.riskLevel === 'high' ? 'text-destructive border-destructive/30' :
                      lastResult.meta.prediction.riskLevel === 'medium' ? 'text-warning border-warning/30' :
                      'text-success border-success/30'
                    }`}>
                      {lastResult.meta.prediction.riskLevel === 'critical' ? '🔴 Nguy hiểm' :
                       lastResult.meta.prediction.riskLevel === 'high' ? '🟠 Cao' :
                       lastResult.meta.prediction.riskLevel === 'medium' ? '🟡 Trung bình' : '🟢 Thấp'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {lastResult.meta?.vietnamPoints > 0 && <span>🇻🇳 {lastResult.meta.vietnamPoints}</span>}
                    {lastResult.meta?.aseanPoints > 0 && <span>🌏 {lastResult.meta.aseanPoints}</span>}
                    {lastResult.meta?.chinaPoints > 0 && <span>🇨🇳 {lastResult.meta.chinaPoints}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {lastResult.meta.prediction.policyLevel && (
                      <span className={`font-medium ${
                        lastResult.meta.prediction.policyLevel === 'intervention_recommended' ? 'text-destructive' :
                        lastResult.meta.prediction.policyLevel === 'preparedness' ? 'text-warning' :
                        lastResult.meta.prediction.policyLevel === 'watchlist' ? 'text-primary' : 'text-success'
                      }`}>
                        {lastResult.meta.prediction.policyLevel === 'intervention_recommended' ? '⚠️ Can thiệp' :
                         lastResult.meta.prediction.policyLevel === 'preparedness' ? '🛡️ Chuẩn bị' :
                         lastResult.meta.prediction.policyLevel === 'watchlist' ? '👁️ Theo dõi' : '✅ Thấp'}
                      </span>
                    )}
                    <span className="text-muted-foreground">Tin cậy {lastResult.meta.prediction.modelConfidence}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {provinceRanking.map((p, i) => {
                const trendIcon = p.trend === 'rising' ? '↗' : p.trend === 'falling' ? '↘' : '→';
                const trendColor = p.trend === 'rising' ? 'text-destructive' : p.trend === 'falling' ? 'text-success' : 'text-muted-foreground';
                // Find province prediction data from backend
                const pp = lastResult?.provincePredictions?.find(
                  (x: any) => p.name.toLowerCase().includes(x.province) || x.province.includes(p.name.toLowerCase())
                );
                const zoneLabel = pp?.climate_zone === 'north' ? '🏔️ Bắc' : pp?.climate_zone === 'central' ? '🏖️ Trung' : pp?.climate_zone === 'south' ? '🌴 Nam' : '';
                const ppi = pp?.policy_pressure_index;
                const stressPct = pp?.capacity_stress_pct;
                return (
                  <div key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${getRiskBg(p.risk)}`}>
                    <span className="text-[10px] font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground truncate block">{p.name}</span>
                      {pp && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] text-muted-foreground">{zoneLabel}</span>
                          <span className="text-[8px] text-muted-foreground">×{pp.adjustment_factor}</span>
                          {pp.urban_index > 0.6 && <span className="text-[8px] text-primary/60">🏙</span>}
                          {pp.health_capacity > 0.6 && <span className="text-[8px] text-success/60">🏥</span>}
                          {pp.total_beds > 0 && (
                            <span className="text-[8px] text-muted-foreground/70">{pp.total_beds}🛏</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="font-semibold text-foreground">{p.predictedCases} ca</span>
                      {ppi !== undefined && ppi > 0 && (
                        <span className={`font-bold ${ppi > 100 ? 'text-destructive' : ppi > 50 ? 'text-warning' : 'text-success'}`} title="Policy Pressure Index">
                          PPI:{Math.round(ppi)}
                        </span>
                      )}
                      {stressPct !== undefined && stressPct > 0 && (
                        <span className={`text-[9px] ${stressPct > 80 ? 'text-destructive' : stressPct > 50 ? 'text-warning' : 'text-muted-foreground'}`} title="Capacity Stress">
                          {stressPct}%
                        </span>
                      )}
                      <span className={`font-bold ${trendColor}`}>{trendIcon}</span>
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                        p.riskLevel === 'critical' ? 'text-destructive' :
                        p.riskLevel === 'high' ? 'text-destructive' :
                        p.riskLevel === 'medium' ? 'text-warning' : 'text-success'
                      }`}>
                        {p.riskLevel === 'critical' ? '🔴' : p.riskLevel === 'high' ? '🟠' : p.riskLevel === 'medium' ? '🟡' : '🟢'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-border/30 text-[9px] text-muted-foreground">
              <span>PPI = predicted_cases ÷ health_capacity_score</span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> &lt;50</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" /> 50-150</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive/70 inline-block" /> 150-300</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" /> &gt;300</span>
              <span className="flex items-center gap-1 ml-auto">🏥 Zoom &gt;8: Chi tiết BV</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

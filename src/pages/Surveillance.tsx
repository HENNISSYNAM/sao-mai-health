import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Filter, Download, Eye, Loader2, RefreshCw, Plus,
  Users, Activity, AlertTriangle, List, X, FileText,
  Layers, ChevronUp, Shield, MapPin, Crosshair, Printer, Share2,
  Thermometer, Bug, Syringe, HeartPulse, Building2, Newspaper, ExternalLink,
  Stethoscope, Sparkles
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSurveillanceSearch } from "@/hooks/useSurveillanceSearch";
import { HealthStrategyPrompt, type ProvinceRisk, type HotspotProvinceAgg, spatialFilterHotspots } from "@/components/surveillance/HealthStrategyPrompt";
import { useRealtime } from "@/hooks/useRealtime";
import { CaseDetailModal } from "@/components/CaseDetailModal";
import { AddCaseModal } from "@/components/AddCaseModal";
import { useUserRiskScorer, type UserMapDot } from "@/hooks/useUserRiskScorer";
import { useGPS } from "@/hooks/useGPS";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

mapboxgl.accessToken = 'pk.eyJ1IjoiaGVubmlzc3luYW0iLCJhIjoiY21nOWVkOHU4MDZlMTJub3BmbzFuMnNyeiJ9.zZ3ieYtNL9mxuGMMXND0tw';

// Vietnam regions for click-to-report
const vietnamRegions = [
  { id: 'north', name: 'Miền Bắc', center: [105.8, 21.0], bbox: [102, 20, 108, 23.5] },
  { id: 'central', name: 'Miền Trung', center: [108.0, 16.0], bbox: [104, 11.5, 110, 20] },
  { id: 'south', name: 'Miền Nam', center: [106.7, 10.8], bbox: [104, 8.5, 108, 11.5] },
  { id: 'hcmc', name: 'TP. Hồ Chí Minh', center: [106.63, 10.82], bbox: [106.3, 10.5, 107.0, 11.1] },
  { id: 'hanoi', name: 'Hà Nội', center: [105.85, 21.02], bbox: [105.3, 20.5, 106.4, 21.5] },
];

interface RegionReport {
  region: string;
  totalCases: number;
  byDisease: Record<string, number>;
  byStatus: Record<string, number>;
  trend7d: number;
  topDistricts: Array<{ name: string; cases: number }>;
  generatedAt: string;
}

export default function Surveillance() {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const myMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Map intelligence mode
  type MapMode = 'forecast' | 'infrastructure' | 'regional' | 'policy' | 'crossborder';
  const [mapMode, setMapMode] = useState<MapMode>('forecast');
  const [clickedProvince, setClickedProvince] = useState<any>(null);

  // Panels
  const [showCaseList, setShowCaseList] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [showNewsPanel, setShowNewsPanel] = useState(false);
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);

  // Region report
  const [showRegionReport, setShowRegionReport] = useState(false);
  const [regionReport, setRegionReport] = useState<RegionReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showUserDots, setShowUserDots] = useState(true);
  const [showCaseDots, setShowCaseDots] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFacilities, setShowFacilities] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showPendingAlerts, setShowPendingAlerts] = useState(true);
  const [mapInteracting, setMapInteracting] = useState(false);

  // Province profiles for hotspot weighting
  const provinceProfiles: Record<string, { population_density: number; urban_index: number }> = {
    'Ho Chi Minh': { population_density: 4363, urban_index: 0.95 },
    'Hanoi': { population_density: 2398, urban_index: 0.85 },
    'Da Nang': { population_density: 805, urban_index: 0.80 },
    'Hai Phong': { population_density: 1273, urban_index: 0.70 },
    'Can Tho': { population_density: 885, urban_index: 0.65 },
    'Binh Duong': { population_density: 912, urban_index: 0.60 },
    'Dong Nai': { population_density: 525, urban_index: 0.55 },
    'Khanh Hoa': { population_density: 240, urban_index: 0.50 },
    'Quang Ninh': { population_density: 210, urban_index: 0.45 },
    'Thanh Hoa': { population_density: 310, urban_index: 0.25 },
    'Nghe An': { population_density: 195, urban_index: 0.20 },
    'Gia Lai': { population_density: 96, urban_index: 0.15 },
    'Dak Lak': { population_density: 145, urban_index: 0.18 },
    'Lao Cai': { population_density: 108, urban_index: 0.12 },
    'Ha Giang': { population_density: 105, urban_index: 0.10 },
  };

  // All case events for map (no pagination limit)
  const [allCaseEvents, setAllCaseEvents] = useState<any[]>([]);
  const [totalCaseCount, setTotalCaseCount] = useState(0);
  const [newsCaseCount, setNewsCaseCount] = useState(0);
  const [hotspotCaseCount, setHotspotCaseCount] = useState(0);
  const [hotspotData, setHotspotData] = useState<any[]>([]);
  const [hotspotProvinceAgg, setHotspotProvinceAgg] = useState<HotspotProvinceAgg[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<any[]>([]);
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const provincesDataRef = useRef<any>(null);

  // Search / filter (for list)
  const [searchTerm, setSearchTerm] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { cases, totalCount, loading, stats, exportToCSV } = useSurveillanceSearch({
    searchTerm, diseaseFilter, statusFilter,
    dateFrom: "", dateTo: "", districtFilter: "all",
    ageFilter: "all", genderFilter: "all",
    pageSize, currentPage,
  });

  const { isConnected } = useRealtime({ table: 'case_events', event: '*' });
  const { mapUsers, myRisk, fetchMapUsers } = useUserRiskScorer();
  const { gps } = useGPS();
  const { user } = useAuth();

  // ======= LOAD ALL CASE EVENTS FOR MAP + STATS =======
  useEffect(() => {
    const loadAllCases = async () => {
      // Geo-tagged cases for map
      const { data } = await supabase
        .from('case_events')
        .select('id, lat, lon, disease_code, occurred_at, district_id, patient_age_bucket, patient_gender, symptoms')
        .not('lat', 'is', null)
        .not('lon', 'is', null)
        .order('occurred_at', { ascending: false })
        .limit(1000);
      if (data) setAllCaseEvents(data);

      // Total case count (including non-geo cases from news)
      const { count: totalCount } = await supabase
        .from('case_events')
        .select('id', { count: 'exact', head: true });
      setTotalCaseCount(totalCount || 0);

      // News-reported case counts from health_news_articles
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: newsData } = await supabase
        .from('health_news_articles')
        .select('case_count, disease_type, location, severity')
        .gte('published_at', sevenDaysAgo)
        .not('case_count', 'is', null);
      const newsTotal = (newsData || []).reduce((sum: number, a: any) => sum + (a.case_count || 0), 0);
      setNewsCaseCount(newsTotal);

      // Hotspot-reported case counts
      const { data: hotspots } = await supabase
        .from('disease_hotspots')
        .select('case_count')
        .gte('expires_at', new Date().toISOString())
        .not('case_count', 'is', null);
      const hotspotTotal = (hotspots || []).reduce((sum: number, h: any) => sum + (h.case_count || 0), 0);
      setHotspotCaseCount(hotspotTotal);
    };
    loadAllCases();
  }, []);

  // ======= LOAD HOTSPOTS FROM DB =======
  // Load provinces GeoJSON
  const loadProvincesGeoJSON = useCallback(async () => {
    if (provincesDataRef.current) return provincesDataRef.current;
    const res = await fetch('/maps/vietnam-provinces.geojson');
    const data = await res.json();
    provincesDataRef.current = data;
    return data;
  }, []);

  const loadHotspots = useCallback(async () => {
    const [hotspotsRes, provincesData] = await Promise.all([
      supabase
        .from('disease_hotspots')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('severity', { ascending: false }),
      loadProvincesGeoJSON(),
    ]);
    if (hotspotsRes.data && provincesData) {
      const { valid, provinceAgg } = spatialFilterHotspots(hotspotsRes.data, provincesData);
      setHotspotData(valid);
      setHotspotProvinceAgg(provinceAgg);
    }
  }, [loadProvincesGeoJSON]);

  useEffect(() => { loadHotspots(); }, []);

  // ======= LOAD PENDING COMMUNITY ALERTS =======
  const pendingMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const loadPendingAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('vote-community-alert', {
        body: { action: 'get_pending_alerts', userId: user?.id }
      });
      if (!error && data?.success) {
        setPendingAlerts(data.alerts || []);
      }
    } catch (e) {
      console.warn('Failed to load pending alerts:', e);
    }
  }, [user?.id]);

  useEffect(() => { loadPendingAlerts(); }, [loadPendingAlerts]);

  const voteOnAlert = useCallback(async (alertId: string) => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để xác nhận');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('vote-community-alert', {
        body: { action: 'vote', alertId, userId: user.id, lat: gps?.lat, lng: gps?.lng }
      });
      if (error) throw error;
      if (data?.alreadyVoted) {
        toast.info('Bạn đã xác nhận cảnh báo này rồi');
        return;
      }
      if (data?.promoted) {
        toast.success('🎯 Cảnh báo đã được xác nhận & tạo điểm nóng!', { duration: 5000 });
        loadHotspots();
      } else {
        toast.success(`✅ Đã xác nhận (${data?.confirmCount}/3 người)`);
      }
      loadPendingAlerts();
    } catch (e: any) {
      toast.error('Lỗi: ' + (e.message || 'Không thể vote'));
    }
  }, [user?.id, gps?.lat, gps?.lng, loadHotspots, loadPendingAlerts]);

  // ======= LOAD NEWS ARTICLES (DB + Live Global) =======
  const loadNewsArticles = useCallback(async () => {
    setLoadingNews(true);
    try {
      // 1. Load from DB (crawled articles)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: dbArticles } = await supabase
        .from('health_news_articles')
        .select('id, title, content_summary, disease_type, location, severity, source, url, published_at, case_count')
        .gte('published_at', sevenDaysAgo)
        .order('published_at', { ascending: false })
        .limit(30);

      // 2. Fetch live global news from health-news-intelligence
      let liveArticles: any[] = [];
      try {
        const { data: liveData } = await supabase.functions.invoke('health-news-intelligence', {
          body: { expertMode: false, language: 'vi', forceRefresh: false }
        });
        if (liveData?.articles) {
          liveArticles = liveData.articles.map((a: any) => ({
            id: a.id,
            title: a.title,
            content_summary: a.aiSummary,
            disease_type: a.disease,
            location: a.location,
            severity: a.severity,
            source: a.source,
            url: a.url,
            published_at: a.publishedAt,
            _live: true,
          }));
        }
      } catch (e) {
        console.warn('Live news fetch failed, using DB only:', e);
      }

      // 3. Merge: live first, then DB, deduplicate by title similarity
      const allArticles = [...liveArticles, ...(dbArticles || [])];
      const seen = new Set<string>();
      const deduped = allArticles.filter(a => {
        const key = a.title?.toLowerCase().substring(0, 40) || a.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setNewsArticles(deduped.slice(0, 50));
    } catch (e) {
      console.error('Failed to load news:', e);
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => { loadNewsArticles(); }, []);

  // ======= GENERATE HOTSPOTS FROM NEWS =======
  const generateHotspotsFromNews = useCallback(async () => {
    setLoadingHotspots(true);
    try {
      const { data, error } = await supabase.functions.invoke('news-to-hotspots');
      if (error) throw error;
      toast.success(`Phát hiện ${data?.hotspotsCreated || 0} điểm nóng từ ${data?.articlesAnalyzed || 0} bản tin`);
      await loadHotspots();
    } catch (e: any) {
      console.error('Hotspot generation failed:', e);
      toast.error('Không thể tạo điểm nóng: ' + (e.message || 'Lỗi'));
    } finally {
      setLoadingHotspots(false);
    }
  }, [loadHotspots]);

  // ======= MAP INIT =======
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [106.6297, 10.8231],
      zoom: 6,
      attributionControl: false,
      minZoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.current.on('load', () => setMapLoaded(true));

    // Track map interactions for collapsing suggestions
    const onInteractStart = () => setMapInteracting(true);
    const onInteractEnd = () => setMapInteracting(false);
    map.current.on('dragstart', onInteractStart);
    map.current.on('dragend', onInteractEnd);
    map.current.on('zoomstart', onInteractStart);
    map.current.on('zoomend', onInteractEnd);

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // ======= Memoize GeoJSON features =======
  const caseFeaturesGeoJSON = React.useMemo(() => {
    const features = allCaseEvents
      .filter((c: any) => {
        const lat = Number(c.lat);
        const lon = Number(c.lon);
        return lat >= 8.0 && lat <= 23.5 && lon >= 102.0 && lon <= 110.0 && !isNaN(lat) && !isNaN(lon);
      })
      .map((c: any) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [Number(c.lon), Number(c.lat)] },
        properties: {
          id: c.id,
          disease: c.disease_code,
          district: c.district_id || '',
          date: c.occurred_at,
          age: c.patient_age_bucket || '',
          gender: c.patient_gender || '',
        },
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [allCaseEvents]);

  // Track whether layers have been set up
  const layersInitRef = useRef(false);

  // ======= CLUSTER SOURCE + LAYERS (setup once) =======
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    // Only set up once
    if (layersInitRef.current) return;
    if (map.current.getSource('cases-cluster')) return;

    layersInitRef.current = true;

    // Create source with empty data - will be populated by the data effect
    map.current.addSource('cases-cluster', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 60,
      clusterProperties: {
        dengue_count: ['+', ['case', ['==', ['get', 'disease'], 'dengue'], 1, 0]],
        tcm_count: ['+', ['case', ['==', ['get', 'disease'], 'tcm'], 1, 0]],
        covid_count: ['+', ['case', ['==', ['get', 'disease'], 'covid19'], 1, 0]],
      },
    });

    // Cluster circles
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'cases-cluster',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          '#22c55e', 10, '#a3e635', 25, '#facc15', 50, '#f59e0b', 100, '#ef4444'
        ],
        'circle-radius': [
          'step', ['get', 'point_count'],
          18, 10, 24, 25, 32, 50, 40, 100, 50
        ],
        'circle-opacity': 0.85,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(0,0,0,0.3)',
      },
    });

    // Cluster count labels
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'cases-cluster',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['to-string', ['get', 'point_count']],
        'text-font': ['Arial Unicode MS Bold'],
        'text-size': [
          'step', ['get', 'point_count'],
          12, 10, 13, 50, 15
        ],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Unclustered points
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'cases-cluster',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 7,
        'circle-color': [
          'match', ['get', 'disease'],
          'dengue', '#ef4444', 'covid19', '#3b82f6',
          'tcm', '#f59e0b', 'ari', '#22c55e',
          '#8b5cf6'
        ],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.6)',
      },
    });

    // Heatmap layer (starts hidden)
    map.current.addLayer({
      id: 'cases-heat',
      type: 'heatmap',
      source: 'cases-cluster',
      filter: ['!', ['has', 'point_count']],
      layout: { visibility: 'none' },
      paint: {
        'heatmap-radius': 30,
        'heatmap-opacity': 0.6,
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,255,0)', 0.2, '#22c55e', 0.5, '#f59e0b', 0.8, '#ef4444', 1, '#dc2626'
        ],
      },
    });

    // ======= FORECAST SOURCES + LAYERS (initialized once with empty data) =======
    const emptyGeoJSON = { type: 'FeatureCollection' as const, features: [] };

    map.current.addSource('healthForecast', { type: 'geojson', data: emptyGeoJSON });
    map.current.addSource('provinceRisk', { type: 'geojson', data: emptyGeoJSON });
    map.current.addSource('forecastProjection', { type: 'geojson', data: emptyGeoJSON });
    map.current.addSource('aseanForecast', { type: 'geojson', data: emptyGeoJSON });
    map.current.addSource('chinaForecast', { type: 'geojson', data: emptyGeoJSON });

    // Hospital infrastructure source
    map.current.addSource('hospitalInfra', { type: 'geojson', data: emptyGeoJSON, cluster: true, clusterMaxZoom: 10, clusterRadius: 40 });

    // Forecast projection heatmap surface (risk contour)
    map.current.addLayer({
      id: 'forecast-projection-heatmap',
      type: 'heatmap',
      source: 'forecastProjection',
      maxzoom: 10,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'predicted_cases'], 0, 0, 50, 0.3, 150, 0.6, 300, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 1, 9, 3],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 3, 30, 6, 50, 9, 70],
        'heatmap-opacity': 0.65,
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(34,197,94,0)',
          0.2, 'rgba(34,197,94,0.4)',
          0.4, 'rgba(245,158,11,0.5)',
          0.6, 'rgba(239,68,68,0.6)',
          0.8, 'rgba(220,38,38,0.7)',
          1, 'rgba(185,28,28,0.85)',
        ],
      },
    }, 'clusters');

    // ASEAN country circles (opacity 0.4, visible at zoom <6)
    map.current.addLayer({
      id: 'asean-forecast-circles',
      type: 'circle',
      source: 'aseanForecast',
      maxzoom: 6,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'predicted_cases'], 0, 12, 100, 24, 300, 40],
        'circle-color': [
          'match', ['get', 'risk_level'],
          'critical', '#dc2626', 'high', '#ef4444', 'medium', '#f59e0b', '#22c55e',
        ],
        'circle-opacity': 0.4,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.3)',
      },
    }, 'clusters');

    // ASEAN labels
    map.current.addLayer({
      id: 'asean-forecast-labels',
      type: 'symbol',
      source: 'aseanForecast',
      maxzoom: 6,
      layout: {
        'text-field': ['concat', ['get', 'entity_name'], '\n', ['to-string', ['get', 'predicted_cases']], ' ca'],
        'text-font': ['Arial Unicode MS Bold'],
        'text-size': 11,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': 'rgba(255,255,255,0.7)', 'text-halo-color': 'rgba(0,0,0,0.6)', 'text-halo-width': 1.5 },
    });

    // China South province circles (opacity 0.35, visible at zoom <7)
    map.current.addLayer({
      id: 'china-forecast-circles',
      type: 'circle',
      source: 'chinaForecast',
      maxzoom: 7,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'predicted_cases'], 0, 10, 100, 20, 300, 35],
        'circle-color': [
          'match', ['get', 'risk_level'],
          'critical', '#dc2626', 'high', '#ef4444', 'medium', '#f59e0b', '#22c55e',
        ],
        'circle-opacity': 0.35,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.25)',
      },
    }, 'clusters');

    // China labels
    map.current.addLayer({
      id: 'china-forecast-labels',
      type: 'symbol',
      source: 'chinaForecast',
      maxzoom: 7,
      layout: {
        'text-field': ['concat', ['get', 'entity_name'], '\n', ['to-string', ['get', 'predicted_cases']], ' ca'],
        'text-font': ['Arial Unicode MS Bold'],
        'text-size': 10,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': 'rgba(255,255,255,0.6)', 'text-halo-color': 'rgba(0,0,0,0.5)', 'text-halo-width': 1.2 },
    });

    // Province choropleth fill (visible at low zoom) — predicted cases based
    map.current.addLayer({
      id: 'province-choropleth-fill',
      type: 'fill',
      source: 'provinceRisk',
      maxzoom: 9,
      paint: {
        'fill-color': [
          'case',
          ['get', 'has_data'],
          ['interpolate', ['linear'], ['get', 'predicted_cases'],
            0, 'rgba(34,197,94,0.2)',
            50, 'rgba(34,197,94,0.4)',
            150, 'rgba(245,158,11,0.5)',
            300, 'rgba(239,68,68,0.6)',
            500, 'rgba(185,28,28,0.7)',
          ],
          'rgba(100,100,100,0.05)',
        ],
        'fill-opacity': 0.8,
      },
    }, 'clusters');

    // Province outline — thick for high predicted cases
    map.current.addLayer({
      id: 'province-choropleth-outline',
      type: 'line',
      source: 'provinceRisk',
      maxzoom: 9,
      paint: {
        'line-color': [
          'case',
          ['>=', ['get', 'predicted_cases'], 300], '#dc2626',
          ['>=', ['get', 'predicted_cases'], 150], '#ef4444',
          ['>=', ['get', 'predicted_cases'], 50], '#f59e0b',
          ['get', 'has_data'], '#22c55e',
          'rgba(150,150,150,0.3)',
        ],
        'line-width': [
          'case',
          ['>=', ['get', 'predicted_cases'], 300], 3.5,
          ['>=', ['get', 'predicted_cases'], 150], 2.5,
          ['get', 'has_data'], 1.5,
          0.5,
        ],
      },
    });

    // Province labels — show predicted cases + risk level
    map.current.addLayer({
      id: 'province-choropleth-labels',
      type: 'symbol',
      source: 'provinceRisk',
      maxzoom: 9,
      filter: ['==', ['get', 'has_data'], true],
      layout: {
        'text-field': ['concat',
          ['get', 'name'], '\n',
          ['to-string', ['get', 'predicted_cases']], ' ca',
        ],
        'text-font': ['Arial Unicode MS Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 8, 7, 11],
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': [
          'interpolate', ['linear'], ['get', 'predicted_cases'],
          0, '#16a34a', 50, '#d97706', 150, '#ef4444', 300, '#dc2626',
        ],
        'text-halo-color': 'rgba(0,0,0,0.8)',
        'text-halo-width': 1.5,
      },
    });

    // Forecast node circles (visible at high zoom only — drill-down)
    map.current.addLayer({
      id: 'health-forecast-layer',
      type: 'circle',
      source: 'healthForecast',
      minzoom: 6,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'predicted_cases'], 0, 6, 50, 12, 150, 18, 300, 26],
        'circle-color': [
          'match', ['get', 'risk_level'],
          'critical', '#dc2626',
          'high', '#ef4444',
          'medium', '#f59e0b',
          '#22c55e',
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.6)',
      },
    });

    // Forecast node labels — show predicted cases
    map.current.addLayer({
      id: 'health-forecast-labels',
      type: 'symbol',
      source: 'healthForecast',
      minzoom: 7,
      layout: {
        'text-field': ['concat', ['to-string', ['get', 'predicted_cases']], ' ca'],
        'text-font': ['Arial Unicode MS Bold'],
        'text-size': 10,
        'text-allow-overlap': false,
      },
      paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.6)', 'text-halo-width': 1 },
    });

    // ======= HOSPITAL INFRASTRUCTURE LAYERS (zoom-dependent + mode-controlled) =======
    // Provincial hospital icons (zoom 6-8, only 1 per province via filter)
    map.current.addLayer({
      id: 'hospital-provincial-icons',
      type: 'circle',
      source: 'hospitalInfra',
      filter: ['all', ['!', ['has', 'point_count']], ['in', ['get', 'type'], ['literal', ['central', 'provincial']]]],
      minzoom: 6,
      maxzoom: 8,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'beds'], 200, 6, 1000, 12, 2500, 18],
        'circle-color': 'hsl(210, 80%, 60%)',
        'circle-opacity': 0.75,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.8)',
      },
    });

    // Hospital cluster circles (mobile clustering, zoom > 8)
    map.current.addLayer({
      id: 'hospital-clusters',
      type: 'circle',
      source: 'hospitalInfra',
      filter: ['has', 'point_count'],
      minzoom: 8,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['step', ['get', 'point_count'], 14, 3, 18, 5, 24],
        'circle-color': 'hsl(210, 70%, 50%)',
        'circle-opacity': 0.7,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.6)',
      },
    });

    map.current.addLayer({
      id: 'hospital-cluster-count',
      type: 'symbol',
      source: 'hospitalInfra',
      filter: ['has', 'point_count'],
      minzoom: 8,
      layout: {
        visibility: 'none',
        'text-field': ['concat', '🏥', ['to-string', ['get', 'point_count']]],
        'text-font': ['Arial Unicode MS Bold'],
        'text-size': 11,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#ffffff' },
    });

    // Detailed hospital markers (zoom > 8, hidden by default)
    map.current.addLayer({
      id: 'hospital-detail-circles',
      type: 'circle',
      source: 'hospitalInfra',
      filter: ['!', ['has', 'point_count']],
      minzoom: 8,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'beds'], 100, 6, 500, 10, 1500, 16, 2500, 22],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'stress_pct'],
          0, 'hsl(210, 80%, 60%)',
          50, 'hsl(48, 90%, 55%)',
          80, 'hsl(25, 90%, 55%)',
          100, 'hsl(0, 80%, 55%)',
        ],
        'circle-opacity': 0.85,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': 'rgba(255,255,255,0.9)',
      },
    });

    // Hospital detail labels (zoom > 8, hidden by default)
    map.current.addLayer({
      id: 'hospital-detail-labels',
      type: 'symbol',
      source: 'hospitalInfra',
      filter: ['!', ['has', 'point_count']],
      minzoom: 9,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-font': ['Arial Unicode MS Bold'],
        'text-size': 10,
        'text-offset': [0, 1.8],
        'text-allow-overlap': false,
      },
      paint: { 'text-color': 'hsl(210, 80%, 70%)', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1.2 },
    });

    // Hospital detail tooltip click
    const onClickHospital = (e: any) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties;
      const coords = feat.geometry.coordinates.slice();
      const stressColor = p.stress_pct > 80 ? '#ef4444' : p.stress_pct > 50 ? '#f59e0b' : '#22c55e';
      new mapboxgl.Popup({ offset: 15, maxWidth: '280px', closeButton: true, closeOnClick: true })
        .setLngLat(coords)
        .setHTML(`
          <div style="padding:12px;font-size:12px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;">🏥 ${p.name}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;">
              <div style="background:rgba(59,130,246,0.1);padding:6px;border-radius:6px;text-align:center;">
                <div style="font-size:16px;font-weight:700;color:#60a5fa;">${p.beds}</div>
                <div style="font-size:9px;color:#94a3b8;">Giường</div>
              </div>
              <div style="background:rgba(239,68,68,0.1);padding:6px;border-radius:6px;text-align:center;">
                <div style="font-size:16px;font-weight:700;color:#f87171;">${p.icu_beds}</div>
                <div style="font-size:9px;color:#94a3b8;">ICU</div>
              </div>
              <div style="background:rgba(${p.stress_pct > 80 ? '239,68,68' : p.stress_pct > 50 ? '245,158,11' : '34,197,94'},0.1);padding:6px;border-radius:6px;text-align:center;">
                <div style="font-size:16px;font-weight:700;color:${stressColor};">${p.stress_pct}%</div>
                <div style="font-size:9px;color:#94a3b8;">Tải</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;">
              <span style="color:#94a3b8;">Loại: <b style="color:#e2e8f0;">${p.type === 'central' ? 'Trung ương' : p.type === 'provincial' ? 'Tỉnh' : p.type === 'district' ? 'Quận/Huyện' : 'Phòng khám'}</b></span>
            </div>
          </div>
        `)
        .addTo(map.current!);
    };

    const onEnterHospital = () => { map.current!.getCanvas().style.cursor = 'pointer'; };
    const onLeaveHospital = () => { map.current!.getCanvas().style.cursor = ''; };
    map.current.on('click', 'hospital-detail-circles', onClickHospital);
    map.current.on('click', 'hospital-provincial-icons', onClickHospital);
    map.current.on('mouseenter', 'hospital-detail-circles', onEnterHospital);
    map.current.on('mouseleave', 'hospital-detail-circles', onLeaveHospital);
    map.current.on('mouseenter', 'hospital-provincial-icons', onEnterHospital);
    map.current.on('mouseleave', 'hospital-provincial-icons', onLeaveHospital);

    // ---- Event handlers (registered once) ----
    const onClickCluster = (e: any) => {
      e.preventDefault?.();
      const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const props = features[0].properties!;
      const coords = (features[0].geometry as any).coordinates.slice();
      const total = props.point_count || 0;
      const dengue = props.dengue_count || 0;
      const tcm = props.tcm_count || 0;
      const covid = props.covid_count || 0;
      const other = total - dengue - tcm - covid;
      const clusterId = props.cluster_id;

      const popupHtml = `
        <div style="padding:12px;font-size:12px;min-width:180px;">
          <div style="font-weight:700;font-size:15px;margin-bottom:8px;">🔍 Cụm: ${total} ca bệnh</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${dengue > 0 ? `<div style="display:flex;align-items:center;gap:6px;"><div style="width:8px;height:8px;border-radius:50%;background:#ef4444;"></div><span>Sốt xuất huyết: <b>${dengue}</b></span></div>` : ''}
            ${covid > 0 ? `<div style="display:flex;align-items:center;gap:6px;"><div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;"></div><span>COVID-19: <b>${covid}</b></span></div>` : ''}
            ${tcm > 0 ? `<div style="display:flex;align-items:center;gap:6px;"><div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div><span>Tay chân miệng: <b>${tcm}</b></span></div>` : ''}
            ${other > 0 ? `<div style="display:flex;align-items:center;gap:6px;"><div style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;"></div><span>Khác: <b>${other}</b></span></div>` : ''}
          </div>
          <button id="cluster-zoom-${clusterId}" style="margin-top:10px;width:100%;padding:6px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.4);border-radius:6px;color:#60a5fa;font-size:11px;font-weight:600;cursor:pointer;">
            🔎 Phóng to xem chi tiết
          </button>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 15, maxWidth: '280px', closeButton: true, closeOnClick: true })
        .setLngLat(coords)
        .setHTML(popupHtml)
        .addTo(map.current!);

      setTimeout(() => {
        const zoomBtn = document.getElementById(`cluster-zoom-${clusterId}`);
        if (zoomBtn) {
          zoomBtn.addEventListener('click', () => {
            popup.remove();
            (map.current!.getSource('cases-cluster') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || !zoom) return;
              map.current!.easeTo({ center: coords, zoom });
            });
          });
        }
      }, 50);
    };

    const onClickPoint = (e: any) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties;
      const coords = (feat.geometry as any).coordinates.slice();

      const diseaseNames: Record<string, string> = {
        'D01': 'Sốt xuất huyết', 'D02': 'COVID-19', 'D03': 'Tay chân miệng',
        'D04': 'Cúm mùa', 'D05': 'Sởi', dengue: 'Sốt xuất huyết',
        covid19: 'COVID-19', tcm: 'Tay chân miệng', ari: 'Viêm đường hô hấp',
      };
      const diseaseColors: Record<string, string> = {
        'D01': '#ef4444', 'D02': '#3b82f6', 'D03': '#f59e0b', 'D04': '#22c55e', 'D05': '#ec4899',
        dengue: '#ef4444', covid19: '#3b82f6', tcm: '#f59e0b', ari: '#22c55e',
      };
      const color = diseaseColors[p.disease] || '#8b5cf6';
      const name = diseaseNames[p.disease] || p.disease;
      const date = p.date ? new Date(p.date).toLocaleDateString('vi-VN') : '—';

      new mapboxgl.Popup({ offset: 12, maxWidth: '240px', closeButton: true, closeOnClick: true })
        .setLngLat(coords)
        .setHTML(`
          <div style="padding:10px;font-size:12px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>
              <span style="font-weight:700;font-size:13px;">${name}</span>
            </div>
            <div style="color:#94a3b8;font-size:11px;">📅 ${date}</div>
            ${p.age ? `<div style="color:#94a3b8;font-size:11px;">👤 ${p.age} ${p.gender || ''}</div>` : ''}
            ${p.district ? `<div style="color:#94a3b8;font-size:11px;">📍 ${p.district}</div>` : ''}
          </div>
        `)
        .addTo(map.current!);
    };

    const onEnterCluster = () => { map.current!.getCanvas().style.cursor = 'pointer'; };
    const onLeaveCluster = () => { map.current!.getCanvas().style.cursor = ''; };
    const onEnterPoint = () => { map.current!.getCanvas().style.cursor = 'pointer'; };
    const onLeavePoint = () => { map.current!.getCanvas().style.cursor = ''; };

    map.current.on('click', 'clusters', onClickCluster);
    map.current.on('click', 'unclustered-point', onClickPoint);
    map.current.on('mouseenter', 'clusters', onEnterCluster);
    map.current.on('mouseleave', 'clusters', onLeaveCluster);
    map.current.on('mouseenter', 'unclustered-point', onEnterPoint);
    map.current.on('mouseleave', 'unclustered-point', onLeavePoint);

    // Forecast layer click handlers (registered once since layers are persistent)
    const onClickForecastNode = (e: any) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties;
      const coords = feat.geometry.coordinates.slice();
      const riskIcon = p.risk_level === 'critical' ? '🔴' : p.risk_level === 'high' ? '🟠' : p.risk_level === 'medium' ? '🟡' : '🟢';
      const trendIcon = p.trend === 'rising' ? '📈' : p.trend === 'falling' ? '📉' : '➡️';
      new mapboxgl.Popup({ offset: 15, maxWidth: '300px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="padding:12px;font-size:12px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;">
              ${riskIcon} Dự báo: ${p.predicted_cases} ca
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
              <div style="background:rgba(255,255,255,0.05);padding:6px;border-radius:6px;text-align:center;">
                <div style="font-size:16px;font-weight:700;">${p.confidence}%</div>
                <div style="font-size:9px;color:#94a3b8;">Tin cậy</div>
              </div>
              <div style="background:rgba(255,255,255,0.05);padding:6px;border-radius:6px;text-align:center;">
                <div style="font-size:16px;font-weight:700;">${trendIcon}</div>
                <div style="font-size:9px;color:#94a3b8;">Xu hướng</div>
              </div>
            </div>
            <div style="font-size:11px;line-height:1.5;">${p.suggested_action}</div>
          </div>
        `)
        .addTo(map.current!);
    };

    const onClickProvinceRisk = (e: any) => {
      const feat = e.features?.[0];
      if (!feat || !feat.properties.has_data) return;
      const p = feat.properties;
      const riskIcon = p.risk_level === 'critical' ? '🔴' : p.risk_level === 'high' ? '🟠' : p.risk_level === 'medium' ? '🟡' : '🟢';
      const trendIcon = p.trend === 'rising' ? '↗ Tăng' : p.trend === 'falling' ? '↘ Giảm' : '→ Ổn định';
      new mapboxgl.Popup({ offset: 15, maxWidth: '300px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="padding:14px;font-size:12px;">
            <div style="font-weight:700;font-size:15px;margin-bottom:8px;">${riskIcon} ${p.name}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
              <div style="background:rgba(239,68,68,0.1);padding:8px;border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:700;color:${p.predicted_cases > 300 ? '#dc2626' : p.predicted_cases > 150 ? '#ef4444' : p.predicted_cases >= 50 ? '#f59e0b' : '#22c55e'};">${p.predicted_cases}</div>
                <div style="font-size:9px;color:#94a3b8;">Ca dự báo</div>
              </div>
              <div style="background:rgba(59,130,246,0.1);padding:8px;border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:700;color:#60a5fa;">${p.confidence}%</div>
                <div style="font-size:9px;color:#94a3b8;">Tin cậy</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:#94a3b8;font-size:11px;">Xu hướng</span>
              <span style="font-weight:600;font-size:11px;">${trendIcon}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:#94a3b8;font-size:11px;">Phân loại</span>
              <span style="font-weight:600;font-size:11px;text-transform:uppercase;">${p.risk_level}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#94a3b8;font-size:11px;">Điểm dữ liệu</span>
              <span style="font-weight:600;font-size:11px;">${p.node_count}</span>
            </div>
          </div>
        `)
        .addTo(map.current!);
      // Set clicked province for ranking panel
      setClickedProvince({ name: p.name, id: p.id || p.name, predicted_cases: p.predicted_cases, risk_level: p.risk_level, confidence: p.confidence, trend: p.trend });
    };

    map.current.on('click', 'health-forecast-layer', onClickForecastNode);
    map.current.on('click', 'province-choropleth-fill', onClickProvinceRisk);
    map.current.on('mouseenter', 'health-forecast-layer', onEnterPoint);
    map.current.on('mouseleave', 'health-forecast-layer', onLeavePoint);
    map.current.on('mouseenter', 'province-choropleth-fill', onEnterPoint);
    map.current.on('mouseleave', 'province-choropleth-fill', onLeavePoint);

    return () => {
      if (!map.current) return;
      map.current.off('click', 'clusters', onClickCluster);
      map.current.off('click', 'unclustered-point', onClickPoint);
      map.current.off('mouseenter', 'clusters', onEnterCluster);
      map.current.off('mouseleave', 'clusters', onLeaveCluster);
      map.current.off('mouseenter', 'unclustered-point', onEnterPoint);
      map.current.off('mouseleave', 'unclustered-point', onLeavePoint);
      map.current.off('click', 'health-forecast-layer', onClickForecastNode);
      map.current.off('click', 'province-choropleth-fill', onClickProvinceRisk);
      map.current.off('mouseenter', 'health-forecast-layer', onEnterPoint);
      map.current.off('mouseleave', 'health-forecast-layer', onLeavePoint);
      map.current.off('mouseenter', 'province-choropleth-fill', onEnterPoint);
      map.current.off('mouseleave', 'province-choropleth-fill', onLeavePoint);
      map.current.off('click', 'hospital-detail-circles', onClickHospital);
      map.current.off('click', 'hospital-provincial-icons', onClickHospital);
      map.current.off('mouseenter', 'hospital-detail-circles', onEnterHospital);
      map.current.off('mouseleave', 'hospital-detail-circles', onLeaveHospital);
      map.current.off('mouseenter', 'hospital-provincial-icons', onEnterHospital);
      map.current.off('mouseleave', 'hospital-provincial-icons', onLeaveHospital);
      layersInitRef.current = false;
    };
  }, [mapLoaded]);

  // ======= DATA UPDATE (in-place, no layer teardown) =======
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('cases-cluster') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // Update data in-place — no flicker
    source.setData(showCaseDots ? caseFeaturesGeoJSON : { type: 'FeatureCollection', features: [] });
  }, [mapLoaded, caseFeaturesGeoJSON, showCaseDots]);

  // ======= TOGGLE HEATMAP / DOTS VISIBILITY =======
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (!map.current.getLayer('unclustered-point') || !map.current.getLayer('cases-heat')) return;

    if (showHeatmap) {
      map.current.setLayoutProperty('unclustered-point', 'visibility', 'none');
      map.current.setLayoutProperty('cases-heat', 'visibility', 'visible');
    } else {
      map.current.setLayoutProperty('unclustered-point', 'visibility', 'visible');
      map.current.setLayoutProperty('cases-heat', 'visibility', 'none');
    }
  }, [mapLoaded, showHeatmap]);

  // ======= MODE-DRIVEN LAYER VISIBILITY =======
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const setVis = (layerId: string, visible: boolean) => {
      if (m.getLayer(layerId)) m.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    };

    // Forecast layers (province choropleth + projection heatmap only — no individual node circles)
    const forecastLayers = ['forecast-projection-heatmap', 'province-choropleth-fill', 'province-choropleth-outline', 'province-choropleth-labels'];
    // Infrastructure layers
    const infraLayers = ['hospital-provincial-icons', 'hospital-clusters', 'hospital-cluster-count', 'hospital-detail-circles', 'hospital-detail-labels'];
    // Regional layers
    const regionalLayers = ['asean-forecast-circles', 'asean-forecast-labels', 'china-forecast-circles', 'china-forecast-labels'];

    // Mode: only one intelligence layer group visible
    forecastLayers.forEach(l => setVis(l, mapMode === 'forecast' || mapMode === 'policy'));
    infraLayers.forEach(l => setVis(l, mapMode === 'infrastructure'));
    regionalLayers.forEach(l => setVis(l, mapMode === 'regional'));

    // Disable simultaneous heatmap + hospital + detailed nodes
    if (mapMode === 'infrastructure') {
      setVis('cases-heat', false);
      setVis('forecast-projection-heatmap', false);
    }
    if (mapMode === 'forecast' && showHeatmap) {
      infraLayers.forEach(l => setVis(l, false));
    }
  }, [mapLoaded, mapMode, showHeatmap]);

  // ======= HOTSPOT LAYERS (Province-Aggregated Choropleth) =======
  const hotspotLayersInitRef = useRef(false);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    // Clean up existing hotspot layers
    const layerIds = [
      'hotspot-news-glow', 'hotspot-news-circles', 'hotspot-news-labels',
      'hotspot-disease-circles', 'hotspot-disease-labels',
      'hotspot-province-fill', 'hotspot-province-outline', 'hotspot-province-labels',
    ];
    layerIds.forEach(id => { if (m.getLayer(id)) m.removeLayer(id); });
    ['hotspot-disease', 'hotspot-news', 'hotspot-provinces'].forEach(id => { if (m.getSource(id)) m.removeSource(id); });

    if (!showHotspots || hotspotProvinceAgg.length === 0 || !provincesDataRef.current) return;

    // Build province-aggregated GeoJSON with hotspot_count, avg_risk, max_risk
    const enrichedFeatures = provincesDataRef.current.features.map((f: any) => {
      const pid = f.properties.id || f.properties.name;
      const agg = hotspotProvinceAgg.find(a => a.id === pid);
      return {
        ...f,
        properties: {
          ...f.properties,
          hotspot_count: agg?.hotspotCount ?? 0,
          avg_risk: agg?.avgRisk ?? 0,
          max_risk: agg?.maxRisk ?? 0,
          disease_risk: agg?.diseaseRisk ?? 0,
          news_intensity: agg?.newsIntensity ?? 0,
          confidence: agg?.confidence ?? 0,
          top_disease: agg?.topDisease ?? '',
          has_hotspot: !!agg,
        },
      };
    });
    const provinceAggGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection' as const, features: enrichedFeatures };

    m.addSource('hotspot-provinces', { type: 'geojson', data: provinceAggGeoJSON });

    // Province choropleth fill — colored by hotspot_count (visible at all zoom levels)
    m.addLayer({
      id: 'hotspot-province-fill',
      type: 'fill',
      source: 'hotspot-provinces',
      filter: ['==', ['get', 'has_hotspot'], true],
      paint: {
        'fill-color': [
          'case',
          ['>', ['get', 'hotspot_count'], 15], 'hsla(0, 84%, 55%, 0.6)',
          ['>=', ['get', 'hotspot_count'], 6], 'hsla(25, 95%, 53%, 0.5)',
          ['>=', ['get', 'hotspot_count'], 1], 'hsla(48, 96%, 53%, 0.4)',
          'hsla(142, 71%, 45%, 0.25)',
        ],
        'fill-opacity': 0.75,
      },
    }, m.getLayer('clusters') ? 'clusters' : undefined);

    // Province outline
    m.addLayer({
      id: 'hotspot-province-outline',
      type: 'line',
      source: 'hotspot-provinces',
      filter: ['==', ['get', 'has_hotspot'], true],
      paint: {
        'line-color': [
          'case',
          ['>', ['get', 'hotspot_count'], 15], 'hsl(0, 84%, 60%)',
          ['>=', ['get', 'hotspot_count'], 6], 'hsl(25, 95%, 53%)',
          ['>=', ['get', 'hotspot_count'], 1], 'hsl(48, 96%, 53%)',
          'hsl(142, 71%, 45%)',
        ],
        'line-width': [
          'case',
          ['>', ['get', 'hotspot_count'], 15], 3,
          ['>=', ['get', 'hotspot_count'], 6], 2.5,
          1.5,
        ],
      },
    });

    // Province labels — show hotspot count and avg risk
    m.addLayer({
      id: 'hotspot-province-labels',
      type: 'symbol',
      source: 'hotspot-provinces',
      filter: ['==', ['get', 'has_hotspot'], true],
      layout: {
        'text-field': ['concat', ['get', 'name'], '\n', ['to-string', ['get', 'hotspot_count']], ' điểm nóng'],
        'text-font': ['Arial Unicode MS Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 8, 6, 11, 9, 13],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': [
          'case',
          ['>', ['get', 'hotspot_count'], 15], 'hsl(0, 84%, 70%)',
          ['>=', ['get', 'hotspot_count'], 6], 'hsl(25, 95%, 65%)',
          ['>=', ['get', 'hotspot_count'], 1], 'hsl(48, 96%, 65%)',
          'hsl(142, 80%, 65%)',
        ],
        'text-halo-color': 'hsla(0, 0%, 0%, 0.85)',
        'text-halo-width': 1.5,
      },
    });

    // Click handler for province choropleth
    const onClickProvince = (e: any) => {
      const feat = e.features?.[0];
      if (!feat || !feat.properties.has_hotspot) return;
      const p = feat.properties;
      const countColor = p.hotspot_count > 15 ? '#dc2626' : p.hotspot_count >= 6 ? '#f59e0b' : p.hotspot_count >= 1 ? '#eab308' : '#22c55e';
      new mapboxgl.Popup({ offset: 15, maxWidth: '300px', closeButton: true, closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="padding:14px;font-size:12px;">
            <div style="font-weight:700;font-size:15px;margin-bottom:8px;">🏛️ ${p.name}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
              <div style="background:rgba(239,68,68,0.1);padding:8px;border-radius:8px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:${countColor};">${p.hotspot_count}</div>
                <div style="font-size:9px;color:#94a3b8;">Điểm nóng</div>
              </div>
              <div style="background:rgba(245,158,11,0.1);padding:8px;border-radius:8px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#f59e0b;">${p.avg_risk}</div>
                <div style="font-size:9px;color:#94a3b8;">TB rủi ro</div>
              </div>
              <div style="background:rgba(239,68,68,0.1);padding:8px;border-radius:8px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#ef4444;">${p.max_risk}</div>
                <div style="font-size:9px;color:#94a3b8;">Max rủi ro</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:#94a3b8;font-size:11px;">Bệnh phổ biến</span>
              <span style="font-weight:600;font-size:11px;">${p.top_disease}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:#94a3b8;font-size:11px;">Tin cậy</span>
              <span style="font-weight:600;font-size:11px;">${p.confidence}%</span>
            </div>
            <div style="width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
              <div style="width:${p.confidence}%;height:100%;background:linear-gradient(90deg,hsl(200,80%,65%),hsl(142,71%,45%));border-radius:2px;"></div>
            </div>
          </div>
        `)
        .addTo(m);
    };

    const setCursor = () => { m.getCanvas().style.cursor = 'pointer'; };
    const resetCursor = () => { m.getCanvas().style.cursor = ''; };

    m.on('click', 'hotspot-province-fill', onClickProvince);
    m.on('mouseenter', 'hotspot-province-fill', setCursor);
    m.on('mouseleave', 'hotspot-province-fill', resetCursor);

    return () => {
      m.off('click', 'hotspot-province-fill', onClickProvince);
      m.off('mouseenter', 'hotspot-province-fill', setCursor);
      m.off('mouseleave', 'hotspot-province-fill', resetCursor);
    };
  }, [mapLoaded, showHotspots, hotspotProvinceAgg]);

  // ======= MY LOCATION (blue pulse) =======
  useEffect(() => {
    if (!map.current || !mapLoaded || !gps?.lat || !gps?.lng) return;
    if (myMarkerRef.current) myMarkerRef.current.remove();

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:hsl(217,91%,60%);opacity:0.3;animation:pulse-ring 2s ease-out infinite;"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:hsl(217,91%,60%);border:2px solid white;box-shadow:0 0 8px hsl(217,91%,60%,0.6);"></div>
      </div>
    `;
    myMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([gps.lng, gps.lat])
      .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(`
        <div style="padding:8px;font-size:12px;">
          <div style="font-weight:bold;margin-bottom:4px;">📍 Vị trí của bạn</div>
          ${myRisk ? `<div>Risk: <b style="color:${myRisk.riskLevel === 'high' ? '#ef4444' : myRisk.riskLevel === 'medium' ? '#f59e0b' : '#22c55e'}">${myRisk.riskScore}/100</b></div>` : ''}
        </div>
      `))
      .addTo(map.current!);
  }, [mapLoaded, gps?.lat, gps?.lng, myRisk]);

  // ======= USER DOTS (with Digital Twin health data) =======
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    userMarkersRef.current.forEach(m => m.remove());
    userMarkersRef.current = [];
    if (!showUserDots) return;

    mapUsers.forEach((u: UserMapDot) => {
      const color = u.riskLevel === 'high' ? '#ef4444' : u.riskLevel === 'medium' ? '#f59e0b' : '#22c55e';
      const size = u.hasChronic ? 14 : 10;
      const borderColor = u.hasChronic ? '#ef4444' : 'rgba(255,255,255,0.8)';
      const borderWidth = u.hasChronic ? 3 : 2;

      const el = document.createElement('div');
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${borderWidth}px solid ${borderColor};box-shadow:0 0 6px ${color}80${u.hasChronic ? ', 0 0 12px #ef444460' : ''};cursor:pointer;transition:transform 0.2s;`;
      el.onmouseenter = () => { el.style.transform = 'scale(2)'; };
      el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

      const riskLabel = u.riskLevel === 'high' ? 'Cao' : u.riskLevel === 'medium' ? 'TB' : 'Thấp';
      const healthBadge = u.hasChronic
        ? `<div style="margin-top:4px;padding:2px 6px;border-radius:4px;background:#ef444420;color:#ef4444;font-size:9px;font-weight:600;">⚠ Có bệnh nền (${u.conditionCount})</div>`
        : `<div style="margin-top:4px;padding:2px 6px;border-radius:4px;background:#22c55e20;color:#22c55e;font-size:9px;font-weight:600;">✓ Khỏe mạnh</div>`;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([u.lng, u.lat])
        .setPopup(new mapboxgl.Popup({ offset: 10, closeButton: false, maxWidth: '200px' }).setHTML(`
          <div style="padding:8px;font-size:11px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${color};"></div>
              <span style="font-weight:700;">👤 #${u.userId.slice(-4)}</span>
            </div>
            <div>Nguy cơ: <span style="color:${color};font-weight:bold;">${riskLabel}</span></div>
            ${u.ageGroup ? `<div style="color:#94a3b8;font-size:10px;">Nhóm tuổi: ${u.ageGroup}</div>` : ''}
            ${healthBadge}
          </div>
        `))
        .addTo(map.current!);
      userMarkersRef.current.push(marker);
    });
  }, [mapLoaded, mapUsers, showUserDots]);

  // ======= PENDING COMMUNITY ALERTS (Waze-style) =======
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    pendingMarkersRef.current.forEach(m => m.remove());
    pendingMarkersRef.current = [];
    if (!showPendingAlerts || pendingAlerts.length === 0) return;

    pendingAlerts.forEach((alert: any) => {
      const confirmPct = Math.min(100, ((alert.confirm_count || 0) / 3) * 100);
      const el = document.createElement('div');
      el.style.cssText = `
        width:28px;height:28px;border-radius:50%;
        background:linear-gradient(135deg, #f59e0b, #ef4444);
        border:3px dashed rgba(255,255,255,0.9);
        box-shadow:0 0 10px rgba(245,158,11,0.5);
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        font-size:14px;transition:transform 0.2s;
        animation:pulse-ring 2s ease-out infinite;
      `;
      el.textContent = alert.icon || '⚠️';
      el.onmouseenter = () => { el.style.transform = 'scale(1.3)'; };
      el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

      const popupHtml = `
        <div style="padding:10px;font-size:12px;max-width:260px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:18px;">${alert.icon || '⚠️'}</span>
            <div>
              <div style="font-weight:700;font-size:13px;">Cảnh báo cộng đồng</div>
              <div style="font-size:10px;color:#94a3b8;">${alert.address || ''}</div>
            </div>
          </div>
          <p style="margin:6px 0;color:#e2e8f0;line-height:1.4;">${(alert.description || '').substring(0, 120)}${(alert.description || '').length > 120 ? '...' : ''}</p>
          ${alert.photo_url ? `<img src="${alert.photo_url}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin:6px 0;" />` : ''}
          <div style="display:flex;align-items:center;gap:6px;margin:8px 0;">
            <div style="flex:1;height:6px;background:#334155;border-radius:3px;overflow:hidden;">
              <div style="width:${confirmPct}%;height:100%;background:linear-gradient(90deg,#f59e0b,#22c55e);border-radius:3px;transition:width 0.3s;"></div>
            </div>
            <span style="font-size:10px;font-weight:600;color:#94a3b8;">${alert.confirm_count || 0}/3</span>
          </div>
          <div style="font-size:10px;color:#64748b;margin-bottom:6px;">
            ${alert.userHasVoted ? '✅ Bạn đã xác nhận' : '👆 Bấm nút bên dưới để xác nhận'}
          </div>
          ${!alert.userHasVoted ? `<button onclick="window.__voteAlert && window.__voteAlert('${alert.id}')" style="width:100%;padding:6px;border:none;border-radius:6px;background:linear-gradient(90deg,#f59e0b,#22c55e);color:white;font-weight:700;font-size:11px;cursor:pointer;">✋ Tôi xác nhận điểm này</button>` : ''}
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([alert.lng, alert.lat])
        .addTo(map.current!);

      let activePopup: mapboxgl.Popup | null = null;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (activePopup) { activePopup.remove(); activePopup = null; return; }
        const currentCenter = map.current!.getCenter();
        const currentZoom = map.current!.getZoom();
        activePopup = new mapboxgl.Popup({ offset: 14, maxWidth: '280px', closeButton: true, closeOnClick: true, anchor: 'bottom' })
          .setLngLat([alert.lng, alert.lat])
          .setHTML(popupHtml)
          .addTo(map.current!);
        map.current!.jumpTo({ center: currentCenter, zoom: currentZoom });
        activePopup.on('close', () => { activePopup = null; });
      });
      el.addEventListener('dblclick', (e) => { e.stopPropagation(); e.preventDefault(); });

      pendingMarkersRef.current.push(marker);
    });

    // Expose vote function to popup buttons
    (window as any).__voteAlert = (alertId: string) => {
      voteOnAlert(alertId);
    };

    return () => { delete (window as any).__voteAlert; };
  }, [mapLoaded, pendingAlerts, showPendingAlerts, voteOnAlert]);

  // ======= REGION CLICK (double-click on map) =======
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleDblClick = (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      // Check if click is in Vietnam
      if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
        e.preventDefault();
        generateRegionReport(lat, lng);
      }
    };

    map.current.on('dblclick', handleDblClick);
    return () => { map.current?.off('dblclick', handleDblClick); };
  }, [mapLoaded, allCaseEvents]);

  // Generate region report
  const generateRegionReport = useCallback(async (lat: number, lng: number) => {
    setLoadingReport(true);
    setShowRegionReport(true);

    // Determine region
    let regionName = 'Việt Nam';
    for (const r of vietnamRegions) {
      if (lng >= r.bbox[0] && lng <= r.bbox[2] && lat >= r.bbox[1] && lat <= r.bbox[3]) {
        regionName = r.name;
        break;
      }
    }

    // Filter cases in region (approximate)
    const regionCases = allCaseEvents.filter(c => {
      const dlat = Math.abs(c.lat - lat);
      const dlng = Math.abs(c.lon - lng);
      return dlat < 2 && dlng < 2;
    });

    const byDisease: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const districtCounts: Record<string, number> = {};
    const now = Date.now();
    let recentCases = 0;

    regionCases.forEach(c => {
      byDisease[c.disease_code] = (byDisease[c.disease_code] || 0) + 1;
      const status = c.symptoms?.confirmed ? 'confirmed' : c.symptoms?.probable ? 'probable' : 'suspected';
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (c.district_id) districtCounts[c.district_id] = (districtCounts[c.district_id] || 0) + 1;
      if (now - new Date(c.occurred_at).getTime() < 7 * 86400000) recentCases++;
    });

    const topDistricts = Object.entries(districtCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, cases]) => ({ name, cases }));

    setRegionReport({
      region: regionName,
      totalCases: regionCases.length,
      byDisease,
      byStatus,
      trend7d: recentCases,
      topDistricts,
      generatedAt: new Date().toISOString(),
    });
    setLoadingReport(false);
  }, [allCaseEvents]);

  // Export region report
  const exportRegionReport = () => {
    if (!regionReport) return;
    const lines = [
      `BÁO CÁO Y TẾ - ${regionReport.region}`,
      `Ngày tạo: ${new Date(regionReport.generatedAt).toLocaleString('vi-VN')}`,
      '',
      `Tổng ca: ${regionReport.totalCases}`,
      `Ca trong 7 ngày: ${regionReport.trend7d}`,
      '',
      'PHÂN LOẠI THEO BỆNH:',
      ...Object.entries(regionReport.byDisease).map(([d, c]) => `  ${d}: ${c} ca`),
      '',
      'PHÂN LOẠI THEO TRẠNG THÁI:',
      ...Object.entries(regionReport.byStatus).map(([s, c]) => `  ${s}: ${c} ca`),
      '',
      'TOP QUẬN/HUYỆN:',
      ...regionReport.topDistricts.map((d, i) => `  ${i + 1}. ${d.name}: ${d.cases} ca`),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `health_report_${regionReport.region}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const flyToMe = () => {
    if (map.current && gps?.lat && gps?.lng)
      map.current.flyTo({ center: [gps.lng, gps.lat], zoom: 14, duration: 1500 });
  };

  const flyToVietnam = () => {
    map.current?.flyTo({ center: [106.5, 16.0], zoom: 5.5, duration: 2000 });
  };

  const handleCaseAdded = () => { setCurrentPage(1); window.location.reload(); };

  const diseaseLabel: Record<string, string> = {
    dengue: 'Sốt xuất huyết', tcm: 'Tay chân miệng', covid19: 'COVID-19', ari: 'Viêm hô hấp',
  };

  const diseaseColor: Record<string, string> = {
    dengue: 'bg-destructive', tcm: 'bg-warning', covid19: 'bg-primary', ari: 'bg-success',
  };

  return (
    <div className="fixed inset-0 z-[5] top-16 md:left-[3rem]">
      <div ref={mapContainer} className="absolute inset-0 z-0" />

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes hotspot-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>

      {/* ====== MODE SWITCHER ====== */}
      <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20 flex items-center gap-1">
        {([
          { mode: 'forecast' as MapMode, icon: '📊', label: 'Dự báo' },
          { mode: 'crossborder' as MapMode, icon: '🌐', label: 'Xuyên biên giới' },
          { mode: 'infrastructure' as MapMode, icon: '🏥', label: 'Hạ tầng' },
          { mode: 'regional' as MapMode, icon: '🌏', label: 'Khu vực' },
          { mode: 'policy' as MapMode, icon: '🛡️', label: 'Chính sách' },
        ]).map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => {
              setMapMode(mode);
              setClickedProvince(null);
              // Cross-border: zoom out to show ASEAN + South China
              if (mode === 'crossborder' && map.current) {
                map.current.flyTo({ center: [108, 14], zoom: 3.8, duration: 1500 });
                // Show ASEAN + China layers
                ['asean-forecast-circles', 'asean-forecast-labels', 'china-forecast-circles', 'china-forecast-labels'].forEach(id => {
                  if (map.current?.getLayer(id)) map.current.setLayoutProperty(id, 'visibility', 'visible');
                });
              }
            }}
            className={`px-2 py-1.5 md:px-3 md:py-2 rounded-full text-[10px] md:text-xs font-medium transition-all shrink-0 ${
              mapMode === mode
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-card/80 backdrop-blur-md text-muted-foreground hover:bg-card border border-border/40'
            }`}
          >
            <span className="mr-1">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ====== TOP BAR ====== */}
      <div className="absolute top-12 left-2 right-2 md:top-14 md:left-3 md:right-3 z-10 flex items-center gap-1.5 md:gap-2">
        <HealthStrategyPrompt
          mapInteracting={mapInteracting}
          clickedProvince={clickedProvince}
          mapMode={mapMode}
          onForecastResult={(geojson, meta, provinceRisks) => {
            if (!map.current || !mapLoaded) return;
            const m = map.current;
            if (!geojson || !geojson.features || !Array.isArray(geojson.features)) return;

            const vnFeatures = geojson.features.filter((f: any) => f.properties.region_type === 'vietnam');
            const aseanFeatures = geojson.features.filter((f: any) => f.properties.region_type === 'asean');
            const chinaFeatures = geojson.features.filter((f: any) => f.properties.region_type === 'china');

            const setSourceData = (id: string, data: any) => {
              const src = m.getSource(id) as mapboxgl.GeoJSONSource;
              if (src) src.setData(data);
            };

            setSourceData('healthForecast', { type: 'FeatureCollection', features: vnFeatures });
            setSourceData('forecastProjection', { type: 'FeatureCollection', features: vnFeatures });
            setSourceData('aseanForecast', { type: 'FeatureCollection', features: aseanFeatures });
            setSourceData('chinaForecast', { type: 'FeatureCollection', features: chinaFeatures });
            setSourceData('provinceRisk', meta?.enrichedProvinces || { type: 'FeatureCollection', features: [] });

            // Populate hospital infrastructure from forecast province predictions
            const hospitalFeatures: any[] = [];
            const provPreds = meta?.provincePredictions || [];
            for (const pp of provPreds) {
              if (!pp.hospitals || pp.hospitals.length === 0) continue;
              for (const h of pp.hospitals) {
                hospitalFeatures.push({
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
                  properties: {
                    name: h.name,
                    type: h.type,
                    beds: h.beds,
                    icu_beds: h.icu_beds,
                    stress_pct: pp.capacity_stress_pct || 0,
                    province: pp.province,
                    policy_pressure: pp.policy_pressure_index || 0,
                  },
                });
              }
            }
            setSourceData('hospitalInfra', { type: 'FeatureCollection', features: hospitalFeatures });

            // Hide point-based layers during forecast mode — visibility toggle only, no source removal
            const pointLayers = [
              'clusters', 'cluster-count', 'unclustered-point',
              'hotspot-province-labels',
              'health-forecast-layer', 'health-forecast-labels',
            ];
            pointLayers.forEach(id => {
              if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'none');
            });

            if (meta?.bbox) {
              m.fitBounds([[meta.bbox[0], meta.bbox[1]], [meta.bbox[2], meta.bbox[3]]], { padding: 60, duration: 1500 });
            }
          }}
          onClear={() => {
            if (!map.current) return;
            const m = map.current;
            const emptyGJ = { type: 'FeatureCollection' as const, features: [] };
            ['healthForecast', 'provinceRisk', 'forecastProjection', 'aseanForecast', 'chinaForecast', 'hospitalInfra'].forEach(id => {
              const src = m.getSource(id) as mapboxgl.GeoJSONSource;
              if (src) src.setData(emptyGJ);
            });

            // Restore default visibility for point-based layers
            const pointLayers = [
              'clusters', 'cluster-count', 'unclustered-point',
              'hotspot-province-labels',
              'health-forecast-layer', 'health-forecast-labels',
            ];
            pointLayers.forEach(id => {
              if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'visible');
            });
          }}
        />

        <Badge variant="outline" className="h-9 md:h-10 px-2.5 md:px-3 rounded-full bg-card/90 backdrop-blur-md shadow-lg gap-1 md:gap-1.5 shrink-0">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
          <span className="text-xs font-medium">{totalCaseCount + newsCaseCount}</span>
        </Badge>

        {/* Vietnam focus - hidden on very small screens */}
        <Button size="sm" variant="secondary" className="hidden sm:flex h-9 md:h-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg text-xs gap-1.5 shrink-0" onClick={flyToVietnam}>
          🇻🇳 Vietnam
        </Button>

        <Button size="icon" className="h-9 w-9 md:h-10 md:w-10 rounded-full shadow-lg shrink-0" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* ====== RIGHT CONTROLS ====== */}
      <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 md:gap-2">
        <Button size="icon" variant="secondary" className="h-9 w-9 md:h-10 md:w-10 rounded-full shadow-lg bg-card/90 backdrop-blur-md" onClick={flyToMe}>
          <Crosshair className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className={`h-9 w-9 md:h-10 md:w-10 rounded-full shadow-lg bg-card/90 backdrop-blur-md ${showLayers ? 'ring-2 ring-primary' : ''}`} onClick={() => setShowLayers(!showLayers)}>
          <Layers className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className={`h-9 w-9 md:h-10 md:w-10 rounded-full shadow-lg bg-card/90 backdrop-blur-md ${showFilters ? 'ring-2 ring-primary' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-9 w-9 md:h-10 md:w-10 rounded-full shadow-lg bg-card/90 backdrop-blur-md" onClick={() => fetchMapUsers()}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Button size="icon" variant="secondary" className={`h-9 w-9 md:h-10 md:w-10 rounded-full shadow-lg bg-card/90 backdrop-blur-md ${showNewsPanel ? 'ring-2 ring-primary' : ''}`} onClick={() => { setShowNewsPanel(!showNewsPanel); if (!showNewsPanel && newsArticles.length === 0) loadNewsArticles(); }}>
          <Newspaper className="h-4 w-4" />
        </Button>
      </div>

      {/* ====== LAYERS PANEL (enhanced) ====== */}
      {showLayers && (
        <div className="absolute right-12 md:right-16 top-1/2 -translate-y-1/2 z-10 w-48 md:w-56">
          <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Layers</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowLayers(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Disease tracking */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dịch tễ</span>
              <LayerToggle icon={<Bug className="h-3.5 w-3.5" />} label={`Ca bệnh (${allCaseEvents.length} GPS / ${totalCaseCount} tổng)`} color="bg-destructive" checked={showCaseDots} onChange={setShowCaseDots} />
              <LayerToggle icon={<Thermometer className="h-3.5 w-3.5" />} label="Heatmap" color="bg-warning" checked={showHeatmap} onChange={setShowHeatmap} />
              <LayerToggle icon={<AlertTriangle className="h-3.5 w-3.5" />} label={`Hotspots (${hotspotData.length})`} color="bg-destructive" checked={showHotspots} onChange={setShowHotspots} />
              <Button size="sm" variant="outline" className="w-full text-[10px] h-7 gap-1" onClick={generateHotspotsFromNews} disabled={loadingHotspots}>
                {loadingHotspots ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                Suy luận từ bản tin
              </Button>
            </div>

            {/* People */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Người dùng</span>
              <LayerToggle icon={<Users className="h-3.5 w-3.5" />} label={`Online (${mapUsers.length})`} color="bg-success" checked={showUserDots} onChange={setShowUserDots} />
              <LayerToggle icon={<AlertTriangle className="h-3.5 w-3.5" />} label={`Chờ duyệt (${pendingAlerts.length})`} color="bg-warning" checked={showPendingAlerts} onChange={setShowPendingAlerts} />
            </div>

            {/* Infrastructure */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hạ tầng</span>
              <LayerToggle icon={<Building2 className="h-3.5 w-3.5" />} label="Cơ sở y tế" color="bg-primary" checked={showFacilities} onChange={setShowFacilities} />
            </div>

            {/* Legend — Two-layer system */}
            <div className="border-t border-border/50 pt-3 space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Legend</span>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground">Layer A: Disease Alert</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(142,71%,45%)' }} />&lt;30</span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(48,96%,53%)' }} />30-60</span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(25,95%,53%)' }} />60-80</span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(0,84%,60%)' }} />&gt;80</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground">Layer B: News Intelligence</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(200,80%,65%)' }} />&lt;30</span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(174,72%,45%)' }} />30-60</span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(245,58%,51%)' }} />60-80</span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(270,60%,50%)' }} />&gt;80</span>
                </div>
              </div>
              <div className="text-[8px] text-muted-foreground/60 pt-1">
                Zoom &lt;6: Tỉnh • 6-9: Clusters • &gt;9: Nodes
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== FILTERS POPUP ====== */}
      {showFilters && (
        <div className="absolute right-12 md:right-16 top-1/2 -translate-y-1/2 z-10 w-48 md:w-56">
          <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Bộ lọc</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowFilters(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Select value={diseaseFilter} onValueChange={(v) => { setDiseaseFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue placeholder="Tất cả bệnh" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả bệnh</SelectItem>
                {Object.entries(diseaseLabel).map(([code, label]) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue placeholder="Tất cả trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="confirmed">Xác nhận</SelectItem>
                <SelectItem value="suspected">Nghi ngờ</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={exportToCSV}>
              <Download className="h-3 w-3 mr-1.5" /> Xuất CSV
            </Button>
          </div>
        </div>
      )}

      {/* ====== HEALTH NEWS PANEL ====== */}
      {showNewsPanel && (
        <div className="absolute left-2 md:left-3 top-14 md:top-16 bottom-20 md:bottom-16 z-10 w-72 md:w-80 flex flex-col">
          <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-border/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-bold tracking-wider text-foreground uppercase">Tin Y Tế Toàn Cầu</span>
                <Badge variant="outline" className="text-[10px] h-5">{newsArticles.length}</Badge>
                {newsArticles.some((a: any) => a._live) && <span className="text-[8px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-bold">LIVE</span>}
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={loadNewsArticles} disabled={loadingNews}>
                  <RefreshCw className={`h-3 w-3 ${loadingNews ? 'animate-spin' : ''}`} />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowNewsPanel(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Severity filter tabs */}
            <div className="flex gap-1 p-2 border-b border-border/50 shrink-0 overflow-x-auto">
              {['all', 'critical', 'high', 'medium', 'low'].map(sev => {
                const sevColors: Record<string, string> = { critical: 'bg-destructive text-destructive-foreground', high: 'bg-destructive/20 text-destructive', medium: 'bg-warning/20 text-warning', low: 'bg-success/20 text-success' };
                const count = sev === 'all' ? newsArticles.length : newsArticles.filter(a => a.severity === sev).length;
                if (sev !== 'all' && count === 0) return null;
                return (
                  <span key={sev} className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-default ${sev === 'all' ? 'bg-muted text-muted-foreground' : sevColors[sev] || 'bg-muted'}`}>
                    {sev === 'all' ? 'Tất cả' : sev.toUpperCase()} {count}
                  </span>
                );
              })}
            </div>

            {/* Articles list */}
            <div className="flex-1 overflow-y-auto">
              {loadingNews ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : newsArticles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">Chưa có tin tức</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {newsArticles.map((article) => {
                    const sevColor: Record<string, string> = { critical: 'border-l-destructive', high: 'border-l-destructive/70', medium: 'border-l-warning', low: 'border-l-success' };
                    const diseaseEmoji: Record<string, string> = { dengue: '🦟', covid19: '🦠', tcm: '🖐️', influenza: '🤧', measles: '🔴', tuberculosis: '🫁', ari: '😷', rabies: '🐕' };
                    const timeDiff = Date.now() - new Date(article.published_at).getTime();
                    const hoursAgo = Math.floor(timeDiff / 3600000);
                    const timeLabel = hoursAgo < 1 ? 'Vừa xong' : hoursAgo < 24 ? `${hoursAgo}h trước` : `${Math.floor(hoursAgo / 24)}d trước`;

                    return (
                      <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer"
                        className={`block p-3 hover:bg-muted/30 transition-colors border-l-2 ${sevColor[article.severity] || 'border-l-transparent'}`}
                        onClick={(e) => {
                          // If article has location, also fly to it on map
                          e.stopPropagation();
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm shrink-0 mt-0.5">{diseaseEmoji[article.disease_type] || '📰'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {(article as any)._live && <span className="text-[8px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-bold animate-pulse">LIVE</span>}
                              <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{article.title}</p>
                            </div>
                            {article.content_summary && (
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{article.content_summary}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {article.case_count > 0 && (
                                <span className="text-[10px] font-bold text-destructive">🔢 {article.case_count.toLocaleString('vi-VN')} ca</span>
                              )}
                              <span className="text-[10px] text-muted-foreground">{article.source}</span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                              {article.location && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">·</span>
                                  <span className="text-[10px] text-primary">📍 {article.location}</span>
                                </>
                              )}
                              {article.disease_type && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5">{article.disease_type}</Badge>
                              )}
                              {article.severity && (
                                <Badge className={`text-[9px] h-4 px-1.5 ${
                                  article.severity === 'critical' ? 'bg-destructive' :
                                  article.severity === 'high' ? 'bg-destructive/80' :
                                  article.severity === 'medium' ? 'bg-warning' : 'bg-success'
                                }`}>{article.severity}</Badge>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border/50 shrink-0">
              <p className="text-[9px] text-muted-foreground text-center">
                🌍 WHO · Bộ Y tế · CDC · Reuters · VnExpress · Perplexity Sonar · Cập nhật {new Date().toLocaleTimeString('vi-VN')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ====== BOTTOM BAR ====== */}
      <div className="absolute bottom-[4.5rem] md:bottom-3 left-2 md:left-3 right-2 md:right-3 z-10">
        <div className="flex items-center gap-1.5 md:gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setShowStats(!showStats)} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 text-xs font-medium shrink-0 hover:bg-card transition-colors" title="Mở bảng tổng hợp dữ liệu">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span>{totalCaseCount.toLocaleString('vi-VN')} ca xác nhận</span>
            <ChevronUp className={`h-3 w-3 transition-transform ${showStats ? 'rotate-180' : ''}`} />
          </button>

          <button onClick={() => setShowCaseList(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 text-xs font-medium shrink-0 hover:bg-card transition-colors">
            <List className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Danh sách</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-500/10 backdrop-blur-md shadow-lg border border-blue-500/30 text-xs font-medium shrink-0" title="Ca bệnh đã xác nhận lâm sàng từ Bộ Y tế / HCDC">
            <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-blue-600 dark:text-blue-400">{stats.confirmed.toLocaleString('vi-VN')} xác nhận lâm sàng</span>
          </div>

          {newsCaseCount > 0 && (
            <div
              className="flex flex-col items-start gap-0.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 backdrop-blur-md shadow-lg border border-amber-500/30 text-xs font-medium shrink-0"
              title="Tín hiệu thô trích xuất từ tin tức và mạng xã hội bằng AI — chưa qua xác minh lâm sàng"
            >
              <div className="flex items-center gap-1.5">
                <Newspaper className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{newsCaseCount.toLocaleString('vi-VN')} tín hiệu</span>
              </div>
              <span className="text-[9px] text-amber-700/70 dark:text-amber-400/70 leading-tight">Tín hiệu thô từ tin tức, chưa xác minh</span>
            </div>
          )}

          {hotspotData.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-warning/10 backdrop-blur-md shadow-lg border border-warning/20 text-xs font-medium shrink-0">
              <Thermometer className="h-3.5 w-3.5 text-warning" />
              <span className="text-warning">{hotspotData.length} điểm nóng</span>
            </div>
          )}
          {pendingAlerts.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500/10 backdrop-blur-md shadow-lg border border-amber-500/20 text-xs font-medium shrink-0 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-500">{pendingAlerts.length} chờ duyệt</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-success/10 backdrop-blur-md shadow-lg border border-success/20 text-xs font-medium shrink-0">
            <Users className="h-3.5 w-3.5 text-success" />
            <span className="text-success">{mapUsers.length} online</span>
          </div>

          {myRisk && (
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md shadow-lg border text-xs font-medium shrink-0 ${
              myRisk.riskLevel === 'high' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
              myRisk.riskLevel === 'medium' ? 'bg-warning/10 border-warning/20 text-warning' :
              'bg-success/10 border-success/20 text-success'
            }`}>
              <Shield className="h-3.5 w-3.5" />
              <span>Risk: {myRisk.riskScore}/100</span>
            </div>
          )}

          {/* Double-click hint */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 backdrop-blur-md shadow-lg border border-primary/20 text-xs font-medium shrink-0">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary">Nhấp đúp vào vùng VN → Báo cáo</span>
          </div>
        </div>

        {showStats && (
          <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 p-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{(totalCaseCount + newsCaseCount).toLocaleString('vi-VN')}</p>
                <p className="text-[10px] text-muted-foreground">Tổng ca</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{totalCaseCount.toLocaleString('vi-VN')}</p>
                <p className="text-[10px] text-muted-foreground">Ca báo cáo</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{newsCaseCount.toLocaleString('vi-VN')}</p>
                <p className="text-[10px] text-muted-foreground">Từ tin tức</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{stats.confirmed}</p>
                <p className="text-[10px] text-muted-foreground">Xác nhận</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">{stats.suspected}</p>
                <p className="text-[10px] text-muted-foreground">Nghi ngờ</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{stats.todayCases}</p>
                <p className="text-[10px] text-muted-foreground">Hôm nay</p>
              </div>
            </div>
            {hotspotCaseCount > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>🔥 Điểm nóng: <strong className="text-warning">{hotspotCaseCount.toLocaleString('vi-VN')} ca</strong></span>
                <span>📍 {allCaseEvents.length} có tọa độ GPS</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====== CASE LIST SHEET ====== */}
      <Sheet open={showCaseList} onOpenChange={setShowCaseList}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0">
          <SheetHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" />
                Danh sách ca bệnh ({totalCount})
              </SheetTitle>
              <Badge variant="outline" className="text-xs">
                Trang {currentPage}/{Math.ceil(totalCount / pageSize) || 1}
              </Badge>
            </div>
          </SheetHeader>
          <div className="overflow-auto h-full pb-20">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : cases.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Không tìm thấy ca bệnh</div>
            ) : (
              <div className="divide-y divide-border">
                {cases.map((c: any) => (
                  <button key={c.id} onClick={() => { setSelectedCase(c); setShowCaseModal(true); if (map.current && c.lat && (c.lon || c.lng)) map.current.flyTo({ center: [c.lon || c.lng, c.lat], zoom: 15, duration: 1000 }); }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${diseaseColor[c.disease_code] || 'bg-muted'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{c.patient_name || `#${c.id.slice(0, 6)}`}</span>
                        <Badge className={`${diseaseColor[c.disease_code] || 'bg-muted'} text-[10px]`}>{c.disease_code}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.district_id || 'N/A'} · {new Date(c.occurred_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {Math.ceil(totalCount / pageSize) > 1 && (
              <div className="flex items-center justify-center gap-2 p-4">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Trước</Button>
                <span className="text-xs text-muted-foreground">{currentPage} / {Math.ceil(totalCount / pageSize)}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= Math.ceil(totalCount / pageSize)} onClick={() => setCurrentPage(p => p + 1)}>Sau</Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ====== REGION REPORT MODAL ====== */}
      <Dialog open={showRegionReport} onOpenChange={setShowRegionReport}>
        <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-lg">🇻🇳</span>
              <span>{regionReport?.region || 'Loading...'}</span>
              {regionReport && <Badge variant="outline" className="text-[10px]">{regionReport.totalCases} ca</Badge>}
            </DialogTitle>
          </DialogHeader>

          {loadingReport ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : regionReport ? (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{regionReport.totalCases}</p>
                  <p className="text-[10px] text-muted-foreground">Tổng ca</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{regionReport.trend7d}</p>
                  <p className="text-[10px] text-muted-foreground">7 ngày qua</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-warning">{Object.keys(regionReport.byDisease).length}</p>
                  <p className="text-[10px] text-muted-foreground">Loại bệnh</p>
                </div>
              </div>

              {/* Disease breakdown */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Phân loại theo bệnh</h4>
                <div className="space-y-2">
                  {Object.entries(regionReport.byDisease).sort((a, b) => b[1] - a[1]).map(([disease, count]) => (
                    <div key={disease} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${diseaseColor[disease] || 'bg-muted'}`} />
                      <span className="text-sm flex-1">{diseaseLabel[disease] || disease}</span>
                      <span className="text-sm font-bold">{count}</span>
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${diseaseColor[disease] || 'bg-muted-foreground'}`} style={{ width: `${(count / regionReport.totalCases) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status breakdown */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Trạng thái</h4>
                <div className="flex gap-2">
                  {Object.entries(regionReport.byStatus).map(([status, count]) => (
                    <div key={status} className={`flex-1 rounded-xl p-2 text-center ${
                      status === 'confirmed' ? 'bg-destructive/10' : status === 'probable' ? 'bg-warning/10' : 'bg-muted/50'
                    }`}>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{status === 'confirmed' ? 'Xác nhận' : status === 'probable' ? 'Có thể' : 'Nghi ngờ'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top districts */}
              {regionReport.topDistricts.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Top Quận/Huyện</h4>
                  <div className="space-y-1.5">
                    {regionReport.topDistricts.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-4">{i + 1}.</span>
                        <span className="flex-1">{d.name}</span>
                        <span className="font-bold">{d.cases}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={exportRegionReport}>
                  <Download className="h-3 w-3 mr-1.5" /> Tải báo cáo
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => window.print()}>
                  <Printer className="h-3 w-3 mr-1.5" /> In
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                  navigator.clipboard.writeText(`Báo cáo y tế ${regionReport.region}: ${regionReport.totalCases} ca, ${regionReport.trend7d} ca trong 7 ngày`);
                  toast.success('Đã sao chép');
                }}>
                  <Share2 className="h-3 w-3 mr-1.5" /> Chia sẻ
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Dữ liệu tạo lúc {new Date(regionReport.generatedAt).toLocaleString('vi-VN')} · Nguồn: HCMC Health Hub
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ====== MODALS ====== */}
      <CaseDetailModal case_={selectedCase} open={showCaseModal} onOpenChange={setShowCaseModal} />
      <AddCaseModal open={showAddModal} onOpenChange={setShowAddModal} onCaseAdded={handleCaseAdded} />
    </div>
  );
}

// Layer toggle component
function LayerToggle({ icon, label, color, checked, onChange }: {
  icon: React.ReactNode; label: string; color: string; checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-border" />
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <div className="flex items-center gap-1.5 text-xs text-foreground/80 group-hover:text-foreground transition-colors">
        {icon}
        <span>{label}</span>
      </div>
    </label>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie,
  ComposedChart, Legend, Scatter
} from 'recharts';
import { 
  Activity, Wind, Thermometer, Droplets, TrendingUp, TrendingDown, 
  RefreshCw, Brain, Building2, Ambulance, Clock, MapPin,
  AlertTriangle, Users, Heart, Zap, BarChart3, Navigation,
  Shield, Target, DollarSign, Truck, Bug, Hand, Circle, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { PersonalReportDownloader } from '@/components/reports/PersonalReportDownloader';
import { toast } from 'sonner';
import { EnvironmentData, RiskAssessment, AgeGroup, GPSPoint } from '@/hooks/useStrokeRiskEngine';
import healthLogo from '@/assets/health-logo.png';

interface DiseaseCase {
  id: string;
  name: string;
  icon: string;
  color: string;
  today: number;
  week: number;
  month: number;
  trend: number;
  source: 'database' | 'ai';
  byDistrict: { district: string; cases: number; change: number }[];
  byAge: { ageGroup: string; cases: number; percentage: number }[];
}

interface DiseaseCases {
  diseases: DiseaseCase[];
  totalToday: number;
  totalWeek: number;
  hourly: { hour: string; cases: number }[];
}

interface DiseaseRisk {
  id: string;
  name: string;
  riskScore: number;
  predicted7d: number;
  trend: number;
  factors: string[];
}

interface AnalyticsData {
  pollution: {
    current: { aqi: number; pm25: number; pm10: number; o3: number; no2: number };
    forecast: { time: string; aqi: number; pm25: number }[];
    byDistrict: { district: string; aqi: number; risk: string }[];
  };
  weather: {
    current: { temp: number; humidity: number; pressure: number; wind: number };
    forecast: { time: string; temp: number; pressure: number }[];
  };
  strokeCases: {
    today: number;
    week: number;
    month: number;
    trend: number;
    byDistrict: { district: string; cases: number; change: number }[];
    byAge: { ageGroup: string; cases: number; percentage: number }[];
    hourly: { hour: string; cases: number }[];
  };
  diseaseCases?: DiseaseCases;
  mlPredictions: {
    riskByDistrict: { district: string; riskScore: number; predicted: number; factors: string[] }[];
    timeSeries: { date: string; actual: number; predicted: number }[];
    hotspots: { lat: number; lng: number; risk: number; name: string }[];
    diseaseRisk?: DiseaseRisk[];
  };
  commercialInsights: {
    hospitalCapacity: { name: string; capacity: number; current: number }[];
    ambulanceAvailability: number;
    emergencyResponseTime: number;
    marketTrends: { metric: string; value: number; change: number }[];
  };
  locationInfo?: {
    city: string;
    address: string;
    coordinates: { lat: number; lng: number } | null;
  };
  lastUpdated: string;
}

interface MLAnalyticsDashboardProps {
  gps?: { lat: number; lon: number } | null;
  environment?: EnvironmentData;
  riskAssessment?: RiskAssessment;
  ageGroup?: AgeGroup;
  isTracking?: boolean;
  outdoorMinutes?: number;
  locationConfidence?: number;
  pressureChange1h?: number | null;
  pressureChange24h?: number | null;
}

const DISEASE_ICON_MAP: Record<string, React.ReactNode> = {
  bug: <Bug className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  hand: <Hand className="h-4 w-4" />,
  thermometer: <Thermometer className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  circle: <Circle className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  'alert-triangle': <AlertTriangle className="h-4 w-4" />,
  wind: <Wind className="h-4 w-4" />,
};

const MLAnalyticsDashboard: React.FC<MLAnalyticsDashboardProps> = ({
  gps,
  environment,
  riskAssessment,
  ageGroup = '36-55',
  isTracking = false,
  outdoorMinutes = 0,
  locationConfidence = 0,
  pressureChange1h = null,
  pressureChange24h = null
}) => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null);

  const locationRef = React.useRef<{ lat: number; lon: number } | null>(null);
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  
  const fetchData = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      
      const currentGps = gps || locationRef.current;
      const location = currentGps 
        ? { lat: currentGps.lat, lon: currentGps.lon, name: t('epiIntel.currentPosition') }
        : { name: 'Ho Chi Minh City' };
      
      if (gps) locationRef.current = gps;
      
      const { data: result, error } = await supabase.functions.invoke('stroke-analytics-data', {
        body: { 
          location: location.name,
          coordinates: currentGps ? { lat: currentGps.lat, lon: currentGps.lon } : null,
          userEnvironment: environment,
          userRisk: riskAssessment,
          ageGroup
        }
      });

      if (error) throw error;
      
      setData(result);
      setLastUpdate(new Date());
      
      if (showRefreshToast) {
        toast.success(t('epiIntel.dataUpdated'));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error(t('epiIntel.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const initialLoadRef = React.useRef(false);
  const lastFetchTimeRef = React.useRef<number>(0);
  
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchData();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 30000) {
        lastFetchTimeRef.current = now;
        fetchData();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return 'hsl(142, 71%, 45%)';
    if (aqi <= 100) return 'hsl(55, 100%, 45%)';
    if (aqi <= 150) return 'hsl(38, 92%, 50%)';
    if (aqi <= 200) return 'hsl(25, 95%, 53%)';
    return 'hsl(0, 72%, 51%)';
  };

  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return t('epiIntel.kpi.aqiGood');
    if (aqi <= 100) return t('epiIntel.kpi.aqiModerate');
    if (aqi <= 150) return t('epiIntel.kpi.aqiUnhealthy');
    if (aqi <= 200) return t('epiIntel.kpi.aqiBad');
    return t('epiIntel.kpi.aqiHazardous');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center space-y-4">
          <img src={healthLogo} alt="Loading" className="w-24 h-24 mx-auto animate-heartbeat drop-shadow-lg" />
          <p className="text-lg text-slate-600">{t('epiIntel.loadingAnalytics')}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentAQI = environment?.aqi ?? data.pollution.current.aqi;
  const currentTemp = environment?.temperature ?? data.weather.current.temp;
  const currentHumidity = environment?.humidity ?? data.weather.current.humidity;
  const currentPressure = environment?.pressure ?? data.weather.current.pressure;
  const currentRiskScore = riskAssessment?.risk_score ?? 0;
  const currentRiskLevel = riskAssessment?.risk_level ?? 'LOW';

  const diseases = data.diseaseCases?.diseases || [];
  const totalToday = data.diseaseCases?.totalToday || data.strokeCases.today;
  const totalWeek = data.diseaseCases?.totalWeek || data.strokeCases.week;
  const filteredDiseases = selectedDisease ? diseases.filter(d => d.id === selectedDisease) : diseases;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
              <Brain className="h-6 w-6 text-white" />
            </div>
            {t('epiIntel.title')}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <MapPin className="h-4 w-4 text-blue-500" />
            {data?.locationInfo?.address ? (
              <span className="font-medium text-slate-700">{data.locationInfo.address}</span>
            ) : gps ? (
              <span>{gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}</span>
            ) : (
              <span>TP. Hồ Chí Minh</span>
            )}
            {isTracking && (
              <Badge className="bg-green-100 text-green-700 text-xs">
                <Navigation className="h-3 w-3 mr-1" />
                {t('epiIntel.tracking')}
              </Badge>
            )}
            {data?.locationInfo?.city && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                {data.locationInfo.city}
              </Badge>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <PersonalReportDownloader reportType="stroke" variant="outline" size="sm" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-600">{t('epiIntel.live')}</span>
            <span className="text-xs text-slate-400">{lastUpdate?.toLocaleTimeString(locale)}</span>
          </div>
          <Button 
            variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}
            className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            {t('epiIntel.update')}
          </Button>
        </div>
      </div>

      {/* Real-time Status Banner */}
      {riskAssessment && (
        <div className={cn(
          "mb-6 p-4 rounded-2xl border shadow-sm",
          currentRiskLevel === 'HIGH' ? 'bg-red-50 border-red-200' :
          currentRiskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-200' :
          'bg-emerald-50 border-emerald-200'
        )}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-xl",
                currentRiskLevel === 'HIGH' ? 'bg-red-100' :
                currentRiskLevel === 'MEDIUM' ? 'bg-amber-100' : 'bg-emerald-100'
              )}>
                <Shield className={cn(
                  "h-6 w-6",
                  currentRiskLevel === 'HIGH' ? 'text-red-600' :
                  currentRiskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                )} />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{t('epiIntel.riskStatus.title')}</p>
                <p className="text-sm text-slate-600">
                  {t('epiIntel.riskStatus.score', { score: currentRiskScore }).replace('<b>', '').replace('</b>', '')} • {t('epiIntel.riskStatus.locationConfidence', { value: locationConfidence })}
                </p>
              </div>
            </div>
            <Badge className={cn("text-sm px-4 py-2", getRiskBadgeClass(currentRiskLevel))}>
              {currentRiskLevel === 'HIGH' ? t('epiIntel.riskStatus.high') : 
               currentRiskLevel === 'MEDIUM' ? t('epiIntel.riskStatus.medium') : t('epiIntel.riskStatus.low')}
            </Badge>
          </div>
          {riskAssessment.primary_factors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {riskAssessment.primary_factors.map((factor, idx) => (
                <Badge key={idx} variant="outline" className="bg-white/50 text-slate-600 text-xs">{factor}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pressure Change Warning */}
      {pressureChange1h !== null && Math.abs(pressureChange1h) >= 3 && (
        <div className="mb-6 p-4 rounded-2xl border border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-orange-800">{t('epiIntel.pressure.warningTitle')}</p>
              <p className="text-sm text-orange-700 mt-1">
                {pressureChange1h > 0 
                  ? t('epiIntel.pressure.rose', { value: Math.abs(pressureChange1h).toFixed(1) }).replace('<b>', '').replace('</b>', '')
                  : t('epiIntel.pressure.dropped', { value: Math.abs(pressureChange1h).toFixed(1) }).replace('<b>', '').replace('</b>', '')
                }
                {pressureChange24h !== null && (
                  <span> • {t('epiIntel.pressure.in24h', { value: (pressureChange24h > 0 ? '+' : '') + pressureChange24h.toFixed(1) })}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 font-medium">{t('epiIntel.kpi.todayCases')}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{totalToday}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">{t('epiIntel.kpi.diseaseTypes', { count: diseases.length })}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50">
                <Activity className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 font-medium">{gps ? t('epiIntel.kpi.aqiReal') : t('epiIntel.kpi.aqi')}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{currentAQI}</p>
                <p className="text-xs mt-2 font-medium" style={{ color: getAQIColor(currentAQI) }}>
                  {getAQILevel(currentAQI)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50">
                <Wind className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow",
          pressureChange1h !== null && Math.abs(pressureChange1h) >= 3 && "border-orange-300 ring-2 ring-orange-200"
        )}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                  {gps ? t('epiIntel.kpi.pressureReal') : t('epiIntel.pressure.label')}
                  {pressureChange1h !== null && Math.abs(pressureChange1h) >= 3 && (
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                  )}
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{currentPressure?.toFixed(0) ?? '--'}</p>
                <div className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-2">
                  <span>hPa</span>
                  {pressureChange1h !== null && (
                    <span className={cn(
                      "flex items-center gap-0.5",
                      pressureChange1h > 0 ? "text-red-500" : pressureChange1h < 0 ? "text-blue-500" : "text-slate-400"
                    )}>
                      {pressureChange1h > 0 ? <TrendingUp className="h-3 w-3" /> : pressureChange1h < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                      {pressureChange1h > 0 ? '+' : ''}{pressureChange1h.toFixed(1)}/1h
                    </span>
                  )}
                </div>
              </div>
              <div className={cn(
                "p-2.5 rounded-xl",
                pressureChange1h !== null && Math.abs(pressureChange1h) >= 3 ? "bg-orange-50" : "bg-blue-50"
              )}>
                <Activity className={cn(
                  "h-5 w-5",
                  pressureChange1h !== null && Math.abs(pressureChange1h) >= 3 ? "text-orange-500" : "text-blue-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 font-medium">{gps ? t('epiIntel.kpi.tempReal') : t('epiIntel.statsPanel.temperature')}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{currentTemp?.toFixed(0) ?? '--'}°C</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">{t('epiIntel.kpi.humidity', { value: currentHumidity?.toFixed(0) ?? '--' })}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50">
                <Thermometer className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outdoor Time Card */}
      {isTracking && outdoorMinutes > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 border-0 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/20"><Clock className="h-6 w-6" /></div>
                <div>
                  <p className="font-medium text-blue-100">{t('epiIntel.outdoor.title')}</p>
                  <p className="text-2xl font-bold">{t('epiIntel.outdoor.minutes', { count: outdoorMinutes })}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">{t('epiIntel.outdoor.ageGroup')}</p>
                <Badge className="bg-white/20 text-white border-white/30 mt-1">{ageGroup}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="cases" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl">
          <TabsTrigger value="cases" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
            <Activity className="h-4 w-4 mr-2" />
            {t('epiIntel.tabs.cases')}
          </TabsTrigger>
          <TabsTrigger value="predictions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
            <Brain className="h-4 w-4 mr-2" />
            {t('epiIntel.tabs.predictions')}
          </TabsTrigger>
          <TabsTrigger value="pollution" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
            <Wind className="h-4 w-4 mr-2" />
            {t('epiIntel.tabs.pollution')}
          </TabsTrigger>
          <TabsTrigger value="commercial" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
            <DollarSign className="h-4 w-4 mr-2" />
            {t('epiIntel.tabs.commercial')}
          </TabsTrigger>
        </TabsList>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedDisease === null ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all text-sm px-3 py-1.5",
                selectedDisease === null 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              )}
              onClick={() => setSelectedDisease(null)}
            >
              {t('epiIntel.cases.all', { count: totalToday })}
            </Badge>
            {diseases.map(disease => (
              <Badge
                key={disease.id}
                variant={selectedDisease === disease.id ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all text-sm px-3 py-1.5 gap-1.5",
                  selectedDisease === disease.id
                    ? "text-white hover:opacity-90"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                )}
                style={selectedDisease === disease.id ? { backgroundColor: disease.color } : undefined}
                onClick={() => setSelectedDisease(selectedDisease === disease.id ? null : disease.id)}
              >
                {DISEASE_ICON_MAP[disease.icon]}
                {disease.name}
                <span className="font-bold">{disease.today}</span>
                {disease.source === 'database' && (
                  <Database className="h-3 w-3 text-green-500" />
                )}
              </Badge>
            ))}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {filteredDiseases.map(disease => (
              <Card key={disease.id} className="bg-white border-slate-200 shadow-sm min-w-[180px] flex-shrink-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${disease.color}15` }}>
                      <span style={{ color: disease.color }}>{DISEASE_ICON_MAP[disease.icon]}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 truncate">{disease.name}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 ml-auto",
                        disease.source === 'database' 
                          ? "bg-green-50 text-green-600 border-green-200" 
                          : "bg-purple-50 text-purple-600 border-purple-200"
                      )}
                    >
                      {disease.source === 'database' ? 'DB' : 'AI'}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{disease.today}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{t('epiIntel.cases.week', { count: disease.week })}</span>
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs font-medium",
                      disease.trend >= 0 ? "text-red-500" : "text-green-500"
                    )}>
                      {disease.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(disease.trend)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  {t('epiIntel.cases.hourlyDistribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.diseaseCases?.hourly || data.strokeCases.hourly}>
                      <defs>
                        <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="cases" name={t('epiIntel.cases.numCases')} stroke="#3b82f6" fill="url(#hourlyGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  {t('epiIntel.cases.ageDistribution')} {selectedDisease ? `(${diseases.find(d => d.id === selectedDisease)?.name})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(selectedDisease ? diseases.find(d => d.id === selectedDisease)?.byAge : data.strokeCases.byAge) || []}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}
                        dataKey="cases" nameKey="ageGroup"
                        label={({ ageGroup, percentage }) => `${ageGroup}: ${percentage}%`}
                        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                      >
                        {(data.strokeCases.byAge || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                {t('epiIntel.cases.byDistrict')} {selectedDisease ? `(${diseases.find(d => d.id === selectedDisease)?.name})` : t('epiIntel.cases.allDistricts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {(selectedDisease 
                  ? diseases.find(d => d.id === selectedDisease)?.byDistrict 
                  : data.strokeCases.byDistrict
                )?.map((district, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <p className="text-sm font-semibold text-slate-700 truncate">{district.district}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{district.cases}</p>
                    <div className={cn(
                      "flex items-center gap-1 text-xs mt-2 font-medium",
                      district.change >= 0 ? "text-red-500" : "text-green-500"
                    )}>
                      {district.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{Math.abs(district.change)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ML Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          {data.mlPredictions.diseaseRisk && data.mlPredictions.diseaseRisk.length > 0 && (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  {t('epiIntel.predictions.diseaseRisk7d')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.mlPredictions.diseaseRisk.map((dr, idx) => {
                    const diseaseInfo = diseases.find(d => d.id === dr.id);
                    return (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span style={{ color: diseaseInfo?.color || '#64748b' }}>
                              {DISEASE_ICON_MAP[diseaseInfo?.icon || 'activity']}
                            </span>
                            <span className="text-sm font-semibold text-slate-700">{dr.name}</span>
                          </div>
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-xs font-bold",
                              dr.riskScore > 70 ? "border-red-300 bg-red-50 text-red-600" :
                              dr.riskScore > 40 ? "border-amber-300 bg-amber-50 text-amber-600" :
                              "border-green-300 bg-green-50 text-green-600"
                            )}
                          >
                            {dr.riskScore}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{t('epiIntel.predictions.forecast7d', { count: dr.predicted7d }).replace('<b>', '').replace('</b>', '')}</span>
                          <div className={cn(
                            "flex items-center gap-0.5 font-medium",
                            dr.trend >= 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {dr.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(dr.trend)}%
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {dr.factors.map((f, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-white text-slate-500 border-slate-200">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  {t('epiIntel.predictions.actualVsPredicted')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.mlPredictions.timeSeries}>
                      <defs>
                        <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Area type="monotone" dataKey="actual" name={t('epiIntel.predictions.actual')} stroke="#3b82f6" fill="url(#actualGradient)" strokeWidth={2} />
                      <Line type="monotone" dataKey="predicted" name={t('epiIntel.predictions.predicted')} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#f59e0b', r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-500" />
                  {t('epiIntel.predictions.riskByDistrict')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.mlPredictions.riskByDistrict} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="district" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`${value}%`, t('epiIntel.predictions.riskScore')]} />
                      <Bar dataKey="riskScore" radius={[0, 6, 6, 0]}>
                        {data.mlPredictions.riskByDistrict.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.riskScore > 70 ? '#ef4444' : entry.riskScore > 50 ? '#f59e0b' : '#22c55e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t('epiIntel.predictions.predictedHotspots')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.mlPredictions.hotspots.map((hotspot, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">{hotspot.name}</span>
                      <Badge variant="outline" className={cn(
                        "text-xs font-semibold",
                        hotspot.risk > 70 ? "border-red-300 bg-red-50 text-red-600" :
                        hotspot.risk > 50 ? "border-amber-300 bg-amber-50 text-amber-600" :
                        "border-green-300 bg-green-50 text-green-600"
                      )}>
                        {hotspot.risk}%
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{hotspot.lat.toFixed(4)}, {hotspot.lng.toFixed(4)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pollution Tab */}
        <TabsContent value="pollution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-500" />
                  {t('epiIntel.pollution.forecast24h')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.pollution.forecast.map(d => ({
                      ...d, time: new Date(d.time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                    }))}>
                      <defs>
                        <linearGradient id="aqiGradientLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="aqi" name="AQI" stroke="#f59e0b" fill="url(#aqiGradientLight)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  {t('epiIntel.pollution.aqiByDistrict')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.pollution.byDistrict}>
                      <XAxis dataKey="district" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="aqi" name="AQI" radius={[6, 6, 0, 0]}>
                        {data.pollution.byDistrict.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getAQIColor(entry.aqi)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-cyan-500" />
                {t('epiIntel.pollution.detailedPollution')} {gps ? t('epiIntel.pollution.atYourLocation') : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100">
                  <p className="text-xs text-amber-600 font-medium">PM2.5</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{environment?.pm25 ?? data.pollution.current.pm25}</p>
                  <p className="text-xs text-slate-500 mt-1">µg/m³</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-100">
                  <p className="text-xs text-orange-600 font-medium">PM10</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{environment?.pm10 ?? data.pollution.current.pm10}</p>
                  <p className="text-xs text-slate-500 mt-1">µg/m³</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium">O₃</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{data.pollution.current.o3}</p>
                  <p className="text-xs text-slate-500 mt-1">ppb</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-100">
                  <p className="text-xs text-red-600 font-medium">NO₂</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{environment?.no2 ?? data.pollution.current.no2}</p>
                  <p className="text-xs text-slate-500 mt-1">ppb</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">Wind</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{environment?.windSpeed ?? data.weather.current.wind}</p>
                  <p className="text-xs text-slate-500 mt-1">km/h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commercial Tab */}
        <TabsContent value="commercial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-100 font-medium">{t('epiIntel.commercial.ambulances')}</p>
                    <p className="text-3xl font-bold mt-1">{data.commercialInsights.ambulanceAvailability}</p>
                    <p className="text-xs text-green-200 mt-2">{t('epiIntel.commercial.readyToOperate')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20"><Ambulance className="h-6 w-6" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 text-white shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100 font-medium">{t('epiIntel.commercial.responseTime')}</p>
                    <p className="text-3xl font-bold mt-1">{data.commercialInsights.emergencyResponseTime}</p>
                    <p className="text-xs text-blue-200 mt-2">{t('epiIntel.commercial.avgMinutes')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20"><Clock className="h-6 w-6" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 text-white shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-100 font-medium">{t('epiIntel.commercial.linkedHospitals')}</p>
                    <p className="text-3xl font-bold mt-1">{data.commercialInsights.hospitalCapacity.length}</p>
                    <p className="text-xs text-purple-200 mt-2">{t('epiIntel.commercial.medicalFacilities')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20"><Building2 className="h-6 w-6" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-100 font-medium">{t('epiIntel.commercial.transportService')}</p>
                    <p className="text-3xl font-bold mt-1">24/7</p>
                    <p className="text-xs text-amber-200 mt-2">{t('epiIntel.commercial.operating247')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20"><Truck className="h-6 w-6" /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                {t('epiIntel.commercial.hospitalCapacity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.commercialInsights.hospitalCapacity.map((hospital, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-700">{hospital.name}</span>
                      <span className="text-sm font-bold text-slate-800">{hospital.current}/{hospital.capacity}</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          (hospital.current / hospital.capacity) > 0.9 ? "bg-red-500" :
                          (hospital.current / hospital.capacity) > 0.7 ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min(100, (hospital.current / hospital.capacity) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{t('epiIntel.commercial.bedsAvailable', { count: hospital.capacity - hospital.current })}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {t('epiIntel.commercial.marketTrends')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.commercialInsights.marketTrends.map((trend, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">{trend.metric}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-2">{trend.value.toLocaleString(locale)}</p>
                    <div className={cn(
                      "flex items-center gap-1 text-xs mt-2 font-semibold",
                      trend.change >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {trend.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{trend.change >= 0 ? '+' : ''}{trend.change}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MLAnalyticsDashboard;

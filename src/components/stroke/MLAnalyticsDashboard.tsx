import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie,
  ComposedChart, Legend, Scatter
} from 'recharts';
import { 
  Activity, Wind, Thermometer, Droplets, TrendingUp, TrendingDown, 
  RefreshCw, Brain, Building2, Ambulance, Clock, MapPin,
  AlertTriangle, Users, Heart, Zap, BarChart3, Navigation,
  Shield, Target, DollarSign, Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EnvironmentData, RiskAssessment, AgeGroup, GPSPoint } from '@/hooks/useStrokeRiskEngine';
import healthLogo from '@/assets/health-logo.png';

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
  mlPredictions: {
    riskByDistrict: { district: string; riskScore: number; predicted: number; factors: string[] }[];
    timeSeries: { date: string; actual: number; predicted: number }[];
    hotspots: { lat: number; lng: number; risk: number; name: string }[];
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
  // Data from tracking view
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
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      
      // Use GPS location from tracking if available
      const location = gps 
        ? { lat: gps.lat, lon: gps.lon, name: 'Vị trí hiện tại' }
        : { name: 'Ho Chi Minh City' };
      
      const { data: result, error } = await supabase.functions.invoke('stroke-analytics-data', {
        body: { 
          location: location.name,
          coordinates: gps ? { lat: gps.lat, lon: gps.lon } : null,
          userEnvironment: environment,
          userRisk: riskAssessment,
          ageGroup
        }
      });

      if (error) throw error;
      
      setData(result);
      setLastUpdate(new Date());
      
      if (showRefreshToast) {
        toast.success('Dữ liệu đã được cập nhật');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gps, environment, riskAssessment, ageGroup]);

  // Initial load and refetch when location changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'hsl(142, 71%, 45%)';
      case 'MEDIUM': return 'hsl(38, 92%, 50%)';
      case 'HIGH': return 'hsl(0, 84%, 60%)';
      case 'CRITICAL': return 'hsl(0, 72%, 51%)';
      default: return 'hsl(215, 20%, 65%)';
    }
  };

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
    if (aqi <= 50) return 'Tốt';
    if (aqi <= 100) return 'Trung bình';
    if (aqi <= 150) return 'Kém';
    if (aqi <= 200) return 'Xấu';
    return 'Nguy hại';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center space-y-4">
          <img 
            src={healthLogo} 
            alt="Loading" 
            className="w-24 h-24 mx-auto animate-heartbeat drop-shadow-lg"
          />
          <p className="text-lg text-slate-600">Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Use real-time data from tracking if available
  const currentAQI = environment?.aqi ?? data.pollution.current.aqi;
  const currentTemp = environment?.temperature ?? data.weather.current.temp;
  const currentHumidity = environment?.humidity ?? data.weather.current.humidity;
  const currentPressure = environment?.pressure ?? data.weather.current.pressure;
  const currentRiskScore = riskAssessment?.risk_score ?? 0;
  const currentRiskLevel = riskAssessment?.risk_level ?? 'LOW';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
              <Brain className="h-6 w-6 text-white" />
            </div>
            Phân tích Thống kê
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
                Đang theo dõi
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-600">Trực tiếp</span>
            <span className="text-xs text-slate-400">
              {lastUpdate?.toLocaleTimeString('vi-VN')}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Cập nhật
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
                currentRiskLevel === 'MEDIUM' ? 'bg-amber-100' :
                'bg-emerald-100'
              )}>
                <Shield className={cn(
                  "h-6 w-6",
                  currentRiskLevel === 'HIGH' ? 'text-red-600' :
                  currentRiskLevel === 'MEDIUM' ? 'text-amber-600' :
                  'text-emerald-600'
                )} />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Trạng thái rủi ro hiện tại</p>
                <p className="text-sm text-slate-600">
                  Điểm số: <span className="font-bold">{currentRiskScore}</span>/100 • 
                  Độ tin cậy vị trí: {locationConfidence}%
                </p>
              </div>
            </div>
            <Badge className={cn("text-sm px-4 py-2", getRiskBadgeClass(currentRiskLevel))}>
              {currentRiskLevel === 'HIGH' ? 'Rủi ro cao' : 
               currentRiskLevel === 'MEDIUM' ? 'Rủi ro trung bình' : 'Rủi ro thấp'}
            </Badge>
          </div>
          {riskAssessment.primary_factors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {riskAssessment.primary_factors.map((factor, idx) => (
                <Badge key={idx} variant="outline" className="bg-white/50 text-slate-600 text-xs">
                  {factor}
                </Badge>
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
              <p className="font-semibold text-orange-800 flex items-center gap-2">
                ⚠️ Cảnh báo: Áp suất thay đổi đột ngột
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Áp suất đã {pressureChange1h > 0 ? 'tăng' : 'giảm'} <span className="font-bold">{Math.abs(pressureChange1h).toFixed(1)} hPa</span> trong 1 giờ qua.
                {pressureChange24h !== null && (
                  <span> • Trong 24h: {pressureChange24h > 0 ? '+' : ''}{pressureChange24h.toFixed(1)} hPa</span>
                )}
              </p>
              <p className="text-xs text-orange-600 mt-2">
                💡 Thay đổi áp suất đột ngột có thể ảnh hưởng đến mạch máu và làm tăng nguy cơ đột quỵ. 
                Hãy nghỉ ngơi, uống đủ nước và theo dõi sức khỏe.
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
                <p className="text-sm text-slate-500 font-medium">Ca hôm nay</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{data.strokeCases.today}</p>
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs font-medium",
                  data.strokeCases.trend >= 0 ? "text-red-500" : "text-green-500"
                )}>
                  {data.strokeCases.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{Math.abs(data.strokeCases.trend)}% so với tuần trước</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50">
                <Heart className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 font-medium">AQI {gps ? '(thực tế)' : ''}</p>
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
                  Áp suất {gps ? '(thực tế)' : ''}
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
                <p className="text-sm text-slate-500 font-medium">Nhiệt độ {gps ? '(thực tế)' : ''}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{currentTemp?.toFixed(0) ?? '--'}°C</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Độ ẩm: {currentHumidity?.toFixed(0) ?? '--'}%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50">
                <Thermometer className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outdoor Time Card (if tracking) */}
      {isTracking && outdoorMinutes > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 border-0 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/20">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-blue-100">Thời gian ngoài trời hôm nay</p>
                  <p className="text-2xl font-bold">{outdoorMinutes} phút</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">Nhóm tuổi</p>
                <Badge className="bg-white/20 text-white border-white/30 mt-1">
                  {ageGroup}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl">
          <TabsTrigger value="predictions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
            <Brain className="h-4 w-4 mr-2" />
            ML Predictions
          </TabsTrigger>
          <TabsTrigger value="pollution" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
            <Wind className="h-4 w-4 mr-2" />
            Ô nhiễm
          </TabsTrigger>
          <TabsTrigger value="cases" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
            <Heart className="h-4 w-4 mr-2" />
            Ca bệnh
          </TabsTrigger>
          <TabsTrigger value="commercial" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
            <DollarSign className="h-4 w-4 mr-2" />
            Thương mại
          </TabsTrigger>
        </TabsList>

        {/* ML Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Time Series Prediction */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Dự đoán vs Thực tế (7 ngày)
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
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Legend />
                      <Area type="monotone" dataKey="actual" name="Thực tế" stroke="#3b82f6" fill="url(#actualGradient)" strokeWidth={2} />
                      <Line type="monotone" dataKey="predicted" name="Dự đoán" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#f59e0b', r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Risk by District */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-500" />
                  Rủi ro theo quận (ML Score)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.mlPredictions.riskByDistrict} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="district" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number) => [`${value}%`, 'Điểm rủi ro']}
                      />
                      <Bar dataKey="riskScore" radius={[0, 6, 6, 0]}>
                        {data.mlPredictions.riskByDistrict.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.riskScore > 70 ? '#ef4444' : entry.riskScore > 50 ? '#f59e0b' : '#22c55e'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hotspots Table */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Điểm nóng được dự đoán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.mlPredictions.hotspots.map((hotspot, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">{hotspot.name}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs font-semibold",
                          hotspot.risk > 70 ? "border-red-300 bg-red-50 text-red-600" :
                          hotspot.risk > 50 ? "border-amber-300 bg-amber-50 text-amber-600" :
                          "border-green-300 bg-green-50 text-green-600"
                        )}
                      >
                        {hotspot.risk}%
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {hotspot.lat.toFixed(4)}, {hotspot.lng.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pollution Tab */}
        <TabsContent value="pollution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pollution Forecast */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-500" />
                  Dự báo ô nhiễm (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.pollution.forecast.map(d => ({
                      ...d,
                      time: new Date(d.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    }))}>
                      <defs>
                        <linearGradient id="aqiGradientLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Area type="monotone" dataKey="aqi" name="AQI" stroke="#f59e0b" fill="url(#aqiGradientLight)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* AQI by District */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  AQI theo quận
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.pollution.byDistrict}>
                      <XAxis dataKey="district" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
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

          {/* Current Pollution Details */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-cyan-500" />
                Chỉ số ô nhiễm chi tiết {gps ? '(tại vị trí của bạn)' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100">
                  <p className="text-xs text-amber-600 font-medium">PM2.5</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {environment?.pm25 ?? data.pollution.current.pm25}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">µg/m³</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-100">
                  <p className="text-xs text-orange-600 font-medium">PM10</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {environment?.pm10 ?? data.pollution.current.pm10}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">µg/m³</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium">O₃</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{data.pollution.current.o3}</p>
                  <p className="text-xs text-slate-500 mt-1">ppb</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-100">
                  <p className="text-xs text-red-600 font-medium">NO₂</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {environment?.no2 ?? data.pollution.current.no2}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">ppb</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">Wind</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {environment?.windSpeed ?? data.weather.current.wind}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">km/h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hourly Cases */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Phân bố ca theo giờ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.strokeCases.hourly}>
                      <defs>
                        <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Area type="monotone" dataKey="cases" name="Số ca" stroke="#ef4444" fill="url(#hourlyGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  Phân bố theo độ tuổi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.strokeCases.byAge}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="cases"
                        nameKey="ageGroup"
                        label={({ ageGroup, percentage }) => `${ageGroup}: ${percentage}%`}
                        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                      >
                        {data.strokeCases.byAge.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 4]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cases by District */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                Ca bệnh theo quận
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {data.strokeCases.byDistrict.map((district, idx) => (
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

        {/* Commercial Tab */}
        <TabsContent value="commercial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-100 font-medium">Xe cứu thương</p>
                    <p className="text-3xl font-bold mt-1">{data.commercialInsights.ambulanceAvailability}</p>
                    <p className="text-xs text-green-200 mt-2">Sẵn sàng hoạt động</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20">
                    <Ambulance className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 text-white shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100 font-medium">Thời gian phản hồi</p>
                    <p className="text-3xl font-bold mt-1">{data.commercialInsights.emergencyResponseTime}</p>
                    <p className="text-xs text-blue-200 mt-2">phút trung bình</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 text-white shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-100 font-medium">Bệnh viện liên kết</p>
                    <p className="text-3xl font-bold mt-1">{data.commercialInsights.hospitalCapacity.length}</p>
                    <p className="text-xs text-purple-200 mt-2">Cơ sở y tế</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-100 font-medium">Dịch vụ vận chuyển</p>
                    <p className="text-3xl font-bold mt-1">24/7</p>
                    <p className="text-xs text-amber-200 mt-2">Hoạt động liên tục</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20">
                    <Truck className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hospital Capacity */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                Công suất bệnh viện
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.commercialInsights.hospitalCapacity.map((hospital, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-700">{hospital.name}</span>
                      <span className="text-sm font-bold text-slate-800">
                        {hospital.current}/{hospital.capacity}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          (hospital.current / hospital.capacity) > 0.9 ? "bg-red-500" :
                          (hospital.current / hospital.capacity) > 0.7 ? "bg-amber-500" :
                          "bg-green-500"
                        )}
                        style={{ width: `${Math.min(100, (hospital.current / hospital.capacity) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Còn {hospital.capacity - hospital.current} giường trống
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Market Trends */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Xu hướng thị trường
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.commercialInsights.marketTrends.map((trend, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">{trend.metric}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-2">
                      {trend.value.toLocaleString('vi-VN')}
                    </p>
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

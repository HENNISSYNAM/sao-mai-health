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
  AlertTriangle, Users, Heart, Zap, BarChart3, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  lastUpdated: string;
}

const MLAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      
      const { data: result, error } = await supabase.functions.invoke('stroke-analytics-data', {
        body: { location: 'Ho Chi Minh City' }
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
  }, []);

  // Initial load
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
      case 'HIGH': return 'hsl(25, 95%, 53%)';
      case 'CRITICAL': return 'hsl(0, 72%, 51%)';
      default: return 'hsl(215, 20%, 65%)';
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return 'hsl(142, 71%, 45%)';
    if (aqi <= 100) return 'hsl(55, 100%, 50%)';
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto" />
          <p className="text-lg text-slate-300">Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
              <Brain className="h-6 w-6 text-white" />
            </div>
            Phân tích ML - Đột quỵ
          </h1>
          <p className="text-slate-400 mt-1">Dự đoán & Thống kê thời gian thực TP.HCM</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-slate-300">Live</span>
            <span className="text-xs text-slate-500">
              {lastUpdate?.toLocaleTimeString('vi-VN')}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Cập nhật
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-red-200/80">Ca hôm nay</p>
                <p className="text-3xl font-bold text-white mt-1">{data.strokeCases.today}</p>
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs",
                  data.strokeCases.trend >= 0 ? "text-red-400" : "text-green-400"
                )}>
                  {data.strokeCases.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{Math.abs(data.strokeCases.trend)}% so với tuần trước</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-red-500/20">
                <Heart className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-amber-200/80">AQI hiện tại</p>
                <p className="text-3xl font-bold text-white mt-1">{data.pollution.current.aqi}</p>
                <p className="text-xs mt-2" style={{ color: getAQIColor(data.pollution.current.aqi) }}>
                  {getAQILevel(data.pollution.current.aqi)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Wind className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-cyan-200/80">Áp suất</p>
                <p className="text-3xl font-bold text-white mt-1">{data.weather.current.pressure}</p>
                <p className="text-xs text-cyan-300/70 mt-2">hPa</p>
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Activity className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-purple-200/80">Nhiệt độ</p>
                <p className="text-3xl font-bold text-white mt-1">{data.weather.current.temp}°C</p>
                <p className="text-xs text-purple-300/70 mt-2">Độ ẩm: {data.weather.current.humidity}%</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Thermometer className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="predictions" className="data-[state=active]:bg-cyan-600">
            <Brain className="h-4 w-4 mr-2" />
            ML Predictions
          </TabsTrigger>
          <TabsTrigger value="pollution" className="data-[state=active]:bg-cyan-600">
            <Wind className="h-4 w-4 mr-2" />
            Ô nhiễm
          </TabsTrigger>
          <TabsTrigger value="cases" className="data-[state=active]:bg-cyan-600">
            <Heart className="h-4 w-4 mr-2" />
            Ca bệnh
          </TabsTrigger>
          <TabsTrigger value="commercial" className="data-[state=active]:bg-cyan-600">
            <Building2 className="h-4 w-4 mr-2" />
            Thương mại
          </TabsTrigger>
        </TabsList>

        {/* ML Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Time Series Prediction */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  Dự đoán vs Thực tế (7 ngày)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.mlPredictions.timeSeries}>
                      <defs>
                        <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(217, 33%, 17%)', 
                          border: '1px solid hsl(217, 19%, 27%)',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }} 
                      />
                      <Legend />
                      <Area type="monotone" dataKey="actual" name="Thực tế" stroke="#06b6d4" fill="url(#actualGradient)" strokeWidth={2} />
                      <Line type="monotone" dataKey="predicted" name="Dự đoán" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#f59e0b', r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Risk by District */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-400" />
                  Rủi ro theo quận (ML Score)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.mlPredictions.riskByDistrict} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="district" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(217, 33%, 17%)', 
                          border: '1px solid hsl(217, 19%, 27%)',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          name === 'riskScore' ? 'Điểm rủi ro' : name
                        ]}
                      />
                      <Bar dataKey="riskScore" radius={[0, 4, 4, 0]}>
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
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Điểm nóng được dự đoán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.mlPredictions.hotspots.map((hotspot, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-200">{hotspot.name}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          hotspot.risk > 70 ? "border-red-500 text-red-400" :
                          hotspot.risk > 50 ? "border-amber-500 text-amber-400" :
                          "border-green-500 text-green-400"
                        )}
                      >
                        {hotspot.risk}%
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500">
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
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" />
                  Dự báo ô nhiễm (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.pollution.forecast.map(d => ({
                      ...d,
                      time: new Date(d.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    }))}>
                      <defs>
                        <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(217, 33%, 17%)', border: '1px solid hsl(217, 19%, 27%)', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="aqi" name="AQI" stroke="#f59e0b" fill="url(#aqiGradient)" strokeWidth={2} />
                      <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pollution by District */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                  AQI theo quận
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.pollution.byDistrict.map((district, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-24 truncate">{district.district}</span>
                      <div className="flex-1 h-6 bg-slate-900/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(district.aqi / 2, 100)}%`,
                            backgroundColor: getAQIColor(district.aqi)
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-200 w-12 text-right">{district.aqi}</span>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] w-16 justify-center"
                        style={{ borderColor: getRiskColor(district.risk), color: getRiskColor(district.risk) }}
                      >
                        {district.risk}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pollution Details */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-200">Chi tiết ô nhiễm hiện tại</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'PM2.5', value: data.pollution.current.pm25, unit: 'µg/m³', color: '#ef4444' },
                  { label: 'PM10', value: data.pollution.current.pm10, unit: 'µg/m³', color: '#f59e0b' },
                  { label: 'O₃', value: data.pollution.current.o3, unit: 'ppb', color: '#22c55e' },
                  { label: 'NO₂', value: data.pollution.current.no2, unit: 'ppb', color: '#8b5cf6' },
                  { label: 'AQI', value: data.pollution.current.aqi, unit: '', color: getAQIColor(data.pollution.current.aqi) }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-xs text-slate-500">{item.unit}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hourly Distribution */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  Phân bố ca theo giờ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.strokeCases.hourly}>
                      <defs>
                        <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(217, 33%, 17%)', border: '1px solid hsl(217, 19%, 27%)', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="cases" name="Ca bệnh" stroke="#06b6d4" fill="url(#hourlyGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  Phân bố theo độ tuổi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.strokeCases.byAge}
                        dataKey="percentage"
                        nameKey="ageGroup"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ ageGroup, percentage }) => `${ageGroup}: ${percentage}%`}
                        labelLine={{ stroke: '#64748b' }}
                      >
                        {data.strokeCases.byAge.map((_, idx) => (
                          <Cell key={idx} fill={['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'][idx % 4]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(217, 33%, 17%)', border: '1px solid hsl(217, 19%, 27%)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cases by District */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-400" />
                Ca bệnh theo quận (tuần này)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {data.strokeCases.byDistrict.map((district, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                    <p className="text-xs text-slate-400 truncate">{district.district}</p>
                    <p className="text-xl font-bold text-white mt-1">{district.cases}</p>
                    <div className={cn(
                      "flex items-center gap-1 text-xs mt-1",
                      district.change >= 0 ? "text-red-400" : "text-green-400"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Ambulance className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-200/80">Xe cấp cứu sẵn sàng</p>
                    <p className="text-2xl font-bold text-white">{data.commercialInsights.ambulanceAvailability}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200/80">Thời gian phản hồi TB</p>
                    <p className="text-2xl font-bold text-white">{data.commercialInsights.emergencyResponseTime} phút</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <Building2 className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-violet-200/80">Bệnh viện theo dõi</p>
                    <p className="text-2xl font-bold text-white">{data.commercialInsights.hospitalCapacity.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hospital Capacity */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  Công suất bệnh viện
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.commercialInsights.hospitalCapacity.map((hospital, idx) => {
                    const utilization = (hospital.current / hospital.capacity) * 100;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300 truncate">{hospital.name}</span>
                          <span className="text-slate-400">{hospital.current}/{hospital.capacity}</span>
                        </div>
                        <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${utilization}%`,
                              backgroundColor: utilization > 90 ? '#ef4444' : utilization > 70 ? '#f59e0b' : '#22c55e'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Market Trends */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Xu hướng thị trường y tế
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.commercialInsights.marketTrends.map((trend, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                      <span className="text-sm text-slate-300">{trend.metric}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-white">{trend.value.toLocaleString()}M</span>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs",
                            trend.change >= 0 ? "border-green-500 text-green-400" : "border-red-500 text-red-400"
                          )}
                        >
                          {trend.change >= 0 ? '+' : ''}{trend.change}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MLAnalyticsDashboard;

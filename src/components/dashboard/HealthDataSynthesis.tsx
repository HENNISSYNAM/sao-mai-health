import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Database,
  Sparkles,
  BarChart3,
  Activity,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';

interface DataPoint {
  timestamp: string;
  disease: string;
  location: string;
  dataType: 'observed' | 'generated';
  value: number;
  confidence?: 'high' | 'medium' | 'low';
  scenario?: 'best-case' | 'most-likely' | 'worst-case';
  source?: string;
}

interface ChartData {
  trendData: any[];
  diseaseDistribution: any[];
  locationDistribution: any[];
  alertEvolution: any[];
}

interface SynthesisResult {
  success: boolean;
  observedData: DataPoint[];
  generatedData: DataPoint[];
  chartData: ChartData;
  lastUpdated: string;
  searchEngine: string;
  dataQuality: {
    observedCount: number;
    generatedCount: number;
    coverageDays: number;
    diseases: string[];
    locations: string[];
  };
}

const diseaseConfig: Record<string, { name: string; color: string }> = {
  dengue: { name: 'Sốt xuất huyết', color: 'hsl(var(--dengue))' },
  covid19: { name: 'COVID-19', color: 'hsl(var(--secondary))' },
  hfmd: { name: 'Tay chân miệng', color: 'hsl(var(--tcm))' },
  influenza: { name: 'Cúm', color: 'hsl(var(--warning))' },
  ari: { name: 'Nhiễm khuẩn HH', color: 'hsl(var(--info))' }
};

export function HealthDataSynthesis() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<SynthesisResult | null>(null);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>(['dengue', 'hfmd', 'covid19']);
  const [showProjections, setShowProjections] = useState(true);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('health-data-synthesis');
      
      if (error) throw error;
      
      if (result?.success) {
        setData(result);
        toast.success('Dữ liệu đã được cập nhật');
      }
    } catch (error: any) {
      console.error('Error fetching synthesis data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleDisease = (disease: string) => {
    setSelectedDiseases(prev => 
      prev.includes(disease) 
        ? prev.filter(d => d !== disease)
        : [...prev, disease]
    );
  };

  // Filter trend data based on projection toggle
  const filteredTrendData = useMemo(() => {
    if (!data?.chartData?.trendData) return [];
    if (showProjections) return data.chartData.trendData;
    return data.chartData.trendData.filter((d: any) => !d.isProjection);
  }, [data?.chartData?.trendData, showProjections]);

  // Find the boundary between observed and projected data
  const projectionStartIndex = useMemo(() => {
    if (!data?.chartData?.trendData) return -1;
    return data.chartData.trendData.findIndex((d: any) => d.isProjection);
  }, [data?.chartData?.trendData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      const isProjection = dataPoint?.isProjection;
      
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium">{label}</p>
            {isProjection && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Dự báo
              </Badge>
            )}
          </div>
          {payload
            .filter((entry: any) => !entry.dataKey.includes('_type'))
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => {
              const disease = entry.dataKey;
              const config = diseaseConfig[disease];
              const type = dataPoint?.[`${disease}_type`];
              
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className={cn(
                      "w-3 h-3 rounded-full",
                      type === 'generated' && "opacity-50"
                    )}
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="flex-1">{config?.name || disease}:</span>
                  <span className="font-medium">{entry.value?.toLocaleString()} ca</span>
                  {type === 'generated' && (
                    <Sparkles className="h-3 w-3 text-warning" />
                  )}
                </div>
              );
            })}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px] rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  const chartData = data?.chartData;
  const quality = data?.dataQuality;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Tổng hợp Dữ liệu Y tế Công cộng</h3>
            <p className="text-xs text-muted-foreground">
              Dữ liệu thực + Dự báo AI
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Data Quality Indicators */}
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/30">
              <Database className="h-3 w-3" />
              {quality?.observedCount || 0} thực
            </Badge>
            <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/30">
              <Sparkles className="h-3 w-3" />
              {quality?.generatedCount || 0} dự báo
            </Badge>
          </div>

          {/* Projection Toggle */}
          <Button
            variant={showProjections ? "default" : "outline"}
            size="sm"
            onClick={() => setShowProjections(!showProjections)}
            className="gap-1 text-xs"
          >
            <Sparkles className="h-3 w-3" />
            Dự báo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="gap-1"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Disease Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(diseaseConfig).map(([key, config]) => {
          const isSelected = selectedDiseases.includes(key);
          return (
            <Badge
              key={key}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: isSelected ? config.color : 'transparent',
                borderColor: config.color,
                color: isSelected ? 'white' : config.color
              }}
              onClick={() => toggleDisease(key)}
            >
              {config.name}
            </Badge>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Trend Chart with Projections */}
        <Card className="rounded-2xl border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Xu hướng Dịch bệnh theo Thời gian</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5 bg-primary" />
                  <span>Thực tế</span>
                </div>
                {showProjections && (
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-primary opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)' }} />
                    <span>Dự báo</span>
                  </div>
                )}
              </div>
            </div>
            <CardDescription>
              Dữ liệu thực ● và dự báo ◇ từ AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={filteredTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  label={{ 
                    value: 'Số ca', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Reference line for projection boundary */}
                {showProjections && projectionStartIndex > 0 && (
                  <ReferenceLine 
                    x={filteredTrendData[projectionStartIndex]?.name} 
                    stroke="hsl(var(--warning))" 
                    strokeDasharray="5 5"
                    label={{ value: 'Dự báo →', position: 'top', fill: 'hsl(var(--warning))', fontSize: 10 }}
                  />
                )}

                {selectedDiseases.map((disease) => {
                  const config = diseaseConfig[disease];
                  return (
                    <Line
                      key={disease}
                      type="monotone"
                      dataKey={disease}
                      stroke={config.color}
                      strokeWidth={2}
                      name={config.name}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const isGenerated = payload?.[`${disease}_type`] === 'generated';
                        if (!cx || !cy) return null;
                        
                        if (isGenerated) {
                          return (
                            <polygon
                              key={`dot-${disease}-${props.index}`}
                              points={`${cx},${cy-4} ${cx+4},${cy} ${cx},${cy+4} ${cx-4},${cy}`}
                              fill={config.color}
                              fillOpacity={0.5}
                              stroke={config.color}
                              strokeWidth={1}
                            />
                          );
                        }
                        return (
                          <circle
                            key={`dot-${disease}-${props.index}`}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={config.color}
                            stroke="hsl(var(--card))"
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 6, stroke: config.color, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Disease Distribution */}
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Phân bố Dịch bệnh</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-success" />
              Dữ liệu thực tế hôm nay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData?.diseaseDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  width={80}
                />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString() + ' ca', 'Số ca']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Phân bố theo Địa phương</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-success" />
              Tổng hợp tất cả dịch bệnh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData?.locationDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString() + ' ca', 'Tổng ca']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--info))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Cập nhật: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString('vi-VN') : 'N/A'}
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Nguồn: {data?.searchEngine || 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-success" />
            = Dữ liệu xác minh
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-warning" />
            = Dự báo AI
          </span>
        </div>
      </div>
    </div>
  );
}

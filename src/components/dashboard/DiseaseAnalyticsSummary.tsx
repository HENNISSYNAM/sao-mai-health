import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, Clock, Users, MapPin, ArrowRight,
  TrendingUp, TrendingDown, Bug, Heart, Hand,
  Thermometer, Shield, Circle, AlertTriangle, Wind, Database, Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useGPS } from '@/hooks/useGPS';
import { MetricInfoTooltip } from '@/components/metrics/MetricInfoTooltip';
import { MetricLegend } from '@/components/metrics/MetricLegend';
import { formatUpdateTime } from '@/lib/metricTypes';

interface DiseaseCase {
  id: string;
  name: string;
  icon: string;
  color: string;
  today: number;
  week: number;
  trend: number;
  source: 'database' | 'ai';
  byDistrict: { district: string; cases: number; change: number }[];
  byAge: { ageGroup: string; cases: number; percentage: number }[];
}

const DISEASE_ICON_MAP: Record<string, React.ReactNode> = {
  bug: <Bug className="h-3.5 w-3.5" />,
  heart: <Heart className="h-3.5 w-3.5" />,
  hand: <Hand className="h-3.5 w-3.5" />,
  thermometer: <Thermometer className="h-3.5 w-3.5" />,
  shield: <Shield className="h-3.5 w-3.5" />,
  circle: <Circle className="h-3.5 w-3.5" />,
  activity: <Activity className="h-3.5 w-3.5" />,
  'alert-triangle': <AlertTriangle className="h-3.5 w-3.5" />,
  wind: <Wind className="h-3.5 w-3.5" />,
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];

export function DiseaseAnalyticsSummary() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const { gps } = useGPS();
  const initRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [diseases, setDiseases] = useState<DiseaseCase[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [hourly, setHourly] = useState<{ hour: string; cases: number }[]>([]);
  const [byAge, setByAge] = useState<{ ageGroup: string; cases: number; percentage: number }[]>([]);
  const [byDistrict, setByDistrict] = useState<{ district: string; cases: number; change: number }[]>([]);
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const location = gps
        ? { name: 'Vị trí hiện tại', coordinates: { lat: gps.lat, lon: gps.lng } }
        : { name: 'Ho Chi Minh City', coordinates: null };

      const { data, error } = await supabase.functions.invoke('stroke-analytics-data', {
        body: {
          location: location.name,
          coordinates: location.coordinates,
        }
      });

      if (error) throw error;

      const d = data?.diseaseCases?.diseases || [];
      setDiseases(d);
      setTotalToday(data?.diseaseCases?.totalToday || data?.strokeCases?.today || 0);
      setHourly(data?.diseaseCases?.hourly || data?.strokeCases?.hourly || []);
      setByAge(data?.strokeCases?.byAge || []);
      setByDistrict(data?.strokeCases?.byDistrict || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching disease analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [gps]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchData();
  }, []);

  const filteredByAge = selectedDisease
    ? diseases.find(d => d.id === selectedDisease)?.byAge || byAge
    : byAge;

  const filteredByDistrict = selectedDisease
    ? diseases.find(d => d.id === selectedDisease)?.byDistrict || byDistrict
    : byDistrict;

  if (loading) {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-44 rounded-xl shrink-0" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[240px] rounded-xl" />
          <Skeleton className="h-[240px] rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4 border-border">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">
            {isVi ? 'Phân tích Dịch tễ' : 'Disease Analytics'}
          </h3>
          <Badge variant="outline" className="text-[10px]">
            {totalToday} {isVi ? 'ca' : 'cases'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1 text-primary"
          onClick={() => navigate('/stroke-risk')}
        >
          {isVi ? 'Chi tiết' : 'Details'}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Disease Filter */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={selectedDisease === null ? "default" : "outline"}
          className="cursor-pointer text-[11px] px-2 py-0.5"
          onClick={() => setSelectedDisease(null)}
        >
          {isVi ? 'Tất cả' : 'All'} ({totalToday})
        </Badge>
        {diseases.slice(0, 6).map(d => (
          <Badge
            key={d.id}
            variant={selectedDisease === d.id ? "default" : "outline"}
            className={cn(
              "cursor-pointer text-[11px] px-2 py-0.5 gap-1",
              selectedDisease === d.id && "text-primary-foreground"
            )}
            style={selectedDisease === d.id ? { backgroundColor: d.color } : undefined}
            onClick={() => setSelectedDisease(selectedDisease === d.id ? null : d.id)}
          >
            {DISEASE_ICON_MAP[d.icon]}
            {d.name} {d.today}
          </Badge>
        ))}
      </div>

      {/* Disease KPI Cards */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
        {(selectedDisease ? diseases.filter(d => d.id === selectedDisease) : diseases).slice(0, 6).map(d => (
          <div
            key={d.id}
            className="min-w-[150px] flex-shrink-0 rounded-xl border bg-card p-3 space-y-1"
          >
            <div className="flex items-center gap-1.5">
              <span style={{ color: d.color }}>{DISEASE_ICON_MAP[d.icon]}</span>
              <span className="text-[11px] font-medium text-muted-foreground truncate">{d.name}</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1 py-0 ml-auto",
                  d.source === 'database'
                    ? "text-success border-success/30"
                    : "text-purple-500 border-purple-300"
                )}
              >
                {d.source === 'database' ? 'DB' : 'AI'}
              </Badge>
            </div>
            <p className="text-xl font-bold" style={{ color: d.color }}>{d.today}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{isVi ? 'Tuần' : 'Week'}: {d.week}</span>
              <span className={cn(
                "flex items-center gap-0.5 text-[10px] font-medium",
                d.trend >= 0 ? "text-destructive" : "text-success"
              )}>
                {d.trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {Math.abs(d.trend)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Distribution */}
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {isVi ? 'Phân bố ca theo giờ' : 'Hourly Distribution'}
          </p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly}>
                <defs>
                  <linearGradient id="dashHourlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    fontSize: '12px',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cases"
                  name={isVi ? "Số ca" : "Cases"}
                  stroke="hsl(var(--primary))"
                  fill="url(#dashHourlyGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Users className="h-3.5 w-3.5 text-purple-500" />
            {isVi ? 'Phân bố theo độ tuổi' : 'Age Distribution'}
          </p>
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredByAge}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={75}
                  paddingAngle={3}
                  dataKey="cases" nameKey="ageGroup"
                  label={({ ageGroup, percentage }) => `${ageGroup}: ${percentage}%`}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                >
                  {filteredByAge.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    fontSize: '12px',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cases by District */}
      <div className="rounded-xl border bg-card p-3">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
          <MapPin className="h-3.5 w-3.5 text-destructive" />
          {isVi ? 'Ca bệnh theo quận' : 'Cases by District'}
          {selectedDisease && (
            <span className="text-foreground">
              ({diseases.find(d => d.id === selectedDisease)?.name})
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredByDistrict.slice(0, 6).map((district, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-semibold text-foreground truncate">{district.district}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{district.cases}</p>
              <div className={cn(
                "flex items-center gap-0.5 text-[10px] font-medium mt-1",
                district.change >= 0 ? "text-destructive" : "text-success"
              )}>
                {district.change >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {Math.abs(district.change)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { TrendingDown, TrendingUp, Minus, Activity, Wind, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskChartsProps {
  pressureHistory: { pressure: number; timestamp: number }[];
  pollutionData: { time: string; aqi: number; pm25: number }[];
  riskDistribution: { level: string; count: number }[];
  currentPressure?: number | null;
  pressureChange1h?: number | null;
}

const RiskCharts: React.FC<RiskChartsProps> = ({
  pressureHistory,
  pollutionData,
  riskDistribution,
  currentPressure,
  pressureChange1h
}) => {
  // Format pressure history for chart
  const pressureChartData = useMemo(() => {
    return pressureHistory.slice(-24).map((reading, idx) => ({
      time: new Date(reading.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      pressure: reading.pressure,
      idx
    }));
  }, [pressureHistory]);

  // Determine pressure trend
  const pressureTrend = useMemo(() => {
    if (pressureChange1h === null || pressureChange1h === undefined) return 'stable';
    if (pressureChange1h < -2) return 'dropping';
    if (pressureChange1h > 2) return 'rising';
    return 'stable';
  }, [pressureChange1h]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'hsl(var(--success))';
      case 'MEDIUM': return 'hsl(var(--warning))';
      case 'HIGH': return 'hsl(var(--danger))';
      case 'CRITICAL': return '#7f1d1d';
      default: return 'hsl(var(--muted))';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Pressure Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" />
              Áp suất khí quyển
            </span>
            <div className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
              pressureTrend === 'dropping' && "bg-danger/20 text-danger",
              pressureTrend === 'rising' && "bg-warning/20 text-warning",
              pressureTrend === 'stable' && "bg-success/20 text-success"
            )}>
              {pressureTrend === 'dropping' && <TrendingDown className="h-3 w-3" />}
              {pressureTrend === 'rising' && <TrendingUp className="h-3 w-3" />}
              {pressureTrend === 'stable' && <Minus className="h-3 w-3" />}
              {pressureChange1h !== null && (
                <span>{pressureChange1h > 0 ? '+' : ''}{pressureChange1h?.toFixed(1)} hPa</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentPressure && (
            <div className="text-3xl font-bold mb-2">
              {currentPressure.toFixed(0)}
              <span className="text-sm text-muted-foreground ml-1">hPa</span>
            </div>
          )}
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pressureChartData}>
                <defs>
                  <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tick={{ fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} hPa`, 'Áp suất']}
                />
                <Area
                  type="monotone"
                  dataKey="pressure"
                  stroke="hsl(var(--info))"
                  strokeWidth={2}
                  fill="url(#pressureGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {pressureTrend === 'dropping' && (
            <p className="text-xs text-danger mt-2">
              ⚠️ Áp suất đang giảm nhanh - tăng nguy cơ đột quỵ
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pollution Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wind className="h-4 w-4 text-warning" />
            Ô nhiễm không khí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pollutionData}>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="aqi" 
                  name="AQI"
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="pm25" 
                  name="PM2.5"
                  stroke="hsl(var(--danger))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-muted-foreground">AQI</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-muted-foreground">PM2.5</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-danger" />
            Phân bố nguy cơ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="level" 
                  type="category" 
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tickFormatter={(value) => {
                    const labels: Record<string, string> = {
                      LOW: 'Thấp',
                      MEDIUM: 'TB',
                      HIGH: 'Cao',
                      CRITICAL: 'Rất cao'
                    };
                    return labels[value] || value;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value} khu vực`, 'Số lượng']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getRiskColor(entry.level)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskCharts;

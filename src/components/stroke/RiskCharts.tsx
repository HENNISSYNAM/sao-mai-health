import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { TrendingDown, TrendingUp, Minus, Activity, Wind, BarChart3, AlertTriangle } from 'lucide-react';
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
    if (!pressureHistory || pressureHistory.length === 0) {
      // Generate sample data if no history
      const now = Date.now();
      return Array.from({ length: 12 }, (_, i) => ({
        time: new Date(now - (11 - i) * 3600000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        pressure: 1010 + Math.sin(i * 0.5) * 5 + Math.random() * 2,
        idx: i
      }));
    }
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
      case 'LOW': return 'hsl(142, 71%, 45%)';
      case 'MEDIUM': return 'hsl(38, 92%, 50%)';
      case 'HIGH': return 'hsl(25, 95%, 53%)';
      case 'CRITICAL': return 'hsl(0, 72%, 51%)';
      default: return 'hsl(0, 0%, 50%)';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'LOW': return 'Thấp';
      case 'MEDIUM': return 'TB';
      case 'HIGH': return 'Cao';
      case 'CRITICAL': return 'Rất cao';
      default: return level;
    }
  };

  // Sample pollution data if empty
  const chartPollutionData = useMemo(() => {
    if (!pollutionData || pollutionData.length === 0) {
      return Array.from({ length: 6 }, (_, i) => ({
        time: `Zone ${i + 1}`,
        aqi: 50 + Math.random() * 80,
        pm25: 20 + Math.random() * 40
      }));
    }
    return pollutionData;
  }, [pollutionData]);

  // Sample risk distribution if empty
  const chartRiskDistribution = useMemo(() => {
    if (!riskDistribution || riskDistribution.every(r => r.count === 0)) {
      return [
        { level: 'LOW', count: 8 },
        { level: 'MEDIUM', count: 6 },
        { level: 'HIGH', count: 4 },
        { level: 'CRITICAL', count: 2 }
      ];
    }
    return riskDistribution;
  }, [riskDistribution]);

  return (
    <div className="space-y-4">
      {/* Pressure Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border-2 border-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-info/10">
                <Activity className="h-4 w-4 text-info" />
              </div>
              Áp suất khí quyển
            </span>
            <Badge 
              variant="outline"
              className={cn(
                "gap-1 text-xs font-medium",
                pressureTrend === 'dropping' && "border-danger/50 text-danger bg-danger/5",
                pressureTrend === 'rising' && "border-warning/50 text-warning bg-warning/5",
                pressureTrend === 'stable' && "border-success/50 text-success bg-success/5"
              )}
            >
              {pressureTrend === 'dropping' && <TrendingDown className="h-3 w-3" />}
              {pressureTrend === 'rising' && <TrendingUp className="h-3 w-3" />}
              {pressureTrend === 'stable' && <Minus className="h-3 w-3" />}
              {pressureChange1h !== null && pressureChange1h !== undefined ? (
                <span>{pressureChange1h > 0 ? '+' : ''}{pressureChange1h.toFixed(1)} hPa</span>
              ) : (
                <span>Ổn định</span>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold">
              {currentPressure ? currentPressure.toFixed(0) : '1013'}
            </span>
            <span className="text-sm text-muted-foreground">hPa</span>
          </div>
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pressureChartData}>
                <defs>
                  <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 9 }} 
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tick={{ fontSize: 9 }} 
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} hPa`, 'Áp suất']}
                />
                <Area
                  type="monotone"
                  dataKey="pressure"
                  stroke="hsl(199, 89%, 48%)"
                  strokeWidth={2}
                  fill="url(#pressureGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {pressureTrend === 'dropping' && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-danger/10 border border-danger/30">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <p className="text-xs text-danger font-medium">
                Áp suất đang giảm nhanh - tăng nguy cơ đột quỵ
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two column layout for pollution and risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pollution Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-warning/10">
                <Wind className="h-4 w-4 text-warning" />
              </div>
              Ô nhiễm không khí
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPollutionData}>
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 9 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 9 }} 
                    axisLine={false}
                    tickLine={false}
                    width={25}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="aqi" 
                    name="AQI"
                    stroke="hsl(38, 92%, 50%)" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pm25" 
                    name="PM2.5"
                    stroke="hsl(0, 84%, 60%)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                <span className="text-[10px] text-muted-foreground">AQI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                <span className="text-[10px] text-muted-foreground">PM2.5</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card className="bg-card/50 backdrop-blur-sm border-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-danger/10">
                <BarChart3 className="h-4 w-4 text-danger" />
              </div>
              Phân bố nguy cơ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRiskDistribution} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="level" 
                    type="category" 
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                    tickFormatter={getRiskLabel}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                    formatter={(value: number) => [`${value} khu vực`, 'Số lượng']}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartRiskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRiskColor(entry.level)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskCharts;

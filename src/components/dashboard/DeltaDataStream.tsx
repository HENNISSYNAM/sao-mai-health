import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  Database
} from 'lucide-react';
import { useHealthDataDelta } from '@/hooks/useHealthDataDelta';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

const DISEASE_NAMES: Record<string, string> = {
  'A90': 'Dengue',
  'U07.1': 'COVID-19',
  'B08.4': 'HFMD',
  'J10': 'Influenza',
  'J06.9': 'ARI',
  'B05': 'Measles',
};

const DISEASE_COLORS: Record<string, string> = {
  'A90': '#ef4444',
  'U07.1': '#8b5cf6',
  'B08.4': '#f97316',
  'J10': '#3b82f6',
  'J06.9': '#22c55e',
  'B05': '#ec4899',
};

export function DeltaDataStream() {
  const {
    isConnected,
    lastUpdate,
    pendingDeltas,
    diseaseDistribution,
    locationAggregation,
    deltaSummary,
    triggerDeltaComputation,
    getChartTimeSeries,
  } = useHealthDataDelta();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const chartData = getChartTimeSeries();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerDeltaComputation();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <Wifi className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Last update: {formatTime(lastUpdate)}
            </span>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          Sync Delta
        </Button>
      </div>

      {/* Delta Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">New Points</p>
                <p className="text-2xl font-bold text-blue-600">{deltaSummary.newCount}</p>
              </div>
              <Database className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-2xl font-bold text-amber-600">{deltaSummary.updateCount}</p>
              </div>
              <Activity className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Delta Cases</p>
                <p className="text-2xl font-bold text-green-600">
                  {deltaSummary.totalCases.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Delta Feed */}
      {pendingDeltas.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Live Delta Stream
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingDeltas.slice(0, 5).map((delta, idx) => (
                <div 
                  key={`${delta.dataPoint.id}-${idx}`}
                  className="flex items-center justify-between text-sm animate-in slide-in-from-left-5 duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={delta.type === 'insert' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {delta.type === 'insert' ? 'NEW' : 'UPD'}
                    </Badge>
                    <span className="font-medium">
                      {DISEASE_NAMES[delta.dataPoint.disease] || delta.dataPoint.disease}
                    </span>
                    <span className="text-muted-foreground">
                      @ {delta.dataPoint.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{delta.dataPoint.cases.toLocaleString()}</span>
                    {delta.change !== undefined && (
                      <span className={cn(
                        "flex items-center text-xs",
                        delta.change > 0 ? "text-red-500" : "text-green-500"
                      )}>
                        {delta.change > 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Math.abs(delta.change)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Case Trend (Delta-Based)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.isNew) {
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={6} 
                          fill="hsl(var(--primary))"
                          className="animate-pulse"
                        />
                      );
                    }
                    return <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No data yet. Click "Sync Delta" to fetch updates.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disease & Location Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Disease Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {diseaseDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={diseaseDistribution} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="disease" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => DISEASE_NAMES[value] || value}
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Cases']}
                  />
                  <Bar dataKey="cases" radius={[0, 4, 4, 0]}>
                    {diseaseDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={DISEASE_COLORS[entry.disease] || '#6366f1'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Awaiting data...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Location Aggregation</CardTitle>
          </CardHeader>
          <CardContent>
            {locationAggregation.length > 0 ? (
              <div className="space-y-3">
                {locationAggregation.slice(0, 5).map((loc) => (
                  <div key={loc.location} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{loc.location}</span>
                      <div className="flex gap-1 mt-1">
                        {loc.diseases.slice(0, 3).map(d => (
                          <Badge 
                            key={d} 
                            variant="outline" 
                            className="text-xs py-0"
                            style={{ 
                              borderColor: DISEASE_COLORS[d],
                              color: DISEASE_COLORS[d]
                            }}
                          >
                            {DISEASE_NAMES[d] || d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <span className="font-mono text-lg">{loc.cases.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Awaiting data...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

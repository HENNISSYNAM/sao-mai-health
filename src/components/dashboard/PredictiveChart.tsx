import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PredictiveChartProps {
  chartData?: {
    observed: any[];
    predicted: any[];
    scenarios: {
      bestCase: any[];
      mostLikely: any[];
      worstCase: any[];
    };
  };
  isLoading?: boolean;
}

const DISEASE_COLORS: Record<string, string> = {
  dengue: 'hsl(var(--chart-1))',
  covid19: 'hsl(var(--chart-2))',
  hfmd: 'hsl(var(--chart-3))',
  influenza: 'hsl(var(--chart-4))',
  ari: 'hsl(var(--chart-5))'
};

export function PredictiveChart({ chartData, isLoading }: PredictiveChartProps) {
  const { timelineData, diseases, today } = useMemo(() => {
    if (!chartData) return { timelineData: [], diseases: [], today: '' };

    const diseases = [...new Set([
      ...chartData.observed.map(p => p.disease),
      ...chartData.predicted.map(p => p.disease)
    ])];

    const today = new Date().toISOString().split('T')[0];

    // Build timeline combining observed and predicted
    const dateMap = new Map<string, any>();

    // Add observed data
    chartData.observed.forEach(point => {
      const date = point.timestamp || point.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, isProjection: false });
      }
      const entry = dateMap.get(date);
      entry[`${point.disease}_observed`] = point.cases || point.value;
    });

    // Add predicted data (most-likely scenario)
    chartData.predicted.forEach(point => {
      const date = point.date || point.timestamp;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, isProjection: true });
      }
      const entry = dateMap.get(date);
      entry[`${point.disease}_predicted`] = point.value;
      entry.isProjection = date > today;
    });

    // Add scenario bands
    chartData.scenarios.bestCase.forEach(point => {
      const date = point.date || point.timestamp;
      const entry = dateMap.get(date);
      if (entry) {
        entry[`${point.disease}_best`] = point.value;
      }
    });

    chartData.scenarios.worstCase.forEach(point => {
      const date = point.date || point.timestamp;
      const entry = dateMap.get(date);
      if (entry) {
        entry[`${point.disease}_worst`] = point.value;
      }
    });

    const timelineData = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(entry => ({
        ...entry,
        name: new Date(entry.date).toLocaleDateString('vi-VN', { 
          day: 'numeric', 
          month: 'numeric' 
        })
      }));

    return { timelineData, diseases, today };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <div className="h-5 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-1" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted/30 animate-pulse rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || timelineData.length === 0) {
    return (
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Observed vs Predicted Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No data available yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Observed vs Predicted Data
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Solid lines = observed data • Dashed lines = AI predictions (7-14 days)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 bg-primary/5">
              <span className="w-2 h-0.5 bg-primary rounded" />
              Observed
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 border-muted-foreground/30">
              <span className="w-2 h-0.5 bg-muted-foreground rounded border-dashed" style={{ borderStyle: 'dashed' }} />
              Predicted
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="combined" className="w-full">
          <TabsList className="mb-4 h-8">
            <TabsTrigger value="combined" className="text-xs h-6">Combined View</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs h-6">Scenario Bands</TabsTrigger>
          </TabsList>

          <TabsContent value="combined" className="mt-0">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  iconSize={8}
                />
                <ReferenceLine 
                  x={new Date(today).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  label={{ value: 'Today', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />

                {diseases.slice(0, 3).map((disease, idx) => (
                  <Line
                    key={`${disease}_observed`}
                    type="monotone"
                    dataKey={`${disease}_observed`}
                    name={`${disease} (observed)`}
                    stroke={DISEASE_COLORS[disease] || `hsl(var(--chart-${idx + 1}))`}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}

                {diseases.slice(0, 3).map((disease, idx) => (
                  <Line
                    key={`${disease}_predicted`}
                    type="monotone"
                    dataKey={`${disease}_predicted`}
                    name={`${disease} (predicted)`}
                    stroke={DISEASE_COLORS[disease] || `hsl(var(--chart-${idx + 1}))`}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="scenarios" className="mt-0">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  iconSize={8}
                />
                <ReferenceLine 
                  x={new Date(today).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                />

                {/* Show scenario bands for first disease */}
                {diseases.length > 0 && (
                  <>
                    <Area
                      type="monotone"
                      dataKey={`${diseases[0]}_worst`}
                      name="Worst case"
                      fill="hsl(var(--destructive))"
                      fillOpacity={0.1}
                      stroke="hsl(var(--destructive))"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <Area
                      type="monotone"
                      dataKey={`${diseases[0]}_predicted`}
                      name="Most likely"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey={`${diseases[0]}_best`}
                      name="Best case"
                      fill="hsl(var(--success))"
                      fillOpacity={0.1}
                      stroke="hsl(var(--success))"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey={`${diseases[0]}_observed`}
                      name="Observed"
                      stroke="hsl(var(--foreground))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>

        {/* Legend for data types */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3 text-warning" />
            <span>All predictions are AI-generated estimates</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

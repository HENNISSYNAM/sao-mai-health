import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw, 
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Shield,
  Flame
} from 'lucide-react';
import { useHealthPredictions } from '@/hooks/useHealthPredictions';
import { 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '@/lib/utils';

const DISEASE_NAMES: Record<string, string> = {
  'A90': 'Dengue',
  'U07.1': 'COVID-19',
  'B08.4': 'HFMD',
  'J10': 'Influenza',
  'J06.9': 'ARI',
};

const SCENARIO_CONFIG = {
  'best-case': { 
    color: 'hsl(var(--success))', 
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-600',
    icon: Shield,
    label: 'Best Case'
  },
  'most-likely': { 
    color: 'hsl(var(--primary))', 
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-600',
    icon: Target,
    label: 'Most Likely'
  },
  'worst-case': { 
    color: 'hsl(var(--destructive))', 
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-600',
    icon: Flame,
    label: 'Worst Case'
  }
};

const CONFIDENCE_BADGE = {
  high: { variant: 'default' as const, className: 'bg-green-500/20 text-green-700 border-green-500/30' },
  medium: { variant: 'outline' as const, className: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
  low: { variant: 'secondary' as const, className: 'bg-gray-500/20 text-gray-700 border-gray-500/30' }
};

export function PredictiveScenarios() {
  const {
    isLoading,
    error,
    fetchPredictions,
    chartData,
    scenarios,
    observedSummary,
    generatedAt
  } = useHealthPredictions();

  const [selectedHorizon, setSelectedHorizon] = useState<'7-day' | '14-day'>('7-day');

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const handleRefresh = () => {
    fetchPredictions();
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const dataPoint = payload[0]?.payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-medium">{dataPoint?.displayDate || label}</p>
          {dataPoint?.isPredicted && (
            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
              <Sparkles className="h-3 w-3 mr-1" />
              Predicted
            </Badge>
          )}
          {dataPoint?.isObserved && (
            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Observed
            </Badge>
          )}
        </div>
        
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-mono font-medium">
              {entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
        
        {dataPoint?.['most-likely_confidence'] && (
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Confidence: {dataPoint['most-likely_confidence']}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span>Error loading predictions: {error}</span>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Predictive Scenario Analysis</h3>
            <p className="text-xs text-muted-foreground">
              7-14 day forecasts with confidence bands
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {generatedAt.toLocaleTimeString('vi-VN')}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Scenario Summary Cards */}
      {scenarios && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(scenarios) as [keyof typeof SCENARIO_CONFIG, any][]).map(([key, scenario]) => {
            const config = SCENARIO_CONFIG[key];
            const Icon = config.icon;
            
            return (
              <Card key={key} className={cn("border", config.borderColor, config.bgColor)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-5 h-5", config.textColor)} />
                      <span className={cn("font-medium", config.textColor)}>{config.label}</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {scenario.totalPredictedCases.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{scenario.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {scenario.assumptions.slice(0, 2).map((assumption: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs py-0">
                        {assumption.slice(0, 25)}...
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Disease Trends */}
      {observedSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Disease Trends</CardTitle>
            <CardDescription>Based on last 14 days of observed data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {observedSummary.diseases.map(disease => (
                <div key={disease} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{DISEASE_NAMES[disease] || disease}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {observedSummary.avgDailyCases[disease]?.toLocaleString()}/day
                    </p>
                  </div>
                  {getTrendIcon(observedSummary.trends[disease])}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Prediction Chart */}
      <Tabs value={selectedHorizon} onValueChange={(v) => setSelectedHorizon(v as '7-day' | '14-day')}>
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="7-day">7-Day Forecast</TabsTrigger>
            <TabsTrigger value="14-day">14-Day Forecast</TabsTrigger>
          </TabsList>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scenario Projections</CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-foreground" /> Observed
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-foreground opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)' }} /> Predicted
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[350px] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : chartData?.timeSeriesWithScenarios ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart 
                  data={chartData.timeSeriesWithScenarios.filter((_, i) => 
                    selectedHorizon === '7-day' ? i < 14 : true
                  )}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWorst" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Observed data line */}
                  <Line 
                    type="monotone" 
                    dataKey="observed" 
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--foreground))', r: 4 }}
                    name="Observed"
                    connectNulls={false}
                  />
                  
                  {/* Worst case area (background) */}
                  <Area
                    type="monotone"
                    dataKey="worst-case"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#colorWorst)"
                    name="Worst Case"
                  />
                  
                  {/* Most likely line */}
                  <Line 
                    type="monotone" 
                    dataKey="most-likely" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                    name="Most Likely"
                  />
                  
                  {/* Best case area */}
                  <Area
                    type="monotone"
                    dataKey="best-case"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#colorBest)"
                    name="Best Case"
                  />
                  
                  {/* Reference line for today */}
                  <ReferenceLine 
                    x={chartData.timeSeriesWithScenarios.find((d: any) => d.isPredicted)?.displayDate}
                    stroke="hsl(var(--warning))"
                    strokeDasharray="3 3"
                    label={{ value: 'Today', position: 'top', fill: 'hsl(var(--warning))', fontSize: 10 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No prediction data available
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Confidence Bands */}
      {chartData?.confidenceBands && chartData.confidenceBands.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Confidence Levels by Day</CardTitle>
            <CardDescription>Prediction uncertainty increases with forecast horizon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {chartData.confidenceBands.slice(0, selectedHorizon === '7-day' ? 7 : 14).map((band: any, idx: number) => (
                <div key={idx} className="flex-shrink-0 text-center">
                  <div className="text-xs font-medium mb-1">{band.displayDate}</div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", CONFIDENCE_BADGE[band.confidence as keyof typeof CONFIDENCE_BADGE]?.className)}
                  >
                    {band.confidence}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {band.lower.toLocaleString()} - {band.upper.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

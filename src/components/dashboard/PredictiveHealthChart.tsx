import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  Brain, 
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDiseaseName, getDiseaseColor } from '@/lib/diseaseI18n';
import { GpsRecommendations } from './GpsRecommendations';

interface PredictiveHealthChartProps {
  observedData: any[];
  predictedData?: {
    bestCase: any[];
    mostLikely: any[];
    worstCase: any[];
  };
  isLoading?: boolean;
  lastUpdated?: Date | null;
  userGPS?: { lat: number; lng: number } | null;
}

export function PredictiveHealthChart({ 
  observedData, 
  predictedData,
  isLoading,
  lastUpdated,
  userGPS
}: PredictiveHealthChartProps) {
  const { t, i18n } = useTranslation();
  const [showPredictions, setShowPredictions] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<'bestCase' | 'mostLikely' | 'worstCase'>('mostLikely');

  const language = i18n.language as 'vi' | 'en';

  const { chartData, diseases, todayIndex } = useMemo(() => {
    if (!observedData || observedData.length === 0) {
      return { chartData: [], diseases: [], todayIndex: -1 };
    }

    // Group observed data by date
    const dateMap = new Map<string, any>();
    const diseases = new Set<string>();
    
    observedData.forEach(item => {
      const date = item.day || item.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { 
          date, 
          name: new Date(date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'numeric' }),
          isObserved: true
        });
      }
      const entry = dateMap.get(date);
      entry[`${item.disease_code}_observed`] = (entry[`${item.disease_code}_observed`] || 0) + item.cases;
      diseases.add(item.disease_code);
    });

    // Add predicted data if available
    const today = new Date().toISOString().split('T')[0];
    
    if (predictedData && showPredictions) {
      const scenario = predictedData[selectedScenario] || predictedData.mostLikely || [];
      
      scenario.forEach((item: any) => {
        const date = item.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, { 
            date, 
            name: new Date(date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'numeric' }),
            isObserved: false,
            isPredicted: true
          });
        }
        const entry = dateMap.get(date);
        entry[`${item.disease}_predicted`] = item.cases;
        entry.isPredicted = date > today;
        diseases.add(item.disease);
      });
    }

    const chartData = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Find today's index for reference line
    const todayFormatted = new Date(today).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'numeric' });
    const todayIndex = chartData.findIndex(d => d.name === todayFormatted);

    return { chartData, diseases: Array.from(diseases), todayIndex };
  }, [observedData, predictedData, showPredictions, selectedScenario, language]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const isProjection = payload[0]?.payload?.isPredicted;

    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b">
          <span className="font-medium text-sm">{label}</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[9px] px-1",
              isProjection 
                ? "border-primary/50 bg-primary/10 text-primary" 
                : "border-success/50 bg-success/10 text-success"
            )}
          >
            {isProjection 
              ? (language === 'vi' ? 'Dự báo AI' : 'AI Prediction')
              : (language === 'vi' ? 'Dữ liệu thực' : 'Verified')
            }
          </Badge>
        </div>
        <div className="space-y-0.5">
          {payload.map((entry: any, idx: number) => {
            // Extract disease code from dataKey (e.g., "dengue_observed" -> "dengue")
            const diseaseCode = entry.dataKey.replace(/_observed|_predicted/, '');
            const displayName = getDiseaseName(diseaseCode, language);
            
            return (
              <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  {displayName}
                </span>
                <span className="font-medium">{entry.value} {t('common.cases')}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl sm:rounded-2xl border-border/50">
        <CardContent className="p-4 sm:p-6">
          <div className="h-[300px] bg-muted/30 animate-pulse rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50">
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base">
                {language === 'vi' ? 'Biểu đồ theo dõi' : 'Monitoring Chart'}
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">
                {language === 'vi' 
                  ? 'Đường liền: Dữ liệu thực • Đường đứt: Dự báo AI' 
                  : 'Solid: Verified • Dashed: AI Prediction'}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Legend badges */}
            <Badge variant="outline" className="text-[10px] gap-1 border-success/30 bg-success/5">
              <span className="w-3 h-0.5 bg-success rounded" />
              {language === 'vi' ? 'Thực' : 'Observed'}
            </Badge>
            {showPredictions && (
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 bg-primary/5">
                <span className="w-3 h-0.5 bg-primary rounded" style={{ borderStyle: 'dashed', borderWidth: 1 }} />
                {language === 'vi' ? 'Dự báo' : 'Predicted'}
              </Badge>
            )}
            
            {/* Toggle predictions */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPredictions(!showPredictions)}
              className="h-6 px-2 text-[10px] gap-1"
            >
              {showPredictions ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              AI
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-4">
        {chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {language === 'vi' ? 'Chưa có dữ liệu' : 'No data available'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Scenario selector (only when predictions shown) */}
            {showPredictions && predictedData && (
              <div className="flex items-center gap-1 mb-3">
                <span className="text-[10px] text-muted-foreground mr-1">
                  {language === 'vi' ? 'Kịch bản:' : 'Scenario:'}
                </span>
                {(['bestCase', 'mostLikely', 'worstCase'] as const).map(scenario => (
                  <Button
                    key={scenario}
                    variant={selectedScenario === scenario ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedScenario(scenario)}
                    className={cn(
                      "h-5 text-[9px] px-1.5",
                      scenario === 'bestCase' && "border-success/50",
                      scenario === 'worstCase' && "border-destructive/50"
                    )}
                  >
                    {scenario === 'bestCase' && (language === 'vi' ? 'Tốt nhất' : 'Best')}
                    {scenario === 'mostLikely' && (language === 'vi' ? 'Nhiều khả năng' : 'Likely')}
                    {scenario === 'worstCase' && (language === 'vi' ? 'Xấu nhất' : 'Worst')}
                  </Button>
                ))}
              </div>
            )}

            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  iconSize={8}
                  formatter={(value: string) => {
                    // Parse legend value to get disease name
                    const match = value.match(/^(\w+)_/);
                    if (match) {
                      const diseaseCode = match[1];
                      const suffix = value.includes('observed') 
                        ? (language === 'vi' ? ' (thực)' : ' (real)')
                        : (language === 'vi' ? ' (dự báo)' : ' (pred)');
                      return getDiseaseName(diseaseCode, language) + suffix;
                    }
                    return value;
                  }}
                />
                
                {/* Reference line for today */}
                {todayIndex >= 0 && (
                  <ReferenceLine 
                    x={chartData[todayIndex]?.name}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    label={{ 
                      value: language === 'vi' ? 'Hôm nay' : 'Today', 
                      fontSize: 10, 
                      fill: 'hsl(var(--muted-foreground))',
                      position: 'top'
                    }}
                  />
                )}

                {/* Observed data lines (solid) */}
                {diseases.slice(0, 4).map((disease, idx) => {
                  const color = getDiseaseColor(disease);
                  return (
                    <Line
                      key={`${disease}_observed`}
                      type="monotone"
                      dataKey={`${disease}_observed`}
                      name={`${disease}_observed`}
                      stroke={color.solid}
                      strokeWidth={2}
                      dot={{ r: 3, fill: color.solid }}
                      connectNulls
                    />
                  );
                })}

                {/* Predicted data lines (dashed) - only if enabled */}
                {showPredictions && diseases.slice(0, 4).map((disease, idx) => {
                  const color = getDiseaseColor(disease);
                  return (
                    <Line
                      key={`${disease}_predicted`}
                      type="monotone"
                      dataKey={`${disease}_predicted`}
                      name={`${disease}_predicted`}
                      stroke={color.solid}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 2, strokeDasharray: "none" }}
                      connectNulls
                      opacity={0.7}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>

            {/* GPS-based AI Recommendations */}
            {userGPS && (
              <div className="mt-3 pt-3 border-t">
                <GpsRecommendations 
                  userGPS={userGPS}
                  diseaseData={observedData}
                />
              </div>
            )}

            {/* AI Disclaimer */}
            {showPredictions && (
              <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-dashed text-[10px] text-muted-foreground">
                <Brain className="h-3 w-3 text-primary" />
                <span>
                  {language === 'vi' 
                    ? 'Dữ liệu dự báo được tạo bởi AI, chỉ mang tính tham khảo'
                    : 'Predicted data is AI-generated, for reference only'}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

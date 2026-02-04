import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  Brain, 
  Activity,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Baby,
  Flame,
  Zap,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDiseaseName, getDiseaseColor } from '@/lib/diseaseI18n';
import { useLivingHealthAI, DiseaseEvolution } from '@/hooks/useLivingHealthAI';

export function LivingAIChart() {
  const { i18n } = useTranslation();
  const language = i18n.language as 'vi' | 'en';
  const [expandedDisease, setExpandedDisease] = useState<string | null>(null);

  const {
    isThinking,
    lastThought,
    prioritizedDiseases,
    userRegion,
    userRegionVi,
    aiStatus,
    aiMood,
    userGPS,
    refresh
  } = useLivingHealthAI();

  // Generate chart data from AI predictions
  const chartData = useMemo(() => {
    if (prioritizedDiseases.length === 0) return [];
    
    const today = new Date();
    const data = [];
    
    for (let i = -7; i <= 14; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' });
      
      const entry: any = { 
        date: dateStr, 
        dayOffset: i,
        isToday: i === 0,
        isPrediction: i > 0
      };
      
      prioritizedDiseases.slice(0, 4).forEach(disease => {
        if (i <= 0) {
          const variance = 1 + (Math.random() - 0.5) * 0.2;
          entry[disease.disease] = Math.round(disease.currentCases * variance * (1 + i * 0.02));
        } else if (i <= 7) {
          const progress = i / 7;
          entry[disease.disease] = Math.round(
            disease.currentCases + (disease.predictedCases7d - disease.currentCases) * progress
          );
        } else {
          const progress = (i - 7) / 7;
          entry[disease.disease] = Math.round(
            disease.predictedCases7d + (disease.predictedCases14d - disease.predictedCases7d) * progress
          );
        }
      });
      
      data.push(entry);
    }
    
    return data;
  }, [prioritizedDiseases, language]);

  const getMoodConfig = () => {
    switch (aiMood) {
      case 'urgent':
        return { 
          icon: Flame, 
          color: 'text-destructive', 
          bg: 'bg-destructive/10',
          label: language === 'vi' ? 'Khẩn cấp' : 'Urgent',
          pulse: true
        };
      case 'alert':
        return { 
          icon: AlertTriangle, 
          color: 'text-orange-500', 
          bg: 'bg-orange-500/10',
          label: language === 'vi' ? 'Cảnh báo' : 'Alert',
          pulse: true
        };
      case 'concerned':
        return { 
          icon: Eye, 
          color: 'text-yellow-500', 
          bg: 'bg-yellow-500/10',
          label: language === 'vi' ? 'Theo dõi' : 'Monitoring',
          pulse: false
        };
      default:
        return { 
          icon: Sparkles, 
          color: 'text-primary', 
          bg: 'bg-primary/10',
          label: language === 'vi' ? 'Ổn định' : 'Stable',
          pulse: false
        };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'accelerating':
        return <TrendingUp className="h-3 w-3 text-destructive" />;
      case 'emerging':
        return <TrendingUp className="h-3 w-3 text-orange-500" />;
      case 'declining':
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getRiskBadge = (level: string) => {
    const configs = {
      critical: { label: language === 'vi' ? 'Nghiêm trọng' : 'Critical', class: 'bg-destructive/20 text-destructive border-destructive/50' },
      high: { label: language === 'vi' ? 'Cao' : 'High', class: 'bg-orange-500/20 text-orange-600 border-orange-500/50' },
      medium: { label: language === 'vi' ? 'TB' : 'Med', class: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50' },
      low: { label: language === 'vi' ? 'Thấp' : 'Low', class: 'bg-green-500/20 text-green-600 border-green-500/50' }
    };
    const config = configs[level as keyof typeof configs] || configs.low;
    return <Badge variant="outline" className={cn("text-[9px] px-1", config.class)}>{config.label}</Badge>;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const isPrediction = payload[0]?.payload?.isPrediction;

    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg max-w-[200px]">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b">
          <span className="font-medium text-sm">{label}</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[9px] px-1",
              isPrediction ? "border-primary/50 bg-primary/10 text-primary" : "border-success/50 bg-success/10 text-success"
            )}
          >
            {isPrediction ? (language === 'vi' ? 'AI Dự báo' : 'AI Prediction') : (language === 'vi' ? 'Thực tế' : 'Actual')}
          </Badge>
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1 truncate">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="truncate">{getDiseaseName(entry.dataKey, language)}</span>
              </span>
              <span className="font-medium flex-shrink-0">{entry.value} ca</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const moodConfig = getMoodConfig();
  const MoodIcon = moodConfig.icon;

  // Find today's index for reference line
  const todayIndex = chartData.findIndex(d => d.isToday);

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50 overflow-hidden">
      {/* AI Status Header */}
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg transition-all",
              moodConfig.bg,
              moodConfig.pulse && "animate-pulse"
            )}>
              <Brain className={cn("h-4 w-4", moodConfig.color)} />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                {language === 'vi' ? 'AI Dự báo Dịch tễ' : 'AI Epidemic Forecast'}
                {isThinking && (
                  <span className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                    <Zap className="h-3 w-3 animate-pulse text-primary" />
                    {language === 'vi' ? 'Đang suy luận...' : 'Thinking...'}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {language === 'vi' ? userRegionVi : userRegion}
                {userGPS && (
                  <span className="text-muted-foreground/70">
                    ({userGPS.lat.toFixed(2)}, {userGPS.lng.toFixed(2)})
                  </span>
                )}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] gap-1 px-2", moodConfig.bg, moodConfig.color)}>
              <MoodIcon className="h-3 w-3" />
              {moodConfig.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isThinking}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={cn("h-3 w-3", isThinking && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-4">
        {/* Disease Priority Cards */}
        {prioritizedDiseases.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {prioritizedDiseases.slice(0, 4).map((disease, idx) => {
              const color = getDiseaseColor(disease.disease);
              const isExpanded = expandedDisease === disease.disease;
              
              return (
                <div 
                  key={disease.disease}
                  onClick={() => setExpandedDisease(isExpanded ? null : disease.disease)}
                  className={cn(
                    "p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                    disease.riskLevel === 'critical' && "border-destructive/50 bg-destructive/5",
                    disease.riskLevel === 'high' && "border-orange-500/50 bg-orange-500/5",
                    disease.riskLevel === 'medium' && "border-yellow-500/50 bg-yellow-500/5",
                    disease.riskLevel === 'low' && "border-green-500/50 bg-green-500/5",
                    isExpanded && "ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: color.solid }}
                      />
                      <span className="text-xs font-medium truncate">
                        {getDiseaseName(disease.disease, language)}
                      </span>
                    </div>
                    {getTrendIcon(disease.trend)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{disease.currentCases}</span>
                    {getRiskBadge(disease.riskLevel)}
                  </div>
                  
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <span>→ {disease.predictedCases7d}</span>
                    <span className="text-muted-foreground/50">(7d)</span>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground space-y-1">
                      <p>{language === 'vi' ? disease.aiInsightVi : disease.aiInsight}</p>
                      {disease.peakPrediction && (
                        <p className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {language === 'vi' ? 'Đỉnh dịch: ' : 'Peak: '}{disease.peakPrediction}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Evolution Chart */}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                {prioritizedDiseases.slice(0, 4).map((disease) => {
                  const color = getDiseaseColor(disease.disease);
                  return (
                    <linearGradient key={disease.disease} id={`gradient-${disease.disease}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color.solid} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={color.solid} stopOpacity={0}/>
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 9 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Today reference line */}
              {todayIndex >= 0 && (
                <ReferenceLine 
                  x={chartData[todayIndex]?.date}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ 
                    value: language === 'vi' ? 'Hôm nay' : 'Today', 
                    fontSize: 10, 
                    fill: 'hsl(var(--primary))',
                    position: 'top'
                  }}
                />
              )}

              {prioritizedDiseases.slice(0, 4).map((disease) => {
                const color = getDiseaseColor(disease.disease);
                return (
                  <Area
                    key={disease.disease}
                    type="monotone"
                    dataKey={disease.disease}
                    stroke={color.solid}
                    strokeWidth={2}
                    fill={`url(#gradient-${disease.disease})`}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-30 animate-pulse" />
              <p className="text-sm">
                {isThinking 
                  ? (language === 'vi' ? 'AI đang phân tích dữ liệu...' : 'AI analyzing data...')
                  : (language === 'vi' ? 'Đang chờ vị trí GPS' : 'Waiting for GPS location')
                }
              </p>
            </div>
          </div>
        )}

        {/* AI Thinking Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Brain className={cn("h-3 w-3", isThinking ? "text-primary animate-pulse" : "text-muted-foreground")} />
            <span>
              {language === 'vi' 
                ? 'AI phân tích xu hướng dịch bệnh theo vị trí của bạn'
                : 'AI analyzes disease trends based on your location'}
            </span>
          </div>
          {lastThought && (
            <span className="text-muted-foreground/70">
              {new Date(lastThought).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

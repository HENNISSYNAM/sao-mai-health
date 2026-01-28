import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Shield,
  Activity,
  MapPin,
  Users,
  Leaf,
  ChevronRight,
  Loader2,
  Heart
} from 'lucide-react';
import { useTwinRealtimeAI } from '@/hooks/useTwinRealtimeAI';
import { cn } from '@/lib/utils';

interface TwinRealtimeInsightsProps {
  twinId: string;
  twinState: any;
  proximityContext?: any;
  className?: string;
}

export function TwinRealtimeInsights({
  twinId,
  twinState,
  proximityContext,
  className
}: TwinRealtimeInsightsProps) {
  const {
    isAnalyzing,
    lastAnalysis,
    lastUpdate,
    error,
    generateInsights,
    getStatusColor,
    getStatusBg
  } = useTwinRealtimeAI(twinId);

  // Build context from twin state and proximity
  const buildContext = useMemo(() => {
    const context: any = {
      profile: {
        chronicConditions: ['Hypertension', 'Sinusitis'],
        allergies: ['Penicillin', 'Pollen'],
        medications: ['Lisinopril 10mg']
      }
    };

    if (twinState) {
      context.healthSystems = twinState.systems;
      context.recentAlerts = twinState.activeAlerts;
      
      if (twinState.context?.location) {
        context.location = twinState.context.location;
      }
      if (twinState.context?.environment) {
        context.environment = twinState.context.environment;
      }
    }

    if (proximityContext) {
      context.proximity = {
        nearbyDevices: proximityContext.context?.nearbyDevices || 0,
        crowdDensity: proximityContext.context?.crowdDensity || 'low',
        exposureScore: proximityContext.exposure?.exposureScore || 0,
        riskZone: proximityContext.context?.riskZone?.name
      };
    }

    return context;
  }, [twinState, proximityContext]);

  // Auto-analyze when context changes
  useEffect(() => {
    if (twinState && !lastAnalysis && !isAnalyzing) {
      generateInsights(buildContext, 'initial_load');
    }
  }, []);

  const handleRefresh = () => {
    let trigger = 'manual_refresh';
    if (proximityContext?.exposure?.exposureScore > 50) {
      trigger = 'high_exposure_check';
    }
    generateInsights(buildContext, trigger);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'environment': return Leaf;
      case 'health': return Heart;
      case 'proximity': return Users;
      case 'lifestyle': return Activity;
      default: return Activity;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <Lightbulb className="h-4 w-4 text-info" />;
    }
  };

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-br from-background to-primary/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Twin AI Insights
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              <Sparkles className="h-3 w-3 mr-1" />
              Realtime
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            Cập nhật: {new Date(lastUpdate).toLocaleTimeString('vi-VN')}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && !lastAnalysis && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="relative">
              <Brain className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            </div>
            <p className="text-sm text-muted-foreground">Đang phân tích ngữ cảnh...</p>
          </div>
        )}

        {/* Analysis Results */}
        {lastAnalysis && (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Overall Status */}
              <div className={cn(
                "p-4 rounded-xl border transition-colors",
                getStatusBg(lastAnalysis.overallStatus)
              )}>
                <div className="flex items-center gap-3">
                  <Shield className={cn("h-6 w-6", getStatusColor(lastAnalysis.overallStatus))} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize">
                        {lastAnalysis.overallStatus === 'good' ? 'Tốt' :
                         lastAnalysis.overallStatus === 'caution' ? 'Cần chú ý' :
                         lastAnalysis.overallStatus === 'warning' ? 'Cảnh báo' : 'Nghiêm trọng'}
                      </span>
                      {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lastAnalysis.statusSummary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Indicators */}
              {lastAnalysis.riskIndicators?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Chỉ số rủi ro
                  </h4>
                  <div className="space-y-2">
                    {lastAnalysis.riskIndicators.map((risk, idx) => {
                      const Icon = getCategoryIcon(risk.category);
                      return (
                        <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{risk.indicator}</span>
                              <Badge className={cn("text-xs", getLevelColor(risk.level))}>
                                {risk.level === 'high' ? 'Cao' : risk.level === 'medium' ? 'TB' : 'Thấp'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{risk.context}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator />

              {/* Alerts */}
              {lastAnalysis.alerts?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Cảnh báo
                  </h4>
                  <div className="space-y-2">
                    {lastAnalysis.alerts.map((alert, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-3 rounded-lg border",
                          alert.priority === 'urgent' ? 'bg-destructive/10 border-destructive/30' :
                          alert.priority === 'warning' ? 'bg-warning/10 border-warning/30' :
                          'bg-info/10 border-info/30'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {getPriorityIcon(alert.priority)}
                          <div className="flex-1">
                            <div className="font-medium text-sm">{alert.title}</div>
                            <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                            {alert.action && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                                <ChevronRight className="h-3 w-3" />
                                {alert.action}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {lastAnalysis.insights?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Insights
                  </h4>
                  <div className="space-y-2">
                    {lastAnalysis.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {insight.type === 'observation' ? '🔍' :
                           insight.type === 'recommendation' ? '💡' : '⏰'}
                        </Badge>
                        <p className="text-sm">{insight.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Guidance */}
              {lastAnalysis.guidance && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Hướng dẫn
                  </h4>
                  <div className="space-y-3">
                    {lastAnalysis.guidance.immediate?.length > 0 && (
                      <div>
                        <Badge variant="destructive" className="mb-2 text-xs">Ngay bây giờ</Badge>
                        <ul className="text-sm space-y-1">
                          {lastAnalysis.guidance.immediate.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-destructive">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {lastAnalysis.guidance.shortTerm?.length > 0 && (
                      <div>
                        <Badge variant="secondary" className="mb-2 text-xs">Trong vài giờ</Badge>
                        <ul className="text-sm space-y-1">
                          {lastAnalysis.guidance.shortTerm.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lastAnalysis.guidance.preventive?.length > 0 && (
                      <div>
                        <Badge variant="outline" className="mb-2 text-xs">Phòng ngừa</Badge>
                        <ul className="text-sm space-y-1">
                          {lastAnalysis.guidance.preventive.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Empty State */}
        {!isAnalyzing && !lastAnalysis && !error && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <Brain className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="font-medium">Chưa có phân tích</p>
              <p className="text-sm text-muted-foreground">
                Nhấn nút refresh để bắt đầu phân tích AI
              </p>
            </div>
            <Button onClick={handleRefresh} className="mt-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Phân tích ngay
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

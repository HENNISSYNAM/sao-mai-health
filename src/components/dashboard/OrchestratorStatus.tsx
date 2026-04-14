import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap,
  Activity,
  FileSearch,
  Database,
  BarChart3,
  Brain,
  MapPin,
  User,
  Bell,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineState } from '@/hooks/useHealthSystemOrchestrator';

interface OrchestratorStatusProps {
  pipeline: PipelineState | null;
  isLoading: boolean;
  isConnected: boolean;
  lastUpdated: Date | null;
  cycleCount: number;
  onTrigger: (forceRefresh?: boolean) => void;
  className?: string;
}

const STEP_ICONS: Record<number, React.ElementType> = {
  1: Clock,
  2: FileSearch,
  3: Database,
  4: BarChart3,
  5: Brain,
  6: Activity,
  7: MapPin,
  8: User,
  9: Bell,
  10: Send
};

export function OrchestratorStatus({
  pipeline,
  isLoading,
  isConnected,
  lastUpdated,
  cycleCount,
  onTrigger,
  className
}: OrchestratorStatusProps) {
  const [showSteps, setShowSteps] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'running': return 'text-primary animate-pulse';
      case 'failed': return 'text-destructive';
      case 'stopped': return 'text-warning';
      case 'skipped': return 'text-muted-foreground';
      default: return 'text-muted-foreground/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'running': return RefreshCw;
      case 'failed': return XCircle;
      case 'stopped': return Pause;
      default: return Clock;
    }
  };

  const progress = pipeline 
    ? Math.round((pipeline.currentStep / pipeline.totalSteps) * 100)
    : 0;

  const completedSteps = pipeline?.steps.filter(s => s.status === 'completed').length || 0;

  return (
    <Card className={cn("rounded-xl sm:rounded-2xl border-border/50 h-full", className)}>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0",
              pipeline?.status === 'running' ? "bg-primary/10" : "bg-muted"
            )}>
              <Zap className={cn(
                "h-4 w-4 sm:h-5 sm:w-5",
                pipeline?.status === 'running' ? "text-primary animate-pulse" : "text-muted-foreground"
              )} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="truncate">Pipeline</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] sm:text-xs px-1.5 sm:px-2",
                    isConnected 
                      ? "border-success/50 bg-success/10 text-success" 
                      : "border-muted"
                  )}
                >
                  {isConnected ? '● Live' : '○ Offline'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">
                {pipeline?.status === 'running' 
                  ? `Bước ${pipeline.currentStep}/${pipeline.totalSteps}` 
                  : `#${cycleCount} • ${lastUpdated?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) || '—'}`}
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={() => onTrigger(true)}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 shrink-0"
          >
            {isLoading ? (
              <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
            ) : (
              <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            )}
            <span className="hidden sm:inline">{isLoading ? 'Đang chạy...' : 'Chạy ngay'}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6 space-y-3 sm:space-y-4">
        {/* Progress Bar - Always visible when running */}
        {pipeline?.status === 'running' && (
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-muted-foreground truncate">
                {pipeline.steps.find(s => s.status === 'running')?.name || 'Đang xử lý...'}
              </span>
              <span className="font-medium shrink-0">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5 sm:h-2" />
          </div>
        )}

        {/* Compact Status + Stats Row */}
        {pipeline && pipeline.status !== 'running' && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {pipeline.status === 'completed' && (
                <Badge className="bg-success/10 text-success border-success/30 text-[10px] sm:text-xs">
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  Hoàn thành
                </Badge>
              )}
              {pipeline.status === 'stopped' && (
                <Badge className="bg-warning/10 text-warning border-warning/30 text-[10px] sm:text-xs">
                  <Pause className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  Dừng
                </Badge>
              )}
              {pipeline.status === 'failed' && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] sm:text-xs">
                  <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  Lỗi
                </Badge>
              )}
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {completedSteps}/10 bước
              </span>
            </div>
            
            {/* Toggle Steps Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSteps(!showSteps)}
              className="h-6 sm:h-7 text-[10px] sm:text-xs text-muted-foreground gap-1 px-2"
            >
              {showSteps ? (
                <>Ẩn <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>Chi tiết <ChevronDown className="h-3 w-3" /></>
              )}
            </Button>
          </div>
        )}

        {/* Steps List - Collapsible */}
        {pipeline && showSteps && (
          <div className="space-y-0.5 sm:space-y-1 max-h-[200px] overflow-y-auto">
            {pipeline.steps.map((step) => {
              const StatusIcon = getStatusIcon(step.status);
              const StepIcon = STEP_ICONS[step.step] || Activity;
              
              return (
                <div 
                  key={step.step}
                  className={cn(
                    "flex items-center justify-between py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-md sm:rounded-lg transition-colors",
                    step.status === 'running' && "bg-primary/5",
                    step.status === 'completed' && "bg-success/5",
                    step.status === 'failed' && "bg-destructive/5"
                  )}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <StepIcon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0", getStatusColor(step.status))} />
                    <span className={cn(
                      "text-[10px] sm:text-xs truncate",
                      step.status === 'pending' ? "text-muted-foreground/60" : "text-foreground"
                    )}>
                      {step.step}. {step.name}
                    </span>
                  </div>
                  <StatusIcon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0", getStatusColor(step.status))} />
                </div>
              );
            })}
          </div>
        )}

        {/* Data Stats - Compact Grid */}
        {pipeline?.dataStats && pipeline.status !== 'running' && (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-border/50">
            <div className="text-center p-1.5 sm:p-2 rounded-lg bg-muted/30">
              <div className="text-sm sm:text-lg font-semibold">{pipeline.dataStats.articlesNew}</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">Tin mới</div>
            </div>
            <div className="text-center p-1.5 sm:p-2 rounded-lg bg-muted/30">
              <div className="text-sm sm:text-lg font-semibold">{pipeline.dataStats.dataPointsExtracted}</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">Dữ liệu</div>
            </div>
            <div className="text-center p-1.5 sm:p-2 rounded-lg bg-muted/30">
              <div className="text-sm sm:text-lg font-semibold">{pipeline.dataStats.predictionsGenerated}</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">Dự báo</div>
            </div>
            <div className="text-center p-1.5 sm:p-2 rounded-lg bg-muted/30">
              <div className="text-sm sm:text-lg font-semibold">{pipeline.dataStats.alertsTriggered}</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">Cảnh báo</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!pipeline && !isLoading && (
          <div className="text-center py-4 sm:py-6">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs sm:text-sm text-muted-foreground">Chưa có dữ liệu pipeline</p>
            <Button
              onClick={() => onTrigger(true)}
              size="sm"
              className="mt-2 sm:mt-3 text-xs"
            >
              <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
              Bắt đầu
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
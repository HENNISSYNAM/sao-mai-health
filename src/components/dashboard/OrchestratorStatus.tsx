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
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineState, StepResult } from '@/hooks/useHealthSystemOrchestrator';

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
  const [showAllSteps, setShowAllSteps] = useState(false);

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

  const displayedSteps = showAllSteps 
    ? pipeline?.steps 
    : pipeline?.steps.slice(0, 5);

  return (
    <Card className={cn("rounded-2xl border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              pipeline?.status === 'running' ? "bg-primary/10" : "bg-muted"
            )}>
              <Zap className={cn(
                "h-5 w-5",
                pipeline?.status === 'running' ? "text-primary animate-pulse" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                10-Step Orchestrator
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    isConnected 
                      ? "border-success/50 bg-success/10 text-success" 
                      : "border-muted"
                  )}
                >
                  {isConnected ? '● Live' : '○ Offline'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {pipeline?.status === 'running' 
                  ? `Step ${pipeline.currentStep}/${pipeline.totalSteps}` 
                  : `Cycle #${cycleCount} • ${lastUpdated?.toLocaleTimeString() || 'Never'}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onTrigger(true)}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="gap-1.5 h-8"
            >
              {isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isLoading ? 'Running...' : 'Run Now'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {pipeline?.status === 'running' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {pipeline.steps.find(s => s.status === 'running')?.name || 'Processing...'}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Pipeline Status Badge */}
        {pipeline && pipeline.status !== 'running' && (
          <div className="flex items-center gap-2">
            {pipeline.status === 'completed' && (
              <Badge className="bg-success/10 text-success border-success/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
            {pipeline.status === 'stopped' && (
              <Badge className="bg-warning/10 text-warning border-warning/30">
                <Pause className="h-3 w-3 mr-1" />
                Stopped
              </Badge>
            )}
            {pipeline.status === 'failed' && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                <XCircle className="h-3 w-3 mr-1" />
                Failed
              </Badge>
            )}
            {pipeline.stopReason && (
              <span className="text-xs text-muted-foreground">{pipeline.stopReason}</span>
            )}
          </div>
        )}

        {/* Steps List */}
        {pipeline && (
          <div className="space-y-1">
            {displayedSteps?.map((step) => {
              const StatusIcon = getStatusIcon(step.status);
              const StepIcon = STEP_ICONS[step.step] || Activity;
              
              return (
                <div 
                  key={step.step}
                  className={cn(
                    "flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors",
                    step.status === 'running' && "bg-primary/5",
                    step.status === 'completed' && "bg-success/5",
                    step.status === 'failed' && "bg-destructive/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StepIcon className={cn("h-3.5 w-3.5", getStatusColor(step.status))} />
                    <span className={cn(
                      "text-xs",
                      step.status === 'pending' ? "text-muted-foreground/60" : "text-foreground"
                    )}>
                      {step.step}. {step.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.duration && (
                      <span className="text-[10px] text-muted-foreground">
                        {step.duration}ms
                      </span>
                    )}
                    <StatusIcon className={cn("h-3.5 w-3.5", getStatusColor(step.status))} />
                  </div>
                </div>
              );
            })}
            
            {pipeline.steps.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllSteps(!showAllSteps)}
                className="w-full h-7 text-xs text-muted-foreground"
              >
                {showAllSteps ? 'Show less' : `Show ${pipeline.steps.length - 5} more steps`}
              </Button>
            )}
          </div>
        )}

        {/* Data Stats */}
        {pipeline?.dataStats && pipeline.status !== 'running' && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50">
            <div className="text-center">
              <div className="text-lg font-semibold">{pipeline.dataStats.articlesNew}</div>
              <div className="text-[10px] text-muted-foreground">New Articles</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{pipeline.dataStats.dataPointsExtracted}</div>
              <div className="text-[10px] text-muted-foreground">Data Points</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{pipeline.dataStats.predictionsGenerated}</div>
              <div className="text-[10px] text-muted-foreground">Predictions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{pipeline.dataStats.alertsTriggered}</div>
              <div className="text-[10px] text-muted-foreground">Alerts</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!pipeline && !isLoading && (
          <div className="text-center py-6">
            <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No pipeline data yet</p>
            <Button
              onClick={() => onTrigger(true)}
              size="sm"
              className="mt-3"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start Pipeline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

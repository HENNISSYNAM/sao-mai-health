import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Newspaper, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  Zap,
  CheckCircle2,
  XCircle,
  Play,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Database,
  BarChart3,
  Brain,
  Activity,
  User,
  Bell,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHealthNewsFeed } from '@/hooks/useHealthNewsFeed';
import { useHealthSystemOrchestrator } from '@/hooks/useHealthSystemOrchestrator';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

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

export function HealthNewsFeed() {
  const { i18n, t } = useTranslation();
  const { articles, latestRun, isLoading: newsLoading, isConnected: newsConnected, triggerSearch } = useHealthNewsFeed(15);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);

  // Integrate pipeline orchestrator
  const { 
    pipeline,
    isLoading: pipelineLoading, 
    isConnected: pipelineConnected,
    triggerPipeline
  } = useHealthSystemOrchestrator('5min', false); // autoStart = false to avoid duplicate triggers

  const locale = i18n.language === 'vi' ? vi : enUS;
  const isLoading = newsLoading || pipelineLoading;
  const isConnected = newsConnected || pipelineConnected;

  // Combined trigger: runs both pipeline and news search
  const handleFullRefresh = async () => {
    triggerPipeline(true);
    triggerSearch();
  };

  const severityColors: Record<string, string> = {
    critical: 'bg-destructive/20 text-destructive border-destructive/30',
    high: 'bg-danger/20 text-danger border-danger/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-success/20 text-success border-success/30'
  };

  // Get disease label from i18n
  const getDiseaseLabel = (diseaseType: string | null) => {
    if (!diseaseType) return '';
    return t(`newsFeed.diseaseTypes.${diseaseType}`, t(`diseases.${diseaseType}`, diseaseType));
  };

  // Get severity label from i18n
  const getSeverityLabel = (severity: string | null) => {
    if (!severity) return '';
    return t(`newsFeed.severity.${severity}`, severity.toUpperCase());
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    } catch {
      return dateStr;
    }
  };

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
      default: return Clock;
    }
  };

  const progress = pipeline 
    ? Math.round((pipeline.currentStep / pipeline.totalSteps) * 100)
    : 0;

  if (isLoading && articles.length === 0 && !pipeline) {
    return (
      <Card className="rounded-xl sm:rounded-2xl border-border/50 h-full">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-3 sm:space-y-4">
            <div className="h-5 sm:h-6 bg-muted rounded w-1/3" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 sm:h-20 bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50 h-full">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0",
              pipeline?.status === 'running' ? "bg-primary/10" : "bg-primary/10"
            )}>
              {pipeline?.status === 'running' ? (
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary animate-pulse" />
              ) : (
                <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">
                {t('newsFeed.title')}
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">
                {pipeline?.status === 'running' 
                  ? `${t('newsFeed.step')} ${pipeline.currentStep}/${pipeline.totalSteps}`
                  : t('newsFeed.autoUpdates')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2",
                isConnected 
                  ? "border-success/50 bg-success/10 text-success" 
                  : "border-muted"
              )}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-success"></span>
                  </span>
                  <span className="hidden sm:inline">LIVE</span>
                </>
              ) : (
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-muted-foreground" />
              )}
            </Badge>
            
            <Button 
              size="sm" 
              variant={pipeline?.status === 'running' ? "outline" : "default"}
              onClick={handleFullRefresh}
              disabled={isLoading}
              className="gap-1 rounded-lg h-7 sm:h-8 px-2 sm:px-3"
            >
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span className="hidden sm:inline text-xs">
                {isLoading ? t('newsFeed.running') : t('newsFeed.update')}
              </span>
            </Button>
          </div>
        </div>

        {/* Pipeline Progress - Show when running */}
        {pipeline?.status === 'running' && (
          <div className="space-y-1.5 mt-3 pt-3 border-t">
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-muted-foreground truncate">
                {pipeline.steps.find(s => s.status === 'running')?.name || t('newsFeed.processing')}
              </span>
              <span className="font-medium shrink-0">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Status Summary Row */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t text-[10px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-2 sm:gap-4">
            {latestRun && (
              <>
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {formatTime(latestRun.completed_at || latestRun.started_at)}
                </span>
                <span className="flex items-center gap-1">
                  {latestRun.status === 'completed' ? (
                    <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-success" />
                  ) : latestRun.status === 'failed' ? (
                    <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-destructive" />
                  ) : (
                    <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
                  )}
                  {latestRun.articles_new} {t('newsFeed.new')}
                </span>
              </>
            )}
            {pipeline?.dataStats && pipeline.status !== 'running' && (
              <span className="flex items-center gap-1">
                <Activity className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {pipeline.dataStats.predictionsGenerated} {t('newsFeed.predictions')}
              </span>
            )}
          </div>

          {/* Toggle Pipeline Steps */}
          {pipeline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPipeline(!showPipeline)}
              className="h-5 sm:h-6 text-[10px] sm:text-xs text-muted-foreground gap-1 px-1.5 -mr-1.5"
            >
              10 {t('newsFeed.steps')}
              {showPipeline ? (
                <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              ) : (
                <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              )}
            </Button>
          )}
        </div>

        {/* Collapsible Pipeline Steps */}
        {pipeline && showPipeline && (
          <div className="mt-2 pt-2 border-t space-y-0.5">
            {pipeline.steps.map((step) => {
              const StatusIcon = getStatusIcon(step.status);
              const StepIcon = STEP_ICONS[step.step] || Activity;
              
              return (
                <div 
                  key={step.step}
                  className={cn(
                    "flex items-center justify-between py-1 px-1.5 rounded-md transition-colors",
                    step.status === 'running' && "bg-primary/5",
                    step.status === 'completed' && "bg-success/5",
                    step.status === 'failed' && "bg-destructive/5"
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <StepIcon className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0", getStatusColor(step.status))} />
                    <span className={cn(
                      "text-[9px] sm:text-[10px] truncate",
                      step.status === 'pending' ? "text-muted-foreground/60" : "text-foreground"
                    )}>
                      {step.step}. {step.name}
                    </span>
                  </div>
                  <StatusIcon className={cn(
                    "h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0",
                    getStatusColor(step.status),
                    step.status === 'running' && "animate-spin"
                  )} />
                </div>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
        <ScrollArea className="h-[240px] sm:h-[300px] lg:h-[340px] pr-2 sm:pr-4">
          <div className="space-y-2 sm:space-y-3">
            {articles.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Newspaper className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">
                  {t('newsFeed.noNews')}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleFullRefresh}
                  className="mt-2 text-xs"
                >
                  {t('newsFeed.startScan')}
                </Button>
              </div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className={cn(
                    "p-2.5 sm:p-3 rounded-lg sm:rounded-xl border bg-card/50 hover:bg-muted/30 transition-colors cursor-pointer",
                    article.severity === 'critical' && "border-destructive/30 bg-destructive/5",
                    article.severity === 'high' && "border-danger/30 bg-danger/5",
                    expanded === article.id && "ring-2 ring-primary/30"
                  )}
                  onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                        {article.severity && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", severityColors[article.severity])}
                          >
                            {getSeverityLabel(article.severity)}
                          </Badge>
                        )}
                        {article.disease_type && (
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                            {getDiseaseLabel(article.disease_type)}
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-medium text-xs sm:text-sm line-clamp-2 mb-1">
                        {article.title}
                      </h4>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 sm:gap-1">
                          <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {article.source}
                        </span>
                        {article.location && (
                          <span className="flex items-center gap-0.5 sm:gap-1">
                            <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {article.location}
                          </span>
                        )}
                      </div>

                      {/* Expanded content */}
                      {expanded === article.id && article.content_summary && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {article.content_summary}
                          </p>
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-2 text-[10px] sm:text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {t('newsFeed.readMore')}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Verified Sources & Disclaimer Footer */}
        <div className="mt-3 pt-3 border-t border-dashed space-y-2">
          {/* Verified Sources */}
          <div className="flex flex-wrap items-center gap-1.5 justify-center">
            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t('newsFeed.verifiedSources')}:
            </span>
            {(i18n.language === 'vi' 
              ? ['Bộ Y tế Việt Nam', 'WHO', 'CDC', 'VnExpress', 'Tuổi Trẻ', 'Thanh Niên']
              : ['Vietnam MOH', 'WHO', 'CDC', 'VnExpress', 'Tuoi Tre', 'Thanh Nien']
            ).map((source) => (
              <Badge 
                key={source}
                variant="outline" 
                className="text-[9px] sm:text-[10px] px-1.5 py-0.5 bg-muted/50 font-normal"
              >
                {source}
              </Badge>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            <span>
              {t('newsFeed.disclaimer')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

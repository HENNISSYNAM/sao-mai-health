import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Workflow, 
  Search, 
  Database, 
  TrendingUp, 
  MapPin, 
  Radio,
  RefreshCw,
  Check,
  Clock,
  AlertCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  name: string;
  nameVi: string;
  icon: React.ElementType;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface PipelineStatusProps {
  isLoading: boolean;
  isConnected: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  dataQuality?: {
    isRealtime: boolean;
    searchEngine: string;
    observedCount: number;
    predictedCount: number;
  };
}

export function PipelineStatus({ 
  isLoading, 
  isConnected, 
  lastUpdated, 
  onRefresh,
  dataQuality 
}: PipelineStatusProps) {
  const { i18n } = useTranslation();

  const stages: PipelineStage[] = [
    { id: 'scheduler', name: 'Scheduler', nameVi: 'Lập lịch', icon: Clock, status: isLoading ? 'running' : 'completed' },
    { id: 'web-search', name: 'Web Search', nameVi: 'Tìm kiếm', icon: Search, status: isLoading ? 'running' : 'completed' },
    { id: 'extraction', name: 'Extraction', nameVi: 'Trích xuất', icon: Database, status: isLoading ? 'pending' : 'completed' },
    { id: 'predictive', name: 'Predictive', nameVi: 'Dự báo', icon: TrendingUp, status: isLoading ? 'pending' : 'completed' },
    { id: 'risk-classifier', name: 'Risk GPS', nameVi: 'Phân loại GPS', icon: MapPin, status: isLoading ? 'pending' : 'completed' },
    { id: 'realtime-push', name: 'Realtime', nameVi: 'Đẩy dữ liệu', icon: Radio, status: isLoading ? 'pending' : 'completed' }
  ];

  const getStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed': return <Check className="h-3 w-3" />;
      case 'running': return <RefreshCw className="h-3 w-3 animate-spin" />;
      case 'failed': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed': return 'bg-success/20 text-success border-success/30';
      case 'running': return 'bg-primary/20 text-primary border-primary/30';
      case 'failed': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Pipeline stages */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs whitespace-nowrap",
                  getStatusColor(stage.status)
                )}>
                  <stage.icon className="h-3 w-3" />
                  <span className="hidden md:inline">
                    {i18n.language === 'vi' ? stage.nameVi : stage.name}
                  </span>
                  {getStatusIcon(stage.status)}
                </div>
                {idx < stages.length - 1 && (
                  <div className="w-2 sm:w-4 h-px bg-border mx-0.5" />
                )}
              </div>
            ))}
          </div>

          {/* Status and actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Connection status */}
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 text-xs",
                isConnected 
                  ? "border-success/50 bg-success/10 text-success" 
                  : "border-muted"
              )}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  LIVE
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Offline
                </>
              )}
            </Badge>

            {/* Data quality badge */}
            {dataQuality?.isRealtime && (
              <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                <Zap className="h-3 w-3" />
                {dataQuality.searchEngine}
              </Badge>
            )}

            {/* Last updated */}
            {lastUpdated && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {lastUpdated.toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
              </span>
            )}

            {/* Refresh button */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-1 rounded-lg"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">
                {i18n.language === 'vi' ? 'Làm mới' : 'Refresh'}
              </span>
            </Button>
          </div>
        </div>

        {/* Data stats */}
        {dataQuality && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{dataQuality.observedCount}</strong>
              {' '}{i18n.language === 'vi' ? 'điểm quan sát' : 'observed points'}
            </span>
            <span>
              <strong className="text-foreground">{dataQuality.predictedCount}</strong>
              {' '}{i18n.language === 'vi' ? 'dự báo' : 'predictions'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

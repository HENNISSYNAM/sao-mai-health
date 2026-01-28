import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  RefreshCw,
  Shield,
  AlertTriangle,
  Activity,
  Users,
  Heart,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe,
  Navigation,
  TrendingUp,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGPSHealthIntelligence, PrioritizedAlert } from '@/hooks/useGPSHealthIntelligence';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

const PRIORITY_STYLES: Record<number, { bg: string; border: string; icon: React.ElementType; label: string }> = {
  1: { bg: 'bg-destructive/10', border: 'border-destructive/30', icon: Navigation, label: 'TRỰC TIẾP' },
  2: { bg: 'bg-warning/10', border: 'border-warning/30', icon: Globe, label: 'LIÊN VÙNG' },
  3: { bg: 'bg-primary/10', border: 'border-primary/30', icon: TrendingUp, label: 'TIỀM ẨN' },
  4: { bg: 'bg-muted/50', border: 'border-muted', icon: Info, label: 'THAM KHẢO' }
};

const RISK_LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'bg-success/20', text: 'text-success' },
  MEDIUM: { bg: 'bg-warning/20', text: 'text-warning' },
  HIGH: { bg: 'bg-danger/20', text: 'text-danger' },
  CRITICAL: { bg: 'bg-destructive/20', text: 'text-destructive' }
};

export function GPSHealthIntelligence() {
  const { i18n } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  
  const { data, isLoading, error, lastUpdated, refresh } = useGPSHealthIntelligence({
    autoFetch: true,
    refreshInterval: 300000 // 5 minutes
  });

  const locale = i18n.language === 'vi' ? vi : enUS;
  const isVi = i18n.language === 'vi';

  const formatTime = (date: Date | null) => {
    if (!date) return '—';
    return formatDistanceToNow(date, { addSuffix: true, locale });
  };

  const getRiskStatusColor = (level: string) => {
    switch (level) {
      case 'Cao':
      case 'High':
        return 'bg-danger text-white';
      case 'Trung bình':
      case 'Medium':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-success text-white';
    }
  };

  if (isLoading && !data) {
    return (
      <Card className="rounded-xl sm:rounded-2xl border-border/50">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted rounded-xl" />
              ))}
            </div>
            <div className="h-24 bg-muted rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="rounded-xl sm:rounded-2xl border-border/50">
        <CardContent className="p-4 sm:p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50 overflow-hidden">
      {/* Header with Location & Risk Status */}
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-semibold truncate">
                {data?.userLocation?.city || 'Đang định vị...'}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {isVi ? 'Thông tin y tế theo vị trí' : 'Location-based health intel'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium",
                getRiskStatusColor(data?.communityRiskStatus?.level || 'Thấp')
              )}
            >
              <Shield className="h-3 w-3 mr-1" />
              {data?.communityRiskStatus?.level || 'Thấp'}
            </Badge>
            
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              disabled={isLoading}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Risk Explanation */}
        {data?.communityRiskStatus?.explanationVi && (
          <p className="text-xs sm:text-sm text-muted-foreground bg-muted/30 rounded-lg p-2.5">
            {isVi ? data.communityRiskStatus.explanationVi : data.communityRiskStatus.explanation}
          </p>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
        {/* KPI Cards - 4 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-muted/30 rounded-xl p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
            <div className="text-lg sm:text-xl font-bold">
              {data?.kpi?.todayCasesLocal?.toLocaleString() || '0'}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {isVi ? 'Ca hôm nay' : 'Today cases'}
            </div>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-warning" />
            <div className="text-lg sm:text-xl font-bold">
              {data?.kpi?.openAlertsLocal || 0}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {isVi ? 'Cảnh báo' : 'Alerts'}
            </div>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-3 text-center">
            <Activity className="h-4 w-4 mx-auto mb-1 text-success" />
            <div className="text-lg sm:text-xl font-bold">
              {data?.kpi?.diseasesMonitoredRegional || 0}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {isVi ? 'Loại bệnh' : 'Diseases'}
            </div>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-3 text-center">
            <Heart className="h-4 w-4 mx-auto mb-1 text-danger" />
            <div className="text-lg sm:text-xl font-bold">
              {data?.kpi?.vaccinationRate ? `${data.kpi.vaccinationRate}%` : '—'}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {isVi ? 'Tiêm chủng' : 'Vaccinated'}
            </div>
          </div>
        </div>

        {/* Prioritized Alerts - Max 3 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-medium">
              {isVi ? 'Tin tức & Diễn biến' : 'News & Updates'}
            </h4>
            <span className="text-[10px] text-muted-foreground">
              {isVi ? 'Theo thứ tự ưu tiên' : 'By priority'}
            </span>
          </div>

          {data?.prioritizedAlerts?.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">
                {isVi ? 'Không có tin tức đáng chú ý' : 'No notable news'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.prioritizedAlerts?.slice(0, 3).map((alert, idx) => {
                const style = PRIORITY_STYLES[alert.priority];
                const riskStyle = RISK_LEVEL_STYLES[alert.riskLevel];
                const PriorityIcon = style.icon;
                const isExpanded = expanded === `${idx}`;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl border p-3 cursor-pointer transition-all",
                      style.bg,
                      style.border,
                      isExpanded && "ring-2 ring-primary/30"
                    )}
                    onClick={() => setExpanded(isExpanded ? null : `${idx}`)}
                  >
                    <div className="flex items-start gap-2.5">
                      <PriorityIcon className="h-4 w-4 mt-0.5 shrink-0 text-foreground/70" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                            {alert.priorityLabelVi}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn("text-[9px] px-1.5 py-0", riskStyle.bg, riskStyle.text)}
                          >
                            {alert.diseaseVi}
                          </Badge>
                          {alert.casesCount && alert.casesCount > 0 && (
                            <span className="text-[9px] text-muted-foreground">
                              {alert.casesCount} ca
                            </span>
                          )}
                        </div>
                        
                        <h5 className="text-xs sm:text-sm font-medium line-clamp-2 mb-1">
                          {alert.title}
                        </h5>
                        
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {alert.location}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" />
                            {alert.source}
                          </span>
                        </div>

                        {/* Expanded Summary */}
                        {isExpanded && alert.summary && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground">
                              {alert.summary}
                            </p>
                          </div>
                        )}
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Personal Insight */}
        {data?.personalInsight?.messageVi && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-primary">
                  {isVi ? 'Ý nghĩa với bạn' : 'What this means for you'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isVi ? data.personalInsight.messageVi : data.personalInsight.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Trust Line */}
        <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
          <span>{data?.footer?.dataType || 'Dữ liệu xác minh + Dự báo AI'}</span>
          <span>Cập nhật {formatTime(lastUpdated)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

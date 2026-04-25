import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Radio,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Zap
} from "lucide-react";
import { useAlertOrchestrator, AlertAction } from "@/hooks/useAlertOrchestrator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RISK_LEVEL_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    pulse: 'animate-pulse'
  },
  high: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    pulse: ''
  },
  medium: {
    icon: Bell,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    pulse: ''
  },
  low: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    pulse: ''
  }
};

const ACTION_CONFIG = {
  create: { icon: TrendingUp, color: 'text-red-500', label: { en: 'New Alert', vi: 'Cảnh báo mới' } },
  update: { icon: Activity, color: 'text-yellow-500', label: { en: 'Updated', vi: 'Đã cập nhật' } },
  close: { icon: CheckCircle2, color: 'text-green-500', label: { en: 'Closed', vi: 'Đã đóng' } }
};

export function AlertOrchestrationPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'vi';
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    isConnected,
    isProcessing,
    summary,
    recentActions,
    lastUpdate,
    triggerOrchestration,
    refreshSummary
  } = useAlertOrchestrator();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await triggerOrchestration({ trigger_source: 'manual_refresh' });
    setIsRefreshing(false);
    
    if (result.success) {
      toast.success(
        lang === 'vi' 
          ? `Đã xử lý ${result.data?.actions_taken || 0} hành động cảnh báo`
          : `Processed ${result.data?.actions_taken || 0} alert actions`
      );
    } else {
      toast.error(
        lang === 'vi' 
          ? 'Lỗi khi điều phối cảnh báo'
          : 'Error orchestrating alerts'
      );
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-destructive/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10">
              <Zap className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {lang === 'vi' ? 'Điều phối Cảnh báo' : 'Alert Orchestration'}
                {isConnected && (
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                    LIVE
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lang === 'vi' ? 'Cập nhật lúc' : 'Updated at'} {formatTime(lastUpdate)}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isProcessing}
            className="gap-1"
          >
            <RefreshCw className={cn("h-3 w-3", (isRefreshing || isProcessing) && "animate-spin")} />
            {lang === 'vi' ? 'Làm mới' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alert Level Summary */}
        <div className="grid grid-cols-4 gap-2">
          {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
            const config = RISK_LEVEL_CONFIG[level];
            const LevelIcon = config.icon;
            const count = summary.by_level[level];
            
            return (
              <div
                key={level}
                className={cn(
                  "p-3 rounded-xl border text-center transition-all",
                  config.bg,
                  config.border,
                  count > 0 && config.pulse
                )}
              >
                <LevelIcon className={cn("h-4 w-4 mx-auto mb-1", config.color)} />
                <p className={cn("text-xl font-bold", config.color)}>{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{level}</p>
              </div>
            );
          })}
        </div>

        {/* Total Open Alerts */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-medium">
                {lang === 'vi' ? 'Tổng cảnh báo mở' : 'Total Open Alerts'}
              </p>
              <p className="text-2xl font-bold text-primary">{summary.total}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {lang === 'vi' ? 'Theo bệnh' : 'By Disease'}
            </p>
            <div className="flex flex-wrap gap-1 justify-end mt-1">
              {Object.entries(summary.by_disease).slice(0, 3).map(([disease, count]) => (
                <Badge key={disease} variant="secondary" className="text-xs">
                  {disease}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Actions Feed */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {lang === 'vi' ? 'Hành động gần đây' : 'Recent Actions'}
          </p>
          
          {isProcessing ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : recentActions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {lang === 'vi' 
                  ? 'Chưa có hành động cảnh báo'
                  : 'No alert actions yet'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {recentActions.map((action, idx) => (
                  <AlertActionItem key={idx} action={action} lang={lang} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Status Footer */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-success animate-pulse" : "bg-muted"
              )} />
              {isConnected 
                ? (lang === 'vi' ? 'Đã kết nối realtime' : 'Realtime connected')
                : (lang === 'vi' ? 'Đang kết nối...' : 'Connecting...')}
            </div>
            <span>
              {lang === 'vi' 
                ? '⚡ Tự động cập nhật mỗi 5 phút'
                : '⚡ Auto-updates every 5 min'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertActionItem({ action, lang }: { action: AlertAction; lang: 'en' | 'vi' }) {
  const config = ACTION_CONFIG[action.action];
  const riskConfig = RISK_LEVEL_CONFIG[action.risk_level];
  const ActionIcon = config.icon;
  const RiskIcon = riskConfig.icon;

  return (
    <div className={cn(
      "p-3 rounded-xl border transition-all hover:shadow-sm",
      riskConfig.bg,
      "border-border/50"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <ActionIcon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("text-xs", riskConfig.color)}>
                <RiskIcon className="h-3 w-3 mr-1" />
                {action.risk_level.toUpperCase()}
              </Badge>
              <span className="text-xs font-medium">{action.disease}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {action.reason}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className={cn("text-xs shrink-0", config.color)}>
          {config.label[lang]}
        </Badge>
      </div>
    </div>
  );
}

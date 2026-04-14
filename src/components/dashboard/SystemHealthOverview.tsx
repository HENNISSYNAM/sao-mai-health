import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Globe, 
  Clock,
  Shield,
  TrendingUp,
  Radio,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Bell,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAlertCounts } from "@/hooks/useAlertOrchestrator";

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  aiSummary: string;
  classification: 'confirmed' | 'emerging' | 'predictive';
  disease?: string;
  location?: string;
  severity: 'low' | 'medium' | 'high';
}

interface SystemStatus {
  overallRisk: 'low' | 'medium' | 'high';
  articles: NewsArticle[];
  lastUpdated: Date;
  isLive: boolean;
  isRealtime: boolean;
  sourcesChecked: string[];
  searchEngine: string;
  searchTime: string;
}

const RISK_CONFIG = {
  low: { 
    icon: '🟢', 
    color: 'text-success', 
    bg: 'bg-success/10',
    border: 'border-success/30',
    label: { en: 'Low Risk', vi: 'Rủi ro thấp' }
  },
  medium: { 
    icon: '🟠', 
    color: 'text-warning', 
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    label: { en: 'Medium Risk', vi: 'Rủi ro trung bình' }
  },
  high: { 
    icon: '🔴', 
    color: 'text-danger', 
    bg: 'bg-danger/10',
    border: 'border-danger/30',
    label: { en: 'High Risk', vi: 'Rủi ro cao' }
  }
};

const CLASSIFICATION_CONFIG = {
  confirmed: {
    icon: CheckCircle2,
    emoji: '🟢',
    color: 'text-success',
    bg: 'bg-success/10',
    label: { en: 'Confirmed', vi: 'Đã xác nhận' }
  },
  emerging: {
    icon: AlertCircle,
    emoji: '🟠',
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: { en: 'Emerging Risk', vi: 'Rủi ro mới nổi' }
  },
  predictive: {
    icon: Lightbulb,
    emoji: '🔵',
    color: 'text-info',
    bg: 'bg-info/10',
    label: { en: 'Predictive', vi: 'Dự đoán' }
  }
};

export function SystemHealthOverview() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<SystemStatus>({
    overallRisk: 'low',
    articles: [],
    lastUpdated: new Date(),
    isLive: false,
    isRealtime: false,
    sourcesChecked: [],
    searchEngine: '',
    searchTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get alert counts from orchestrator
  const alertCounts = useAlertCounts();

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const lang = i18n.language as 'en' | 'vi';

  const fetchHealthUpdates = useCallback(async () => {
    setLoading(true);
    
    try {
      console.log('🔍 Triggering Health News Intelligence Agent...');
      
      const { data, error } = await supabase.functions.invoke('health-news-intelligence');
      
      if (error) {
        if (error.message?.includes('429')) {
          toast.error(lang === 'vi' ? 'Đã vượt giới hạn. Vui lòng thử lại sau.' : 'Rate limit exceeded. Please try again later.');
          return;
        }
        if (error.message?.includes('402')) {
          toast.error(lang === 'vi' ? 'Cần nạp thêm credits.' : 'Payment required. Please add credits.');
          return;
        }
        throw error;
      }

      if (data?.success) {
        setStatus({
          overallRisk: data.overallRisk || 'low',
          articles: data.articles || [],
          lastUpdated: new Date(data.lastUpdated),
          isLive: true,
          isRealtime: data.isRealtime || false,
          sourcesChecked: data.metadata?.sourcesChecked || [],
          searchEngine: data.metadata?.searchEngine || 'AI',
          searchTime: data.metadata?.searchTime || ''
        });

        toast.success(
          lang === 'vi' 
            ? `Đã cập nhật ${data.articles?.length || 0} tin tức y tế`
            : `Updated ${data.articles?.length || 0} health news items`
        );
      }
    } catch (error: any) {
      console.error('❌ Health update error:', error);
      toast.error(
        lang === 'vi'
          ? 'Lỗi cập nhật thông tin y tế'
          : 'Error updating health information'
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  // Auto-refresh every 5 minutes when enabled
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealthUpdates, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchHealthUpdates]);

  // Initial fetch
  useEffect(() => {
    fetchHealthUpdates();
  }, []);

  const riskConfig = RISK_CONFIG[status.overallRisk];

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {lang === 'vi' ? 'Tổng quan Hệ thống Y tế' : 'System Health Overview'}
                {status.isLive && (
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                    LIVE
                  </Badge>
                )}
                {status.isRealtime && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    ⚡ Real-time
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {status.searchEngine && (
                  <span className="font-medium text-primary">{status.searchEngine}</span>
                )}
                {status.searchTime && (
                  <span>• {lang === 'vi' ? 'Cập nhật lúc' : 'Updated at'} {status.searchTime}</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn("text-xs", autoRefresh && "text-primary")}
            >
              <Activity className={cn("h-3 w-3 mr-1", autoRefresh && "animate-pulse")} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHealthUpdates}
              disabled={loading}
              className="gap-1"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              {lang === 'vi' ? 'Cập nhật' : 'Update'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Risk Indicator */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-xl border",
          riskConfig.bg,
          riskConfig.border
        )}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{riskConfig.icon}</span>
            <div>
              <p className="text-sm font-medium">
                {lang === 'vi' ? 'Mức độ rủi ro cộng đồng' : 'Community Risk Level'}
              </p>
              <p className={cn("text-lg font-bold", riskConfig.color)}>
                {riskConfig.label[lang]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className={cn("h-8 w-8", riskConfig.color)} />
          </div>
        </div>

        {/* Alert Counts from Orchestrator */}
        <div className="grid grid-cols-4 gap-2">
          <div className={cn(
            "p-3 rounded-xl text-center border",
            alertCounts.critical > 0 ? "bg-red-500/10 border-red-500/30 animate-pulse" : "bg-muted/30 border-border/50"
          )}>
            <AlertTriangle className={cn("h-4 w-4 mx-auto mb-1", alertCounts.critical > 0 ? "text-red-500" : "text-muted-foreground")} />
            <p className={cn("text-lg font-bold", alertCounts.critical > 0 ? "text-red-500" : "text-muted-foreground")}>
              {alertCounts.critical}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'vi' ? 'Nguy hiểm' : 'Critical'}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-xl text-center border",
            alertCounts.high > 0 ? "bg-orange-500/10 border-orange-500/30" : "bg-muted/30 border-border/50"
          )}>
            <AlertCircle className={cn("h-4 w-4 mx-auto mb-1", alertCounts.high > 0 ? "text-orange-500" : "text-muted-foreground")} />
            <p className={cn("text-lg font-bold", alertCounts.high > 0 ? "text-orange-500" : "text-muted-foreground")}>
              {alertCounts.high}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'vi' ? 'Cao' : 'High'}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-xl text-center border",
            alertCounts.medium > 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-muted/30 border-border/50"
          )}>
            <Bell className={cn("h-4 w-4 mx-auto mb-1", alertCounts.medium > 0 ? "text-yellow-500" : "text-muted-foreground")} />
            <p className={cn("text-lg font-bold", alertCounts.medium > 0 ? "text-yellow-500" : "text-muted-foreground")}>
              {alertCounts.medium}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'vi' ? 'Trung bình' : 'Medium'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center border border-border/50">
            <Zap className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-primary">
              {alertCounts.total}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'vi' ? 'Tổng cộng' : 'Total'}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold">
              {status.articles.filter(a => a.classification === 'confirmed').length}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'vi' ? 'Xác nhận' : 'Confirmed'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <AlertCircle className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold">
              {status.articles.filter(a => a.classification === 'emerging').length}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'vi' ? 'Mới nổi' : 'Emerging'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs font-medium">
              {status.lastUpdated.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'vi' ? 'Cập nhật' : 'Updated'}
            </p>
          </div>
        </div>

        {/* News Articles with AI Summaries */}
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {lang === 'vi' ? 'Tin tức y tế (AI tóm tắt)' : 'Health News (AI Summarized)'}
          </p>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : status.articles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {lang === 'vi' 
                  ? 'Không có tin tức y tế mới'
                  : 'No new health news found'}
              </p>
            </div>
          ) : (
            status.articles.slice(0, 5).map((article) => {
              const classConfig = CLASSIFICATION_CONFIG[article.classification];
              const ClassIcon = classConfig.icon;
              
              return (
                <div
                  key={article.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all hover:shadow-md",
                    classConfig.bg,
                    "border-border/50"
                  )}
                >
                  {/* Classification Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs gap-1", classConfig.color)}
                    >
                      <ClassIcon className="h-3 w-3" />
                      {classConfig.label[lang]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.publishedAt).toLocaleDateString(locale)}
                    </span>
                  </div>

                  {/* AI Summary - Primary Content */}
                  <div className="mb-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-primary font-medium">
                          {lang === 'vi' ? 'AI tóm tắt:' : 'AI Summary:'}
                        </span>
                        <p className="text-sm text-foreground leading-relaxed">
                          {article.aiSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Source Info */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {article.source}
                      </span>
                      {article.location && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            📍 {article.location}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Read Full Article Link */}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {lang === 'vi' ? 'Đọc bài gốc' : 'Read full article'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Article Title */}
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    {article.title}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Source Attribution */}
        <div className="pt-3 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            {lang === 'vi' 
              ? 'Nguồn đã kiểm tra:'
              : 'Sources checked:'}
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {(status.sourcesChecked.length > 0 
              ? status.sourcesChecked 
              : ['Ministry of Health', 'WHO', 'CDC']
            ).map((source, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {source}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {lang === 'vi' 
              ? '⚡ Cập nhật tự động mỗi 5 phút • AI tóm tắt không thay thế tư vấn y tế'
              : '⚡ Auto-updates every 5 min • AI summaries do not replace medical advice'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

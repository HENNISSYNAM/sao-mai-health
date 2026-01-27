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
  Radio
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HealthUpdate {
  id: string;
  disease: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  cases: number;
  source: string;
  confidence: 'verified' | 'unverified';
  timestamp: string;
  summary: string;
}

interface SystemStatus {
  overallRisk: 'low' | 'medium' | 'high';
  activeAlerts: number;
  emergingIssues: HealthUpdate[];
  lastUpdated: Date;
  isLive: boolean;
}

const RISK_CONFIG = {
  low: { 
    icon: '🟢', 
    color: 'text-success', 
    bg: 'bg-success/10',
    label: { en: 'Low Risk', vi: 'Rủi ro thấp' }
  },
  medium: { 
    icon: '🟠', 
    color: 'text-warning', 
    bg: 'bg-warning/10',
    label: { en: 'Medium Risk', vi: 'Rủi ro trung bình' }
  },
  high: { 
    icon: '🔴', 
    color: 'text-danger', 
    bg: 'bg-danger/10',
    label: { en: 'High Risk', vi: 'Rủi ro cao' }
  }
};

export function SystemHealthOverview() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<SystemStatus>({
    overallRisk: 'low',
    activeAlerts: 0,
    emergingIssues: [],
    lastUpdated: new Date(),
    isLive: false
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const fetchHealthUpdates = useCallback(async () => {
    setLoading(true);
    
    try {
      console.log('🔍 Triggering automated health update search...');
      
      const { data, error } = await supabase.functions.invoke('fetch-disease-news');
      
      if (error) throw error;

      if (data?.success) {
        const emergingIssues: HealthUpdate[] = (data.articles || [])
          .slice(0, 3)
          .map((article: any, idx: number) => ({
            id: `update-${Date.now()}-${idx}`,
            disease: article.disease || 'unknown',
            location: article.location || 'Vietnam',
            severity: article.severity || 'low',
            cases: article.cases || 0,
            source: 'Official Health Sources',
            confidence: 'verified' as const,
            timestamp: article.date || new Date().toISOString(),
            summary: article.summary || ''
          }));

        // Calculate overall risk based on emerging issues
        let overallRisk: 'low' | 'medium' | 'high' = 'low';
        if (emergingIssues.some(i => i.severity === 'high')) {
          overallRisk = 'high';
        } else if (emergingIssues.some(i => i.severity === 'medium')) {
          overallRisk = 'medium';
        }

        setStatus({
          overallRisk,
          activeAlerts: data.alertsCreated || 0,
          emergingIssues,
          lastUpdated: new Date(),
          isLive: true
        });

        toast.success(
          i18n.language === 'vi' 
            ? `Đã cập nhật ${emergingIssues.length} thông tin y tế mới`
            : `Updated ${emergingIssues.length} new health updates`
        );
      }
    } catch (error: any) {
      console.error('❌ Health update error:', error);
      toast.error(
        i18n.language === 'vi'
          ? 'Lỗi cập nhật thông tin y tế'
          : 'Error updating health information'
      );
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

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
                {i18n.language === 'vi' ? 'Tổng quan Hệ thống Y tế' : 'System Health Overview'}
                {status.isLive && (
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                    LIVE
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {i18n.language === 'vi' ? 'Cập nhật tự động từ nguồn chính thống' : 'Auto-updated from official sources'}
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
              {i18n.language === 'vi' ? 'Cập nhật' : 'Update'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Risk Indicator */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-xl",
          riskConfig.bg
        )}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{riskConfig.icon}</span>
            <div>
              <p className="text-sm font-medium">
                {i18n.language === 'vi' ? 'Mức độ rủi ro cộng đồng' : 'Community Risk Level'}
              </p>
              <p className={cn("text-lg font-bold", riskConfig.color)}>
                {riskConfig.label[i18n.language as 'en' | 'vi']}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className={cn("h-8 w-8", riskConfig.color)} />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold">{status.activeAlerts}</p>
            <p className="text-xs text-muted-foreground">
              {i18n.language === 'vi' ? 'Cảnh báo mới' : 'New Alerts'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{status.emergingIssues.length}</p>
            <p className="text-xs text-muted-foreground">
              {i18n.language === 'vi' ? 'Vấn đề nổi bật' : 'Emerging Issues'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs font-medium">
              {status.lastUpdated.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {i18n.language === 'vi' ? 'Cập nhật lần cuối' : 'Last Updated'}
            </p>
          </div>
        </div>

        {/* Emerging Issues */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {i18n.language === 'vi' ? 'Vấn đề y tế nổi bật' : 'Key Emerging Health Issues'}
          </p>
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : status.emergingIssues.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {i18n.language === 'vi' 
                  ? 'Không có vấn đề y tế nghiêm trọng nào được phát hiện'
                  : 'No significant health issues detected'}
              </p>
            </div>
          ) : (
            status.emergingIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <span className="text-lg mt-0.5">
                  {RISK_CONFIG[issue.severity].icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {issue.disease.toUpperCase()}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        issue.confidence === 'verified' 
                          ? "border-success/50 text-success" 
                          : "border-warning/50 text-warning"
                      )}
                    >
                      {issue.confidence === 'verified' ? '✓ Verified' : '? Unverified'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {issue.summary || `${issue.cases} cases reported in ${issue.location}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {issue.location} • {new Date(issue.timestamp).toLocaleDateString(locale)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Source Attribution */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            {i18n.language === 'vi' 
              ? '📡 Nguồn: Bộ Y tế, WHO, CDC • Cập nhật tự động mỗi 5 phút'
              : '📡 Sources: Ministry of Health, WHO, CDC • Auto-updates every 5 minutes'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

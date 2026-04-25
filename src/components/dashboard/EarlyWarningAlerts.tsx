import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Brain, 
  MapPin, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Shield,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Baby
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { getDiseaseName } from '@/lib/diseaseI18n';
import { useRegionalRisk, RiskAlert } from '@/hooks/useRegionalRisk';

interface EarlyWarningAlertsProps {
  verifiedAlerts: any[];
  userGPS?: { lat: number; lng: number } | null;
}

// Extended alert for display
interface DisplayAlert {
  id: string;
  type: 'verified' | 'ai_prediction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: string;
  confidence: 'low' | 'medium' | 'high';
  createdAt: string;
  diseaseType?: string;
  cases?: number;
  trend?: 'increasing' | 'stable' | 'decreasing';
  isOutbreak?: boolean;
  priority?: number; // For sorting
}

// Disease priority config - matches backend logic
// COVID-19 is deprioritized (endemic), focus on Dengue, HFMD, Measles
const DISEASE_PRIORITY: Record<string, number> = {
  dengue: 1,
  hfmd: 2,
  measles: 3,
  rabies: 4,
  influenza: 5,
  cholera: 6,
  ari: 7,
  covid19: 10, // Low priority - endemic
  covid: 10,
};

// Smart sorting for alerts
function sortAlertsByPriority(alerts: DisplayAlert[]): DisplayAlert[] {
  return alerts.sort((a, b) => {
    // 1. Outbreak alerts first
    if (a.isOutbreak && !b.isOutbreak) return -1;
    if (!a.isOutbreak && b.isOutbreak) return 1;
    
    // 2. Critical/High before Medium/Low
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    if (severityDiff !== 0) return severityDiff;
    
    // 3. Increasing trends first
    if (a.trend === 'increasing' && b.trend !== 'increasing') return -1;
    if (a.trend !== 'increasing' && b.trend === 'increasing') return 1;
    
    // 4. Disease priority (Dengue > HFMD > ... > COVID)
    const priorityA = DISEASE_PRIORITY[a.diseaseType?.toLowerCase() || ''] || 8;
    const priorityB = DISEASE_PRIORITY[b.diseaseType?.toLowerCase() || ''] || 8;
    return priorityA - priorityB;
  });
}

export function EarlyWarningAlerts({ verifiedAlerts, userGPS }: EarlyWarningAlertsProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  const language = i18n.language as 'vi' | 'en';
  const locale = language === 'vi' ? vi : enUS;

  // Get AI predictions from regional risk hook
  const { data: riskData } = useRegionalRisk({ autoFetch: true });

  // Convert verified alerts (from props) to display format
  const verified: DisplayAlert[] = verifiedAlerts.map(alert => {
    const diseaseName = getDiseaseName(alert.disease_code, language);
    return {
      id: alert.id,
      type: 'verified',
      severity: alert.status === 'critical' ? 'critical' : 'high',
      title: `${diseaseName}: ${alert.cases} ${t('common.cases')}`,
      description: language === 'vi' 
        ? 'Ngưỡng cảnh báo vượt mức cho phép'
        : 'Alert threshold exceeded',
      location: alert.district_id,
      confidence: 'high',
      createdAt: alert.created_at,
      diseaseType: alert.disease_code,
      cases: alert.cases
    };
  });

  // Convert AI predictions from regional risk data
  const aiPredictions: DisplayAlert[] = riskData?.alerts?.map((alert: RiskAlert & { cases?: number; trend?: string; isOutbreak?: boolean }, idx: number) => ({
    id: `ai-${alert.disease}-${idx}`,
    type: 'ai_prediction' as const,
    severity: (alert.riskLevel?.toLowerCase() || 'low') as DisplayAlert['severity'],
    title: `${language === 'vi' ? alert.diseaseVi : alert.disease}: ${alert.cases || Math.round(alert.confidence / 10)} ${language === 'vi' ? 'ca' : 'cases'}`,
    description: language === 'vi' ? alert.explanationVi : alert.explanation,
    location: riskData?.region?.nameVi || riskData?.region?.name,
    confidence: alert.confidence > 70 ? 'high' : alert.confidence > 40 ? 'medium' : 'low',
    createdAt: alert.timestamp,
    diseaseType: alert.disease,
    cases: alert.cases,
    trend: alert.trend as DisplayAlert['trend'],
    isOutbreak: alert.isOutbreak
  })) || [];

  // Apply smart priority sorting - Dengue, HFMD first; COVID last
  const allAlerts = sortAlertsByPriority([...verified, ...aiPredictions]);
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-destructive/50 bg-destructive/10 text-destructive';
      case 'high': return 'border-orange-500/50 bg-orange-500/10 text-orange-500';
      case 'medium': return 'border-warning/50 bg-warning/10 text-warning';
      default: return 'border-success/50 bg-success/10 text-success';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    const labels = {
      high: language === 'vi' ? 'Tin cậy cao' : 'High',
      medium: language === 'vi' ? 'Tin cậy TB' : 'Medium',
      low: language === 'vi' ? 'Tin cậy thấp' : 'Low'
    };
    return labels[confidence as keyof typeof labels] || confidence;
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'increasing') return <TrendingUp className="h-3 w-3 text-destructive" />;
    if (trend === 'decreasing') return <TrendingDown className="h-3 w-3 text-success" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    } catch {
      return dateStr;
    }
  };

  // Check if disease affects children
  const affectsChildren = (diseaseType?: string) => {
    const childDiseases = ['hfmd', 'measles', 'ari'];
    return childDiseases.includes(diseaseType?.toLowerCase() || '');
  };

  const displayedAlerts = showAll 
    ? allAlerts 
    : allAlerts.slice(0, 4);

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50">
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <CardTitle className="text-sm sm:text-base">
              {language === 'vi' ? 'Cảnh báo & Tín hiệu sớm' : 'Alerts & Early Signals'}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] gap-1 border-success/30 bg-success/5">
              <Shield className="h-2.5 w-2.5" />
              {verified.length}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 bg-primary/5">
              <Brain className="h-2.5 w-2.5" />
              {aiPredictions.length}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-4">
        {displayedAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Eye className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {language === 'vi' ? 'Không có cảnh báo' : 'No alerts'}
            </p>
          </div>
        ) : (
          <ScrollArea className={cn("pr-2", showAll ? "h-[300px]" : "")}>
            <div className="space-y-2">
              {displayedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-2.5 sm:p-3 rounded-lg border transition-all cursor-pointer",
                    "hover:shadow-sm",
                    alert.type === 'verified' 
                      ? "bg-card border-border" 
                      : "bg-primary/5 border-primary/20 border-dashed"
                  )}
                  onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Type & Severity badges */}
                      <div className="flex flex-wrap items-center gap-1 mb-1.5">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[9px] px-1.5 py-0",
                            alert.type === 'verified' 
                              ? "border-success/50 bg-success/10 text-success" 
                              : "border-primary/50 bg-primary/10 text-primary"
                          )}
                        >
                          {alert.type === 'verified' ? (
                            <>
                              <Shield className="h-2 w-2 mr-0.5" />
                              {language === 'vi' ? 'Xác nhận' : 'Verified'}
                            </>
                          ) : (
                            <>
                              <Brain className="h-2 w-2 mr-0.5" />
                              {language === 'vi' ? 'Dự báo AI' : 'AI Prediction'}
                            </>
                          )}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn("text-[9px] px-1.5 py-0", getSeverityStyle(alert.severity))}
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        {alert.type === 'ai_prediction' && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {getConfidenceLabel(alert.confidence)}
                          </Badge>
                        )}
                        {/* Outbreak indicator */}
                        {alert.isOutbreak && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-destructive/50 bg-destructive/10 text-destructive animate-pulse">
                            <Flame className="h-2 w-2 mr-0.5" />
                            {language === 'vi' ? 'Bùng phát' : 'Outbreak'}
                          </Badge>
                        )}
                        {/* Affects children indicator */}
                        {affectsChildren(alert.diseaseType) && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-orange-400/50 bg-orange-400/10 text-orange-500">
                            <Baby className="h-2 w-2 mr-0.5" />
                            {language === 'vi' ? 'Trẻ em' : 'Children'}
                          </Badge>
                        )}
                      </div>

                      {/* Title with trend */}
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-medium text-xs sm:text-sm line-clamp-1">
                          {alert.title}
                        </h4>
                        {alert.trend && getTrendIcon(alert.trend)}
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        {alert.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {alert.location}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(alert.createdAt)}
                        </span>
                      </div>

                      {/* Expanded content */}
                      {expanded === alert.id && (
                        <div className="mt-2 pt-2 border-t border-dashed">
                          <p className="text-xs text-muted-foreground">
                            {alert.description}
                          </p>
                          {alert.type === 'ai_prediction' && (
                            <p className="text-[10px] text-warning mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {language === 'vi' 
                                ? 'Đây là cảnh báo sớm từ AI, cần theo dõi thêm'
                                : 'This is an AI early warning, requires monitoring'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expand indicator */}
                    <div className="shrink-0">
                      {expanded === alert.id ? (
                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Show more button */}
        {allAlerts.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 text-xs h-7"
          >
            {showAll 
              ? (language === 'vi' ? 'Thu gọn' : 'Show less')
              : (language === 'vi' ? `Xem tất cả (${allAlerts.length})` : `View all (${allAlerts.length})`)
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

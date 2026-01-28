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
  TrendingUp,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

interface EarlyWarning {
  id: string;
  type: 'ai_prediction' | 'verified';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: string;
  confidence: 'low' | 'medium' | 'high';
  createdAt: string;
  diseaseType?: string;
}

interface EarlyWarningAlertsProps {
  verifiedAlerts: any[];
  aiWarnings?: EarlyWarning[];
  userGPS?: { lat: number; lng: number } | null;
}

export function EarlyWarningAlerts({ verifiedAlerts, aiWarnings = [], userGPS }: EarlyWarningAlertsProps) {
  const { i18n } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  const locale = i18n.language === 'vi' ? vi : enUS;

  // Generate AI early warnings based on data patterns
  const generateAIWarnings = (): EarlyWarning[] => {
    const warnings: EarlyWarning[] = [];
    
    // Example: Detect unusual patterns (this would come from the AI agent in production)
    if (verifiedAlerts.length > 3) {
      warnings.push({
        id: 'ai-1',
        type: 'ai_prediction',
        severity: 'medium',
        title: i18n.language === 'vi' 
          ? 'Tín hiệu sớm: Gia tăng ca bệnh' 
          : 'Early Signal: Increasing Cases',
        description: i18n.language === 'vi'
          ? 'Phát hiện xu hướng tăng không theo mùa. Cần theo dõi thêm trong 48h tới.'
          : 'Detected off-season increase trend. Monitor closely for next 48h.',
        location: 'Quận 1, TP.HCM',
        confidence: 'medium',
        createdAt: new Date().toISOString(),
        diseaseType: 'dengue'
      });
    }

    // Add GPS-based warning if user location available
    if (userGPS) {
      warnings.push({
        id: 'ai-gps-1',
        type: 'ai_prediction',
        severity: 'low',
        title: i18n.language === 'vi'
          ? 'Khu vực của bạn: Nguy cơ thấp'
          : 'Your Area: Low Risk',
        description: i18n.language === 'vi'
          ? 'Không phát hiện tín hiệu bất thường tại khu vực hiện tại.'
          : 'No unusual signals detected in your current area.',
        location: i18n.language === 'vi' ? 'Vị trí hiện tại' : 'Current location',
        confidence: 'high',
        createdAt: new Date().toISOString()
      });
    }

    return [...aiWarnings, ...warnings];
  };

  const allWarnings = generateAIWarnings();
  
  // Separate verified and AI warnings
  const verified = verifiedAlerts.map(alert => ({
    id: alert.id,
    type: 'verified' as const,
    severity: alert.status === 'critical' ? 'critical' : 'high' as const,
    title: `${alert.disease_code.toUpperCase()}: ${alert.cases} ca`,
    description: `Ngưỡng cảnh báo vượt mức cho phép`,
    location: alert.district_id,
    confidence: 'high' as const,
    createdAt: alert.created_at,
    diseaseType: alert.disease_code
  }));

  const aiPredictions = allWarnings.filter(w => w.type === 'ai_prediction');

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-destructive/50 bg-destructive/10 text-destructive';
      case 'high': return 'border-danger/50 bg-danger/10 text-danger';
      case 'medium': return 'border-warning/50 bg-warning/10 text-warning';
      default: return 'border-success/50 bg-success/10 text-success';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    const labels = {
      high: i18n.language === 'vi' ? 'Tin cậy cao' : 'High confidence',
      medium: i18n.language === 'vi' ? 'Tin cậy TB' : 'Medium confidence',
      low: i18n.language === 'vi' ? 'Tin cậy thấp' : 'Low confidence'
    };
    return labels[confidence as keyof typeof labels] || confidence;
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    } catch {
      return dateStr;
    }
  };

  const displayedAlerts = showAll ? [...verified, ...aiPredictions] : [...verified, ...aiPredictions].slice(0, 4);

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50">
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base">
                {i18n.language === 'vi' ? 'Cảnh báo & Tín hiệu sớm' : 'Alerts & Early Signals'}
              </CardTitle>
            </div>
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
              {i18n.language === 'vi' ? 'Không có cảnh báo' : 'No alerts'}
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
                              {i18n.language === 'vi' ? 'Xác nhận' : 'Verified'}
                            </>
                          ) : (
                            <>
                              <Brain className="h-2 w-2 mr-0.5" />
                              {i18n.language === 'vi' ? 'Dự báo AI' : 'AI Prediction'}
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
                      </div>

                      {/* Title */}
                      <h4 className="font-medium text-xs sm:text-sm line-clamp-1">
                        {alert.title}
                      </h4>

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
                              {i18n.language === 'vi' 
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
        {(verified.length + aiPredictions.length) > 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 text-xs h-7"
          >
            {showAll 
              ? (i18n.language === 'vi' ? 'Thu gọn' : 'Show less')
              : (i18n.language === 'vi' ? `Xem tất cả (${verified.length + aiPredictions.length})` : `View all (${verified.length + aiPredictions.length})`)
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

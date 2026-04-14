import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Navigation,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegionalRisk, RiskAlert, RegionalRiskData } from '@/hooks/useRegionalRisk';

interface RegionalRiskMapProps {
  isLoading?: boolean;
}

// Risk level colors
const RISK_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  LOW: { bg: 'bg-success/10', border: 'border-success/50', text: 'text-success', badge: 'bg-success' },
  MEDIUM: { bg: 'bg-warning/10', border: 'border-warning/50', text: 'text-warning', badge: 'bg-warning' },
  HIGH: { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-500', badge: 'bg-orange-500' },
  CRITICAL: { bg: 'bg-destructive/10', border: 'border-destructive/50', text: 'text-destructive', badge: 'bg-destructive animate-pulse' }
};

const RISK_LABELS: Record<string, { en: string; vi: string }> = {
  LOW: { en: 'Low', vi: 'Thấp' },
  MEDIUM: { en: 'Medium', vi: 'Trung bình' },
  HIGH: { en: 'High', vi: 'Cao' },
  CRITICAL: { en: 'Critical', vi: 'Rất cao' }
};

const getTrendIcon = (trend?: string) => {
  if (trend === 'increasing') return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
  if (trend === 'decreasing') return <TrendingDown className="h-3.5 w-3.5 text-success" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

// Extended alert type with cases and trend
interface ExtendedAlert extends RiskAlert {
  cases?: number;
  trend?: string;
}

// Disease Alert Row Component
const DiseaseAlertRow: React.FC<{ alert: ExtendedAlert; isVi: boolean }> = ({ alert, isVi }) => {
  const colors = RISK_COLORS[alert.riskLevel] || RISK_COLORS.LOW;
  const isUrl = alert.source?.startsWith('http');
  
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-medium text-sm">
          {isVi ? alert.diseaseVi : alert.disease}
        </span>
        {isUrl && (
          <a href={alert.source} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <ExternalLink className="h-3 w-3 text-primary hover:text-primary/80" />
          </a>
        )}
        {!isUrl && alert.source && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            {alert.source}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className={cn("text-[10px] px-1.5 py-0 text-white", colors.badge)}>
          {alert.riskLevel}
        </Badge>
        {getTrendIcon(alert.trend)}
        <span className="text-sm font-bold tabular-nums min-w-[50px] text-right">
          {alert.cases ?? Math.round(alert.confidence / 10)} {isVi ? 'ca' : 'cases'}
        </span>
      </div>
    </div>
  );
};

export function RegionalRiskMap({ isLoading: externalLoading }: RegionalRiskMapProps) {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Use the regional risk hook with AI data
  const { 
    data, 
    isLoading: classifierLoading, 
    location,
    refreshWithCurrentLocation 
  } = useRegionalRisk({
    autoFetch: true,
    refreshInterval: 300000 // 5 minutes
  });

  const isLoading = externalLoading || classifierLoading;

  // Loading state
  if (isLoading && !data) {
    return (
      <Card className="rounded-xl border-border/50">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded-lg" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data) {
    return (
      <Card className="rounded-xl border-border/50">
        <CardContent className="p-6 text-center">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {isVi ? 'Không thể lấy dữ liệu khu vực' : 'Unable to get regional data'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refreshWithCurrentLocation(true)} className="mt-3">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {isVi ? 'Thử lại' : 'Try again'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { region, overallRiskLevel, alerts, metadata } = data;
  const riskColors = RISK_COLORS[overallRiskLevel] || RISK_COLORS.LOW;
  const riskLabel = RISK_LABELS[overallRiskLevel]?.[isVi ? 'vi' : 'en'] || overallRiskLevel;

  return (
    <Card className="rounded-xl border-border/50 overflow-hidden">
      {/* Collapsible Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className={cn(
            "pb-3 cursor-pointer hover:bg-accent/50 transition-colors",
            riskColors.bg
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", riskColors.bg, riskColors.border, "border")}>
                  <Navigation className={cn("h-4 w-4", riskColors.text)} />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {region.nameVi}
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : region.name}
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={cn("text-white text-xs", riskColors.badge)}>
                  {riskLabel}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshWithCurrentLocation();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </Button>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-4">
            {/* Section Header */}
            <div className="flex items-center justify-between py-2 border-b border-border/50 mb-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {isVi ? 'Nguy cơ theo bệnh' : 'Risk by Disease'}
              </span>
              {metadata?.fromAI && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/50 text-primary">
                  <Globe className="h-2.5 w-2.5 mr-0.5" />
                  AI
                </Badge>
              )}
            </div>

            {/* Disease Alerts List */}
            {alerts && alerts.length > 0 ? (
              <div className="divide-y divide-border/30">
                {alerts.slice(0, 4).map((alert, idx) => (
                  <DiseaseAlertRow 
                    key={`${alert.disease}-${idx}`} 
                    alert={alert as ExtendedAlert} 
                    isVi={isVi} 
                  />
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground text-sm">
                {isVi ? 'Không có cảnh báo dịch bệnh' : 'No disease alerts'}
              </div>
            )}

            {/* Last updated */}
            {metadata?.timestamp && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                {isVi ? 'Cập nhật: ' : 'Updated: '}
                {new Date(metadata.timestamp).toLocaleTimeString(isVi ? 'vi-VN' : 'en-US')}
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

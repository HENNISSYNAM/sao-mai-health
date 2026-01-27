import React, { useState } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Navigation,
  RefreshCw,
  Shield,
  ChevronRight,
  Users,
  Cloud,
  Thermometer,
  Wind,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegionalRisk } from '@/hooks/useHealthPipeline';
import { useRegionalRisk, RiskAlert, RegionalRiskData } from '@/hooks/useRegionalRisk';

interface RegionalRiskMapProps {
  regionalRisks?: RegionalRisk[];
  userRegion?: RegionalRisk | null;
  isLoading?: boolean;
}

// Risk level color mappings
const RISK_COLORS = {
  LOW: { bg: 'bg-success/10', border: 'border-success', text: 'text-success', badge: 'bg-success' },
  MEDIUM: { bg: 'bg-warning/10', border: 'border-warning', text: 'text-warning', badge: 'bg-warning' },
  HIGH: { bg: 'bg-secondary/10', border: 'border-secondary', text: 'text-secondary', badge: 'bg-secondary' },
  CRITICAL: { bg: 'bg-danger/10', border: 'border-danger', text: 'text-danger', badge: 'bg-danger animate-pulse' }
};

const REGION_ICONS: Record<string, string> = {
  northern: '🏔️',
  central: '🌊',
  southern: '🌴',
  mekong: '🌾',
  urban: '🏙️'
};

const DENSITY_LABELS: Record<string, { en: string; vi: string }> = {
  low: { en: 'Low Density', vi: 'Mật độ thấp' },
  medium: { en: 'Medium Density', vi: 'Mật độ trung bình' },
  high: { en: 'High Density', vi: 'Mật độ cao' },
  very_high: { en: 'Very High Density', vi: 'Mật độ rất cao' }
};

// Legacy risk color map for backward compatibility
const riskColorMap = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
  critical: 'bg-destructive/20 text-destructive border-destructive/30 animate-pulse'
};

const riskBgMap = {
  low: 'from-success/10 to-success/5',
  medium: 'from-warning/10 to-warning/5',
  high: 'from-danger/10 to-danger/5',
  critical: 'from-destructive/10 to-destructive/5'
};

// Risk Alert Card Component
interface RiskAlertCardProps {
  alert: RiskAlert;
  isFirst: boolean;
  isVi: boolean;
}

const RiskAlertCard: React.FC<RiskAlertCardProps> = ({ alert, isFirst, isVi }) => {
  const colors = RISK_COLORS[alert.riskLevel];
  const [expanded, setExpanded] = useState(isFirst);
  
  return (
    <div 
      className={cn(
        "rounded-lg border-2 p-3 transition-all cursor-pointer",
        colors.bg,
        colors.border,
        expanded && "shadow-lg"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn("text-white font-bold text-xs", colors.badge)}>
            {alert.riskLevel}
          </Badge>
          <span className="font-semibold text-sm">
            {isVi ? alert.diseaseVi : alert.disease}
          </span>
          {isVi && (
            <span className="text-xs text-muted-foreground">({alert.disease})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{alert.confidence}%</span>
          <ChevronRight className={cn(
            "h-4 w-4 transition-transform",
            expanded && "rotate-90"
          )} />
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-muted-foreground">
            {isVi ? alert.explanationVi : alert.explanation}
          </p>
          
          {(isVi ? alert.recommendationsVi : alert.recommendations).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                {isVi ? 'Khuyến nghị:' : 'Recommendations:'}
              </p>
              <ul className="space-y-1">
                {(isVi ? alert.recommendationsVi : alert.recommendations).map((rec, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Shield className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <p className="text-[10px] text-muted-foreground/60">
            {isVi ? 'Nguồn' : 'Source'}: {alert.source} • {new Date(alert.timestamp).toLocaleTimeString(isVi ? 'vi-VN' : 'en-US')}
          </p>
        </div>
      )}
    </div>
  );
};

// Enhanced Region Info Component
interface EnhancedRegionInfoProps {
  data: RegionalRiskData;
  isVi: boolean;
}

const EnhancedRegionInfo: React.FC<EnhancedRegionInfoProps> = ({ data, isVi }) => {
  const { region, overallRiskLevel, metadata } = data;
  const colors = RISK_COLORS[overallRiskLevel];
  
  const riskLabels = {
    LOW: isVi ? 'Nguy cơ thấp' : 'Low Risk',
    MEDIUM: isVi ? 'Nguy cơ trung bình' : 'Medium Risk',
    HIGH: isVi ? 'Nguy cơ cao' : 'High Risk',
    CRITICAL: isVi ? 'Nguy cơ nghiêm trọng' : 'Critical Risk'
  };
  
  return (
    <div className={cn(
      "rounded-xl border-2 p-4",
      colors.bg,
      colors.border
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{REGION_ICONS[region.type] || '📍'}</div>
          <div>
            <h3 className="font-bold text-lg">
              {isVi ? region.nameVi : region.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isVi ? region.name : region.nameVi}
            </p>
          </div>
        </div>
        <Badge className={cn("text-white font-bold", colors.badge)}>
          {riskLabels[overallRiskLevel]}
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            {DENSITY_LABELS[region.populationDensity]?.[isVi ? 'vi' : 'en'] || region.populationDensity}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Cloud className="h-4 w-4 text-info" />
          <span className="text-muted-foreground capitalize">
            {region.climate.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-warning" />
          <span className="text-muted-foreground">
            {metadata.alertCount} {isVi ? 'cảnh báo' : 'alerts'}
          </span>
        </div>
      </div>
      
      {(metadata.criticalCount > 0 || metadata.highCount > 0) && (
        <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-background/50">
          <AlertTriangle className={cn("h-4 w-4", colors.text)} />
          <span className="text-xs">
            {metadata.criticalCount > 0 && `${metadata.criticalCount} ${isVi ? 'nghiêm trọng' : 'critical'}`}
            {metadata.criticalCount > 0 && metadata.highCount > 0 && ' • '}
            {metadata.highCount > 0 && `${metadata.highCount} ${isVi ? 'cao' : 'high'}`}
          </span>
        </div>
      )}
    </div>
  );
};

// Environmental Advice Component
interface EnvironmentalAdviceProps {
  advice: RegionalRiskData['environmentalAdvice'];
  isVi: boolean;
}

const EnvironmentalAdvice: React.FC<EnvironmentalAdviceProps> = ({ advice, isVi }) => {
  const items = isVi ? advice.vi : advice.en;
  if (items.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Thermometer className="h-4 w-4 text-warning" />
        {isVi ? 'Cảnh báo môi trường' : 'Environmental Warnings'}
      </h4>
      {items.map((item, idx) => (
        <Alert key={idx} className="border-warning/30 bg-warning/5">
          <Wind className="h-4 w-4 text-warning" />
          <AlertDescription className="text-xs">{item}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

// Trend icon helper
const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up': return <TrendingUp className="h-3 w-3 text-danger" />;
    case 'down': return <TrendingDown className="h-3 w-3 text-success" />;
    default: return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
};

export function RegionalRiskMap({ regionalRisks = [], userRegion, isLoading: externalLoading }: RegionalRiskMapProps) {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  
  // Use the enhanced regional risk hook
  const { 
    data: classifierData, 
    isLoading: classifierLoading, 
    location,
    refreshWithCurrentLocation 
  } = useRegionalRisk({
    autoFetch: true,
    refreshInterval: 300000 // 5 minutes
  });

  const sortedRisks = useMemo(() => {
    return [...regionalRisks].sort((a, b) => b.riskScore - a.riskScore);
  }, [regionalRisks]);

  const isLoading = externalLoading || classifierLoading;

  if (isLoading && !classifierData && regionalRisks.length === 0) {
    return (
      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded-xl" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {isVi ? 'Phân tích Nguy cơ Khu vực' : 'Regional Risk Analysis'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isVi 
                  ? 'Phân loại nguy cơ dịch bệnh theo GPS và môi trường' 
                  : 'GPS & environment-based disease risk classification'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {location && (
              <Badge variant="outline" className="gap-1 border-primary/50 text-primary text-xs">
                <Navigation className="h-3 w-3" />
                {isVi ? 'Đang định vị' : 'Located'}
              </Badge>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={refreshWithCurrentLocation}
              disabled={classifierLoading}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", classifierLoading && "animate-spin")} />
              {isVi ? 'Làm mới' : 'Refresh'}
            </Button>
          </div>
        </div>
        {location && classifierData && (
          <p className="text-xs text-muted-foreground mt-1">
            📍 {location.lat.toFixed(4)}, {location.lon.toFixed(4)} • 
            {isVi ? ' Cập nhật: ' : ' Updated: '}
            {new Date(classifierData.metadata.timestamp).toLocaleTimeString(isVi ? 'vi-VN' : 'en-US')}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* Enhanced AI-powered region analysis */}
        {classifierData && (
          <>
            <EnhancedRegionInfo data={classifierData} isVi={isVi} />
            <EnvironmentalAdvice advice={classifierData.environmentalAdvice} isVi={isVi} />
            
            {/* Disease Alerts from classifier */}
            {classifierData.alerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {isVi ? 'Cảnh báo dịch bệnh' : 'Disease Alerts'} ({classifierData.alerts.length})
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {classifierData.alerts.map((alert, idx) => (
                    <RiskAlertCard 
                      key={`${alert.disease}-${idx}`} 
                      alert={alert} 
                      isFirst={idx === 0}
                      isVi={isVi}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {classifierData.alerts.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-sm">
                  {isVi ? 'Không có cảnh báo dịch bệnh đáng lo ngại' : 'No concerning disease alerts'}
                </p>
                <p className="text-xs">
                  {isVi ? 'Khu vực của bạn hiện tại an toàn' : 'Your area is currently safe'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Legacy user region highlight (if provided) */}
        {userRegion && !classifierData && (
          <div className={cn(
            "p-4 rounded-xl border-2 border-primary/50 bg-gradient-to-br",
            riskBgMap[userRegion.riskLevel]
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span className="font-semibold">{userRegion.regionName}</span>
              </div>
              <Badge className={cn("text-xs font-medium", riskColorMap[userRegion.riskLevel])}>
                {userRegion.riskLevel.toUpperCase()} - {userRegion.riskScore}%
              </Badge>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {userRegion.diseases.map(disease => (
                <div key={disease.disease} className="text-center p-2 rounded-lg bg-background/50">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-sm font-medium">{disease.cases}</span>
                    {getTrendIcon(disease.trend)}
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {disease.disease}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legacy regional risk grid */}
        {sortedRisks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              {isVi ? 'Các khu vực khác' : 'Other Regions'}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedRisks.filter(r => r.regionId !== userRegion?.regionId).slice(0, 6).map((region) => (
                <div
                  key={region.regionId}
                  className={cn(
                    "p-3 rounded-xl border bg-gradient-to-br transition-all hover:shadow-md",
                    riskBgMap[region.riskLevel],
                    region.riskLevel === 'critical' && "border-destructive/50",
                    region.riskLevel === 'high' && "border-danger/50",
                    region.riskLevel === 'medium' && "border-warning/50",
                    region.riskLevel === 'low' && "border-success/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {region.riskLevel === 'critical' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse" />
                      )}
                      <span className="font-medium text-sm">{region.regionName}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] px-1.5 py-0", riskColorMap[region.riskLevel])}
                    >
                      {region.riskScore}%
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {region.diseases.slice(0, 3).map(disease => (
                      <div 
                        key={disease.disease} 
                        className="flex items-center gap-1 text-xs bg-background/50 px-1.5 py-0.5 rounded"
                      >
                        <span className="uppercase font-medium">{disease.disease.slice(0, 3)}</span>
                        <span className="text-muted-foreground">{disease.cases}</span>
                        {getTrendIcon(disease.trend)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success/50" />
            <span>{isVi ? 'Thấp' : 'Low'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-warning/50" />
            <span>{isVi ? 'Trung bình' : 'Medium'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-danger/50" />
            <span>{isVi ? 'Cao' : 'High'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/50 animate-pulse" />
            <span>{isVi ? 'Nghiêm trọng' : 'Critical'}</span>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground/70 flex items-start gap-1.5">
            <Shield className="h-3 w-3 mt-0.5 shrink-0" />
            {isVi 
              ? 'Thông tin mang tính tham khảo, dựa trên dữ liệu dịch tễ và môi trường. Không thay thế tư vấn y khoa.'
              : 'For reference only, based on epidemiological and environmental data. Does not replace medical advice.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default RegionalRiskMap;

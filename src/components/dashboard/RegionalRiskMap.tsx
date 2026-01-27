import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, TrendingUp, TrendingDown, Minus, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegionalRisk } from '@/hooks/useHealthPipeline';

interface RegionalRiskMapProps {
  regionalRisks: RegionalRisk[];
  userRegion?: RegionalRisk | null;
  isLoading?: boolean;
}

export function RegionalRiskMap({ regionalRisks, userRegion, isLoading }: RegionalRiskMapProps) {
  const { t, i18n } = useTranslation();

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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-danger" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-success" />;
      default: return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const sortedRisks = useMemo(() => {
    return [...regionalRisks].sort((a, b) => b.riskScore - a.riskScore);
  }, [regionalRisks]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {i18n.language === 'vi' ? 'Bản đồ Nguy cơ Khu vực' : 'Regional Risk Map'}
              </CardTitle>
              <CardDescription className="text-xs">
                {i18n.language === 'vi' 
                  ? 'Phân loại nguy cơ dịch bệnh theo GPS' 
                  : 'GPS-based disease risk classification'}
              </CardDescription>
            </div>
          </div>
          {userRegion && (
            <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
              <Navigation className="h-3 w-3" />
              {i18n.language === 'vi' ? 'Vị trí của bạn' : 'Your location'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User region highlight */}
        {userRegion && (
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

        {/* Regional risk grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRisks.filter(r => r.regionId !== userRegion?.regionId).map((region) => (
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

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success/50" />
            <span>{i18n.language === 'vi' ? 'Thấp (<25%)' : 'Low (<25%)'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-warning/50" />
            <span>{i18n.language === 'vi' ? 'Trung bình (25-50%)' : 'Medium (25-50%)'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-danger/50" />
            <span>{i18n.language === 'vi' ? 'Cao (50-75%)' : 'High (50-75%)'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/50 animate-pulse" />
            <span>{i18n.language === 'vi' ? 'Nghiêm trọng (>75%)' : 'Critical (>75%)'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

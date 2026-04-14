import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Cloud, Wind, Droplets, Sun, Thermometer, 
  AlertTriangle, RefreshCw, MapPin, Shield,
  Heart, Zap, Eye
} from 'lucide-react';
import { useEnvironmentData, EnvironmentHealthImpact } from '@/hooks/useEnvironmentData';
import type { UserHealthProfile } from '@/types/health';

interface EnvironmentHealthPanelProps {
  profile: UserHealthProfile | null;
  onEnvironmentUpdate?: (data: any, impact: EnvironmentHealthImpact | null) => void;
}

export const EnvironmentHealthPanel: React.FC<EnvironmentHealthPanelProps> = ({ 
  profile,
  onEnvironmentUpdate 
}) => {
  const { data, healthImpact, loading, error, fetchEnvironmentData } = useEnvironmentData();

  // Fetch on mount and when profile changes
  useEffect(() => {
    const userProfile = profile ? {
      chronicConditions: profile.chronicConditions,
      allergies: profile.allergies,
    } : undefined;
    
    fetchEnvironmentData(undefined, userProfile).then(result => {
      if (result && onEnvironmentUpdate) {
        onEnvironmentUpdate(result.environment, result.impact);
      }
    });
  }, [profile?.id]);

  const handleRefresh = async () => {
    const userProfile = profile ? {
      chronicConditions: profile.chronicConditions,
      allergies: profile.allergies,
    } : undefined;
    
    const result = await fetchEnvironmentData(undefined, userProfile);
    if (result && onEnvironmentUpdate) {
      onEnvironmentUpdate(result.environment, result.impact);
    }
  };

  const getRiskColor = (risk: EnvironmentHealthImpact['overallRisk']) => {
    switch (risk) {
      case 'critical': return 'text-danger bg-danger/10 border-danger/30';
      case 'high': return 'text-warning bg-warning/10 border-warning/30';
      case 'medium': return 'text-info bg-info/10 border-info/30';
      default: return 'text-success bg-success/10 border-success/30';
    }
  };

  const getImpactIcon = (impact: 'positive' | 'neutral' | 'negative' | 'dangerous') => {
    switch (impact) {
      case 'positive': return <Heart className="h-4 w-4 text-success" />;
      case 'neutral': return <Eye className="h-4 w-4 text-muted-foreground" />;
      case 'negative': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'dangerous': return <Zap className="h-4 w-4 text-danger" />;
    }
  };

  const getImpactBg = (impact: 'positive' | 'neutral' | 'negative' | 'dangerous') => {
    switch (impact) {
      case 'positive': return 'bg-success/10 border-success/20';
      case 'neutral': return 'bg-muted/50 border-muted';
      case 'negative': return 'bg-warning/10 border-warning/20';
      case 'dangerous': return 'bg-danger/10 border-danger/20';
    }
  };

  if (loading && !data) {
    return (
      <Card className="border-2 border-info/20 bg-gradient-to-br from-info/5 to-transparent">
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 text-info animate-spin mr-2" />
          <span className="text-muted-foreground">Đang lấy dữ liệu môi trường...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="border-2 border-danger/20">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-danger mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-3">
            <RefreshCw className="h-4 w-4 mr-2" />
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-info/20 bg-gradient-to-br from-info/5 via-transparent to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cloud className="h-5 w-5 text-info" />
              Môi trường & Sức khỏe
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {data?.location ? `${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}` : 'Đang định vị...'}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {healthImpact && (
              <Badge variant="outline" className={getRiskColor(healthImpact.overallRisk)}>
                <Shield className="h-3 w-3 mr-1" />
                {healthImpact.overallRisk === 'critical' ? 'Nguy hiểm' :
                 healthImpact.overallRisk === 'high' ? 'Rủi ro cao' :
                 healthImpact.overallRisk === 'medium' ? 'Cần chú ý' : 'An toàn'}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Score Bar */}
        {healthImpact && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mức độ ảnh hưởng</span>
              <span className="font-mono font-bold">{healthImpact.riskScore}/100</span>
            </div>
            <Progress 
              value={healthImpact.riskScore} 
              className={`h-2 ${
                healthImpact.riskScore >= 60 ? '[&>div]:bg-danger' :
                healthImpact.riskScore >= 40 ? '[&>div]:bg-warning' :
                healthImpact.riskScore >= 20 ? '[&>div]:bg-info' : '[&>div]:bg-success'
              }`}
            />
          </div>
        )}

        {/* Environment Factors Grid */}
        <div className="grid grid-cols-2 gap-3">
          {healthImpact?.factors.map((factor, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-lg border ${getImpactBg(factor.impact)} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{factor.name}</span>
                {getImpactIcon(factor.impact)}
              </div>
              <div className="text-lg font-bold">{factor.value}</div>
              <div className="text-xs text-muted-foreground">{factor.description}</div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {healthImpact?.recommendations && healthImpact.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Khuyến nghị
            </h4>
            <div className="space-y-1.5">
              {healthImpact.recommendations.slice(0, 3).map((rec, idx) => (
                <div 
                  key={idx}
                  className="text-xs p-2 rounded bg-warning/10 border border-warning/20 text-foreground"
                >
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Sources */}
        {data?.sources && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Nguồn: {data.sources.weather}, {data.sources.airQuality}</span>
            <span>{data.fetchTimeMs}ms</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

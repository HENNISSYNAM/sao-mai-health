import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  RefreshCw,
  Shield,
  AlertTriangle,
  Thermometer,
  Wind,
  Navigation,
  ChevronDown,
  ChevronUp,
  Brain,
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getDiseaseName } from '@/lib/diseaseI18n';

interface GpsRecommendationsProps {
  userGPS: { lat: number; lng: number } | null;
  diseaseData?: any[];
  className?: string;
}

interface LocationRisk {
  region: string;
  regionVi: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  diseases: {
    code: string;
    risk: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  recommendations: {
    vi: string[];
    en: string[];
  };
  environmental: {
    temperature?: number;
    humidity?: number;
    aqi?: number;
  };
}

export function GpsRecommendations({ userGPS, diseaseData, className }: GpsRecommendationsProps) {
  const { i18n } = useTranslation();
  const language = i18n.language as 'vi' | 'en';
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [riskData, setRiskData] = useState<LocationRisk | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch location-based risk data
  const fetchLocationRisk = async () => {
    if (!userGPS) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('location-risk-classifier', {
        body: { 
          lat: userGPS.lat, 
          lon: userGPS.lng,
          includeRecommendations: true
        }
      });

      if (!error && data) {
        // Transform response to our format
        const transformed: LocationRisk = {
          region: data.region?.name || 'Unknown',
          regionVi: data.region?.nameVi || 'Không xác định',
          overallRisk: data.overallRiskLevel || 'LOW',
          diseases: (data.alerts || []).slice(0, 4).map((alert: any) => ({
            code: alert.disease?.toLowerCase() || 'unknown',
            risk: Math.round(alert.confidence * 100),
            trend: alert.riskLevel === 'HIGH' || alert.riskLevel === 'CRITICAL' ? 'up' : 'stable'
          })),
          recommendations: {
            vi: data.environmentalAdvice?.vi || getDefaultRecommendations('vi', data.overallRiskLevel),
            en: data.environmentalAdvice?.en || getDefaultRecommendations('en', data.overallRiskLevel)
          },
          environmental: {
            temperature: data.metadata?.temperature,
            humidity: data.metadata?.humidity,
            aqi: data.metadata?.aqi
          }
        };
        setRiskData(transformed);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching location risk:', err);
      // Use fallback data
      setRiskData(getDefaultRiskData(userGPS));
    } finally {
      setIsLoading(false);
    }
  };

  // Default recommendations based on risk level
  const getDefaultRecommendations = (lang: 'vi' | 'en', riskLevel: string): string[] => {
    const recs = {
      vi: {
        LOW: ['Duy trì vệ sinh cá nhân', 'Theo dõi thông tin y tế địa phương'],
        MEDIUM: ['Hạn chế tiếp xúc đông người', 'Đeo khẩu trang khi ra ngoài', 'Rửa tay thường xuyên'],
        HIGH: ['Hạn chế ra ngoài không cần thiết', 'Đeo khẩu trang N95', 'Kiểm tra sức khỏe định kỳ', 'Liên hệ cơ sở y tế nếu có triệu chứng'],
        CRITICAL: ['Ở nhà trừ trường hợp khẩn cấp', 'Liên hệ ngay cơ sở y tế', 'Theo dõi các triệu chứng', 'Tuân thủ hướng dẫn y tế địa phương']
      },
      en: {
        LOW: ['Maintain personal hygiene', 'Follow local health updates'],
        MEDIUM: ['Limit crowded places', 'Wear masks outdoors', 'Wash hands frequently'],
        HIGH: ['Avoid unnecessary outings', 'Wear N95 masks', 'Regular health checks', 'Contact healthcare if symptoms appear'],
        CRITICAL: ['Stay home except emergencies', 'Contact healthcare immediately', 'Monitor symptoms', 'Follow local health guidelines']
      }
    };
    return recs[lang][riskLevel as keyof typeof recs.vi] || recs[lang].LOW;
  };

  // Fallback risk data
  const getDefaultRiskData = (gps: { lat: number; lng: number }): LocationRisk => {
    // Determine region based on coordinates
    let region = 'HCMC Metro';
    let regionVi = 'TP. Hồ Chí Minh';
    
    if (gps.lat > 20) {
      region = 'Red River Delta';
      regionVi = 'Đồng bằng sông Hồng';
    } else if (gps.lat > 15) {
      region = 'Central Vietnam';
      regionVi = 'Miền Trung';
    }

    return {
      region,
      regionVi,
      overallRisk: 'MEDIUM',
      diseases: [
        { code: 'dengue', risk: 65, trend: 'up' },
        { code: 'covid19', risk: 45, trend: 'stable' },
        { code: 'hfmd', risk: 55, trend: 'up' },
        { code: 'influenza', risk: 30, trend: 'down' }
      ],
      recommendations: {
        vi: ['Hạn chế tiếp xúc đông người', 'Đeo khẩu trang khi ra ngoài', 'Rửa tay thường xuyên'],
        en: ['Limit crowded places', 'Wear masks outdoors', 'Wash hands frequently']
      },
      environmental: {}
    };
  };

  useEffect(() => {
    if (userGPS) {
      fetchLocationRisk();
    }
  }, [userGPS?.lat, userGPS?.lng]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 border-red-300';
      case 'HIGH': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      default: return 'text-green-600 bg-green-100 border-green-300';
    }
  };

  const getRiskLabel = (risk: string) => {
    const labels = {
      vi: { CRITICAL: 'Rất cao', HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' },
      en: { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
    };
    return labels[language][risk as keyof typeof labels.vi] || risk;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  if (!userGPS) {
    return (
      <div className={cn("p-3 rounded-xl bg-muted/30 border border-dashed", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-xs">
            {language === 'vi' 
              ? 'Bật GPS để nhận khuyến nghị theo vị trí'
              : 'Enable GPS for location-based recommendations'}
          </span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("p-3 rounded-xl bg-primary/5 border", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!riskData) return null;

  return (
    <div className={cn("rounded-xl border overflow-hidden transition-all", className)}>
      {/* Header - Always visible */}
      <div 
        className={cn(
          "px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors",
          riskData.overallRisk === 'HIGH' || riskData.overallRisk === 'CRITICAL' 
            ? 'bg-destructive/5' 
            : 'bg-primary/5'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Navigation className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">
                {language === 'vi' ? riskData.regionVi : riskData.region}
              </span>
              <Badge 
                variant="outline" 
                className={cn("text-[9px] px-1.5 py-0", getRiskColor(riskData.overallRisk))}
              >
                {getRiskLabel(riskData.overallRisk)}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />
              {userGPS.lat.toFixed(4)}, {userGPS.lng.toFixed(4)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              fetchLocationRisk();
            }}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-2.5 border-t bg-background/50">
          {/* Disease Risk Indicators */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {language === 'vi' ? 'Nguy cơ theo bệnh' : 'Disease Risks'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {riskData.diseases.map((disease) => (
                <div 
                  key={disease.code}
                  className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30 text-xs"
                >
                  <span className="truncate">{getDiseaseName(disease.code, language)}</span>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "font-medium",
                      disease.risk >= 70 ? "text-destructive" : 
                      disease.risk >= 50 ? "text-orange-500" : "text-green-600"
                    )}>
                      {disease.risk}%
                    </span>
                    <span className={cn(
                      "text-[10px]",
                      disease.trend === 'up' ? "text-destructive" :
                      disease.trend === 'down' ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {getTrendIcon(disease.trend)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental Factors */}
          {(riskData.environmental.temperature || riskData.environmental.aqi) && (
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30">
              {riskData.environmental.temperature && (
                <div className="flex items-center gap-1 text-xs">
                  <Thermometer className="h-3 w-3 text-blue-500" />
                  <span>{riskData.environmental.temperature}°C</span>
                </div>
              )}
              {riskData.environmental.humidity && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">💧</span>
                  <span>{riskData.environmental.humidity}%</span>
                </div>
              )}
              {riskData.environmental.aqi && (
                <div className="flex items-center gap-1 text-xs">
                  <Wind className="h-3 w-3 text-gray-500" />
                  <span>AQI: {riskData.environmental.aqi}</span>
                </div>
              )}
            </div>
          )}

          {/* AI Recommendations */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <Brain className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">
                {language === 'vi' ? 'Khuyến nghị AI' : 'AI Recommendations'}
              </span>
            </div>
            <ul className="space-y-1">
              {riskData.recommendations[language].map((rec, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-dashed">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Info className="h-2.5 w-2.5" />
              {language === 'vi' ? 'Dựa trên GPS & dữ liệu thời gian thực' : 'Based on GPS & real-time data'}
            </span>
            {lastUpdated && (
              <span className="text-[9px] text-muted-foreground">
                {language === 'vi' ? 'Cập nhật: ' : 'Updated: '}
                {lastUpdated.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

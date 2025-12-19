import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Wind,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Sparkles,
  RefreshCw,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import type { RiskAssessment, EnvironmentData, AgeGroup } from '@/hooks/useStrokeRiskEngine';

interface RiskOverlayProps {
  riskAssessment: RiskAssessment;
  environment: EnvironmentData;
  pressureChange1h: number | null;
  isVisible: boolean;
  ageGroup?: AgeGroup;
  gps?: { lat: number; lon: number } | null;
  devicePressure?: number | null;
}

interface AIRecommendations {
  summary?: string;
  warnings?: string[];
  recommendations?: {
    do: string[];
    avoid: string[];
  };
  healthTip?: string;
  urgency?: 'low' | 'medium' | 'high';
  text?: string;
}

const RiskOverlay: React.FC<RiskOverlayProps> = ({
  riskAssessment,
  environment,
  pressureChange1h,
  isVisible,
  ageGroup = '36-55',
  gps,
  devicePressure
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendations | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const { risk_score, risk_level, primary_factors, recommendations } = riskAssessment;

  // Fetch AI recommendations
  const fetchAIRecommendations = useCallback(async () => {
    if (!gps) return;
    
    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('stroke-health-ai', {
        body: {
          context: {
            temperature: environment.temperature,
            humidity: environment.humidity,
            pressure: environment.pressure,
            pressureChange1h,
            aqi: environment.aqi,
            pm25: environment.pm25,
            uvIndex: environment.uvIndex,
            ageGroup,
            riskScore: risk_score,
            riskLevel: risk_level,
            primaryFactors: primary_factors,
            lat: gps.lat,
            lon: gps.lon,
            devicePressure
          },
          type: 'recommendations'
        }
      });

      if (error) throw error;
      setAiRecommendations(data);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setIsLoadingAI(false);
    }
  }, [environment, pressureChange1h, ageGroup, risk_score, risk_level, primary_factors, gps, devicePressure]);

  // Fetch AI recommendations when expanded
  useEffect(() => {
    if (isExpanded && gps && !aiRecommendations) {
      fetchAIRecommendations();
    }
  }, [isExpanded, gps]);

  if (!isVisible) return null;

  const getRiskStyles = () => {
    switch (risk_level) {
      case 'HIGH':
        return {
          bg: 'bg-red-500',
          bgLight: 'bg-red-500/20',
          border: 'border-red-500/50',
          icon: ShieldAlert,
          label: 'Cao',
          color: 'text-red-500',
          pulse: 'animate-pulse'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-500/20',
          border: 'border-amber-500/50',
          icon: AlertTriangle,
          label: 'TB',
          color: 'text-amber-500',
          pulse: ''
        };
      default:
        return {
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-500/20',
          border: 'border-emerald-500/50',
          icon: ShieldCheck,
          label: 'Thấp',
          color: 'text-emerald-500',
          pulse: ''
        };
    }
  };

  const styles = getRiskStyles();
  const Icon = styles.icon;
  const displayRecommendations = aiRecommendations?.recommendations || recommendations;
  const displayWarnings = aiRecommendations?.warnings || [];

  return (
    <>
      {/* Always show floating badge with risk score */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "fixed bottom-32 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95",
            styles.bg,
            risk_level === 'HIGH' && styles.pulse
          )}
        >
          <Icon className="h-4 w-4 text-white" />
          <span className="text-white font-bold">{risk_score}</span>
          <ChevronUp className="h-3 w-3 text-white/70" />
        </button>
      )}

      {/* Expanded Panel - Only shows recommendations/warnings */}
      {isExpanded && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-80 z-30 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
            {/* Header - Collapsible */}
            <button
              onClick={() => setIsExpanded(false)}
              className={cn("w-full px-4 py-3 flex items-center justify-between", styles.bg)}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-white" />
                <span className="text-white font-semibold text-sm">Cảnh báo sức khỏe</span>
              </div>
              <ChevronDown className="h-4 w-4 text-white/70" />
            </button>

            {/* Primary Factors */}
            {primary_factors.length > 0 && primary_factors[0] !== 'Điều kiện bình thường' && (
              <div className="px-4 py-2 border-b border-border/30">
                <div className="flex flex-wrap gap-1">
                  {primary_factors.map((factor, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-border/50 bg-muted/30">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI Warnings */}
            {displayWarnings.length > 0 && (
              <div className="px-4 py-2 bg-red-500/10 border-b border-border/30">
                {displayWarnings.slice(0, 3).map((warning, i) => (
                  <div key={i} className="text-[11px] text-red-400 flex items-start gap-1.5 py-0.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations - Compact */}
            <div className="px-4 py-2 border-b border-border/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-500">NÊN LÀM</span>
                  </div>
                  <ul className="space-y-0.5">
                    {displayRecommendations.do.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-[10px] font-semibold text-red-500">TRÁNH</span>
                  </div>
                  <ul className="space-y-0.5">
                    {displayRecommendations.avoid.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* AI Health Tip */}
            {aiRecommendations?.healthTip && (
              <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
                <div className="flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{aiRecommendations.healthTip}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 py-2 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-[10px] h-7"
                onClick={fetchAIRecommendations}
                disabled={isLoadingAI}
              >
                {isLoadingAI ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                AI Tư vấn
              </Button>
              {/* Direct call 115 */}
              <a 
                href="tel:115"
                className="flex-1 inline-flex items-center justify-center text-[10px] h-7 px-3 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Phone className="h-3 w-3 mr-1" />
                Gọi 115
              </a>
            </div>

            {/* Footer note */}
            <div className="px-4 py-1.5 bg-muted/30">
              <p className="text-[9px] text-muted-foreground text-center">
                ⚠️ Cảnh báo sớm, không phải chẩn đoán y tế
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RiskOverlay;

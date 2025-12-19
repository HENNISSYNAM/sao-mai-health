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
  Hospital,
  X,
  ChevronUp,
  ChevronDown,
  Activity
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
  const [showEmergency, setShowEmergency] = useState(false);

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
      {/* Collapsed Badge - Bottom Right */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "fixed bottom-20 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95",
            styles.bg,
            styles.pulse
          )}
        >
          <Icon className="h-4 w-4 text-white" />
          <span className="text-white font-bold">{risk_score}</span>
          <ChevronUp className="h-3 w-3 text-white/70" />
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-30 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
            {/* Header - Collapsible */}
            <button
              onClick={() => setIsExpanded(false)}
              className={cn("w-full px-4 py-3 flex items-center justify-between", styles.bg)}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold text-sm">Nguy cơ {styles.label.toLowerCase()}</div>
                  <div className="text-white/70 text-xs">Nhấn để thu gọn</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{risk_score}</span>
                <ChevronDown className="h-4 w-4 text-white/70" />
              </div>
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

            {/* PM2.5 & Pressure */}
            {(environment.pm25 !== null || pressureChange1h !== null) && (
              <div className="px-4 py-2 border-b border-border/30 flex items-center gap-4">
                {environment.pm25 !== null && (
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">PM2.5</div>
                      <div className="text-lg font-bold">{environment.pm25}</div>
                    </div>
                  </div>
                )}
                {pressureChange1h !== null && (
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Áp suất</div>
                      <div className="flex items-center gap-1 font-medium">
                        {environment.pressure?.toFixed(0) || '--'}
                        {pressureChange1h < 0 ? (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        ) : (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Warnings */}
            {displayWarnings.length > 0 && (
              <div className="px-4 py-2 bg-red-500/10 border-b border-border/30">
                {displayWarnings.slice(0, 2).map((warning, i) => (
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
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-[10px] h-7 text-red-500 border-red-500/30 hover:bg-red-500/10"
                onClick={() => setShowEmergency(true)}
              >
                <Hospital className="h-3 w-3 mr-1" />
                Cấp cứu
              </Button>
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

      {/* Emergency Modal */}
      {showEmergency && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowEmergency(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-4 w-full max-w-xs animate-in zoom-in-95 duration-200">
            <button 
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted"
              onClick={() => setShowEmergency(false)}
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Hospital className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="font-bold text-lg">Cấp cứu</h3>
            </div>

            <div className="space-y-2">
              <a 
                href="tel:115" 
                className="flex items-center gap-3 p-3 bg-red-500 text-white rounded-xl"
              >
                <Phone className="h-5 w-5" />
                <div>
                  <div className="font-bold">115</div>
                  <div className="text-xs text-white/80">Cấp cứu quốc gia</div>
                </div>
              </a>

              <div className="pt-2 border-t border-border">
                <div className="text-xs font-medium mb-2">Dấu hiệu FAST</div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="bg-muted/50 p-1.5 rounded"><b className="text-red-500">F</b>ace - Méo mặt</div>
                  <div className="bg-muted/50 p-1.5 rounded"><b className="text-red-500">A</b>rm - Yếu tay</div>
                  <div className="bg-muted/50 p-1.5 rounded"><b className="text-red-500">S</b>peech - Nói khó</div>
                  <div className="bg-muted/50 p-1.5 rounded"><b className="text-red-500">T</b>ime - Gọi 115</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RiskOverlay;

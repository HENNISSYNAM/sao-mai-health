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
  MapPin,
  Sparkles,
  RefreshCw,
  Hospital,
  X
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

  // Fetch AI recommendations when visible and data changes significantly
  useEffect(() => {
    if (isVisible && gps) {
      const timer = setTimeout(fetchAIRecommendations, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, risk_level]);

  if (!isVisible) return null;

  const getRiskStyles = () => {
    switch (risk_level) {
      case 'HIGH':
        return {
          bg: 'bg-red-500',
          bgLight: 'bg-red-500/20',
          border: 'border-red-500',
          icon: ShieldAlert,
          label: 'Nguy cơ cao',
          sublabel: 'Chỉ số nguy cơ môi trường',
          color: 'text-red-500'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-500/20',
          border: 'border-amber-500',
          icon: AlertTriangle,
          label: 'Nguy cơ trung bình',
          sublabel: 'Chỉ số nguy cơ môi trường',
          color: 'text-amber-500'
        };
      default:
        return {
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-500/20',
          border: 'border-emerald-500',
          icon: ShieldCheck,
          label: 'Nguy cơ thấp',
          sublabel: 'Chỉ số nguy cơ môi trường',
          color: 'text-emerald-500'
        };
    }
  };

  const styles = getRiskStyles();
  const Icon = styles.icon;

  // Use AI recommendations if available, otherwise use calculated ones
  const displayRecommendations = aiRecommendations?.recommendations || recommendations;
  const displayWarnings = aiRecommendations?.warnings || [];

  return (
    <div className="absolute bottom-4 right-4 w-80 z-30 animate-in slide-in-from-right-4 duration-500">
      {/* Main Risk Card - Windy Style */}
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
        {/* Risk Score Header */}
        <div className={cn("px-4 py-3 flex items-center justify-between", styles.bg)}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">{styles.label}</div>
              <div className="text-white/70 text-xs">{styles.sublabel}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{risk_score}</div>
            <div className="text-white/70 text-xs">/100</div>
          </div>
        </div>

        {/* Primary Factors */}
        <div className="px-4 py-3 border-b border-border/30">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Yếu tố chính</div>
          {primary_factors.length > 0 && primary_factors[0] !== 'Điều kiện bình thường' ? (
            <div className="flex flex-wrap gap-1.5">
              {primary_factors.map((factor, i) => (
                <Badge key={i} variant="outline" className="text-xs border-border/50 bg-muted/30">
                  {factor}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Không có yếu tố nguy cơ đáng kể</div>
          )}
        </div>

        {/* PM2.5 Highlight - like Windy */}
        {environment.pm25 !== null && (
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-muted/50">
              <Wind className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">PM2.5</div>
              <div className="text-2xl font-bold">{environment.pm25}</div>
            </div>
            {pressureChange1h !== null && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  Áp suất
                </div>
                <div className="flex items-center gap-1 text-sm font-medium">
                  {environment.pressure?.toFixed(0) || '--'}
                  {pressureChange1h < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Warnings */}
        {displayWarnings.length > 0 && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-border/30">
            {displayWarnings.map((warning, i) => (
              <div key={i} className="text-xs text-red-400 flex items-start gap-2 py-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {warning}
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Do */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-500 uppercase">Nên làm</span>
              </div>
              <ul className="space-y-1">
                {displayRecommendations.do.slice(0, 3).map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Avoid */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-500 uppercase">Tránh</span>
              </div>
              <ul className="space-y-1">
                {displayRecommendations.avoid.slice(0, 3).map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* AI Health Tip */}
        {aiRecommendations?.healthTip && (
          <div className="px-4 py-2 bg-primary/5 border-t border-border/30">
            <div className="flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">{aiRecommendations.healthTip}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-4 py-3 border-t border-border/30 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs h-8"
            onClick={fetchAIRecommendations}
            disabled={isLoadingAI}
          >
            {isLoadingAI ? (
              <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1.5" />
            )}
            AI Tư vấn
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs h-8 text-red-500 border-red-500/30 hover:bg-red-500/10"
            onClick={() => setShowEmergency(true)}
          >
            <Hospital className="h-3 w-3 mr-1.5" />
            Cấp cứu
          </Button>
        </div>

        {/* Footer note */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" />
            Đây là cảnh báo sớm dựa trên yếu tố môi trường, không phải chẩn đoán y tế
          </p>
        </div>
      </div>

      {/* Emergency Modal */}
      {showEmergency && (
        <div className="absolute inset-0 -top-40 -left-4 -right-4 -bottom-4 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowEmergency(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-4 w-full max-w-xs mx-4 animate-in zoom-in-95 duration-200">
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
              <p className="text-xs text-muted-foreground">Liên hệ ngay khi có dấu hiệu bất thường</p>
            </div>

            <div className="space-y-3">
              <a 
                href="tel:115" 
                className="flex items-center gap-3 p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                <Phone className="h-5 w-5" />
                <div>
                  <div className="font-bold">115</div>
                  <div className="text-xs text-white/80">Cấp cứu quốc gia</div>
                </div>
              </a>
              
              <a 
                href="tel:1900599920" 
                className="flex items-center gap-3 p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
              >
                <Hospital className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">1900 599 920</div>
                  <div className="text-xs text-muted-foreground">Bệnh viện Bạch Mai</div>
                </div>
              </a>

              <div className="pt-2 border-t border-border">
                <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Dấu hiệu FAST của đột quỵ
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="bg-muted/50 p-2 rounded-lg">
                    <span className="font-bold text-red-500">F</span>ace - Méo mặt
                  </div>
                  <div className="bg-muted/50 p-2 rounded-lg">
                    <span className="font-bold text-red-500">A</span>rm - Yếu tay
                  </div>
                  <div className="bg-muted/50 p-2 rounded-lg">
                    <span className="font-bold text-red-500">S</span>peech - Nói khó
                  </div>
                  <div className="bg-muted/50 p-2 rounded-lg">
                    <span className="font-bold text-red-500">T</span>ime - Gọi 115
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskOverlay;

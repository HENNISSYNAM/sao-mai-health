import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Droplets,
  Wind,
  ThermometerSun,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Activity
} from 'lucide-react';
import type { RiskAssessment, EnvironmentData } from '@/hooks/useStrokeRiskEngine';

interface RiskOverlayProps {
  riskAssessment: RiskAssessment;
  environment: EnvironmentData;
  pressureChange1h: number | null;
  isVisible: boolean;
}

const RiskOverlay: React.FC<RiskOverlayProps> = ({
  riskAssessment,
  environment,
  pressureChange1h,
  isVisible
}) => {
  if (!isVisible) return null;

  const { risk_score, risk_level, primary_factors, recommendations } = riskAssessment;

  const getRiskStyles = () => {
    switch (risk_level) {
      case 'HIGH':
        return {
          bg: 'bg-danger/90',
          border: 'border-danger',
          icon: ShieldAlert,
          label: 'Nguy cơ cao',
          color: 'text-danger'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-warning/90',
          border: 'border-warning',
          icon: AlertTriangle,
          label: 'Nguy cơ trung bình',
          color: 'text-warning'
        };
      default:
        return {
          bg: 'bg-success/90',
          border: 'border-success',
          icon: ShieldCheck,
          label: 'Nguy cơ thấp',
          color: 'text-success'
        };
    }
  };

  const styles = getRiskStyles();
  const Icon = styles.icon;

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 z-20 animate-in slide-in-from-bottom-4 duration-500">
      {/* Main Risk Card */}
      <div className={cn(
        "bg-card/95 backdrop-blur-xl rounded-2xl border-2 shadow-2xl overflow-hidden",
        styles.border
      )}>
        {/* Risk Score Header */}
        <div className={cn("px-4 py-3 flex items-center justify-between", styles.bg)}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold">{styles.label}</div>
              <div className="text-white/80 text-xs">Chỉ số nguy cơ môi trường</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{risk_score}</div>
            <div className="text-white/80 text-xs">/100</div>
          </div>
        </div>

        {/* Risk Factors */}
        {primary_factors.length > 0 && primary_factors[0] !== 'Điều kiện bình thường' && (
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Yếu tố chính</div>
            <div className="flex flex-wrap gap-2">
              {primary_factors.map((factor, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="px-4 py-3 grid grid-cols-4 gap-2 border-b border-border/50">
          {environment.temperature !== null && (
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <ThermometerSun className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-xs font-semibold">{environment.temperature?.toFixed(0)}°</div>
            </div>
          )}
          {environment.humidity !== null && (
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <Droplets className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-xs font-semibold">{environment.humidity?.toFixed(0)}%</div>
            </div>
          )}
          {environment.aqi !== null && (
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <Wind className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-xs font-semibold">{environment.aqi}</div>
            </div>
          )}
          {environment.pressure !== null && (
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <Gauge className="h-4 w-4 mx-auto mb-1 text-teal-500" />
              <div className="flex items-center justify-center gap-0.5">
                <span className="text-xs font-semibold">{environment.pressure?.toFixed(0)}</span>
                {pressureChange1h !== null && (
                  pressureChange1h < 0 
                    ? <TrendingDown className="h-3 w-3 text-danger" />
                    : <TrendingUp className="h-3 w-3 text-success" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Do */}
            {recommendations.do.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs font-semibold text-success uppercase">Nên làm</span>
                </div>
                <ul className="space-y-1">
                  {recommendations.do.slice(0, 3).map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-success mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Avoid */}
            {recommendations.avoid.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                  <span className="text-xs font-semibold text-danger uppercase">Tránh</span>
                </div>
                <ul className="space-y-1">
                  {recommendations.avoid.slice(0, 3).map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-danger mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground text-center">
            ⚠️ Đây là cảnh báo sớm dựa trên yếu tố môi trường, không phải chẩn đoán y tế
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiskOverlay;

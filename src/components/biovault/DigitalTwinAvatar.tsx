import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, Brain, Activity, Droplets, 
  AlertTriangle, Dna, Shield,
  Footprints, Hand, Scale, Eye,
  TrendingUp, CheckCircle2, Zap
} from 'lucide-react';
import type { UserHealthProfile, ExtractedMetric } from '@/types/health';
import type { DeviceSensorsState } from '@/hooks/useDeviceSensors';

interface DigitalTwinAvatarProps {
  profile: UserHealthProfile | null;
  sensorData?: DeviceSensorsState | null;
}

interface FloatingMetric {
  id: string;
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  side: 'left' | 'right';
  top: string; // CSS top value
}

interface RiskItem {
  id: string;
  icon: React.ElementType;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

// Floating biometric card
const FloatingBioCard: React.FC<{ metric: FloatingMetric; index: number }> = ({ metric, index }) => {
  const borderColor = {
    normal: 'border-emerald-500/25',
    warning: 'border-amber-400/35',
    critical: 'border-red-400/40',
  };
  const glowShadow = {
    normal: '',
    warning: 'shadow-[0_0_10px_rgba(251,191,36,0.1)]',
    critical: 'shadow-[0_0_10px_rgba(239,68,68,0.15)]',
  };

  return (
    <div
      className={`
        absolute z-20 animate-fade-in
        ${metric.side === 'left' ? 'left-0 sm:left-2' : 'right-0 sm:right-2'}
      `}
      style={{
        top: metric.top,
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className={`
        rounded-lg border px-2.5 py-1.5 backdrop-blur-md
        bg-[hsl(210,50%,8%)]/85
        ${borderColor[metric.status]} ${glowShadow[metric.status]}
        transition-all duration-300 hover:scale-105 cursor-default
      `}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <metric.icon className="h-3 w-3 text-cyan-400/80" />
          <span className="text-[9px] text-cyan-300/50 uppercase tracking-wider font-semibold">{metric.label}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-base font-bold text-white tabular-nums leading-none">
            {typeof metric.value === 'number' ? Math.round(metric.value) : metric.value}
          </span>
          <span className="text-[9px] text-cyan-300/40">{metric.unit}</span>
        </div>
      </div>
    </div>
  );
};

export const DigitalTwinAvatar: React.FC<DigitalTwinAvatarProps> = ({ profile, sensorData }) => {
  const { t, i18n } = useTranslation();
  const [scanY, setScanY] = useState(0);
  const isVi = i18n.language === 'vi';

  // Scanning line animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanY(v => (v + 0.4) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Extract latest vitals
  const vitals = useMemo(() => {
    if (!profile?.extractedMetrics?.length) return null;
    const latest = (name: string) =>
      profile.extractedMetrics.filter(m => m.name.toLowerCase().includes(name)).sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      hr: latest('nhịp tim') || latest('heart'),
      spo2: latest('spo2') || latest('oxygen'),
      stress: latest('stress'),
      hydration: latest('ẩm') || latest('hydration'),
      bp: latest('huyết áp') || latest('blood pressure'),
    };
  }, [profile?.extractedMetrics]);

  // Build floating metrics
  const floatingMetrics: FloatingMetric[] = useMemo(() => {
    const metrics: FloatingMetric[] = [];

    if (vitals?.hr) {
      metrics.push({ id: 'hr', icon: Heart, label: isVi ? 'Nhịp tim' : 'Heart', value: vitals.hr.value, unit: 'bpm', status: vitals.hr.riskLevel, side: 'left', top: '18%' });
    }
    if (vitals?.spo2) {
      metrics.push({ id: 'spo2', icon: Activity, label: 'SpO2', value: vitals.spo2.value, unit: '%', status: vitals.spo2.riskLevel, side: 'left', top: '38%' });
    }
    if (vitals?.bp) {
      metrics.push({ id: 'bp', icon: Heart, label: isVi ? 'Huyết áp' : 'BP', value: vitals.bp.value, unit: 'mmHg', status: vitals.bp.riskLevel, side: 'right', top: '22%' });
    }
    if (vitals?.stress) {
      metrics.push({ id: 'stress', icon: Brain, label: 'Stress', value: vitals.stress.value, unit: '%', status: vitals.stress.riskLevel, side: 'right', top: '10%' });
    }
    if (sensorData) {
      metrics.push({ id: 'steps', icon: Footprints, label: isVi ? 'Bước' : 'Steps', value: sensorData.health.steps, unit: '', status: 'normal', side: 'left', top: '62%' });
      metrics.push({ id: 'balance', icon: Scale, label: isVi ? 'Thăng bằng' : 'Balance', value: Math.round(sensorData.health.balanceScore), unit: '/100', status: sensorData.health.balanceScore < 30 ? 'critical' : sensorData.health.balanceScore < 60 ? 'warning' : 'normal', side: 'right', top: '55%' });
      if (sensorData.health.tremorDetected) {
        metrics.push({ id: 'tremor', icon: Hand, label: isVi ? 'Run tay' : 'Tremor', value: Math.round(sensorData.health.tremorIntensity * 100), unit: '%', status: 'warning', side: 'left', top: '48%' });
      }
    }
    if (vitals?.hydration) {
      metrics.push({ id: 'hydration', icon: Droplets, label: isVi ? 'Nước' : 'Hydration', value: vitals.hydration.value, unit: '%', status: vitals.hydration.riskLevel, side: 'right', top: '42%' });
    }
    return metrics;
  }, [vitals, sensorData, isVi]);

  // Health score
  const healthScore = useMemo(() => {
    if (!profile) return 0;
    let score = 100;
    score -= (profile.chronicConditions?.length || 0) * 10;
    if (!profile.bloodType) score -= 5;
    if ((profile.documents?.length || 0) === 0) score -= 10;
    if (sensorData) {
      if (sensorData.health.tremorDetected) score -= 10;
      if (sensorData.health.fallDetected) score -= 20;
      if (sensorData.health.balanceScore < 60) score -= 10;
    }
    return Math.max(10, Math.min(100, score));
  }, [profile, sensorData]);

  // Risk items
  const riskItems: RiskItem[] = useMemo(() => {
    const items: RiskItem[] = [];
    if (profile?.chronicConditions?.some(c => c.toLowerCase().includes('huyết áp') || c.toLowerCase().includes('hypertension'))) {
      items.push({ id: 'stroke', icon: Brain, severity: 'high', title: isVi ? 'Nguy cơ đột quỵ cao' : 'High stroke risk', description: isVi ? 'Liên quan tăng huyết áp' : 'Hypertension related' });
    }
    if (sensorData?.health.tremorDetected) {
      items.push({ id: 'tremor', icon: Hand, severity: 'medium', title: isVi ? 'Phát hiện run tay' : 'Tremor detected', description: isVi ? 'Cần theo dõi thần kinh' : 'Neurological monitoring' });
    }
    if (sensorData?.health.fallDetected) {
      items.push({ id: 'fall', icon: AlertTriangle, severity: 'high', title: isVi ? 'Phát hiện té ngã' : 'Fall detected', description: isVi ? 'Kiểm tra ngay' : 'Immediate check needed' });
    }
    if (sensorData && sensorData.health.balanceScore < 60) {
      items.push({ id: 'balance', icon: Scale, severity: sensorData.health.balanceScore < 30 ? 'high' : 'medium', title: isVi ? 'Thăng bằng kém' : 'Poor balance', description: isVi ? 'Nguy cơ té ngã tăng' : 'Increased fall risk' });
    }
    if (items.length === 0) {
      items.push({ id: 'ok', icon: CheckCircle2, severity: 'low', title: isVi ? 'Tình trạng ổn định' : 'Stable', description: isVi ? 'Không có cảnh báo' : 'No warnings' });
    }
    return items;
  }, [profile, sensorData, isVi]);

  const riskLevel = riskItems.some(r => r.severity === 'high') ? 'high' : riskItems.some(r => r.severity === 'medium') ? 'medium' : 'low';
  const riskColor = riskLevel === 'high' ? 'text-red-400' : riskLevel === 'medium' ? 'text-amber-400' : 'text-emerald-400';
  const riskBg = riskLevel === 'high' ? 'bg-red-500/8 border-red-500/20' : riskLevel === 'medium' ? 'bg-amber-500/8 border-amber-500/20' : 'bg-emerald-500/8 border-emerald-500/20';
  const riskLabel = riskLevel === 'high' ? (isVi ? 'Rủi ro Cao' : 'High Risk') : riskLevel === 'medium' ? (isVi ? 'Rủi ro TB' : 'Medium Risk') : (isVi ? 'Rủi ro Thấp' : 'Low Risk');
  const scoreColor = healthScore >= 80 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBarColor = healthScore >= 80 ? 'from-emerald-500 to-cyan-400' : healthScore >= 50 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-orange-400';

  return (
    <div className="rounded-2xl overflow-hidden border border-cyan-900/30 bg-[hsl(210,50%,5%)]">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between border-b border-cyan-900/20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Dna className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              {t('biovault.digitalTwin.title', 'Song sinh số')}
            </h2>
            <p className="text-[10px] text-cyan-300/35 hidden sm:block">Digital Twin Simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${scoreColor} bg-transparent border border-current/30 font-bold text-xs sm:text-sm`}>
            <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            {healthScore}%
          </Badge>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-cyan-300/50 font-medium">{isVi ? 'Hoạt động' : 'Active'}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row">
        {/* Body visualization */}
        <div className="flex-1 relative min-h-[400px] sm:min-h-[480px]">
          {/* Radial background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(34,211,238,0.06)_0%,transparent_65%)]" />

          {/* Scanning line */}
          <div
            className="absolute left-[15%] right-[15%] h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent z-10 pointer-events-none"
            style={{ top: `${5 + scanY * 0.9}%` }}
          />

          {/* 3D Body Image */}
          <div className="absolute inset-0 flex items-center justify-center px-8 sm:px-16">
            <img 
              src="/images/digital-twin-body.png" 
              alt="Digital Twin 3D Body" 
              className="h-[370px] sm:h-[450px] w-auto object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.15)] select-none pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Floating biometric cards */}
          {floatingMetrics.map((metric, i) => (
            <FloatingBioCard key={metric.id} metric={metric} index={i} />
          ))}

          {/* Bottom feature tags */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 sm:gap-3 flex-wrap px-3">
            {[
              { label: 'Digital Twin', icon: Dna },
              { label: isVi ? 'Sinh trắc' : 'Biometrics', icon: Activity },
              { label: isVi ? 'AI Dự báo' : 'AI Forecast', icon: Brain },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/8 border border-cyan-500/12">
                <item.icon className="h-2.5 w-2.5 text-cyan-400/50" />
                <span className="text-[9px] text-cyan-300/40 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - Risk Forecast */}
        <div className="w-full lg:w-[300px] xl:w-[320px] border-t lg:border-t-0 lg:border-l border-cyan-900/20 p-4 space-y-3 flex-shrink-0">
          {/* Risk level */}
          <div className={`rounded-xl p-3.5 border ${riskBg}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-4 w-4 ${riskColor}`} />
              <span className={`font-bold text-base ${riskColor}`}>{riskLabel}</span>
            </div>
            <p className="text-[11px] text-cyan-300/35 leading-relaxed">
              {riskLevel === 'high'
                ? (isVi ? 'Phát hiện yếu tố rủi ro cao. Cần kiểm tra y tế.' : 'High risk factors detected. Medical check advised.')
                : riskLevel === 'medium'
                ? (isVi ? 'Một số chỉ số cần theo dõi.' : 'Some indicators need monitoring.')
                : (isVi ? 'Tất cả chỉ số bình thường.' : 'All indicators normal.')}
            </p>
          </div>

          {/* Risk forecast list */}
          <div>
            <h3 className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              {isVi ? 'Dự báo Rủi ro' : 'Risk Forecast'}
            </h3>
            <div className="space-y-2">
              {riskItems.map(item => (
                <div key={item.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[hsl(210,50%,9%)]/70 border border-cyan-900/12 hover:border-cyan-900/25 transition-colors">
                  <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                    item.severity === 'high' ? 'bg-red-500/12 text-red-400' :
                    item.severity === 'medium' ? 'bg-amber-500/12 text-amber-400' :
                    'bg-emerald-500/12 text-emerald-400'
                  }`}>
                    <item.icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.severity === 'high' ? 'bg-red-400' :
                        item.severity === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <span className="text-[11px] font-semibold text-white truncate">{item.title}</span>
                    </div>
                    <p className="text-[10px] text-cyan-300/30 mt-0.5 ml-3">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Score Bar */}
          <div className="rounded-xl p-3.5 bg-[hsl(210,50%,9%)]/50 border border-cyan-900/12">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-cyan-300/40">{isVi ? 'Điểm sức khỏe' : 'Health Score'}</span>
              <span className={`text-base font-bold ${scoreColor}`}>{healthScore}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[hsl(210,50%,14%)] overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${scoreBarColor}`} style={{ width: `${healthScore}%` }} />
            </div>
          </div>

          {/* Profile summary */}
          {profile && (
            <div className="rounded-xl p-3.5 bg-[hsl(210,50%,9%)]/50 border border-cyan-900/12">
              <h4 className="text-[11px] font-semibold text-white mb-2.5">{isVi ? 'Hồ sơ' : 'Profile'}</h4>
              <div className="space-y-1.5">
                {[
                  { label: isVi ? 'Nhóm máu' : 'Blood', value: profile.bloodType || 'N/A' },
                  { label: isVi ? 'Bệnh nền' : 'Conditions', value: profile.chronicConditions.length },
                  { label: isVi ? 'Tài liệu' : 'Documents', value: profile.documents?.length || 0 },
                  { label: isVi ? 'Chỉ số' : 'Metrics', value: profile.extractedMetrics?.length || 0 },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-[10px] text-cyan-300/30">{item.label}</span>
                    <span className="text-[11px] font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expert advice */}
          <div className="rounded-xl p-3 bg-cyan-500/5 border border-cyan-500/10">
            <p className="text-[10px] text-cyan-300/35 leading-relaxed">
              <Eye className="h-3 w-3 text-cyan-400/40 inline mr-1 -mt-0.5" />
              {isVi
                ? 'Chuyên gia khuyến nghị kiểm tra định kỳ nếu có mệt mỏi, đau đầu hoặc chóng mặt kéo dài.'
                : 'Experts advise check-ups for prolonged fatigue, headaches, or dizziness.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Heart, Brain, Activity, Droplets, Shield, AlertTriangle,
  Dna, TrendingUp, TrendingDown, Zap, Eye,
  FileText, ChevronRight, Stethoscope, Bone, Wind, Pill, X,
  Thermometer, Gauge, Waves, Layers, Sparkles
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import type { UserHealthProfile, ExtractedMetric } from '@/types/health';
import type { DeviceSensorsState } from '@/hooks/useDeviceSensors';

// ─── Layer Images ───────────────────────────────────────────────
import layerFull from '@/assets/digital-twin-body-3d.png';
import layerSkeleton from '@/assets/twin-layer-skeleton.png';
import layerOrgans from '@/assets/twin-layer-organs.png';
import layerCirculatory from '@/assets/twin-layer-circulatory.png';
import layerNervous from '@/assets/twin-layer-nervous.png';
import layerMuscular from '@/assets/twin-layer-muscular.png';

// ─── Layer Definitions ──────────────────────────────────────────
interface BodyLayer {
  id: string;
  nameVi: string;
  nameEn: string;
  image: string;
  color: string;
  icon: React.ElementType;
  description: string;
}

const BODY_LAYERS: BodyLayer[] = [
  { id: 'full', nameVi: 'Tổng quan', nameEn: 'Overview', image: layerFull, color: '#22d3ee', icon: Layers, description: 'Toàn bộ hệ cơ thể' },
  { id: 'organs', nameVi: 'Nội tạng', nameEn: 'Organs', image: layerOrgans, color: '#fb923c', icon: Activity, description: 'Phổi, tim, gan, dạ dày' },
  { id: 'skeleton', nameVi: 'Xương khớp', nameEn: 'Skeleton', image: layerSkeleton, color: '#67e8f9', icon: Bone, description: 'Hệ xương & khớp' },
  { id: 'circulatory', nameVi: 'Tuần hoàn', nameEn: 'Circulatory', image: layerCirculatory, color: '#f87171', icon: Heart, description: 'Tim & mạch máu' },
  { id: 'nervous', nameVi: 'Thần kinh', nameEn: 'Nervous', image: layerNervous, color: '#a78bfa', icon: Brain, description: 'Não & dây thần kinh' },
  { id: 'muscular', nameVi: 'Cơ bắp', nameEn: 'Muscular', image: layerMuscular, color: '#f97316', icon: Shield, description: 'Hệ cơ & mô mềm' },
];

// ─── Organ System Definitions ───────────────────────────────────
export interface OrganSystem {
  id: string;
  nameVi: string;
  nameEn: string;
  icon: React.ElementType;
  color: string;
  criticalColor: string;
  warningColor: string;
  relatedMetrics: string[];
  relatedICD: string[];
  descVi: string;
  descEn: string;
  hotspot: { top: string; left: string };
  layers: string[];
}

const ORGAN_SYSTEMS: OrganSystem[] = [
  { id: 'brain', nameVi: 'Não bộ', nameEn: 'Brain', icon: Brain, color: '#a78bfa', criticalColor: '#ef4444', warningColor: '#f59e0b', relatedMetrics: ['stress', 'não', 'brain', 'neuro', 'đột quỵ', 'stroke', 'tremor', 'run'], relatedICD: ['8A', '8B', '8C', '8D'], descVi: 'Hệ thần kinh trung ương', descEn: 'Central nervous system', hotspot: { top: '8%', left: '50%' }, layers: ['full', 'organs', 'nervous'] },
  { id: 'eyes', nameVi: 'Mắt', nameEn: 'Eyes', icon: Eye, color: '#67e8f9', criticalColor: '#ef4444', warningColor: '#f59e0b', relatedMetrics: ['mắt', 'eye', 'retina', 'võng mạc', 'thị lực', 'vision'], relatedICD: ['9A', '9B', '9C'], descVi: 'Thị giác & Mắt', descEn: 'Vision & Eyes', hotspot: { top: '12%', left: '50%' }, layers: ['full', 'nervous'] },
  { id: 'heart', nameVi: 'Tim mạch', nameEn: 'Heart', icon: Heart, color: '#f87171', criticalColor: '#dc2626', warningColor: '#f59e0b', relatedMetrics: ['tim', 'heart', 'nhịp', 'pulse', 'huyết áp', 'blood pressure', 'bp', 'cardiac'], relatedICD: ['BA', 'BB', 'BC', 'BD', 'BE'], descVi: 'Tim & Hệ tuần hoàn', descEn: 'Heart & Cardiovascular', hotspot: { top: '30%', left: '53%' }, layers: ['full', 'organs', 'circulatory'] },
  { id: 'lungs', nameVi: 'Phổi', nameEn: 'Lungs', icon: Wind, color: '#60a5fa', criticalColor: '#ef4444', warningColor: '#f59e0b', relatedMetrics: ['spo2', 'oxygen', 'phổi', 'lung', 'hô hấp', 'respiratory', 'thở'], relatedICD: ['CA', 'CB', 'J1', 'J2'], descVi: 'Hệ hô hấp', descEn: 'Respiratory system', hotspot: { top: '28%', left: '45%' }, layers: ['full', 'organs'] },
  { id: 'liver', nameVi: 'Gan', nameEn: 'Liver', icon: Activity, color: '#fb923c', criticalColor: '#ef4444', warningColor: '#f59e0b', relatedMetrics: ['gan', 'liver', 'alt', 'ast', 'bilirubin', 'sgot', 'sgpt'], relatedICD: ['DB', 'DC', 'DD'], descVi: 'Gan & Mật', descEn: 'Liver & Biliary', hotspot: { top: '37%', left: '44%' }, layers: ['full', 'organs'] },
  { id: 'kidneys', nameVi: 'Thận', nameEn: 'Kidneys', icon: Droplets, color: '#c084fc', criticalColor: '#ef4444', warningColor: '#f59e0b', relatedMetrics: ['thận', 'kidney', 'creatinine', 'urea', 'gfr', 'tiết niệu'], relatedICD: ['GB', 'GC'], descVi: 'Hệ tiết niệu', descEn: 'Urinary system', hotspot: { top: '42%', left: '56%' }, layers: ['full', 'organs'] },
  { id: 'stomach', nameVi: 'Tiêu hóa', nameEn: 'Stomach', icon: Pill, color: '#fbbf24', criticalColor: '#ef4444', warningColor: '#f59e0b', relatedMetrics: ['tiêu hóa', 'stomach', 'dạ dày', 'ruột', 'intestine', 'glucose', 'đường huyết', 'hba1c'], relatedICD: ['DA', 'DE'], descVi: 'Hệ tiêu hóa', descEn: 'Digestive system', hotspot: { top: '40%', left: '50%' }, layers: ['full', 'organs'] },
  { id: 'skeleton', nameVi: 'Xương khớp', nameEn: 'Skeleton', icon: Bone, color: '#e2e8f0', criticalColor: '#ef4444', warningColor: '#f59e0b', relatedMetrics: ['xương', 'bone', 'khớp', 'joint', 'calcium', 'vitamin d', 'mật độ xương'], relatedICD: ['FA', 'FB', 'FC', 'FD'], descVi: 'Hệ xương khớp', descEn: 'Musculoskeletal', hotspot: { top: '62%', left: '50%' }, layers: ['full', 'skeleton'] },
  { id: 'skin', nameVi: 'Da', nameEn: 'Skin', icon: Shield, color: '#fda4af', criticalColor: '#ef4444', warningColor: '#f59e0b', relatedMetrics: ['da', 'skin', 'ẩm', 'hydration', 'bmi'], relatedICD: ['EA', 'EB', 'EC', 'ED'], descVi: 'Da & Mô mềm', descEn: 'Skin & Soft tissue', hotspot: { top: '34%', left: '35%' }, layers: ['full', 'muscular'] },
];

function getOrganHealth(organ: OrganSystem, metrics: ExtractedMetric[]): {
  status: 'normal' | 'warning' | 'critical'; score: number; matchedMetrics: ExtractedMetric[]; conditions: string[];
} {
  const matched = metrics.filter(m => { const n = m.name.toLowerCase(); return organ.relatedMetrics.some(kw => n.includes(kw)); });
  const icdMatched = metrics.filter(m => m.icd11Code && organ.relatedICD.some(prefix => m.icd11Code!.startsWith(prefix)));
  const all = [...matched, ...icdMatched].filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);
  const criticalCount = all.filter(m => m.riskLevel === 'critical').length;
  const warningCount = all.filter(m => m.riskLevel === 'warning').length;
  let score = 100; score -= criticalCount * 25; score -= warningCount * 10; score = Math.max(0, Math.min(100, score));
  const status = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'normal';
  return { status, score, matchedMetrics: all, conditions: all.filter(m => m.riskLevel !== 'normal').map(m => m.name) };
}

// ─── Animated Health Score Ring ─────────────────────────────────
const HealthScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 56 }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black text-white tabular-nums">{score}</span>
      </div>
    </div>
  );
};

// ─── Layer Picker with animated indicator ───────────────────────
const LayerPicker: React.FC<{
  layers: BodyLayer[]; activeLayer: string; onSelect: (id: string) => void; isVi: boolean;
}> = ({ layers, activeLayer, onSelect, isVi }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector(`[data-layer="${activeLayer}"]`) as HTMLElement;
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      });
    }
  }, [activeLayer]);

  return (
    <div ref={containerRef} className="relative flex gap-0.5 p-1 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06]">
      {/* Animated sliding indicator */}
      <div
        className="absolute top-1 h-[calc(100%-8px)] rounded-xl z-0"
        style={{
          ...indicatorStyle,
          background: `linear-gradient(135deg, ${BODY_LAYERS.find(l => l.id === activeLayer)?.color}18, ${BODY_LAYERS.find(l => l.id === activeLayer)?.color}08)`,
          border: `1px solid ${BODY_LAYERS.find(l => l.id === activeLayer)?.color}30`,
          boxShadow: `0 0 20px ${BODY_LAYERS.find(l => l.id === activeLayer)?.color}10`,
        }}
      />
      {layers.map(layer => {
        const active = activeLayer === layer.id;
        const Icon = layer.icon;
        return (
          <button
            key={layer.id}
            data-layer={layer.id}
            onClick={() => onSelect(layer.id)}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-colors duration-300 ${
              active ? 'text-white' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" style={active ? { color: layer.color } : undefined} />
            <span className="hidden sm:inline">{isVi ? layer.nameVi : layer.nameEn}</span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Stealth Organ Hotspot with ripple effect ───────────────────
const OrganHotspot: React.FC<{
  organ: OrganSystem; health: ReturnType<typeof getOrganHealth>;
  isSelected: boolean; isHovered: boolean;
  onSelect: (id: string) => void; onHover: (id: string | null) => void;
  isVi: boolean;
}> = ({ organ, health, isSelected, isHovered, onSelect, onHover, isVi }) => {
  const color = health.status === 'critical' ? organ.criticalColor : health.status === 'warning' ? organ.warningColor : organ.color;
  const active = isSelected || isHovered;
  const isCritical = health.status === 'critical';
  const isWarning = health.status === 'warning';

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group"
      style={{ top: organ.hotspot.top, left: organ.hotspot.left }}
      onClick={() => onSelect(organ.id)}
      onMouseEnter={() => onHover(organ.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Hit area - larger than visual */}
      <div className="w-14 h-14 rounded-full relative flex items-center justify-center">
        {/* Critical/warning persistent pulse */}
        {(isCritical || isWarning) && !active && (
          <>
            <div
              className="absolute inset-1 rounded-full animate-ping"
              style={{ backgroundColor: `${color}15`, animationDuration: isCritical ? '1.5s' : '3s' }}
            />
            <div
              className="absolute w-2 h-2 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: `${color}80`, boxShadow: `0 0 6px ${color}60` }}
            />
          </>
        )}

        {/* Hover/select glow */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-500"
          style={{
            boxShadow: active ? `0 0 24px ${color}80, 0 0 48px ${color}30` : 'none',
            background: active ? `radial-gradient(circle, ${color}25 0%, transparent 70%)` : 'transparent',
          }}
        />

        {/* Inner icon circle */}
        <div
          className="w-9 h-9 rounded-full border-[1.5px] transition-all duration-400 flex items-center justify-center backdrop-blur-sm"
          style={{
            borderColor: active ? `${color}90` : 'transparent',
            backgroundColor: active ? `${color}15` : 'transparent',
            transform: active ? 'scale(1)' : 'scale(0.6)',
            opacity: active ? 1 : 0,
          }}
        >
          {React.createElement(organ.icon, {
            className: 'w-3.5 h-3.5 transition-all duration-300',
            style: { color, opacity: active ? 1 : 0 }
          })}
        </div>
      </div>

      {/* Tooltip */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-12 whitespace-nowrap transition-all duration-300 pointer-events-none"
        style={{
          opacity: active ? 1 : 0,
          transform: active ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        <div className="px-3 py-1.5 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl">
          <span className="text-[11px] font-semibold text-white">{isVi ? organ.nameVi : organ.nameEn}</span>
          <span className={`ml-2 text-[10px] font-bold tabular-nums ${
            health.status === 'critical' ? 'text-red-400' : health.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {health.score}%
          </span>
        </div>
        <div className="w-2 h-2 bg-black/90 border-b border-r border-white/10 rotate-45 mx-auto -mt-1" />
      </div>
    </div>
  );
};

// ─── Vital Card with micro-animation ────────────────────────────
const VitalCard: React.FC<{
  icon: React.ElementType; label: string; value: string; unit: string;
  color: string; trend?: 'up' | 'down' | 'stable'; animate?: boolean;
}> = ({ icon: Icon, label, value, unit, color, trend, animate }) => (
  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.1] transition-all duration-300 group">
    <div className={`p-1.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${animate ? 'animate-heartbeat' : ''}`} style={{ backgroundColor: `${color}12` }}>
      <Icon className="h-3.5 w-3.5" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] text-white/25 font-medium leading-none tracking-wide uppercase">{label}</p>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <span className="text-sm font-bold text-white tabular-nums leading-none">{value}</span>
        <span className="text-[9px] text-white/20">{unit}</span>
      </div>
    </div>
    {trend && (
      <span className={`transition-transform duration-300 group-hover:scale-125 ${
        trend === 'down' ? 'text-emerald-400' : trend === 'up' ? 'text-red-400' : 'text-white/15'
      }`}>
        {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
      </span>
    )}
  </div>
);

// ─── Organ Detail Panel (sheet-like slide) ──────────────────────
const OrganDetailPanel: React.FC<{
  organ: OrganSystem; health: ReturnType<typeof getOrganHealth>; isVi: boolean; onClose: () => void;
}> = ({ organ, health, isVi, onClose }) => {
  const Icon = organ.icon;
  const statusColor = health.status === 'critical' ? 'text-red-400' : health.status === 'warning' ? 'text-amber-400' : 'text-emerald-400';
  const statusBg = health.status === 'critical' ? 'bg-red-500/8 border-red-500/12' : health.status === 'warning' ? 'bg-amber-500/8 border-amber-500/12' : 'bg-emerald-500/8 border-emerald-500/12';
  const statusLabel = health.status === 'critical' ? (isVi ? 'Nguy hiểm' : 'Critical') : health.status === 'warning' ? (isVi ? 'Cảnh báo' : 'Warning') : (isVi ? 'Bình thường' : 'Normal');

  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-[300px] bg-[#08080d]/95 backdrop-blur-3xl border-l border-white/[0.06] z-20 flex flex-col animate-slide-in-right"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl" style={{ backgroundColor: `${organ.color}10`, border: `1px solid ${organ.color}15` }}>
            <Icon className="h-5 w-5" style={{ color: organ.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{isVi ? organ.nameVi : organ.nameEn}</h3>
            <p className="text-[10px] text-white/25 mt-0.5">{isVi ? organ.descVi : organ.descEn}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <X className="h-4 w-4 text-white/25" />
        </button>
      </div>

      {/* Score Card */}
      <div className="p-4">
        <div className={`rounded-2xl p-4 border ${statusBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
              <p className="text-[10px] text-white/20 mt-0.5">{isVi ? 'Điểm sức khỏe cơ quan' : 'Organ health score'}</p>
            </div>
            <HealthScoreRing score={health.score} size={48} />
          </div>
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${health.score}%`,
                background: health.score >= 80 ? 'linear-gradient(90deg, #10b981, #22d3ee)' : health.score >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f97316)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {health.matchedMetrics.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-2">
              {isVi ? 'Chỉ số liên quan' : 'Related Metrics'}
            </h4>
            {health.matchedMetrics.map((m, i) => (
              <div
                key={m.id || i}
                className={`rounded-xl p-3 border transition-all hover:bg-white/[0.02] ${
                  m.riskLevel === 'critical' ? 'border-red-500/12 bg-red-500/4' :
                  m.riskLevel === 'warning' ? 'border-amber-500/12 bg-amber-500/4' :
                  'border-white/[0.04] bg-white/[0.01]'
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      m.riskLevel === 'critical' ? 'bg-red-400 animate-pulse' :
                      m.riskLevel === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span className="text-[11px] font-medium text-white/70">{m.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-white tabular-nums">
                    {m.value} <span className="text-white/25 font-normal">{m.unit}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-10 border border-dashed border-white/[0.06] text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <FileText className="h-5 w-5 text-white/10" />
            </div>
            <p className="text-[11px] text-white/20 font-medium">{isVi ? 'Chưa có dữ liệu' : 'No data yet'}</p>
            <p className="text-[10px] text-white/10 mt-1">{isVi ? 'Tải lên tài liệu y tế để xem' : 'Upload medical documents'}</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

// ─── Enhanced Scanning Effects ──────────────────────────────────
const ScanningBeam: React.FC<{ color: string }> = ({ color }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-[5] rounded-xl">
    {/* === FULL-BODY SCAN: wide gradient band sweeping top→bottom === */}
    <div
      className="absolute left-0 right-0 h-[60px]"
      style={{
        background: `linear-gradient(180deg, transparent, ${color}06, ${color}18, ${color}06, transparent)`,
        animation: 'body-scan 5s ease-in-out infinite',
        boxShadow: `0 0 40px ${color}15, 0 0 80px ${color}08`,
      }}
    />
    {/* Bright scan edge line inside the band */}
    <div
      className="absolute left-0 right-0 h-[2px]"
      style={{
        background: `linear-gradient(90deg, transparent 3%, ${color}60, ${color}90, ${color}60, transparent 97%)`,
        animation: 'body-scan 5s ease-in-out infinite',
        boxShadow: `0 0 12px ${color}40, 0 0 30px ${color}20`,
      }}
    />

    {/* Secondary slower reverse scan */}
    <div
      className="absolute left-0 right-0 h-[30px] opacity-40"
      style={{
        background: `linear-gradient(180deg, transparent, ${color}10, transparent)`,
        animation: 'body-scan 8s ease-in-out infinite reverse',
      }}
    />

    {/* Vertical sweep */}
    <div
      className="absolute top-0 bottom-0 w-[1px] opacity-20"
      style={{
        background: `linear-gradient(180deg, transparent 10%, ${color}40, transparent 90%)`,
        animation: 'scan-line-h 10s ease-in-out infinite',
      }}
    />

    {/* Corner brackets — HUD style */}
    {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
      <div
        key={i}
        className={`absolute ${pos} w-6 h-6 opacity-30 animate-twin-corner`}
        style={{
          borderColor: `${color}50`,
          borderTopWidth: pos.includes('top') ? '1.5px' : '0',
          borderBottomWidth: pos.includes('bottom') ? '1.5px' : '0',
          borderLeftWidth: pos.includes('left') ? '1.5px' : '0',
          borderRightWidth: pos.includes('right') ? '1.5px' : '0',
          animationDelay: `${i * 0.3}s`,
        }}
      />
    ))}

    {/* Grid overlay */}
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `linear-gradient(${color}30 1px, transparent 1px), linear-gradient(90deg, ${color}30 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}
    />

    {/* Body silhouette reveal mask — highlights during scan pass */}
    <div
      className="absolute left-[15%] right-[15%] h-[80px] opacity-0 rounded-full"
      style={{
        background: `radial-gradient(ellipse, ${color}12, transparent 70%)`,
        animation: 'body-scan-glow 5s ease-in-out infinite',
        filter: 'blur(20px)',
      }}
    />

    {/* Edge breathing glow */}
    <div
      className="absolute inset-0 rounded-xl animate-twin-edge-glow"
      style={{
        boxShadow: `inset 0 0 40px ${color}06, inset 0 0 80px ${color}03`,
      }}
    />
  </div>
);

// ─── Data Point Particles ───────────────────────────────────────
const DataParticles: React.FC<{ color: string }> = ({ color }) => (
  <div className="absolute inset-0 pointer-events-none z-[4] overflow-hidden">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 rounded-full animate-twin-particle"
        style={{
          backgroundColor: color,
          opacity: 0.4,
          left: `${15 + Math.random() * 70}%`,
          top: `${10 + Math.random() * 80}%`,
          animationDelay: `${i * 0.8}s`,
          animationDuration: `${3 + Math.random() * 2}s`,
        }}
      />
    ))}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────
interface DigitalTwin3DProps { profile: UserHealthProfile | null; sensorData?: DeviceSensorsState | null; }

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({ profile, sensorData }) => {
  const { i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState('full');
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload images
  useEffect(() => {
    const imgs = BODY_LAYERS.map(l => {
      const img = new Image();
      img.src = l.image;
      return img;
    });
    Promise.all(imgs.map(img => new Promise(resolve => { img.onload = resolve; img.onerror = resolve; })))
      .then(() => setImagesLoaded(true));
  }, []);

  const organHealthMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getOrganHealth>>();
    const metrics = profile?.extractedMetrics || [];
    ORGAN_SYSTEMS.forEach(organ => { map.set(organ.id, getOrganHealth(organ, metrics)); });
    return map;
  }, [profile?.extractedMetrics]);

  const healthScore = useMemo(() => {
    if (!profile) return 72;
    let totalOrgan = 0;
    organHealthMap.forEach(h => { totalOrgan += h.score; });
    let score = totalOrgan / ORGAN_SYSTEMS.length;
    if ((profile.documents?.length || 0) === 0) score -= 5;
    if (sensorData?.health.tremorDetected) score -= 10;
    if (sensorData?.health.fallDetected) score -= 15;
    return Math.max(5, Math.min(100, Math.round(score)));
  }, [profile, organHealthMap, sensorData]);

  const riskLevel = healthScore < 50 ? 'high' : healthScore < 75 ? 'medium' : 'low';
  const handleSelectOrgan = useCallback((id: string) => { setSelectedOrgan(prev => prev === id ? null : id); }, []);
  const selectedOrganData = selectedOrgan ? ORGAN_SYSTEMS.find(o => o.id === selectedOrgan) : null;
  const selectedOrganHealth = selectedOrgan ? organHealthMap.get(selectedOrgan) : null;

  const activeLayerData = BODY_LAYERS.find(l => l.id === activeLayer) || BODY_LAYERS[0];
  const visibleOrgans = ORGAN_SYSTEMS.filter(o => o.layers.includes(activeLayer));

  const heartRate = profile?.extractedMetrics?.find(m => m.name.toLowerCase().includes('nhịp tim') || m.name.toLowerCase().includes('heart'));
  const spo2 = profile?.extractedMetrics?.find(m => m.name.toLowerCase().includes('spo2'));
  const bp = profile?.extractedMetrics?.find(m => m.name.toLowerCase().includes('huyết áp') || m.name.toLowerCase().includes('blood pressure'));

  // Count issues
  const criticalCount = Array.from(organHealthMap.values()).filter(h => h.status === 'critical').length;
  const warningCount = Array.from(organHealthMap.values()).filter(h => h.status === 'warning').length;

  return (
    <div className="rounded-3xl overflow-hidden border border-white/[0.06] bg-[#060609] shadow-2xl">
      {/* ─── Header ─── */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/[0.06]">
            <Dna className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">{isVi ? 'Song Sinh Số' : 'Digital Twin'}</h2>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-cyan-500/20 text-cyan-400/60 bg-cyan-500/5">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                AI
              </Badge>
            </div>
            <p className="text-[10px] text-white/20 mt-0.5">{isVi ? 'Chọn layer để khám phá cơ thể' : 'Select a layer to explore'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Issue counts */}
          {(criticalCount > 0 || warningCount > 0) && (
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {criticalCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {warningCount}
                </span>
              )}
            </div>
          )}
          <HealthScoreRing score={healthScore} />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/8 border border-emerald-500/12">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400/60 font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* ─── Layer Picker ─── */}
      <div className="px-5 py-3 flex justify-center border-b border-white/[0.02]">
        <LayerPicker layers={BODY_LAYERS} activeLayer={activeLayer} onSelect={setActiveLayer} isVi={isVi} />
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex flex-col lg:flex-row relative">

        {/* LEFT: Body Viewer */}
        <div className="flex-1 relative" style={{ minHeight: '620px' }}>

          {/* Vitals Strip */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 pointer-events-auto flex-wrap">
            <VitalCard icon={Heart} label={isVi ? 'Nhịp tim' : 'Heart Rate'} value={heartRate ? String(heartRate.value) : '92'} unit="bpm" color="#f87171" trend="stable" animate />
            <VitalCard icon={Wind} label="SpO2" value={spo2 ? String(spo2.value) : '99'} unit="%" color="#60a5fa" trend="stable" />
            <VitalCard icon={Gauge} label={isVi ? 'Huyết áp' : 'BP'} value={bp ? String(bp.value) : '120/80'} unit="mmHg" color="#a78bfa" />
            <div className="flex-1" />
            <VitalCard icon={Thermometer} label={isVi ? 'Thân nhiệt' : 'Temp'} value="36.6" unit="°C" color="#22d3ee" />
          </div>

          {/* Body Image with smooth crossfade + per-layer effects */}
          <div className="absolute inset-0 flex items-center justify-center pt-20 pb-6">
            <div className="relative h-full max-h-[560px] aspect-[9/16]">
              {/* Background ambient glow - pulsing */}
              <div
                className="absolute inset-[10%] rounded-full blur-3xl transition-colors duration-1000 animate-twin-ambient"
                style={{ backgroundColor: activeLayerData.color }}
              />

              {/* Secondary radial ring glow */}
              <div
                className="absolute inset-[20%] rounded-full blur-2xl transition-colors duration-1000 animate-twin-ring"
                style={{ backgroundColor: activeLayerData.color }}
              />

              {BODY_LAYERS.map(layer => {
                const isActive = activeLayer === layer.id;
                // Per-layer unique animation class
                const layerEffect = isActive ? ({
                  full: 'animate-twin-hologram',
                  skeleton: 'animate-twin-xray',
                  organs: 'animate-twin-pulse',
                  circulatory: 'animate-twin-heartbeat',
                  nervous: 'animate-twin-spark',
                  muscular: 'animate-twin-flex',
                } as Record<string, string>)[layer.id] || '' : '';

                return (
                  <img
                    key={layer.id}
                    src={layer.image}
                    alt={layer.nameEn}
                    className={`absolute inset-0 h-full w-full object-contain transition-all duration-700 ease-in-out ${layerEffect}`}
                    style={{
                      opacity: isActive ? 1 : 0,
                      filter: isActive
                        ? `drop-shadow(0 0 30px ${layer.color}30) drop-shadow(0 0 60px ${layer.color}15) brightness(1.05)`
                        : 'none',
                      transform: isActive ? 'scale(1)' : 'scale(0.95)',
                    }}
                  />
                );
              })}

              {/* Scanning beam + data particles */}
              <ScanningBeam color={activeLayerData.color} />
              <DataParticles color={activeLayerData.color} />

              {/* Organ Hotspots */}
              {visibleOrgans.map(organ => (
                <OrganHotspot
                  key={organ.id}
                  organ={organ}
                  health={organHealthMap.get(organ.id) || { status: 'normal', score: 100, matchedMetrics: [], conditions: [] }}
                  isSelected={selectedOrgan === organ.id}
                  isHovered={hoveredOrgan === organ.id}
                  onSelect={handleSelectOrgan}
                  onHover={setHoveredOrgan}
                  isVi={isVi}
                />
              ))}
            </div>
          </div>

          {/* Layer description badge */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/[0.06]">
              <div className="w-2 h-2 rounded-full transition-colors duration-500" style={{ backgroundColor: activeLayerData.color, boxShadow: `0 0 8px ${activeLayerData.color}60` }} />
              <span className="text-[11px] font-medium text-white/50">
                {isVi ? activeLayerData.description : activeLayerData.nameEn}
              </span>
            </div>
          </div>

          {/* Organ detail panel */}
          {selectedOrganData && selectedOrganHealth && (
            <OrganDetailPanel organ={selectedOrganData} health={selectedOrganHealth} isVi={isVi} onClose={() => setSelectedOrgan(null)} />
          )}
        </div>

        {/* RIGHT: Organ Systems Panel */}
        <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-white/[0.04] bg-[#060609]">
          <div className="p-4 border-b border-white/[0.03]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">{isVi ? 'Hệ cơ quan' : 'Systems'}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/15 font-medium">{visibleOrgans.length}/{ORGAN_SYSTEMS.length}</span>
              </div>
            </div>
            <div className="w-full h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${healthScore}%`,
                  background: healthScore >= 80 ? 'linear-gradient(90deg, #10b981, #22d3ee)' : healthScore >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f97316)',
                }}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-0.5">
              {ORGAN_SYSTEMS.map((organ, index) => {
                const h = organHealthMap.get(organ.id) || { status: 'normal' as const, score: 100, matchedMetrics: [], conditions: [] };
                const isActive = selectedOrgan === organ.id;
                const Icon = organ.icon;
                const dotColor = h.status === 'critical' ? 'bg-red-400 animate-pulse' : h.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400/60';
                const isVisible = visibleOrgans.includes(organ);
                return (
                  <button
                    key={organ.id}
                    onClick={() => handleSelectOrgan(organ.id)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-300 text-left ${
                      isActive ? 'bg-white/[0.06] border border-white/[0.08] shadow-lg' : 'hover:bg-white/[0.03] border border-transparent'
                    } ${!isVisible ? 'opacity-20 pointer-events-none' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="p-1.5 rounded-xl shrink-0 transition-transform duration-300" style={{
                      backgroundColor: `${organ.color}08`,
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: isActive ? organ.color : `${organ.color}80` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span className={`text-[11px] font-semibold truncate transition-colors ${isActive ? 'text-white' : 'text-white/60'}`}>
                          {isVi ? organ.nameVi : organ.nameEn}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold tabular-nums shrink-0 ${
                      h.status === 'critical' ? 'text-red-400' : h.status === 'warning' ? 'text-amber-400' : 'text-white/20'
                    }`}>{h.score}%</span>
                    <ChevronRight className={`h-3 w-3 shrink-0 transition-all ${isActive ? 'text-white/30 translate-x-0.5' : 'text-white/8'}`} />
                  </button>
                );
              })}
            </div>

            {/* Recommendation */}
            <div className="p-3">
              <div className="rounded-2xl p-4 bg-gradient-to-br from-white/[0.02] to-white/[0.01] border border-white/[0.04]">
                <h4 className="text-[10px] font-semibold text-white/25 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Stethoscope className="h-3 w-3" />
                  {isVi ? 'Khuyến nghị' : 'Recommendations'}
                </h4>
                <p className="text-[10px] text-white/15 leading-relaxed">
                  {healthScore >= 80 ? (isVi ? 'Sức khỏe tổng quát tốt. Duy trì lối sống lành mạnh và tiếp tục theo dõi.' : 'Overall health is good. Maintain healthy lifestyle.')
                    : healthScore >= 50 ? (isVi ? 'Một số chỉ số cần theo dõi. Nên tham khảo ý kiến bác sĩ.' : 'Some indicators need monitoring.')
                    : (isVi ? 'Nhiều chỉ số bất thường. Khuyến nghị khám sức khỏe sớm.' : 'Multiple abnormal indicators.')}
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Heart, Brain, Wind, Activity, Droplets, Eye, Bone,
  Shield, Zap, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, ChevronRight, X,
  Sparkles, Target, BarChart3, Clock, RefreshCw
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface DigitalTwinCommandCenterProps {
  profile: UserHealthProfile | null;
  isPremium?: boolean;
}

// Semantic Status System
type SystemStatus = 'optimal' | 'stable' | 'elevated' | 'warning' | 'critical';
type TrendDirection = 'improving' | 'stable' | 'declining';

interface BodySystem {
  id: string;
  name: string;
  nameVi: string;
  icon: React.ElementType;
  // Position on body silhouette (percentage)
  position: { x: number; y: number };
  // Size of the indicator
  size: 'sm' | 'md' | 'lg';
  // Priority level for visual hierarchy (1 = highest)
  priority: 1 | 2 | 3;
  // Current status
  status: SystemStatus;
  // Score 0-100
  healthScore: number;
  // Trend
  trend: TrendDirection;
  // Number of active alerts/conditions
  alertCount: number;
  // Key metrics
  metrics: SystemMetric[];
  // AI insights
  insight?: string;
}

interface SystemMetric {
  label: string;
  value: string;
  unit: string;
  status: SystemStatus;
  range: string;
}

// Color system with semantic meaning
const STATUS_CONFIG: Record<SystemStatus, {
  color: string;
  bgColor: string;
  glowColor: string;
  ringColor: string;
  label: string;
  pulseSpeed: string;
}> = {
  optimal: {
    color: 'hsl(var(--success))',
    bgColor: 'hsl(var(--success) / 0.15)',
    glowColor: 'hsl(142 76% 36% / 0.4)',
    ringColor: 'ring-success/50',
    label: 'Optimal',
    pulseSpeed: '4s'
  },
  stable: {
    color: 'hsl(var(--info))',
    bgColor: 'hsl(var(--info) / 0.15)',
    glowColor: 'hsl(199 89% 48% / 0.4)',
    ringColor: 'ring-info/50',
    label: 'Stable',
    pulseSpeed: '3s'
  },
  elevated: {
    color: 'hsl(var(--warning))',
    bgColor: 'hsl(var(--warning) / 0.2)',
    glowColor: 'hsl(38 92% 50% / 0.5)',
    ringColor: 'ring-warning/50',
    label: 'Elevated',
    pulseSpeed: '2s'
  },
  warning: {
    color: 'hsl(var(--risk-high))',
    bgColor: 'hsl(var(--risk-high) / 0.25)',
    glowColor: 'hsl(25 95% 53% / 0.6)',
    ringColor: 'ring-orange-500/50',
    label: 'Warning',
    pulseSpeed: '1.5s'
  },
  critical: {
    color: 'hsl(var(--danger))',
    bgColor: 'hsl(var(--danger) / 0.3)',
    glowColor: 'hsl(0 84% 60% / 0.7)',
    ringColor: 'ring-danger/60',
    label: 'Critical',
    pulseSpeed: '0.8s'
  }
};

export const DigitalTwinCommandCenter: React.FC<DigitalTwinCommandCenterProps> = ({
  profile,
  isPremium = false
}) => {
  const [selectedSystem, setSelectedSystem] = useState<BodySystem | null>(null);
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);
  const [vitalPulse, setVitalPulse] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const [scanLine, setScanLine] = useState(0);
  const [isScanning, setIsScanning] = useState(true);

  // Breathing animation (chest expansion)
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathPhase(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Heartbeat pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setVitalPulse(prev => (prev + 1) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Scan line animation
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setScanLine(prev => {
        if (prev >= 100) {
          setTimeout(() => setIsScanning(true), 3000);
          return 0;
        }
        return prev + 0.5;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isScanning]);

  // Body systems data
  const bodySystems: BodySystem[] = [
    {
      id: 'brain',
      name: 'Neurological',
      nameVi: 'Hệ thần kinh',
      icon: Brain,
      position: { x: 50, y: 8 },
      size: 'lg',
      priority: 1,
      status: 'elevated',
      healthScore: 76,
      trend: 'stable',
      alertCount: 2,
      metrics: [
        { label: 'Cognitive Score', value: '76', unit: '/100', status: 'elevated', range: '80-100' },
        { label: 'Stress Index', value: 'Moderate', unit: '', status: 'elevated', range: 'Low' },
        { label: 'Sleep Quality', value: '68', unit: '%', status: 'warning', range: '85%+' }
      ],
      insight: 'Elevated stress markers detected. Consider stress management protocols.'
    },
    {
      id: 'heart',
      name: 'Cardiovascular',
      nameVi: 'Tim mạch',
      icon: Heart,
      position: { x: 44, y: 33 },
      size: 'lg',
      priority: 1,
      status: 'warning',
      healthScore: 62,
      trend: 'declining',
      alertCount: 3,
      metrics: [
        { label: 'Blood Pressure', value: '138/88', unit: 'mmHg', status: 'warning', range: '<120/80' },
        { label: 'Heart Rate', value: '78', unit: 'bpm', status: 'stable', range: '60-80' },
        { label: 'HRV', value: '42', unit: 'ms', status: 'elevated', range: '50+' }
      ],
      insight: 'Blood pressure trending high. Medication adherence check recommended.'
    },
    {
      id: 'lungs',
      name: 'Respiratory',
      nameVi: 'Hô hấp',
      icon: Wind,
      position: { x: 56, y: 32 },
      size: 'md',
      priority: 2,
      status: 'optimal',
      healthScore: 92,
      trend: 'stable',
      alertCount: 0,
      metrics: [
        { label: 'SpO2', value: '98', unit: '%', status: 'optimal', range: '95-100' },
        { label: 'Resp Rate', value: '14', unit: '/min', status: 'optimal', range: '12-20' }
      ]
    },
    {
      id: 'liver',
      name: 'Hepatic',
      nameVi: 'Gan',
      icon: Activity,
      position: { x: 40, y: 44 },
      size: 'md',
      priority: 2,
      status: 'stable',
      healthScore: 84,
      trend: 'improving',
      alertCount: 0,
      metrics: [
        { label: 'ALT', value: '28', unit: 'U/L', status: 'optimal', range: '7-56' },
        { label: 'AST', value: '24', unit: 'U/L', status: 'optimal', range: '10-40' }
      ]
    },
    {
      id: 'pancreas',
      name: 'Metabolic',
      nameVi: 'Chuyển hóa',
      icon: Droplets,
      position: { x: 58, y: 46 },
      size: 'lg',
      priority: 1,
      status: 'warning',
      healthScore: 58,
      trend: 'declining',
      alertCount: 4,
      metrics: [
        { label: 'Glucose', value: '118', unit: 'mg/dL', status: 'warning', range: '<100' },
        { label: 'HbA1c', value: '6.5', unit: '%', status: 'warning', range: '<5.7' },
        { label: 'Insulin Sens.', value: 'Low', unit: '', status: 'elevated', range: 'Normal' }
      ],
      insight: 'Pre-diabetes markers present. Lifestyle intervention critical.'
    },
    {
      id: 'kidneys',
      name: 'Renal',
      nameVi: 'Thận',
      icon: Droplets,
      position: { x: 50, y: 52 },
      size: 'sm',
      priority: 3,
      status: 'optimal',
      healthScore: 88,
      trend: 'stable',
      alertCount: 0,
      metrics: [
        { label: 'eGFR', value: '95', unit: 'mL/min', status: 'optimal', range: '>90' },
        { label: 'Creatinine', value: '0.9', unit: 'mg/dL', status: 'optimal', range: '0.7-1.3' }
      ]
    },
    {
      id: 'skeleton',
      name: 'Musculoskeletal',
      nameVi: 'Xương khớp',
      icon: Bone,
      position: { x: 35, y: 68 },
      size: 'sm',
      priority: 3,
      status: 'stable',
      healthScore: 82,
      trend: 'stable',
      alertCount: 1,
      metrics: [
        { label: 'Vitamin D', value: '35', unit: 'ng/mL', status: 'stable', range: '30-50' },
        { label: 'Bone Density', value: 'Normal', unit: '', status: 'optimal', range: 'Normal' }
      ]
    },
    {
      id: 'eyes',
      name: 'Visual',
      nameVi: 'Thị giác',
      icon: Eye,
      position: { x: 44, y: 10 },
      size: 'sm',
      priority: 3,
      status: 'optimal',
      healthScore: 90,
      trend: 'stable',
      alertCount: 0,
      metrics: [
        { label: 'Acuity', value: '20/20', unit: '', status: 'optimal', range: '20/20' }
      ]
    }
  ];

  // Calculate overall status
  const criticalSystems = bodySystems.filter(s => s.status === 'critical').length;
  const warningSystems = bodySystems.filter(s => s.status === 'warning').length;
  const totalAlerts = bodySystems.reduce((sum, s) => sum + s.alertCount, 0);
  const overallScore = Math.round(bodySystems.reduce((sum, s) => sum + s.healthScore, 0) / bodySystems.length);

  const overallStatus: SystemStatus = criticalSystems > 0 ? 'critical' 
    : warningSystems > 0 ? 'warning' 
    : 'stable';

  // Heartbeat scale for heart indicator
  const heartbeatScale = 1 + Math.sin(vitalPulse * 0.15) * 0.12;
  
  // Breathing scale for chest area
  const breathScale = 1 + Math.sin(breathPhase * Math.PI / 180) * 0.02;

  const getIndicatorSize = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'lg': return { outer: 14, inner: 10 };
      case 'md': return { outer: 11, inner: 7 };
      case 'sm': return { outer: 8, inner: 5 };
    }
  };

  const getTrendIcon = (trend: TrendDirection) => {
    switch (trend) {
      case 'improving': return TrendingUp;
      case 'declining': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: TrendDirection) => {
    switch (trend) {
      case 'improving': return 'text-success';
      case 'declining': return 'text-danger';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <TooltipProvider>
      <Card className="border-2 border-primary/20 bg-gradient-to-b from-card via-card to-primary/5 overflow-hidden">
        <CardContent className="p-6">
          {/* Header with Quick Status */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${STATUS_CONFIG[overallStatus].bgColor}`}>
                <Shield className="h-5 w-5" style={{ color: STATUS_CONFIG[overallStatus].color }} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Digital Twin Command Center</h2>
                <p className="text-xs text-muted-foreground">Real-time biological status monitoring</p>
              </div>
            </div>
            
            {/* Quick Status Indicators */}
            <div className="flex items-center gap-4">
              {/* Overall Score */}
              <div className="text-center">
                <div className={`text-2xl font-bold`} style={{ color: STATUS_CONFIG[overallStatus].color }}>
                  {overallScore}%
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Health Index</p>
              </div>
              
              {/* Alerts */}
              {totalAlerts > 0 && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {totalAlerts} Alert{totalAlerts > 1 ? 's' : ''}
                </Badge>
              )}
              
              {/* Scan Status */}
              <Button variant="ghost" size="sm" onClick={() => setIsScanning(true)} className="gap-1">
                <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span className="text-xs">{isScanning ? 'Scanning' : 'Rescan'}</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Digital Twin Body Visualization */}
            <div className="lg:col-span-2">
              <div className="relative aspect-[3/4] max-h-[550px] mx-auto bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-2xl border border-border/50 overflow-hidden">
                <svg viewBox="0 0 100 120" className="w-full h-full">
                  <defs>
                    {/* Base body gradient */}
                    <linearGradient id="bodyBase" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                      <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                    </linearGradient>
                    
                    {/* Scan line gradient */}
                    <linearGradient id="scanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>

                    {/* Status-specific radial gradients */}
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <radialGradient key={`gradient-${status}`} id={`${status}Gradient`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={config.color} stopOpacity="0.8" />
                        <stop offset="70%" stopColor={config.color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={config.color} stopOpacity="0" />
                      </radialGradient>
                    ))}

                    {/* Glow filters */}
                    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    
                    <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Body Silhouette with breathing animation */}
                  <g transform={`translate(50, 60) scale(${breathScale}) translate(-50, -60)`}>
                    {/* Head */}
                    <ellipse cx="50" cy="12" rx="10" ry="11" 
                      fill="url(#bodyBase)" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth="0.4" 
                      strokeOpacity="0.6"
                    />
                    
                    {/* Neck */}
                    <rect x="46" y="22" width="8" height="6" fill="url(#bodyBase)" />
                    
                    {/* Torso */}
                    <path 
                      d="M32 28 L68 28 L70 65 L60 70 L60 90 L40 90 L40 70 L30 65 Z" 
                      fill="url(#bodyBase)" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth="0.4"
                      strokeOpacity="0.6"
                    />
                    
                    {/* Arms */}
                    <path d="M32 28 L20 55 L24 56 L34 35" fill="url(#bodyBase)" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeOpacity="0.5" />
                    <path d="M68 28 L80 55 L76 56 L66 35" fill="url(#bodyBase)" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeOpacity="0.5" />
                    
                    {/* Legs */}
                    <path d="M40 90 L38 115 L44 115 L48 90" fill="url(#bodyBase)" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeOpacity="0.5" />
                    <path d="M60 90 L62 115 L56 115 L52 90" fill="url(#bodyBase)" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeOpacity="0.5" />
                  </g>

                  {/* Scan line effect */}
                  {isScanning && (
                    <g>
                      <rect 
                        x="0" 
                        y={scanLine * 1.2} 
                        width="100" 
                        height="3" 
                        fill="url(#scanGradient)"
                        opacity="0.7"
                      />
                    </g>
                  )}

                  {/* System Indicators */}
                  {bodySystems.map((system) => {
                    const config = STATUS_CONFIG[system.status];
                    const sizes = getIndicatorSize(system.size);
                    const isSelected = selectedSystem?.id === system.id;
                    const isHovered = hoveredSystem === system.id;
                    const isHighPriority = system.priority === 1;
                    
                    // Heart has special pulsing animation
                    const scale = system.id === 'heart' ? heartbeatScale : 1;
                    const shouldPulse = system.status === 'warning' || system.status === 'critical';

                    return (
                      <g 
                        key={system.id}
                        transform={`translate(${system.position.x}, ${system.position.y}) scale(${scale})`}
                        className="cursor-pointer transition-all duration-300"
                        onClick={() => setSelectedSystem(system)}
                        onMouseEnter={() => setHoveredSystem(system.id)}
                        onMouseLeave={() => setHoveredSystem(null)}
                        style={{ transformOrigin: `${system.position.x}px ${system.position.y}px` }}
                      >
                        {/* Outer glow ring for warning/critical states */}
                        {shouldPulse && (
                          <circle
                            cx="0"
                            cy="0"
                            r={sizes.outer * 0.9}
                            fill="none"
                            stroke={config.color}
                            strokeWidth="0.5"
                            opacity={0.3 + Math.sin(vitalPulse * 0.1) * 0.3}
                            className="animate-pulse"
                          />
                        )}

                        {/* Background glow */}
                        <circle
                          cx="0"
                          cy="0"
                          r={sizes.outer * 0.8}
                          fill={`url(#${system.status}Gradient)`}
                          opacity={isHovered || isSelected ? 1 : 0.7}
                          filter={isHighPriority ? "url(#strongGlow)" : "url(#softGlow)"}
                        />

                        {/* Main indicator circle */}
                        <circle
                          cx="0"
                          cy="0"
                          r={sizes.inner * 0.5}
                          fill={config.color}
                          opacity={isHovered || isSelected ? 1 : 0.9}
                          filter="url(#softGlow)"
                        />

                        {/* Selection ring */}
                        {isSelected && (
                          <circle
                            cx="0"
                            cy="0"
                            r={sizes.outer * 0.7}
                            fill="none"
                            stroke="hsl(var(--foreground))"
                            strokeWidth="0.4"
                            strokeDasharray="2,2"
                            className="animate-spin"
                            style={{ animationDuration: '8s' }}
                          />
                        )}

                        {/* Alert count badge */}
                        {system.alertCount > 0 && (
                          <g transform={`translate(${sizes.inner * 0.4}, ${-sizes.inner * 0.4})`}>
                            <circle
                              cx="0"
                              cy="0"
                              r="3"
                              fill="hsl(var(--background))"
                            />
                            <circle
                              cx="0"
                              cy="0"
                              r="2.5"
                              fill={system.status === 'critical' ? 'hsl(var(--danger))' : 'hsl(var(--warning))'}
                            />
                            <text
                              x="0"
                              y="0.8"
                              textAnchor="middle"
                              fontSize="2.5"
                              fontWeight="bold"
                              fill="white"
                            >
                              {system.alertCount}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Legend */}
                  <g transform="translate(5, 105)">
                    {['optimal', 'stable', 'elevated', 'warning', 'critical'].map((status, i) => (
                      <g key={status} transform={`translate(${i * 18}, 0)`}>
                        <circle cx="2" cy="0" r="2" fill={STATUS_CONFIG[status as SystemStatus].color} />
                        <text x="6" y="1" fontSize="2.5" fill="hsl(var(--muted-foreground))" className="capitalize">
                          {status.slice(0, 3)}
                        </text>
                      </g>
                    ))}
                  </g>
                </svg>

                {/* Floating status labels for priority systems */}
                {bodySystems.filter(s => s.priority === 1 && s.status !== 'optimal').map(system => {
                  const config = STATUS_CONFIG[system.status];
                  return (
                    <div
                      key={`label-${system.id}`}
                      className="absolute pointer-events-none animate-fade-up"
                      style={{
                        left: `${system.position.x + 8}%`,
                        top: `${(system.position.y / 120) * 100}%`,
                        transform: 'translateY(-50%)'
                      }}
                    >
                      <Badge 
                        variant="outline" 
                        className="text-[10px] gap-1 backdrop-blur-sm"
                        style={{ 
                          backgroundColor: config.bgColor,
                          borderColor: config.color,
                          color: config.color
                        }}
                      >
                        {system.name}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Detail Panel */}
            <div className="space-y-4">
              {selectedSystem ? (
                <div className="animate-fade-up">
                  {/* Selected System Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: STATUS_CONFIG[selectedSystem.status].bgColor }}
                      >
                        <selectedSystem.icon 
                          className="h-5 w-5" 
                          style={{ color: STATUS_CONFIG[selectedSystem.status].color }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold">{selectedSystem.name}</h3>
                        <p className="text-xs text-muted-foreground">{selectedSystem.nameVi}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedSystem(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Health Score */}
                  <div className="p-4 rounded-xl bg-muted/50 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Health Score</span>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-2xl font-bold"
                          style={{ color: STATUS_CONFIG[selectedSystem.status].color }}
                        >
                          {selectedSystem.healthScore}%
                        </span>
                        {React.createElement(getTrendIcon(selectedSystem.trend), {
                          className: `h-4 w-4 ${getTrendColor(selectedSystem.trend)}`
                        })}
                      </div>
                    </div>
                    <Progress 
                      value={selectedSystem.healthScore} 
                      className="h-2"
                      style={{ 
                        ['--progress-foreground' as any]: STATUS_CONFIG[selectedSystem.status].color 
                      }}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-[10px]" style={{
                        backgroundColor: STATUS_CONFIG[selectedSystem.status].bgColor,
                        borderColor: STATUS_CONFIG[selectedSystem.status].color,
                        color: STATUS_CONFIG[selectedSystem.status].color
                      }}>
                        {STATUS_CONFIG[selectedSystem.status].label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last updated 2h ago
                      </span>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      Key Metrics
                    </h4>
                    {selectedSystem.metrics.map((metric, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <span className="text-sm">{metric.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {metric.value}
                            <span className="text-muted-foreground text-xs ml-1">{metric.unit}</span>
                          </span>
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: STATUS_CONFIG[metric.status].color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI Insight */}
                  {selectedSystem.insight && (
                    <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-primary mb-1">AI Insight</p>
                          <p className="text-sm text-muted-foreground">{selectedSystem.insight}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button className="w-full mt-4 gap-2">
                    <Target className="h-4 w-4" />
                    Start Improvement Protocol
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </div>
              ) : (
                /* Default: System Overview */
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    System Status Overview
                  </h3>
                  
                  {/* Priority Systems */}
                  {bodySystems
                    .sort((a, b) => {
                      // Sort by status severity, then by priority
                      const statusOrder = { critical: 0, warning: 1, elevated: 2, stable: 3, optimal: 4 };
                      if (statusOrder[a.status] !== statusOrder[b.status]) {
                        return statusOrder[a.status] - statusOrder[b.status];
                      }
                      return a.priority - b.priority;
                    })
                    .map(system => (
                      <div
                        key={system.id}
                        className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
                          hoveredSystem === system.id ? 'ring-2' : ''
                        }`}
                        style={{ 
                          backgroundColor: STATUS_CONFIG[system.status].bgColor,
                          borderColor: STATUS_CONFIG[system.status].color + '40',
                          ['--tw-ring-color' as any]: STATUS_CONFIG[system.status].color
                        }}
                        onClick={() => setSelectedSystem(system)}
                        onMouseEnter={() => setHoveredSystem(system.id)}
                        onMouseLeave={() => setHoveredSystem(null)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <system.icon 
                              className="h-4 w-4"
                              style={{ color: STATUS_CONFIG[system.status].color }}
                            />
                            <span className="text-sm font-medium">{system.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {system.alertCount > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 border-warning/50 text-warning">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {system.alertCount}
                              </Badge>
                            )}
                            <span 
                              className="text-sm font-bold"
                              style={{ color: STATUS_CONFIG[system.status].color }}
                            >
                              {system.healthScore}%
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Quick Actions */}
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-3">Click any system on the body map or list to explore details</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                        <Zap className="h-3 w-3" />
                        Quick Scan
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        History
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default DigitalTwinCommandCenter;

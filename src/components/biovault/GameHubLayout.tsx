import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Heart, Brain, Wind, Activity, Droplets, Eye, Ear, Bone,
  Shield, Zap, Trophy, Star, Target, ChevronRight, ArrowLeft,
  Sparkles, Flame, Crown, Lock, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, Info, Play, Pause,
  Volume2, VolumeX, Settings, User, Clock, Calendar
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface GameHubLayoutProps {
  profile: UserHealthProfile | null;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

interface BodyZone {
  id: string;
  name: string;
  nameVi: string;
  icon: React.ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  healthScore: number;
  riskLevel: 'optimal' | 'caution' | 'warning' | 'critical';
  xp: number;
  level: number;
  unlockedAbilities: string[];
  activeQuests: number;
  biomarkers: Biomarker[];
  conditions: string[];
  achievements: Achievement[];
}

interface Biomarker {
  id: string;
  name: string;
  value: string | number;
  unit: string;
  range: string;
  status: 'normal' | 'borderline' | 'abnormal';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  description: string;
}

interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  totalHealthScore: number;
  streak: number;
  achievements: number;
  totalAchievements: number;
  rank: string;
}

export const GameHubLayout: React.FC<GameHubLayoutProps> = ({
  profile,
  isPremium = false,
  onUpgrade
}) => {
  const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    level: 12,
    xp: 2450,
    xpToNext: 3000,
    totalHealthScore: 72,
    streak: 7,
    achievements: 18,
    totalAchievements: 45,
    rank: 'Health Guardian'
  });
  const [isAnimating, setIsAnimating] = useState(true);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Heartbeat animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Body zones with game data
  const bodyZones: BodyZone[] = [
    {
      id: 'brain',
      name: 'Brain & Nervous System',
      nameVi: 'Não & Hệ thần kinh',
      icon: Brain,
      x: 50, y: 8, width: 16, height: 12,
      healthScore: 78,
      riskLevel: 'caution',
      xp: 1250,
      level: 8,
      unlockedAbilities: ['Stress Monitor', 'Sleep Tracker', 'Focus Mode'],
      activeQuests: 2,
      biomarkers: [
        { id: 'cognitive', name: 'Cognitive Score', value: 78, unit: '/100', range: '80-100', status: 'borderline', trend: 'stable', lastUpdated: '2h ago' },
        { id: 'sleep', name: 'Sleep Quality', value: 72, unit: '%', range: '85-100%', status: 'borderline', trend: 'up', lastUpdated: '8h ago' },
        { id: 'stress', name: 'Stress Level', value: 'Moderate', unit: '', range: 'Low', status: 'borderline', trend: 'down', lastUpdated: '1h ago' }
      ],
      conditions: ['Elevated cortisol from work stress'],
      achievements: [
        { id: 'a1', name: 'Mind Master', icon: '🧠', unlocked: true, progress: 100, description: 'Complete 7 days of meditation' },
        { id: 'a2', name: 'Dream Weaver', icon: '😴', unlocked: false, progress: 60, description: 'Achieve 8h sleep for 14 days' }
      ]
    },
    {
      id: 'heart',
      name: 'Cardiovascular System',
      nameVi: 'Hệ tim mạch',
      icon: Heart,
      x: 45, y: 32, width: 14, height: 14,
      healthScore: 65,
      riskLevel: 'warning',
      xp: 980,
      level: 6,
      unlockedAbilities: ['BP Monitor', 'Heart Rate Zone'],
      activeQuests: 3,
      biomarkers: [
        { id: 'bp', name: 'Blood Pressure', value: '135/85', unit: 'mmHg', range: '<120/80', status: 'abnormal', trend: 'down', lastUpdated: '30m ago' },
        { id: 'hr', name: 'Heart Rate', value: 72, unit: 'bpm', range: '60-80', status: 'normal', trend: 'stable', lastUpdated: 'live' },
        { id: 'cholesterol', name: 'Cholesterol', value: 210, unit: 'mg/dL', range: '<200', status: 'borderline', trend: 'stable', lastUpdated: '7d ago' }
      ],
      conditions: ['Stage 1 Hypertension', 'Elevated LDL'],
      achievements: [
        { id: 'a3', name: 'Heart Hero', icon: '❤️', unlocked: false, progress: 45, description: 'Keep BP under 120/80 for 30 days' },
        { id: 'a4', name: 'Cardio King', icon: '🏃', unlocked: true, progress: 100, description: 'Complete 10 cardio sessions' }
      ]
    },
    {
      id: 'lungs',
      name: 'Respiratory System',
      nameVi: 'Hệ hô hấp',
      icon: Wind,
      x: 55, y: 30, width: 12, height: 16,
      healthScore: 88,
      riskLevel: 'optimal',
      xp: 1580,
      level: 10,
      unlockedAbilities: ['SpO2 Monitor', 'Breath Trainer', 'AQI Alert'],
      activeQuests: 1,
      biomarkers: [
        { id: 'spo2', name: 'SpO2', value: 98, unit: '%', range: '95-100%', status: 'normal', trend: 'stable', lastUpdated: 'live' },
        { id: 'resp', name: 'Respiratory Rate', value: 16, unit: '/min', range: '12-20', status: 'normal', trend: 'stable', lastUpdated: 'live' }
      ],
      conditions: [],
      achievements: [
        { id: 'a5', name: 'Breath Master', icon: '🌬️', unlocked: true, progress: 100, description: 'Complete breathing exercises 7 days' }
      ]
    },
    {
      id: 'liver',
      name: 'Hepatic System',
      nameVi: 'Gan',
      icon: Activity,
      x: 40, y: 42, width: 12, height: 10,
      healthScore: 82,
      riskLevel: 'optimal',
      xp: 1120,
      level: 7,
      unlockedAbilities: ['Liver Function', 'Detox Mode'],
      activeQuests: 1,
      biomarkers: [
        { id: 'alt', name: 'ALT', value: 32, unit: 'U/L', range: '7-56', status: 'normal', trend: 'stable', lastUpdated: '30d ago' },
        { id: 'ast', name: 'AST', value: 28, unit: 'U/L', range: '10-40', status: 'normal', trend: 'stable', lastUpdated: '30d ago' }
      ],
      conditions: [],
      achievements: [
        { id: 'a6', name: 'Detox Hero', icon: '🌿', unlocked: false, progress: 30, description: 'Complete a 7-day detox protocol' }
      ]
    },
    {
      id: 'pancreas',
      name: 'Metabolic System',
      nameVi: 'Tụy & Chuyển hóa',
      icon: Droplets,
      x: 55, y: 45, width: 12, height: 10,
      healthScore: 55,
      riskLevel: 'warning',
      xp: 780,
      level: 5,
      unlockedAbilities: ['Glucose Monitor'],
      activeQuests: 4,
      biomarkers: [
        { id: 'glucose', name: 'Fasting Glucose', value: 108, unit: 'mg/dL', range: '<100', status: 'abnormal', trend: 'up', lastUpdated: '2h ago' },
        { id: 'hba1c', name: 'HbA1c', value: 6.4, unit: '%', range: '<5.7%', status: 'abnormal', trend: 'up', lastUpdated: '14d ago' }
      ],
      conditions: ['Pre-diabetes', 'Insulin Resistance'],
      achievements: [
        { id: 'a7', name: 'Sugar Slayer', icon: '🍬', unlocked: false, progress: 20, description: 'Keep glucose under 100 for 14 days' }
      ]
    },
    {
      id: 'kidneys',
      name: 'Renal System',
      nameVi: 'Thận',
      icon: Droplets,
      x: 50, y: 52, width: 16, height: 8,
      healthScore: 85,
      riskLevel: 'optimal',
      xp: 1350,
      level: 9,
      unlockedAbilities: ['Hydration Tracker', 'Kidney Function'],
      activeQuests: 1,
      biomarkers: [
        { id: 'creat', name: 'Creatinine', value: 1.1, unit: 'mg/dL', range: '0.7-1.3', status: 'normal', trend: 'stable', lastUpdated: '30d ago' },
        { id: 'egfr', name: 'eGFR', value: 92, unit: 'mL/min', range: '>90', status: 'normal', trend: 'stable', lastUpdated: '30d ago' }
      ],
      conditions: [],
      achievements: [
        { id: 'a8', name: 'Hydration Hero', icon: '💧', unlocked: true, progress: 100, description: 'Drink 2L water for 7 consecutive days' }
      ]
    },
    {
      id: 'bones',
      name: 'Musculoskeletal',
      nameVi: 'Xương khớp',
      icon: Bone,
      x: 35, y: 65, width: 10, height: 20,
      healthScore: 90,
      riskLevel: 'optimal',
      xp: 1680,
      level: 11,
      unlockedAbilities: ['Posture Monitor', 'Bone Density', 'Exercise Log'],
      activeQuests: 1,
      biomarkers: [
        { id: 'vitd', name: 'Vitamin D', value: 42, unit: 'ng/mL', range: '30-50', status: 'normal', trend: 'stable', lastUpdated: '60d ago' },
        { id: 'calcium', name: 'Calcium', value: 9.8, unit: 'mg/dL', range: '8.5-10.5', status: 'normal', trend: 'stable', lastUpdated: '60d ago' }
      ],
      conditions: [],
      achievements: [
        { id: 'a9', name: 'Iron Bones', icon: '💪', unlocked: true, progress: 100, description: 'Complete 30 strength training sessions' }
      ]
    },
    {
      id: 'eyes',
      name: 'Visual System',
      nameVi: 'Mắt',
      icon: Eye,
      x: 44, y: 10, width: 6, height: 6,
      healthScore: 86,
      riskLevel: 'optimal',
      xp: 920,
      level: 6,
      unlockedAbilities: ['Eye Strain Alert'],
      activeQuests: 1,
      biomarkers: [
        { id: 'vision', name: 'Visual Acuity', value: '20/20', unit: '', range: '20/20', status: 'normal', trend: 'stable', lastUpdated: '180d ago' }
      ],
      conditions: [],
      achievements: [
        { id: 'a10', name: 'Eagle Eye', icon: '👁️', unlocked: true, progress: 100, description: 'Take eye breaks every 20 minutes for 7 days' }
      ]
    }
  ];

  const getRiskColor = (level: BodyZone['riskLevel']) => {
    switch (level) {
      case 'optimal': return { fill: 'hsl(var(--success))', stroke: 'hsl(var(--success))', glow: '#22c55e' };
      case 'caution': return { fill: 'hsl(var(--info))', stroke: 'hsl(var(--info))', glow: '#3b82f6' };
      case 'warning': return { fill: 'hsl(var(--warning))', stroke: 'hsl(var(--warning))', glow: '#f59e0b' };
      case 'critical': return { fill: 'hsl(var(--danger))', stroke: 'hsl(var(--danger))', glow: '#ef4444' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  // Calculate heartbeat scale for the heart zone
  const heartbeatScale = selectedZone?.id === 'heart' || hoveredZone === 'heart' 
    ? 1 + Math.sin(pulsePhase * 0.12) * 0.08
    : 1;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Player Stats Bar */}
        <Card className="bg-gradient-to-r from-primary/10 via-background to-warning/10 border-2 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* Player Info */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center border-2 border-primary/50">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center border-2 border-background text-[10px] font-bold text-black">
                    {playerStats.level}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{profile?.name || 'Health Guardian'}</h3>
                    {isPremium && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
                        <Crown className="h-3 w-3 mr-1" />PREMIUM
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      <Star className="h-3 w-3 mr-1 text-warning" />
                      {playerStats.rank}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      🔥 {playerStats.streak} day streak
                    </span>
                  </div>
                </div>
              </div>

              {/* XP Bar */}
              <div className="flex-1 max-w-xs mx-6 hidden md:block">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Level {playerStats.level}</span>
                  <span className="text-primary font-medium">{playerStats.xp}/{playerStats.xpToNext} XP</span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-info rounded-full transition-all duration-500"
                    style={{ width: `${(playerStats.xp / playerStats.xpToNext) * 100}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-help">
                      <div className={`text-2xl font-bold ${getScoreColor(playerStats.totalHealthScore)}`}>
                        {playerStats.totalHealthScore}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Health Score</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Overall health score across all organ systems</TooltipContent>
                </Tooltip>

                <div className="h-10 w-px bg-border" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-help">
                      <div className="text-2xl font-bold text-warning flex items-center justify-center">
                        <Trophy className="h-5 w-5 mr-1" />
                        {playerStats.achievements}
                      </div>
                      <p className="text-[10px] text-muted-foreground">/{playerStats.totalAchievements}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Achievements unlocked</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Game Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Digital Twin Body Map */}
          <Card className="lg:col-span-2 border-2 border-primary/20 bg-gradient-to-b from-card via-card to-primary/5 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Digital Twin Command Center
                </h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsAnimating(!isAnimating)}
                  >
                    {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Interactive Body Map */}
              <div className="relative aspect-[3/4] max-h-[600px] mx-auto">
                <svg viewBox="0 0 100 120" className="w-full h-full">
                  <defs>
                    <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    {/* Animated pulse filter */}
                    <filter id="pulseGlow">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feColorMatrix in="blur" type="saturate" values="2"/>
                      <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Body Silhouette */}
                  <g filter="url(#glow)">
                    {/* Head */}
                    <ellipse cx="50" cy="12" rx="10" ry="11" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                    {/* Neck */}
                    <rect x="46" y="22" width="8" height="6" fill="url(#bodyGradient)" />
                    {/* Torso */}
                    <path d="M32 28 L68 28 L70 65 L60 70 L60 90 L40 90 L40 70 L30 65 Z" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                    {/* Arms */}
                    <path d="M32 28 L20 55 L24 56 L34 35" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                    <path d="M68 28 L80 55 L76 56 L66 35" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                    {/* Legs */}
                    <path d="M40 90 L38 115 L44 115 L48 90" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                    <path d="M60 90 L62 115 L56 115 L52 90" fill="url(#bodyGradient)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                  </g>

                  {/* Interactive Organ Zones */}
                  {bodyZones.map(zone => {
                    const colors = getRiskColor(zone.riskLevel);
                    const isHovered = hoveredZone === zone.id;
                    const isSelected = selectedZone?.id === zone.id;
                    const isHeart = zone.id === 'heart';

                    return (
                      <g
                        key={zone.id}
                        onClick={() => setSelectedZone(zone)}
                        onMouseEnter={() => setHoveredZone(zone.id)}
                        onMouseLeave={() => setHoveredZone(null)}
                        className="cursor-pointer transition-all"
                        style={{ 
                          transform: isHeart ? `scale(${heartbeatScale})` : 'scale(1)',
                          transformOrigin: `${zone.x}% ${zone.y}%`
                        }}
                      >
                        {/* Glow effect for warning/critical */}
                        {(zone.riskLevel === 'warning' || zone.riskLevel === 'critical') && (
                          <circle
                            cx={zone.x}
                            cy={zone.y}
                            r={Math.max(zone.width, zone.height) / 2 + 3}
                            fill={colors.glow}
                            opacity={0.2 + Math.sin(pulsePhase * 0.1) * 0.15}
                            filter="url(#pulseGlow)"
                          />
                        )}

                        {/* Zone hitbox */}
                        <circle
                          cx={zone.x}
                          cy={zone.y}
                          r={Math.max(zone.width, zone.height) / 2}
                          fill={colors.fill}
                          opacity={isSelected ? 0.6 : isHovered ? 0.4 : 0.2}
                          stroke={colors.stroke}
                          strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 1}
                          strokeDasharray={isSelected ? '' : '2,2'}
                          className="transition-all duration-200"
                        />

                        {/* Center icon indicator */}
                        <circle
                          cx={zone.x}
                          cy={zone.y}
                          r={3}
                          fill={colors.fill}
                          opacity={0.9}
                        />

                        {/* Quest indicator */}
                        {zone.activeQuests > 0 && (
                          <g>
                            <circle
                              cx={zone.x + zone.width / 3}
                              cy={zone.y - zone.height / 3}
                              r={2.5}
                              fill="hsl(var(--warning))"
                            />
                            <text
                              x={zone.x + zone.width / 3}
                              y={zone.y - zone.height / 3 + 1}
                              textAnchor="middle"
                              fontSize="3"
                              fill="black"
                              fontWeight="bold"
                            >
                              {zone.activeQuests}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Labels for hovered zone */}
                {hoveredZone && !selectedZone && (
                  <div 
                    className="absolute pointer-events-none bg-card/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl z-10 animate-fade-in"
                    style={{
                      left: `${bodyZones.find(z => z.id === hoveredZone)!.x}%`,
                      top: `${bodyZones.find(z => z.id === hoveredZone)!.y + 10}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {(() => {
                      const zone = bodyZones.find(z => z.id === hoveredZone)!;
                      const Icon = zone.icon;
                      return (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Icon className={`h-4 w-4 ${getScoreColor(zone.healthScore)}`} />
                          <span className="font-medium text-sm">{zone.nameVi}</span>
                          <Badge variant="outline" className={`text-[10px] ${getScoreColor(zone.healthScore)}`}>
                            {zone.healthScore}%
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                {[
                  { level: 'optimal', label: 'Optimal', color: 'bg-success' },
                  { level: 'caution', label: 'Caution', color: 'bg-info' },
                  { level: 'warning', label: 'Warning', color: 'bg-warning' },
                  { level: 'critical', label: 'Critical', color: 'bg-danger' }
                ].map(item => (
                  <div key={item.level} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Zone Detail Panel */}
          <div className="space-y-4">
            {selectedZone ? (
              <ZoneDetailPanel 
                zone={selectedZone} 
                onClose={() => setSelectedZone(null)}
                isPremium={isPremium}
                onUpgrade={onUpgrade}
              />
            ) : (
              <QuickOverviewPanel zones={bodyZones} onSelectZone={setSelectedZone} />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

// Zone Detail Panel Component
interface ZoneDetailPanelProps {
  zone: BodyZone;
  onClose: () => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

const ZoneDetailPanel: React.FC<ZoneDetailPanelProps> = ({ zone, onClose, isPremium, onUpgrade }) => {
  const Icon = zone.icon;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getStatusBadge = (status: 'normal' | 'borderline' | 'abnormal') => {
    switch (status) {
      case 'normal': return 'bg-success/10 text-success border-success/30';
      case 'borderline': return 'bg-warning/10 text-warning border-warning/30';
      case 'abnormal': return 'bg-danger/10 text-danger border-danger/30';
    }
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-b from-card to-primary/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Badge className="bg-primary/20 text-primary border border-primary/30">
            Level {zone.level}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${zone.riskLevel === 'warning' ? 'from-warning/20 to-warning/5' : zone.riskLevel === 'optimal' ? 'from-success/20 to-success/5' : 'from-danger/20 to-danger/5'}`}>
            <Icon className={`h-7 w-7 ${getScoreColor(zone.healthScore)}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">{zone.nameVi}</h3>
            <p className="text-xs text-muted-foreground">{zone.name}</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(zone.healthScore)}`}>
              {zone.healthScore}
            </div>
            <p className="text-[10px] text-muted-foreground">Health Score</p>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">XP Progress</span>
            <span className="text-primary">{zone.xp} / {zone.level * 200} XP</span>
          </div>
          <Progress value={(zone.xp / (zone.level * 200)) * 100} className="h-2" />
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Biomarkers */}
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Biomarkers
          </h4>
          <div className="space-y-2">
            {zone.biomarkers.map(marker => {
              const TrendIcon = getTrendIcon(marker.trend);
              return (
                <div key={marker.id} className={`p-3 rounded-xl border ${getStatusBadge(marker.status)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{marker.name}</p>
                      <p className="text-[10px] opacity-70">Range: {marker.range}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{marker.value} {marker.unit}</p>
                      <div className="flex items-center gap-1 text-[10px]">
                        <TrendIcon className="h-3 w-3" />
                        <span>{marker.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conditions */}
        {zone.conditions.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Active Conditions
            </h4>
            <div className="space-y-1">
              {zone.conditions.map((condition, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  <span className="text-sm">{condition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            Achievements
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {zone.achievements.map(achievement => (
              <div 
                key={achievement.id}
                className={`p-2 rounded-xl border text-center ${achievement.unlocked ? 'bg-warning/10 border-warning/30' : 'bg-muted/50 border-border'}`}
              >
                <div className="text-2xl mb-1">{achievement.icon}</div>
                <p className="text-[10px] font-medium truncate">{achievement.name}</p>
                {!achievement.unlocked && (
                  <Progress value={achievement.progress} className="h-1 mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Active Quests */}
        <Button className="w-full" variant={zone.activeQuests > 0 ? 'default' : 'outline'}>
          <Target className="h-4 w-4 mr-2" />
          {zone.activeQuests > 0 ? `${zone.activeQuests} Active Quests` : 'Start New Quest'}
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return TrendingUp;
    case 'down': return TrendingDown;
    default: return Minus;
  }
};

// Quick Overview Panel
interface QuickOverviewPanelProps {
  zones: BodyZone[];
  onSelectZone: (zone: BodyZone) => void;
}

const QuickOverviewPanel: React.FC<QuickOverviewPanelProps> = ({ zones, onSelectZone }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const sortedZones = [...zones].sort((a, b) => a.healthScore - b.healthScore);

  return (
    <Card className="border-2 border-border">
      <CardContent className="p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          System Status
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Click on an organ in the body map or select from the list below
        </p>
        
        <ScrollArea className="h-[500px] pr-2">
          <div className="space-y-2">
            {sortedZones.map(zone => {
              const Icon = zone.icon;
              return (
                <button
                  key={zone.id}
                  onClick={() => onSelectZone(zone)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${zone.riskLevel === 'warning' ? 'bg-warning/10' : zone.riskLevel === 'optimal' ? 'bg-success/10' : 'bg-danger/10'}`}>
                    <Icon className={`h-5 w-5 ${getScoreColor(zone.healthScore)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{zone.nameVi}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Progress value={zone.healthScore} className="h-1.5 flex-1 max-w-20" />
                      <span className={`text-xs font-bold ${getScoreColor(zone.healthScore)}`}>
                        {zone.healthScore}
                      </span>
                    </div>
                  </div>
                  {zone.activeQuests > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {zone.activeQuests} quests
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default GameHubLayout;

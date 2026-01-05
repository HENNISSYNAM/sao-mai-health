import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, CheckCircle2, AlertTriangle, FileText, 
  Activity, Heart, Brain, Crown, ArrowRight, Sparkles,
  Lock, Eye, Mic, Cloud, Timer
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface BioShieldIndexProps {
  score: number;
  profile: UserHealthProfile | null;
  onTaskClick?: (taskId: string) => void;
}

export const BioShieldIndex: React.FC<BioShieldIndexProps> = ({ score, profile, onTaskClick }) => {
  const { t } = useTranslation();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [heartbeatPhase, setHeartbeatPhase] = useState(0);

  // Animate score on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setAnimatedScore(prev => {
          if (prev >= score) {
            clearInterval(interval);
            return score;
          }
          return prev + 1;
        });
      }, 20);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [score]);

  // Heartbeat animation
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartbeatPhase(prev => (prev + 1) % 4);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const getScoreLevel = (s: number) => {
    if (s >= 90) return { label: t('biovault.bioShield.excellent', 'Xuất sắc'), color: 'text-success', bg: 'bg-success', pulseColor: 'rgba(34, 197, 94, 0.5)' };
    if (s >= 70) return { label: t('biovault.bioShield.good', 'Tốt'), color: 'text-info', bg: 'bg-info', pulseColor: 'rgba(59, 130, 246, 0.5)' };
    if (s >= 50) return { label: t('biovault.bioShield.fair', 'Trung bình'), color: 'text-warning', bg: 'bg-warning', pulseColor: 'rgba(234, 179, 8, 0.5)' };
    return { label: t('biovault.bioShield.needsWork', 'Cần cải thiện'), color: 'text-danger', bg: 'bg-danger', pulseColor: 'rgba(239, 68, 68, 0.5)' };
  };

  const level = getScoreLevel(score);

  // Heartbeat scale values
  const heartbeatScale = [1, 1.15, 1, 0.95][heartbeatPhase];

  const completionTasks = [
    { 
      id: 'ocular_scan', 
      label: t('biovault.bioShield.ocularScan', 'Quét Ánh mắt Tiên tri'),
      icon: Eye,
      completed: false,
      points: 30
    },
    { 
      id: 'acoustic_scan', 
      label: t('biovault.bioShield.acousticScan', 'Phân tích Thanh âm Hô hấp'),
      icon: Mic,
      completed: false,
      points: 25
    },
    { 
      id: 'environmental_sync', 
      label: t('biovault.bioShield.envSync', 'Đồng bộ Quy luật ẩn'),
      icon: Cloud,
      completed: false,
      points: 35
    },
    { 
      id: 'simulation_timeline', 
      label: t('biovault.bioShield.simulation', 'Kích hoạt Simulation Timeline'),
      icon: Timer,
      completed: false,
      points: 40,
      premium: true
    }
  ];

  const completedCount = completionTasks.filter(t => t.completed).length;

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-primary/5 overflow-hidden relative">
      {/* Animated Energy Field Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Pulse Rings emanating from center */}
        {[1, 2, 3, 4].map((ring) => (
          <div
            key={ring}
            className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-pulse-ring"
            style={{
              width: `${100 + ring * 80}px`,
              height: `${100 + ring * 80}px`,
              borderColor: level.pulseColor,
              animationDelay: `${ring * 0.3}s`,
              animationDuration: '2s',
              opacity: 0.3 - ring * 0.05
            }}
          />
        ))}
        
        {/* Floating particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary/40 animate-float"
            style={{
              left: `${10 + Math.random() * 30}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      <CardContent className="p-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Score Display with Heartbeat Pulse */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center">
            <div className="relative" style={{ transform: `scale(${heartbeatScale})`, transition: 'transform 0.15s ease-out' }}>
              {/* Outer Glow Ring */}
              <div 
                className="absolute -inset-4 rounded-full animate-pulse"
                style={{
                  background: `radial-gradient(circle, ${level.pulseColor} 0%, transparent 70%)`,
                }}
              />
              
              {/* Energy Pulse Rings */}
              <div 
                className="absolute -inset-2 rounded-full border-4 animate-ping opacity-30"
                style={{ borderColor: level.pulseColor }}
              />
              <div 
                className="absolute -inset-6 rounded-full border-2 animate-ping opacity-20"
                style={{ borderColor: level.pulseColor, animationDelay: '0.5s' }}
              />
              
              {/* Circular Progress */}
              <svg className="w-48 h-48 transform -rotate-90">
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - animatedScore / 100)}
                  className="transition-all duration-1000 ease-out"
                  filter="url(#glow)"
                />
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative">
                  <Shield className={`h-10 w-10 ${level.color}`} />
                  {/* Heartbeat glow on shield */}
                  <div 
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ 
                      background: level.pulseColor,
                      opacity: heartbeatPhase === 1 ? 0.6 : 0.2
                    }}
                  />
                </div>
                <span className={`text-5xl font-bold ${level.color} mt-2`}>{animatedScore}%</span>
                <span className="text-sm text-muted-foreground mt-1">Bio-Shield Index</span>
              </div>
            </div>
            
            <Badge className={`mt-6 ${level.bg} text-white text-sm px-4 py-1`}>
              <Heart className="h-4 w-4 mr-2 animate-pulse" />
              {level.label}
            </Badge>
          </div>

          {/* Completion Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('biovault.bioShield.starMapTasks', 'Nhiệm vụ Bản đồ sao')}
              </h3>
              <Badge variant="outline">
                {completedCount}/{completionTasks.length} {t('biovault.bioShield.completed', 'hoàn thành')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {completionTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => onTaskClick?.(task.id)}
                  className={`
                    flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                    ${task.completed 
                      ? 'bg-success/10 border-success/30' 
                      : 'bg-muted/30 border-border hover:border-primary/50 hover:bg-primary/5'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      task.completed ? 'bg-success/20' : 'bg-primary/10'
                    }`}>
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <task.icon className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <span className={`text-sm ${task.completed ? 'text-success line-through' : 'text-foreground'}`}>
                        {task.label}
                      </span>
                      {task.premium && (
                        <Badge className="ml-2 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                          <Crown className="h-2.5 w-2.5 mr-0.5" />
                          Premium
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    +{task.points} pts
                  </Badge>
                </div>
              ))}
            </div>

            {/* Premium CTA */}
            {score < 100 && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Crown className="h-8 w-8 text-amber-500" />
                      <div className="absolute inset-0 animate-ping bg-amber-500/30 rounded-full" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {t('biovault.bioShield.unlockPremium', 'Mở khóa tất cả tính năng Premium')}
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('biovault.bioShield.premiumDesc', 'Báo cáo PDF ~15 trang (ICD-11), Family Security Hub, Simulation Timeline')}
                      </p>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20">
                    {t('biovault.bioShield.upgrade', 'Nâng cấp')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.8;
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
};

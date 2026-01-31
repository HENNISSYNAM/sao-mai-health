import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, CheckCircle2, AlertTriangle, FileText, 
  Activity, Heart, Brain, Crown, ArrowRight, Sparkles,
  Eye, Scan, UserCheck
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface BioShieldIndexProps {
  score: number;
  profile: UserHealthProfile | null;
  faceScanCompleted?: boolean;
  retinaScanCompleted?: boolean;
}

export const BioShieldIndex: React.FC<BioShieldIndexProps> = ({ 
  score, 
  profile,
  faceScanCompleted = false,
  retinaScanCompleted = false
}) => {
  const { t } = useTranslation();
  const [animatedScore, setAnimatedScore] = useState(0);

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

  const getScoreLevel = (s: number) => {
    if (s >= 90) return { label: t('biovault.bioShield.excellent', 'Xuất sắc'), color: 'text-success', bg: 'bg-success' };
    if (s >= 70) return { label: t('biovault.bioShield.good', 'Tốt'), color: 'text-info', bg: 'bg-info' };
    if (s >= 50) return { label: t('biovault.bioShield.fair', 'Trung bình'), color: 'text-warning', bg: 'bg-warning' };
    return { label: t('biovault.bioShield.needsWork', 'Cần cải thiện'), color: 'text-destructive', bg: 'bg-destructive' };
  };

  const level = getScoreLevel(score);

  // Check if face scan metrics exist in profile
  const hasFaceScanMetrics = profile?.extractedMetrics.some(m => m.extractedFrom === 'Face 3D Scan') || faceScanCompleted;

  const completionTasks = [
    { 
      id: 'retina', 
      label: t('biovault.bioShield.retinaScan', 'Xác thực võng mạc'),
      completed: retinaScanCompleted,
      points: 15,
      icon: Eye
    },
    { 
      id: 'faceScan', 
      label: t('biovault.bioShield.faceScan', 'Quét 3D khuôn mặt'),
      completed: hasFaceScanMetrics,
      points: 25,
      icon: Scan
    },
    { 
      id: 'documents', 
      label: t('biovault.bioShield.uploadDocs', 'Tải lên hồ sơ y tế'),
      completed: (profile?.documents.length || 0) >= 1,
      points: 20,
      icon: FileText
    },
    { 
      id: 'allergies', 
      label: t('biovault.bioShield.addAllergies', 'Cập nhật thông tin dị ứng'),
      completed: (profile?.allergies.length || 0) > 0,
      points: 15,
      icon: AlertTriangle
    },
    { 
      id: 'conditions', 
      label: t('biovault.bioShield.addConditions', 'Khai báo bệnh nền'),
      completed: (profile?.chronicConditions.length || 0) > 0,
      points: 20,
      icon: Heart
    },
    { 
      id: 'metrics', 
      label: t('biovault.bioShield.extractMetrics', 'Trích xuất chỉ số sức khỏe'),
      completed: (profile?.extractedMetrics.length || 0) >= 3,
      points: 25,
      icon: Activity
    }
  ];

  const completedCount = completionTasks.filter(t => t.completed).length;

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-primary/5 overflow-hidden relative">
      {/* Premium Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse opacity-50" />
      
      <CardContent className="p-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Score Display */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center">
            <div className="relative">
              {/* Circular Progress */}
              <svg className="w-48 h-48 transform -rotate-90">
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
                />
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Shield className={`h-8 w-8 ${level.color} mb-1`} />
                <span className={`text-4xl font-bold ${level.color}`}>{animatedScore}%</span>
                <span className="text-sm text-muted-foreground mt-1">Bio-Shield Index</span>
              </div>
            </div>
            
            <Badge className={`mt-4 ${level.bg} text-white`}>
              {level.label}
            </Badge>
          </div>

          {/* Completion Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('biovault.bioShield.completionChecklist', 'Hoàn thiện hồ sơ')}
              </h3>
              <Badge variant="outline">
                {completedCount}/{completionTasks.length} {t('biovault.bioShield.completed', 'hoàn thành')}
              </Badge>
            </div>

            <div className="space-y-2">
              {completionTasks.map(task => (
                <div 
                  key={task.id}
                  className={`
                    flex items-center justify-between p-3 rounded-xl border transition-all
                    ${task.completed 
                      ? 'bg-success/10 border-success/30' 
                      : 'bg-muted/30 border-border hover:border-primary/30 cursor-pointer'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <task.icon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={`text-sm ${task.completed ? 'text-success line-through' : 'text-foreground'}`}>
                      {task.label}
                    </span>
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
                    <Crown className="h-6 w-6 text-amber-500" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {t('biovault.bioShield.unlockPremium', 'Mở khóa tất cả tính năng Premium')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('biovault.bioShield.premiumDesc', 'Báo cáo PDF chuyên sâu, tư vấn AI cá nhân hóa, và nhiều hơn nữa')}
                      </p>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                    {t('biovault.bioShield.upgrade', 'Nâng cấp')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, Mic, Cloud, Timer, Lock, CheckCircle2, 
  Sparkles, Star, Zap, ChevronRight, Crown
} from 'lucide-react';
import { OcularScanTask } from './tasks/OcularScanTask';
import { AcousticScanTask } from './tasks/AcousticScanTask';
import { EnvironmentalSyncTask } from './tasks/EnvironmentalSyncTask';
import { SimulationTimeline } from './tasks/SimulationTimeline';
import type { UserHealthProfile } from '@/pages/BioVault';

interface BioVaultTasksProps {
  profile: UserHealthProfile | null;
  onTaskComplete: (taskId: string, data: any) => void;
}

interface Task {
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  icon: React.ElementType;
  points: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  premium: boolean;
}

export const BioVaultTasks: React.FC<BioVaultTasksProps> = ({ profile, onTaskComplete }) => {
  const { t, i18n } = useTranslation();
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const tasks: Task[] = [
    {
      id: 'ocular_scan',
      name: 'Prophetic Eye Scan',
      nameVi: 'Quét Ánh mắt Tiên tri',
      description: 'Scan ocular membrane to analyze liver & blood health',
      descriptionVi: 'Quét niêm mạc mắt để phân tích sức khỏe Gan và Máu',
      icon: Eye,
      points: 30,
      status: completedTasks.includes('ocular_scan') ? 'completed' : 'available',
      premium: false
    },
    {
      id: 'acoustic_scan',
      name: 'Respiratory Acoustic Scan',
      nameVi: 'Phân tích Thanh âm Hô hấp',
      description: 'Analyze breathing sounds to predict sinusitis',
      descriptionVi: 'Phân tích tiếng thở để dự báo tình trạng Viêm xoang',
      icon: Mic,
      points: 25,
      status: completedTasks.includes('acoustic_scan') ? 'completed' : 'available',
      premium: false
    },
    {
      id: 'environmental_sync',
      name: 'Hidden Pattern Sync',
      nameVi: 'Đồng bộ Quy luật ẩn',
      description: 'Connect barometer & humidity for cardiovascular risk calculation',
      descriptionVi: 'Kết nối Barometer và Độ ẩm để tính xác suất rủi ro tim mạch',
      icon: Cloud,
      points: 35,
      status: completedTasks.includes('environmental_sync') ? 'completed' : 'available',
      premium: false
    },
    {
      id: 'simulation_timeline',
      name: 'Body Simulation Timeline',
      nameVi: 'Kích hoạt Simulation Timeline',
      description: 'Preview your body state in the next 24h based on weather forecast',
      descriptionVi: 'Xem trước trạng thái cơ thể trong 24h tới dựa trên dự báo thời tiết',
      icon: Timer,
      points: 40,
      status: completedTasks.includes('simulation_timeline') ? 'completed' : 'available',
      premium: true
    }
  ];

  const totalPoints = tasks.reduce((sum, task) => 
    completedTasks.includes(task.id) ? sum + task.points : sum, 0
  );
  const maxPoints = tasks.reduce((sum, task) => sum + task.points, 0);
  const completionPercentage = Math.round((totalPoints / maxPoints) * 100);

  const handleTaskComplete = (taskId: string, data: any) => {
    setCompletedTasks(prev => [...prev, taskId]);
    setActiveTask(null);
    onTaskComplete(taskId, data);
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-info/5 overflow-hidden">
      {/* Animated Star Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {t('biovault.tasks.title', 'Bản đồ sao nhiệm vụ')}
            </CardTitle>
            <CardDescription>
              {t('biovault.tasks.description', 'Hoàn thành để nâng cao Bio-Shield Index')}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold text-foreground">{totalPoints}</span>
              <span className="text-sm text-muted-foreground">/ {maxPoints} pts</span>
            </div>
            <Progress value={completionPercentage} className="w-32 h-2 mt-1" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map((task, index) => {
            const isCompleted = completedTasks.includes(task.id);
            const isActive = activeTask === task.id;
            
            return (
              <div
                key={task.id}
                className={`
                  relative p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer
                  ${isCompleted 
                    ? 'border-success/50 bg-success/10' 
                    : isActive 
                      ? 'border-primary bg-primary/10 ring-4 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'}
                `}
                onClick={() => !isCompleted && setActiveTask(isActive ? null : task.id)}
              >
                {/* Connection Line to Next Task */}
                {index < tasks.length - 1 && (
                  <div className="absolute -right-3 top-1/2 w-6 h-0.5 bg-gradient-to-r from-primary/50 to-transparent hidden md:block" />
                )}

                <div className="flex items-start gap-3">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                    ${isCompleted 
                      ? 'bg-success/20' 
                      : 'bg-primary/10'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    ) : (
                      <task.icon className="h-6 w-6 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold truncate ${isCompleted ? 'text-success' : 'text-foreground'}`}>
                        {i18n.language === 'vi' ? task.nameVi : task.name}
                      </h4>
                      {task.premium && (
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px]">
                          <Crown className="h-2.5 w-2.5 mr-0.5" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {i18n.language === 'vi' ? task.descriptionVi : task.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        +{task.points} pts
                      </Badge>
                      {!isCompleted && (
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isActive ? 'rotate-90' : ''}`} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Task Modal/Overlay */}
        {activeTask === 'ocular_scan' && (
          <OcularScanTask 
            onComplete={(data) => handleTaskComplete('ocular_scan', data)}
            onCancel={() => setActiveTask(null)}
          />
        )}
        {activeTask === 'acoustic_scan' && (
          <AcousticScanTask 
            onComplete={(data) => handleTaskComplete('acoustic_scan', data)}
            onCancel={() => setActiveTask(null)}
          />
        )}
        {activeTask === 'environmental_sync' && (
          <EnvironmentalSyncTask 
            profile={profile}
            onComplete={(data) => handleTaskComplete('environmental_sync', data)}
            onCancel={() => setActiveTask(null)}
          />
        )}
        {activeTask === 'simulation_timeline' && (
          <SimulationTimeline 
            profile={profile}
            onComplete={(data) => handleTaskComplete('simulation_timeline', data)}
            onCancel={() => setActiveTask(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};

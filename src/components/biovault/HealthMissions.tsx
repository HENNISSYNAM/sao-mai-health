import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, Heart, Brain, Activity, Droplets, Clock, 
  CheckCircle2, Circle, ArrowRight, Trophy, Flame,
  Calendar, TrendingUp, Zap, Crown, Lock, Play,
  Pause, RefreshCw, Star, Award
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface HealthMissionsProps {
  profile: UserHealthProfile | null;
  isPremium?: boolean;
  onMissionStart?: (missionId: string) => void;
  onMissionComplete?: (missionId: string) => void;
}

interface Mission {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  physiologicalGoal: string;
  icon: React.ElementType;
  category: 'cardiovascular' | 'metabolic' | 'cognitive' | 'recovery';
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  requiredInputs: string[];
  milestones: Milestone[];
  rewards: Reward[];
  status: 'locked' | 'available' | 'active' | 'completed';
  progress: number;
  currentStreak: number;
  isPremium: boolean;
}

interface Milestone {
  id: string;
  title: string;
  target: string;
  completed: boolean;
  current?: string;
}

interface Reward {
  type: 'badge' | 'insight' | 'report' | 'feature';
  name: string;
  icon: React.ElementType;
}

export const HealthMissions: React.FC<HealthMissionsProps> = ({
  profile,
  isPremium = false,
  onMissionStart,
  onMissionComplete
}) => {
  const { t } = useTranslation();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [activeMission, setActiveMission] = useState<string | null>('mission-bp');

  const missions: Mission[] = [
    {
      id: 'mission-bp',
      title: 'Blood Pressure Protocol',
      subtitle: 'Stabilize BP below 130/85',
      description: 'A 30-day intensive program to bring your blood pressure into the healthy range through medication adherence, lifestyle modifications, and stress management.',
      physiologicalGoal: 'Reduce systolic BP by 10mmHg and maintain Stage 1 threshold',
      icon: Heart,
      category: 'cardiovascular',
      duration: '30 days',
      difficulty: 'intermediate',
      requiredInputs: ['Daily BP readings', 'Medication logs', 'Salt intake', 'Sleep data'],
      milestones: [
        { id: 'm1', title: 'Week 1: Establish baseline', target: '7 daily BP readings', completed: true, current: '7/7' },
        { id: 'm2', title: 'Week 2: Medication adherence', target: '100% on time', completed: true, current: '100%' },
        { id: 'm3', title: 'Week 3: Reduce sodium', target: '<2000mg/day avg', completed: false, current: '2400mg' },
        { id: 'm4', title: 'Week 4: Achieve target', target: 'BP <130/85', completed: false }
      ],
      rewards: [
        { type: 'badge', name: 'Heart Guardian', icon: Trophy },
        { type: 'report', name: 'Cardiovascular Health PDF', icon: Award },
        { type: 'insight', name: 'Personal BP Pattern Analysis', icon: TrendingUp }
      ],
      status: 'active',
      progress: 65,
      currentStreak: 12,
      isPremium: false
    },
    {
      id: 'mission-glucose',
      title: 'Glucose Mastery',
      subtitle: 'Reverse pre-diabetic markers',
      description: 'A metabolic reset program focused on improving insulin sensitivity and stabilizing blood glucose through diet timing, exercise, and fasting protocols.',
      physiologicalGoal: 'Reduce HbA1c from 6.2% to below 5.7%',
      icon: Droplets,
      category: 'metabolic',
      duration: '90 days',
      difficulty: 'advanced',
      requiredInputs: ['Fasting glucose', 'Post-meal glucose', 'Meal photos', 'Exercise logs'],
      milestones: [
        { id: 'm1', title: 'Month 1: Learn patterns', target: '30 meal-glucose pairs logged', completed: false },
        { id: 'm2', title: 'Month 2: Optimize diet', target: 'Avg post-meal <140mg/dL', completed: false },
        { id: 'm3', title: 'Month 3: Verify progress', target: 'HbA1c retest', completed: false }
      ],
      rewards: [
        { type: 'badge', name: 'Metabolic Master', icon: Trophy },
        { type: 'feature', name: 'AI Meal Advisor', icon: Zap }
      ],
      status: 'available',
      progress: 0,
      currentStreak: 0,
      isPremium: false
    },
    {
      id: 'mission-stress',
      title: 'Stress Resilience',
      subtitle: 'Lower cortisol response by 25%',
      description: 'Build mental and physiological resilience through HRV training, breathing exercises, and sleep optimization.',
      physiologicalGoal: 'Improve HRV by 15ms and reduce resting heart rate',
      icon: Brain,
      category: 'cognitive',
      duration: '60 days',
      difficulty: 'intermediate',
      requiredInputs: ['HRV measurements', 'Stress logs', 'Sleep quality', 'Breathing sessions'],
      milestones: [
        { id: 'm1', title: 'Week 1-2: HRV baseline', target: 'Establish average', completed: false },
        { id: 'm2', title: 'Week 3-4: Breathing protocol', target: '10 min/day', completed: false },
        { id: 'm3', title: 'Week 5-8: Integration', target: 'HRV +15ms', completed: false }
      ],
      rewards: [
        { type: 'badge', name: 'Zen Master', icon: Trophy },
        { type: 'insight', name: 'Stress Pattern Report', icon: TrendingUp }
      ],
      status: 'locked',
      progress: 0,
      currentStreak: 0,
      isPremium: true
    },
    {
      id: 'mission-sleep',
      title: 'Deep Recovery',
      subtitle: 'Maximize regenerative sleep',
      description: 'Optimize your sleep architecture to enhance overnight recovery, hormone regulation, and cognitive restoration.',
      physiologicalGoal: 'Increase deep sleep to 20% of total sleep time',
      icon: Activity,
      category: 'recovery',
      duration: '21 days',
      difficulty: 'beginner',
      requiredInputs: ['Sleep duration', 'Wake time consistency', 'Sleep environment'],
      milestones: [
        { id: 'm1', title: 'Week 1: Fixed wake time', target: '7 days within 30min', completed: false },
        { id: 'm2', title: 'Week 2: Sleep hygiene', target: 'Complete checklist', completed: false },
        { id: 'm3', title: 'Week 3: Measure quality', target: 'Deep sleep +5%', completed: false }
      ],
      rewards: [
        { type: 'badge', name: 'Sleep Champion', icon: Trophy }
      ],
      status: 'locked',
      progress: 0,
      currentStreak: 0,
      isPremium: true
    }
  ];

  const getCategoryColor = (category: Mission['category']) => {
    switch (category) {
      case 'cardiovascular': return 'text-danger bg-danger/10 border-danger/30';
      case 'metabolic': return 'text-warning bg-warning/10 border-warning/30';
      case 'cognitive': return 'text-primary bg-primary/10 border-primary/30';
      case 'recovery': return 'text-success bg-success/10 border-success/30';
    }
  };

  const getDifficultyColor = (difficulty: Mission['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'bg-success/10 text-success';
      case 'intermediate': return 'bg-warning/10 text-warning';
      case 'advanced': return 'bg-danger/10 text-danger';
    }
  };

  const getStatusColor = (status: Mission['status']) => {
    switch (status) {
      case 'completed': return 'bg-success text-white';
      case 'active': return 'bg-primary text-white';
      case 'available': return 'bg-secondary text-foreground';
      case 'locked': return 'bg-muted text-muted-foreground';
    }
  };

  const handleStartMission = (mission: Mission) => {
    if (mission.isPremium && !isPremium) return;
    setActiveMission(mission.id);
    onMissionStart?.(mission.id);
  };

  return (
    <div className="space-y-6">
      {/* Active Mission Spotlight */}
      {activeMission && (
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 via-card to-primary/5 overflow-hidden">
          {(() => {
            const mission = missions.find(m => m.id === activeMission);
            if (!mission) return null;
            
            return (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <mission.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{mission.title}</CardTitle>
                        <CardDescription>{mission.subtitle}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="font-bold text-orange-500">{mission.currentStreak}</span>
                        <span className="text-xs text-muted-foreground">day streak</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Mission Progress</span>
                      <span className="font-bold text-primary">{mission.progress}%</span>
                    </div>
                    <Progress value={mission.progress} className="h-3" />
                  </div>

                  {/* Milestones */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {mission.milestones.map(milestone => (
                      <div
                        key={milestone.id}
                        className={`
                          p-3 rounded-xl border transition-all
                          ${milestone.completed 
                            ? 'bg-success/10 border-success/30' 
                            : 'bg-card border-border'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {milestone.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-xs font-medium truncate">{milestone.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{milestone.target}</p>
                        {milestone.current && (
                          <p className={`text-sm font-bold mt-1 ${milestone.completed ? 'text-success' : 'text-foreground'}`}>
                            {milestone.current}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button className="flex-1" variant="default">
                      <Play className="h-4 w-4 mr-2" />
                      Log Today's Data
                    </Button>
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            );
          })()}
        </Card>
      )}

      {/* All Missions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Health Missions
          </CardTitle>
          <CardDescription>
            Structured programs with measurable physiological outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map(mission => {
              const isLocked = mission.isPremium && !isPremium;
              const isActive = activeMission === mission.id;
              
              return (
                <button
                  key={mission.id}
                  onClick={() => !isLocked && setSelectedMission(mission)}
                  disabled={isLocked}
                  className={`
                    relative p-4 rounded-xl border text-left transition-all
                    ${isActive 
                      ? 'ring-2 ring-primary border-primary bg-primary/5' 
                      : isLocked
                        ? 'bg-muted/30 border-border cursor-not-allowed'
                        : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                    }
                  `}
                >
                  {/* Premium Lock Overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Premium</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryColor(mission.category)}`}>
                      <mission.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm truncate">{mission.title}</h4>
                        <Badge className={getDifficultyColor(mission.difficulty)} variant="secondary">
                          {mission.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{mission.subtitle}</p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {mission.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {mission.milestones.length} milestones
                        </span>
                      </div>

                      {mission.status === 'active' && (
                        <div className="mt-2">
                          <Progress value={mission.progress} className="h-1.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge 
                    className={`absolute top-3 right-3 ${getStatusColor(mission.status)}`}
                  >
                    {mission.status === 'active' ? `${mission.progress}%` : mission.status}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mission Details Modal */}
      {selectedMission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(selectedMission.category)}`}>
                    <selectedMission.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{selectedMission.title}</CardTitle>
                    <CardDescription>{selectedMission.subtitle}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMission(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            
            <ScrollArea className="max-h-[60vh]">
              <CardContent className="p-6 space-y-6">
                {/* Goal */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Physiological Goal
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedMission.physiologicalGoal}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Program Overview</h4>
                  <p className="text-sm text-muted-foreground">{selectedMission.description}</p>
                </div>

                {/* Required Inputs */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Required Data Inputs</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMission.requiredInputs.map(input => (
                      <Badge key={input} variant="secondary">{input}</Badge>
                    ))}
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Milestones</h4>
                  <div className="space-y-2">
                    {selectedMission.milestones.map(milestone => (
                      <div
                        key={milestone.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border
                          ${milestone.completed ? 'bg-success/10 border-success/30' : 'bg-card border-border'}
                        `}
                      >
                        {milestone.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{milestone.title}</p>
                          <p className="text-xs text-muted-foreground">{milestone.target}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rewards */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Rewards</h4>
                  <div className="flex gap-3">
                    {selectedMission.rewards.map((reward, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30"
                      >
                        <reward.icon className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">{reward.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </ScrollArea>

            <div className="border-t p-4">
              <Button
                className="w-full"
                onClick={() => {
                  handleStartMission(selectedMission);
                  setSelectedMission(null);
                }}
                disabled={selectedMission.status === 'active'}
              >
                {selectedMission.status === 'active' ? (
                  <>Mission In Progress</>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start This Mission
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

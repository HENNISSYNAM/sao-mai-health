import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Heart, Brain, Activity, Droplets, Wind, Zap,
  Moon, Coffee, Utensils, Dumbbell, TrendingUp, TrendingDown,
  ArrowRight, Lock, Crown, BarChart3, LineChart as LineChartIcon
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';
import type { UserHealthProfile } from '@/pages/BioVault';

interface MultiStateTwinProps {
  profile: UserHealthProfile | null;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

type TwinState = 'baseline' | 'stress' | 'metabolic' | 'recovery';

interface OrganState {
  id: string;
  name: string;
  icon: React.ElementType;
  scores: Record<TwinState, number>;
  predictions: Record<TwinState, string>;
}

interface WhatIfScenario {
  id: string;
  question: string;
  impact: string;
  riskChange: number;
}

export const MultiStateTwin: React.FC<MultiStateTwinProps> = ({
  profile,
  isPremium = false,
  onUpgrade
}) => {
  const { t } = useTranslation();
  const [activeTwin, setActiveTwin] = useState<TwinState>('baseline');
  const [compareMode, setCompareMode] = useState(false);
  const [compareTwin, setCompareTwin] = useState<TwinState>('stress');
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);

  const twinStates: { id: TwinState; label: string; icon: React.ElementType; description: string; color: string }[] = [
    { id: 'baseline', label: 'Baseline', icon: User, description: 'Resting state physiology', color: 'text-primary' },
    { id: 'stress', label: 'Stress', icon: Coffee, description: 'Under cognitive/physical load', color: 'text-danger' },
    { id: 'metabolic', label: 'Metabolic', icon: Utensils, description: 'Post-meal processing', color: 'text-warning' },
    { id: 'recovery', label: 'Recovery', icon: Moon, description: 'Sleep & regeneration', color: 'text-success' }
  ];

  const organStates: OrganState[] = [
    {
      id: 'brain',
      name: 'Brain & Nervous',
      icon: Brain,
      scores: { baseline: 78, stress: 62, metabolic: 75, recovery: 85 },
      predictions: {
        baseline: 'Cognitive function normal',
        stress: 'Elevated cortisol affecting focus',
        metabolic: 'Glucose processing stable',
        recovery: 'Neural repair active'
      }
    },
    {
      id: 'heart',
      name: 'Cardiovascular',
      icon: Heart,
      scores: { baseline: 72, stress: 55, metabolic: 68, recovery: 80 },
      predictions: {
        baseline: 'BP: 135/85 - Stage 1 hypertension',
        stress: 'Risk of spike under load (+15mmHg)',
        metabolic: 'Post-meal BP elevation expected',
        recovery: 'Nocturnal dipping impaired'
      }
    },
    {
      id: 'lungs',
      name: 'Respiratory',
      icon: Wind,
      scores: { baseline: 88, stress: 75, metabolic: 85, recovery: 92 },
      predictions: {
        baseline: 'SpO2 98% - Normal range',
        stress: 'Breathing rate may increase',
        metabolic: 'Stable oxygen delivery',
        recovery: 'Optimal gas exchange'
      }
    },
    {
      id: 'liver',
      name: 'Hepatic',
      icon: Activity,
      scores: { baseline: 82, stress: 78, metabolic: 65, recovery: 85 },
      predictions: {
        baseline: 'Enzyme levels normal',
        stress: 'Glycogen mobilization active',
        metabolic: 'Processing dietary load',
        recovery: 'Detoxification peak'
      }
    },
    {
      id: 'pancreas',
      name: 'Metabolic/Endocrine',
      icon: Droplets,
      scores: { baseline: 65, stress: 58, metabolic: 52, recovery: 70 },
      predictions: {
        baseline: 'Pre-diabetic markers present',
        stress: 'Insulin resistance elevated',
        metabolic: 'Post-prandial glucose spike risk',
        recovery: 'Hormonal recalibration'
      }
    }
  ];

  const whatIfScenarios: WhatIfScenario[] = [
    {
      id: 'exercise',
      question: 'What if I skip exercise today?',
      impact: 'Blood pressure may remain elevated. Recovery twin shows -5% overnight repair efficiency.',
      riskChange: +3
    },
    {
      id: 'medication',
      question: 'What if I delay Lisinopril by 4 hours?',
      impact: 'Stress twin cardiovascular score drops to 48. Peak BP could reach 150/95.',
      riskChange: +12
    },
    {
      id: 'meal',
      question: 'What if I have a high-carb dinner?',
      impact: 'Metabolic twin pancreas score drops to 45. 2hr post-meal glucose may exceed 140 mg/dL.',
      riskChange: +8
    }
  ];

  // Radar chart data for twin comparison
  const getRadarData = () => {
    return organStates.map(organ => ({
      organ: organ.name,
      [activeTwin]: organ.scores[activeTwin],
      ...(compareMode && { [compareTwin]: organ.scores[compareTwin] })
    }));
  };

  // Timeline data
  const getTimelineData = () => {
    const hours = ['6am', '9am', '12pm', '3pm', '6pm', '9pm', '12am'];
    return hours.map((hour, i) => ({
      time: hour,
      baseline: 75 + Math.sin(i * 0.5) * 10,
      stress: 65 + Math.sin(i * 0.8) * 15,
      metabolic: 70 + Math.cos(i * 0.6) * 12,
      recovery: 80 + Math.sin(i * 0.3) * 8
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success/10 border-success/30';
    if (score >= 60) return 'bg-warning/10 border-warning/30';
    return 'bg-danger/10 border-danger/30';
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Multi-State Digital Twin
            </CardTitle>
            <CardDescription>
              Predictive physiological modeling across different states
            </CardDescription>
          </div>
          {!isPremium && (
            <Button
              onClick={onUpgrade}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              <Crown className="h-4 w-4 mr-2" />
              Unlock All Twins
            </Button>
          )}
        </div>

        {/* Twin State Selector */}
        <div className="mt-4 flex flex-wrap gap-2">
          {twinStates.map((twin, index) => {
            const isLocked = !isPremium && index > 0;
            return (
              <button
                key={twin.id}
                onClick={() => !isLocked && setActiveTwin(twin.id)}
                disabled={isLocked}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                  ${activeTwin === twin.id 
                    ? 'bg-primary text-white border-primary' 
                    : isLocked
                      ? 'bg-muted/50 text-muted-foreground border-border cursor-not-allowed'
                      : 'bg-card border-border hover:border-primary/50'
                  }
                `}
              >
                {isLocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <twin.icon className="h-4 w-4" />
                )}
                <span className="font-medium">{twin.label}</span>
              </button>
            );
          })}
          
          {isPremium && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
              className={compareMode ? 'bg-primary/10 border-primary' : ''}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Compare
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Twin State Overview */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-center gap-3 mb-3">
            {React.createElement(twinStates.find(t => t.id === activeTwin)?.icon || User, {
              className: `h-6 w-6 ${twinStates.find(t => t.id === activeTwin)?.color}`
            })}
            <div>
              <h3 className="font-semibold">
                {twinStates.find(t => t.id === activeTwin)?.label} Twin
              </h3>
              <p className="text-sm text-muted-foreground">
                {twinStates.find(t => t.id === activeTwin)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Organ States Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {organStates.map(organ => {
            const score = organ.scores[activeTwin];
            const compareScore = compareMode ? organ.scores[compareTwin] : null;
            
            return (
              <button
                key={organ.id}
                onClick={() => setSelectedOrgan(organ.id)}
                className={`
                  p-4 rounded-xl border transition-all text-left hover:scale-[1.02]
                  ${selectedOrgan === organ.id 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'border-border hover:border-primary/50'
                  }
                  ${getScoreBg(score)}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <organ.icon className={`h-5 w-5 ${getScoreColor(score)}`} />
                    <span className="font-medium text-sm">{organ.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                      {score}
                    </span>
                    {compareScore !== null && (
                      <>
                        <span className="text-muted-foreground">/</span>
                        <span className={`text-sm ${getScoreColor(compareScore)}`}>
                          {compareScore}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {organ.predictions[activeTwin]}
                </p>
              </button>
            );
          })}
        </div>

        {/* Comparison Radar Chart */}
        {isPremium && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">State Comparison Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={getRadarData()}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="organ" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <Radar
                        name={activeTwin}
                        dataKey={activeTwin}
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                      {compareMode && (
                        <Radar
                          name={compareTwin}
                          dataKey={compareTwin}
                          stroke="hsl(var(--warning))"
                          fill="hsl(var(--warning))"
                          fillOpacity={0.2}
                        />
                      )}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">24-Hour State Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getTimelineData()}>
                      <XAxis 
                        dataKey="time" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <YAxis 
                        domain={[40, 100]}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey={activeTwin}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                      {compareMode && (
                        <Line
                          type="monotone"
                          dataKey={compareTwin}
                          stroke="hsl(var(--warning))"
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* What-If Scenarios */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              What-If Scenarios
              {!isPremium && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Premium</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {whatIfScenarios.map(scenario => (
                <div
                  key={scenario.id}
                  className={`
                    p-3 rounded-xl border transition-all
                    ${isPremium ? 'bg-card border-border hover:border-primary/50 cursor-pointer' : 'bg-muted/50 border-border blur-sm'}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{scenario.question}</p>
                    <Badge className={scenario.riskChange > 5 ? 'bg-danger' : 'bg-warning'}>
                      {scenario.riskChange > 0 ? '+' : ''}{scenario.riskChange}% risk
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{scenario.impact}</p>
                </div>
              ))}
            </div>
            
            {!isPremium && (
              <div className="mt-4 text-center">
                <Button onClick={onUpgrade} variant="outline" className="border-primary text-primary">
                  <Crown className="h-4 w-4 mr-2" />
                  Unlock Predictive Scenarios
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

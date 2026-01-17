import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, AlertTriangle, XCircle, TrendingDown, TrendingUp,
  ArrowRight, Bell, Shield, Activity, Heart, Brain, Droplets,
  Thermometer, Wind, Zap, Clock, ChevronRight
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface ClinicalDashboardProps {
  profile: UserHealthProfile | null;
  isPremium?: boolean;
  onActionClick?: (action: string) => void;
}

interface StatusAssessment {
  status: 'optimal' | 'attention' | 'warning' | 'critical';
  score: number;
  label: string;
  description: string;
}

interface TrendItem {
  id: string;
  name: string;
  current: number;
  previous: number;
  unit: string;
  trend: 'improving' | 'stable' | 'worsening';
  riskLevel: 'low' | 'medium' | 'high';
  icon: React.ElementType;
}

interface ActionItem {
  id: string;
  priority: 1 | 2 | 3;
  title: string;
  description: string;
  timeframe: string;
  type: 'medication' | 'lifestyle' | 'monitoring' | 'appointment';
}

export const ClinicalDashboard: React.FC<ClinicalDashboardProps> = ({
  profile,
  isPremium = false,
  onActionClick
}) => {
  const { t } = useTranslation();
  const [assessment, setAssessment] = useState<StatusAssessment | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Calculate real-time health assessment
  useEffect(() => {
    if (!profile) return;

    // Analyze profile to determine status
    const hasHighRiskConditions = profile.chronicConditions.some(c => 
      c.toLowerCase().includes('hypertension') || 
      c.toLowerCase().includes('diabetes')
    );
    
    const warningMetrics = profile.extractedMetrics.filter(m => m.riskLevel === 'warning').length;
    const criticalMetrics = profile.extractedMetrics.filter(m => m.riskLevel === 'critical').length;
    
    let status: StatusAssessment['status'] = 'optimal';
    let score = 92;
    
    if (criticalMetrics > 0) {
      status = 'critical';
      score = 35 + Math.random() * 15;
    } else if (warningMetrics > 2 || hasHighRiskConditions) {
      status = 'warning';
      score = 55 + Math.random() * 15;
    } else if (warningMetrics > 0) {
      status = 'attention';
      score = 72 + Math.random() * 10;
    }

    setAssessment({
      status,
      score: Math.round(score),
      label: getStatusLabel(status),
      description: getStatusDescription(status, profile)
    });

    // Build trend data
    setTrends([
      {
        id: 'bp',
        name: 'Blood Pressure',
        current: 135,
        previous: 142,
        unit: 'mmHg',
        trend: 'improving',
        riskLevel: 'medium',
        icon: Heart
      },
      {
        id: 'glucose',
        name: 'Blood Glucose',
        current: 108,
        previous: 102,
        unit: 'mg/dL',
        trend: 'worsening',
        riskLevel: 'medium',
        icon: Droplets
      },
      {
        id: 'hba1c',
        name: 'HbA1c',
        current: 6.4,
        previous: 6.1,
        unit: '%',
        trend: 'worsening',
        riskLevel: 'high',
        icon: Activity
      },
      {
        id: 'rhr',
        name: 'Resting Heart Rate',
        current: 72,
        previous: 74,
        unit: 'bpm',
        trend: 'stable',
        riskLevel: 'low',
        icon: Heart
      }
    ]);

    // Generate AI actions
    setActions([
      {
        id: 'a1',
        priority: 1,
        title: 'Take Lisinopril 10mg',
        description: 'Overdue by 2 hours. Critical for blood pressure management.',
        timeframe: 'Now',
        type: 'medication'
      },
      {
        id: 'a2',
        priority: 2,
        title: 'Log post-meal glucose',
        description: 'Track glucose response to optimize diet recommendations.',
        timeframe: 'After lunch',
        type: 'monitoring'
      },
      {
        id: 'a3',
        priority: 3,
        title: 'Schedule HbA1c retest',
        description: 'Rising trend detected. Early intervention recommended.',
        timeframe: 'This week',
        type: 'appointment'
      }
    ]);

  }, [profile]);

  // Animate score
  useEffect(() => {
    if (!assessment) return;
    let current = 0;
    const target = assessment.score;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        clearInterval(interval);
        setAnimatedScore(target);
      } else {
        setAnimatedScore(current);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [assessment]);

  const getStatusLabel = (status: StatusAssessment['status']) => {
    const labels = {
      optimal: 'All Systems Optimal',
      attention: 'Needs Attention',
      warning: 'Warning Detected',
      critical: 'Immediate Action Required'
    };
    return labels[status];
  };

  const getStatusDescription = (status: StatusAssessment['status'], profile: UserHealthProfile) => {
    switch (status) {
      case 'critical':
        return 'Critical biomarkers detected. Review recommended actions immediately.';
      case 'warning':
        return `${profile.chronicConditions.length} chronic conditions require monitoring. Follow your personalized protocol.`;
      case 'attention':
        return 'Minor fluctuations detected. Continue current health protocol.';
      default:
        return 'Your biomarkers are within healthy ranges. Keep up the good work.';
    }
  };

  const getStatusConfig = (status: StatusAssessment['status']) => {
    switch (status) {
      case 'optimal':
        return { 
          icon: CheckCircle2, 
          color: 'text-success', 
          bg: 'bg-success/10', 
          border: 'border-success/30',
          pulse: 'bg-success'
        };
      case 'attention':
        return { 
          icon: AlertTriangle, 
          color: 'text-warning', 
          bg: 'bg-warning/10', 
          border: 'border-warning/30',
          pulse: 'bg-warning'
        };
      case 'warning':
        return { 
          icon: AlertTriangle, 
          color: 'text-orange-500', 
          bg: 'bg-orange-500/10', 
          border: 'border-orange-500/30',
          pulse: 'bg-orange-500'
        };
      case 'critical':
        return { 
          icon: XCircle, 
          color: 'text-danger', 
          bg: 'bg-danger/10', 
          border: 'border-danger/30',
          pulse: 'bg-danger'
        };
    }
  };

  const getTrendIcon = (trend: TrendItem['trend'], riskLevel: TrendItem['riskLevel']) => {
    if (trend === 'worsening') return TrendingUp;
    if (trend === 'improving') return TrendingDown;
    return Activity;
  };

  const getTrendColor = (trend: TrendItem['trend'], riskLevel: TrendItem['riskLevel']) => {
    if (trend === 'worsening') return 'text-danger';
    if (trend === 'improving') return 'text-success';
    return 'text-muted-foreground';
  };

  const getActionTypeColor = (type: ActionItem['type']) => {
    switch (type) {
      case 'medication': return 'bg-danger/10 text-danger border-danger/30';
      case 'monitoring': return 'bg-info/10 text-info border-info/30';
      case 'lifestyle': return 'bg-success/10 text-success border-success/30';
      case 'appointment': return 'bg-warning/10 text-warning border-warning/30';
    }
  };

  if (!assessment) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-8">
          <div className="h-32 bg-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const config = getStatusConfig(assessment.status);
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Primary Status Card - Answer: "Am I okay right now?" */}
      <Card className={`relative overflow-hidden border-2 ${config.border} ${config.bg}`}>
        {/* Animated Status Pulse */}
        <div className="absolute top-4 right-4">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${config.pulse}`} />
            <div className={`absolute inset-0 rounded-full ${config.pulse} animate-ping opacity-75`} />
          </div>
        </div>

        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Status Indicator */}
            <div className="flex-shrink-0">
              <div className={`w-20 h-20 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center`}>
                <StatusIcon className={`h-10 w-10 ${config.color}`} />
              </div>
            </div>

            {/* Status Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className={`text-2xl font-bold ${config.color}`}>
                  {assessment.label}
                </h2>
                <Badge className={`${config.bg} ${config.color} border ${config.border}`}>
                  Score: {animatedScore}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">
                {assessment.description}
              </p>
              
              {/* Quick Vitals Strip */}
              <div className="flex flex-wrap gap-3">
                {profile?.vitalSigns.slice(0, 4).map(vital => (
                  <div 
                    key={vital.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border"
                  >
                    <Activity className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {vital.value} {vital.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Ring */}
            <div className="flex-shrink-0 hidden lg:block">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={`hsl(var(--${assessment.status === 'optimal' ? 'success' : assessment.status === 'attention' ? 'warning' : 'danger'}))`}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - animatedScore / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xl font-bold ${config.color}`}>{animatedScore}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Card - Answer: "What is trending worse?" */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Trending Biomarkers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trends.map(trend => {
              const TrendIcon = getTrendIcon(trend.trend, trend.riskLevel);
              const change = trend.current - trend.previous;
              const changePercent = ((change / trend.previous) * 100).toFixed(1);
              
              return (
                <div 
                  key={trend.id}
                  className={`
                    flex items-center justify-between p-3 rounded-xl border transition-all
                    ${trend.trend === 'worsening' ? 'bg-danger/5 border-danger/20' : 'bg-card border-border'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${trend.trend === 'worsening' ? 'bg-danger/10' : 'bg-muted'}
                    `}>
                      <trend.icon className={`h-5 w-5 ${getTrendColor(trend.trend, trend.riskLevel)}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{trend.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Previous: {trend.previous} {trend.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getTrendColor(trend.trend, trend.riskLevel)}`}>
                      {trend.current} {trend.unit}
                    </p>
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(trend.trend, trend.riskLevel)}`}>
                      <TrendIcon className="h-3 w-3" />
                      <span>{change > 0 ? '+' : ''}{changePercent}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {!isPremium && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground text-center">
                  <span className="text-primary font-medium">Unlock Premium</span> for predictive trend analysis
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card - Answer: "What should I do next?" */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-warning" />
                Next Actions
              </CardTitle>
              <Badge variant="secondary">{actions.length} pending</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => onActionClick?.(action.id)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                  hover:scale-[1.01] hover:shadow-md
                  ${action.priority === 1 ? 'bg-danger/5 border-danger/30' : 'bg-card border-border hover:border-primary/30'}
                `}
              >
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                  ${action.priority === 1 ? 'bg-danger text-white' : action.priority === 2 ? 'bg-warning text-black' : 'bg-muted text-foreground'}
                `}>
                  {action.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${action.priority === 1 ? 'text-danger' : ''}`}>
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {action.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    {action.timeframe}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}

            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => onActionClick?.('all')}
            >
              View All Actions
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

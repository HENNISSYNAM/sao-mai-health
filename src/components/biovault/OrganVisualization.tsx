import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, Heart, Wind, Activity, Droplets, 
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Minus, Eye, Info, ChevronRight, Zap
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface OrganVisualizationProps {
  profile: UserHealthProfile | null;
  onOrganSelect?: (organId: string) => void;
}

interface OrganData {
  id: string;
  name: string;
  icon: React.ElementType;
  healthScore: number;
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  biomarkers: Biomarker[];
  riskFactors: string[];
  recommendations: string[];
}

interface Biomarker {
  name: string;
  value: string;
  unit: string;
  range: string;
  status: 'normal' | 'borderline' | 'abnormal';
}

export const OrganVisualization: React.FC<OrganVisualizationProps> = ({
  profile,
  onOrganSelect
}) => {
  const { t } = useTranslation();
  const [selectedOrgan, setSelectedOrgan] = useState<string>('heart');
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});

  const organs: OrganData[] = [
    {
      id: 'brain',
      name: 'Brain & Nervous System',
      icon: Brain,
      healthScore: 78,
      trend: 'stable',
      riskLevel: 'medium',
      biomarkers: [
        { name: 'Cognitive Score', value: '78', unit: '/100', range: '80-100', status: 'borderline' },
        { name: 'Sleep Quality', value: '72', unit: '%', range: '85-100%', status: 'borderline' },
        { name: 'Stress Index', value: 'Moderate', unit: '', range: 'Low', status: 'borderline' }
      ],
      riskFactors: ['Hypertension affecting cerebral perfusion', 'Elevated cortisol from stress'],
      recommendations: ['Monitor BP closely to prevent stroke risk', 'Consider stress management protocol']
    },
    {
      id: 'heart',
      name: 'Cardiovascular System',
      icon: Heart,
      healthScore: 68,
      trend: 'improving',
      riskLevel: 'high',
      biomarkers: [
        { name: 'Blood Pressure', value: '135/85', unit: 'mmHg', range: '<120/80', status: 'abnormal' },
        { name: 'Resting HR', value: '72', unit: 'bpm', range: '60-80', status: 'normal' },
        { name: 'Total Cholesterol', value: '210', unit: 'mg/dL', range: '<200', status: 'borderline' },
        { name: 'LDL', value: '130', unit: 'mg/dL', range: '<100', status: 'abnormal' }
      ],
      riskFactors: ['Stage 1 Hypertension', 'Elevated LDL cholesterol', 'Pre-diabetic state affecting vessels'],
      recommendations: ['Continue Lisinopril as prescribed', 'Reduce sodium to <2000mg/day', 'Add 30min daily cardio']
    },
    {
      id: 'lungs',
      name: 'Respiratory System',
      icon: Wind,
      healthScore: 85,
      trend: 'stable',
      riskLevel: 'low',
      biomarkers: [
        { name: 'SpO2', value: '98', unit: '%', range: '95-100%', status: 'normal' },
        { name: 'Respiratory Rate', value: '16', unit: '/min', range: '12-20', status: 'normal' },
        { name: 'Peak Flow', value: '450', unit: 'L/min', range: '400-600', status: 'normal' }
      ],
      riskFactors: ['Sinusitis may affect upper airways', 'Urban air quality exposure'],
      recommendations: ['Continue nasal hygiene routine', 'Wear N95 on high AQI days']
    },
    {
      id: 'liver',
      name: 'Hepatic System',
      icon: Activity,
      healthScore: 82,
      trend: 'stable',
      riskLevel: 'low',
      biomarkers: [
        { name: 'ALT', value: '32', unit: 'U/L', range: '7-56', status: 'normal' },
        { name: 'AST', value: '28', unit: 'U/L', range: '10-40', status: 'normal' },
        { name: 'Bilirubin', value: '0.8', unit: 'mg/dL', range: '0.1-1.2', status: 'normal' }
      ],
      riskFactors: ['Metformin may require liver monitoring', 'Watch for fatty liver with pre-diabetes'],
      recommendations: ['Annual liver function test', 'Limit alcohol to <2 drinks/week']
    },
    {
      id: 'pancreas',
      name: 'Metabolic/Endocrine',
      icon: Droplets,
      healthScore: 58,
      trend: 'declining',
      riskLevel: 'high',
      biomarkers: [
        { name: 'Fasting Glucose', value: '108', unit: 'mg/dL', range: '<100', status: 'abnormal' },
        { name: 'HbA1c', value: '6.2', unit: '%', range: '<5.7%', status: 'abnormal' },
        { name: 'HOMA-IR', value: '3.2', unit: '', range: '<2.5', status: 'abnormal' }
      ],
      riskFactors: ['Pre-diabetic range confirmed', 'Insulin resistance detected', 'Family history factor'],
      recommendations: ['Start Glucose Mastery Mission', 'Consider intermittent fasting', 'Retest HbA1c in 3 months']
    }
  ];

  // Animate scores
  useEffect(() => {
    organs.forEach(organ => {
      let current = 0;
      const target = organ.healthScore;
      const interval = setInterval(() => {
        current += 2;
        if (current >= target) {
          clearInterval(interval);
          setAnimatedScores(prev => ({ ...prev, [organ.id]: target }));
        } else {
          setAnimatedScores(prev => ({ ...prev, [organ.id]: current }));
        }
      }, 20);
    });
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-success/20 to-success/5';
    if (score >= 60) return 'from-warning/20 to-warning/5';
    return 'from-danger/20 to-danger/5';
  };

  const getRiskColor = (level: OrganData['riskLevel']) => {
    switch (level) {
      case 'low': return 'bg-success/10 text-success border-success/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'high': return 'bg-danger/10 text-danger border-danger/30';
      case 'critical': return 'bg-danger text-white border-danger';
    }
  };

  const getTrendIcon = (trend: OrganData['trend']) => {
    switch (trend) {
      case 'improving': return TrendingUp;
      case 'declining': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: OrganData['trend']) => {
    switch (trend) {
      case 'improving': return 'text-success';
      case 'declining': return 'text-danger';
      default: return 'text-muted-foreground';
    }
  };

  const getBiomarkerColor = (status: Biomarker['status']) => {
    switch (status) {
      case 'normal': return 'bg-success/10 text-success';
      case 'borderline': return 'bg-warning/10 text-warning';
      case 'abnormal': return 'bg-danger/10 text-danger';
    }
  };

  const selectedOrganData = organs.find(o => o.id === selectedOrgan);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 3D Organ Selector */}
      <Card className="lg:col-span-1 border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Organ Systems</CardTitle>
          <CardDescription>Select an organ for detailed analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {organs.map(organ => {
            const score = animatedScores[organ.id] || 0;
            const TrendIcon = getTrendIcon(organ.trend);
            const isSelected = selectedOrgan === organ.id;
            
            return (
              <button
                key={organ.id}
                onClick={() => {
                  setSelectedOrgan(organ.id);
                  onOrganSelect?.(organ.id);
                }}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                  ${isSelected 
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                {/* Organ Icon with Score Ring */}
                <div className="relative flex-shrink-0">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    bg-gradient-to-br ${getScoreBgColor(organ.healthScore)}
                  `}>
                    <organ.icon className={`h-6 w-6 ${getScoreColor(organ.healthScore)}`} />
                  </div>
                  {organ.riskLevel === 'high' || organ.riskLevel === 'critical' ? (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger flex items-center justify-center">
                      <AlertTriangle className="h-2.5 w-2.5 text-white" />
                    </div>
                  ) : null}
                </div>

                {/* Organ Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{organ.name}</span>
                    <TrendIcon className={`h-3 w-3 ${getTrendColor(organ.trend)}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress 
                      value={score} 
                      className="h-1.5 flex-1" 
                    />
                    <span className={`text-xs font-bold ${getScoreColor(organ.healthScore)}`}>
                      {score}
                    </span>
                  </div>
                </div>

                <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Organ Detail View */}
      {selectedOrganData && (
        <Card className="lg:col-span-2 border-2 border-border">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center
                  bg-gradient-to-br ${getScoreBgColor(selectedOrganData.healthScore)}
                `}>
                  <selectedOrganData.icon className={`h-8 w-8 ${getScoreColor(selectedOrganData.healthScore)}`} />
                </div>
                <div>
                  <CardTitle className="text-xl">{selectedOrganData.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRiskColor(selectedOrganData.riskLevel)}>
                      {selectedOrganData.riskLevel.toUpperCase()} RISK
                    </Badge>
                    <Badge variant="outline" className={getTrendColor(selectedOrganData.trend)}>
                      {React.createElement(getTrendIcon(selectedOrganData.trend), { className: 'h-3 w-3 mr-1' })}
                      {selectedOrganData.trend}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-4xl font-bold ${getScoreColor(selectedOrganData.healthScore)}`}>
                  {animatedScores[selectedOrganData.id] || 0}
                </span>
                <p className="text-xs text-muted-foreground">Health Score</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Biomarkers Grid */}
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Key Biomarkers
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {selectedOrganData.biomarkers.map(marker => (
                  <div
                    key={marker.name}
                    className={`p-3 rounded-xl border ${getBiomarkerColor(marker.status)} border-current/20`}
                  >
                    <p className="text-xs opacity-80 mb-1">{marker.name}</p>
                    <p className="text-lg font-bold">
                      {marker.value}
                      <span className="text-xs font-normal ml-1">{marker.unit}</span>
                    </p>
                    <p className="text-xs opacity-60 mt-1">Range: {marker.range}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Risk Factors Detected
              </h4>
              <div className="space-y-2">
                {selectedOrganData.riskFactors.map((factor, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20"
                  >
                    <div className="w-6 h-6 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-warning">{i + 1}</span>
                    </div>
                    <p className="text-sm">{factor}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                AI Recommendations
              </h4>
              <div className="space-y-2">
                {selectedOrganData.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <Button className="w-full">
              Start Improvement Protocol
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

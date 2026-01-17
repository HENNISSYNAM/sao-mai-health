/**
 * ENVIRONMENTAL CONTEXT PANEL
 * 
 * Displays real-time environmental factors and their physiological impact.
 * Designed for integration with the Digital Twin Command Center.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Cloud, Droplets, Thermometer, Wind, Sun, Gauge, MapPin,
  RefreshCw, AlertTriangle, Shield, Heart, Brain, Activity,
  Bone, ChevronDown, ChevronUp, Clock, Zap, Eye
} from 'lucide-react';
import { useEnvironmentContext } from '@/hooks/useEnvironmentContext';
import type { PhysiologicalStressFactors, StressTrigger } from '@/lib/environmentalContext';

interface EnvironmentalContextPanelProps {
  compact?: boolean;
  userProfile?: {
    age?: number;
    chronicConditions?: string[];
    allergies?: string[];
    medications?: string[];
  };
  onStressChange?: (stress: PhysiologicalStressFactors) => void;
}

// Color coding for stress levels
const getStressColor = (value: number) => {
  if (value < 25) return 'text-success';
  if (value < 40) return 'text-info';
  if (value < 55) return 'text-warning';
  if (value < 75) return 'text-orange-500';
  return 'text-danger';
};

const getStressBg = (value: number) => {
  if (value < 25) return 'bg-success/10 border-success/30';
  if (value < 40) return 'bg-info/10 border-info/30';
  if (value < 55) return 'bg-warning/10 border-warning/30';
  if (value < 75) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-danger/10 border-danger/30';
};

const getSeverityColor = (severity: StressTrigger['severity']) => {
  switch (severity) {
    case 'critical': return 'bg-danger/20 text-danger border-danger/30';
    case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case 'moderate': return 'bg-warning/20 text-warning border-warning/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

export const EnvironmentalContextPanel: React.FC<EnvironmentalContextPanelProps> = ({
  compact = false,
  userProfile,
  onStressChange
}) => {
  const {
    environment,
    stress,
    isLoading,
    error,
    lastUpdated,
    refresh,
    freshness
  } = useEnvironmentContext({ userProfile });

  const [expanded, setExpanded] = useState(!compact);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);

  // Notify parent of stress changes
  React.useEffect(() => {
    if (stress && onStressChange) {
      onStressChange(stress);
    }
  }, [stress, onStressChange]);

  if (error && !environment) {
    return (
      <Card className="border-danger/30 bg-danger/5">
        <CardContent className="p-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <span className="text-sm text-danger">Failed to load environment data</span>
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!environment || !stress) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </CardContent>
      </Card>
    );
  }

  const systemStress = [
    {
      id: 'cardiovascular',
      name: 'Cardiovascular',
      icon: Heart,
      value: stress.cardiovascular.bloodPressureLoad,
      triggers: stress.cardiovascular.triggers
    },
    {
      id: 'respiratory',
      name: 'Respiratory',
      icon: Wind,
      value: stress.respiratory.airwayIrritation,
      triggers: stress.respiratory.triggers
    },
    {
      id: 'neurological',
      name: 'Neurological',
      icon: Brain,
      value: stress.neurological.cognitiveLoad,
      triggers: stress.neurological.triggers
    },
    {
      id: 'metabolic',
      name: 'Metabolic',
      icon: Activity,
      value: stress.metabolic.thermoregulationLoad,
      triggers: stress.metabolic.triggers
    },
    {
      id: 'immune',
      name: 'Immune',
      icon: Shield,
      value: stress.immune.inflammatoryLoad,
      triggers: stress.immune.triggers
    },
    {
      id: 'musculoskeletal',
      name: 'Musculoskeletal',
      icon: Bone,
      value: stress.musculoskeletal.jointPressure,
      triggers: stress.musculoskeletal.triggers
    }
  ];

  return (
    <TooltipProvider>
      <Card className="border-primary/20 overflow-hidden">
        {/* Compact Header */}
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Environment Context</CardTitle>
              <Badge 
                variant="outline" 
                className={`text-[10px] ${
                  freshness === 'live' ? 'bg-success/10 text-success' :
                  freshness === 'recent' ? 'bg-info/10 text-info' :
                  freshness === 'cached' ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}
              >
                {freshness}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refresh}
                disabled={isLoading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExpanded(!expanded)}
                className="h-6 w-6 p-0"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-0 space-y-3">
          {/* Quick Environment Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { 
                icon: Thermometer, 
                label: 'Temp', 
                value: `${environment.weather.temperature}°`, 
                warning: environment.weather.temperature > 35 
              },
              { 
                icon: Droplets, 
                label: 'Humidity', 
                value: `${environment.weather.humidity}%`, 
                warning: environment.weather.humidity > 85 
              },
              { 
                icon: Gauge, 
                label: 'Pressure', 
                value: `${environment.weather.pressure.toFixed(0)}`, 
                warning: environment.weather.pressure < 1010 
              },
              { 
                icon: Wind, 
                label: 'AQI', 
                value: `${environment.airQuality.aqi}`, 
                warning: environment.airQuality.aqi > 75 
              }
            ].map((stat, i) => (
              <div 
                key={i} 
                className={`p-2 rounded-lg text-center transition-all ${
                  stat.warning ? 'bg-warning/10 border border-warning/30' : 'bg-muted/50'
                }`}
              >
                <stat.icon className={`h-3 w-3 mx-auto mb-0.5 ${stat.warning ? 'text-warning' : 'text-muted-foreground'}`} />
                <p className={`text-xs font-medium ${stat.warning ? 'text-warning' : ''}`}>{stat.value}</p>
                <p className="text-[9px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Overall Stress Index */}
          <div className={`p-2 rounded-lg border ${getStressBg(stress.overall.stressIndex)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Environmental Stress Index</span>
              <span className={`text-sm font-bold ${getStressColor(stress.overall.stressIndex)}`}>
                {stress.overall.stressIndex}%
              </span>
            </div>
            <Progress 
              value={stress.overall.stressIndex} 
              className="h-1.5"
            />
          </div>

          {expanded && (
            <>
              {/* System-by-System Stress */}
              <div className="grid grid-cols-3 gap-2">
                {systemStress.map((system) => (
                  <Tooltip key={system.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSelectedSystem(
                          selectedSystem === system.id ? null : system.id
                        )}
                        className={`p-2 rounded-lg border text-left transition-all hover:scale-105 ${
                          selectedSystem === system.id 
                            ? 'ring-2 ring-primary' 
                            : ''
                        } ${getStressBg(system.value)}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <system.icon className={`h-3 w-3 ${getStressColor(system.value)}`} />
                          <span className="text-[10px] truncate">{system.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Progress value={system.value} className="h-1 flex-1 mr-1" />
                          <span className={`text-xs font-bold ${getStressColor(system.value)}`}>
                            {system.value}
                          </span>
                        </div>
                        {system.triggers.length > 0 && (
                          <Badge variant="outline" className="mt-1 text-[8px] h-4">
                            {system.triggers.length} trigger{system.triggers.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium mb-1">{system.name} Stress</p>
                      {system.triggers.length > 0 ? (
                        <ul className="text-xs space-y-1">
                          {system.triggers.slice(0, 3).map((t, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {t.description}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">No active stress triggers</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Selected System Details */}
              {selectedSystem && (
                <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{selectedSystem} Stress Details</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedSystem(null)}
                      className="h-5 w-5 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  
                  {systemStress.find(s => s.id === selectedSystem)?.triggers.map((trigger, i) => (
                    <div 
                      key={i} 
                      className={`p-2 rounded border text-xs ${getSeverityColor(trigger.severity)}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <Badge variant="outline" className="text-[9px] h-4">
                          {trigger.severity}
                        </Badge>
                        <span className="font-medium">{trigger.factor}</span>
                      </div>
                      <p className="text-[11px] opacity-80">{trigger.description}</p>
                    </div>
                  )) || (
                    <p className="text-xs text-muted-foreground">No stress triggers detected</p>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {stress.overall.recommendedActions.length > 0 && (
                <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-[10px] font-medium text-primary mb-1 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Recommended Actions
                  </p>
                  <ul className="text-xs space-y-0.5">
                    {stress.overall.recommendedActions.map((action, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Time Context */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>{environment.location.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{environment.timeContext.dayPhase} • {environment.timeContext.season}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-3 w-3" />
                  <span>UV {environment.weather.uvIndex}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default EnvironmentalContextPanel;

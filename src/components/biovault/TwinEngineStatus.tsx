import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Brain, Heart, Wind, Zap, Shield, Activity,
  RefreshCw, AlertTriangle, TrendingUp, Clock,
  Thermometer, Droplets, Gauge, Footprints, Hand, Scale, Radio
} from 'lucide-react';
import type { DeviceSensorsState } from '@/hooks/useDeviceSensors';

interface HealthSystem {
  id: string;
  name: string;
  status: 'optimal' | 'good' | 'caution' | 'warning' | 'critical';
  score: number;
  factors: string[];
  recommendations: string[];
}

interface TwinAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  title: string;
  message: string;
}

interface TwinPrediction {
  timeframe: string;
  type: string;
  probability: number;
  description: string;
  preventiveActions: string[];
}

interface TwinState {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  systems: HealthSystem[];
  activeAlerts: TwinAlert[];
  predictions: TwinPrediction[];
  context: {
    environment?: {
      temperature?: number;
      humidity?: number;
      aqi?: number;
    };
  };
  lastUpdated: string;
}

interface TwinEngineStatusProps {
  state: TwinState | null;
  isProcessing: boolean;
  inputQueueLength: number;
  onRefresh: () => void;
  sensorData?: DeviceSensorsState | null;
}

const systemIcons: Record<string, React.ReactNode> = {
  cardiovascular: <Heart className="h-4 w-4" />,
  respiratory: <Wind className="h-4 w-4" />,
  nervous: <Brain className="h-4 w-4" />,
  metabolic: <Zap className="h-4 w-4" />,
  immune: <Shield className="h-4 w-4" />,
  musculoskeletal: <Activity className="h-4 w-4" />
};

const statusColors: Record<string, string> = {
  optimal: 'bg-success text-success-foreground',
  good: 'bg-info text-info-foreground',
  caution: 'bg-warning text-warning-foreground',
  warning: 'bg-orange-500 text-white',
  critical: 'bg-danger text-danger-foreground'
};

const riskColors: Record<string, string> = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-orange-500',
  critical: 'text-danger'
};

export const TwinEngineStatus: React.FC<TwinEngineStatusProps> = ({
  state,
  isProcessing,
  inputQueueLength,
  onRefresh,
  sensorData
}) => {
  if (!state) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground animate-pulse" />
          <p className="mt-4 text-muted-foreground">Đang khởi tạo Digital Twin Engine...</p>
        </CardContent>
      </Card>
    );
  }

  const activeSensors = sensorData
    ? Object.values(sensorData.status).filter(s => s.isActive).length
    : 0;
  const totalSensors = 4;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={`border-2 ${state.riskLevel === 'low' ? 'border-success/30' : state.riskLevel === 'medium' ? 'border-warning/30' : 'border-danger/30'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Digital Twin AI Engine
            </CardTitle>
            <div className="flex items-center gap-2">
              {inputQueueLength > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {inputQueueLength} đang chờ
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onRefresh}
                disabled={isProcessing}
              >
                <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Score Circle */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                  strokeDasharray={`${state.overallScore * 2.51} 251`} className={riskColors[state.riskLevel]} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${riskColors[state.riskLevel]}`}>{state.overallScore}</span>
              </div>
            </div>

            {/* Status Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[state.systems[0]?.status || 'good']}>
                  {state.riskLevel === 'low' ? 'Ổn định' : 
                   state.riskLevel === 'medium' ? 'Cần chú ý' :
                   state.riskLevel === 'high' ? 'Cảnh báo' : 'Nguy hiểm'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {new Date(state.lastUpdated).toLocaleTimeString('vi-VN')}
                </span>
              </div>
              
              {/* Environment quick view */}
              {state.context.environment && (
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {state.context.environment.temperature && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      {Math.round(state.context.environment.temperature)}°C
                    </span>
                  )}
                  {state.context.environment.humidity && (
                    <span className="flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      {Math.round(state.context.environment.humidity)}%
                    </span>
                  )}
                  {state.context.environment.aqi && (
                    <span className={`flex items-center gap-1 ${state.context.environment.aqi > 100 ? 'text-warning' : ''}`}>
                      <Gauge className="h-3 w-3" />
                      AQI {Math.round(state.context.environment.aqi)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Sensors Section */}
      {sensorData && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              Cảm biến thiết bị
              <Badge variant="outline" className="text-xs ml-auto">
                {activeSensors}/{totalSensors} hoạt động
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Footprints className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Bước chân</p>
                  <p className="text-sm font-bold">{sensorData.health.steps}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Activity className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Vận động</p>
                  <p className="text-sm font-bold capitalize">
                    {sensorData.health.activityLevel === 'sedentary' ? 'Ít' :
                     sensorData.health.activityLevel === 'light' ? 'Nhẹ' :
                     sensorData.health.activityLevel === 'moderate' ? 'TB' : 'Cao'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Scale className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Thăng bằng</p>
                  <p className="text-sm font-bold">{Math.round(sensorData.health.balanceScore)}/100</p>
                </div>
              </div>
            </div>

            {/* Sensor alerts */}
            {(sensorData.health.tremorDetected || sensorData.health.fallDetected || sensorData.health.balanceScore < 60) && (
              <div className="space-y-1.5">
                {sensorData.health.fallDetected && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-danger/10 border border-danger/30 text-sm">
                    <AlertTriangle className="h-4 w-4 text-danger" />
                    <span className="font-medium text-danger">Phát hiện té ngã!</span>
                  </div>
                )}
                {sensorData.health.tremorDetected && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                    <Hand className="h-4 w-4 text-warning" />
                    <span>Run tay: {(sensorData.health.tremorIntensity * 100).toFixed(0)}%</span>
                  </div>
                )}
                {sensorData.health.balanceScore < 60 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                    <Scale className="h-4 w-4 text-warning" />
                    <span>Thăng bằng thấp: {Math.round(sensorData.health.balanceScore)}/100</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Health Systems Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {state.systems.map((system) => (
          <Card key={system.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded ${statusColors[system.status]}`}>
                  {systemIcons[system.id]}
                </div>
                <span className="text-sm font-medium">{system.name}</span>
              </div>
              <Progress value={system.score} className="h-1.5 mb-1" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{system.score}%</span>
                <span>{system.status === 'optimal' ? 'Tối ưu' : 
                       system.status === 'good' ? 'Tốt' :
                       system.status === 'caution' ? 'Chú ý' :
                       system.status === 'warning' ? 'Cảnh báo' : 'Nguy hiểm'}</span>
              </div>
              {system.factors.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{system.factors[0]}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Alerts */}
      {state.activeAlerts.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Cảnh báo đang hoạt động ({state.activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.activeAlerts.map((alert) => (
              <div key={alert.id} className={`p-2 rounded text-sm ${
                alert.severity === 'critical' ? 'bg-danger/10 border-l-2 border-danger' :
                alert.severity === 'danger' ? 'bg-orange-500/10 border-l-2 border-orange-500' :
                'bg-warning/10 border-l-2 border-warning'
              }`}>
                <p className="font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      {state.predictions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-info" />
              Dự báo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.predictions.map((pred, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{pred.timeframe}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(pred.probability * 100)}% khả năng
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{pred.description}</p>
                {pred.preventiveActions.length > 0 && (
                  <ul className="text-xs text-muted-foreground pl-4 list-disc">
                    {pred.preventiveActions.slice(0, 2).map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

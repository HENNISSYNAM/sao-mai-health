import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Activity, Compass, Magnet, Sun, Footprints, 
  AlertTriangle, CheckCircle2, XCircle, Power,
  Hand, Scale
} from 'lucide-react';
import type { DeviceSensorsState } from '@/hooks/useDeviceSensors';

interface DeviceSensorsPanelProps {
  sensors: DeviceSensorsState;
  onStartAll: () => void;
  onStopAll: () => void;
  onResetFall?: () => void;
  compact?: boolean;
}

const SensorBadge = memo(({ isSupported, isActive, error }: { isSupported: boolean; isActive: boolean; error: string | null }) => {
  if (isActive) return (
    <Badge variant="outline" className="text-emerald-400 border-emerald-500/50 bg-emerald-500/10 text-xs">
      <CheckCircle2 className="h-3 w-3 mr-1" />Hoạt động
    </Badge>
  );
  if (!isSupported) return (
    <Badge variant="outline" className="text-muted-foreground border-muted text-xs">
      <XCircle className="h-3 w-3 mr-1" />Không hỗ trợ
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-amber-400 border-amber-500/50 text-xs">
      Tắt
    </Badge>
  );
});
SensorBadge.displayName = 'SensorBadge';

const ActivityBadge = memo(({ level }: { level: string }) => {
  const config: Record<string, { label: string; className: string }> = {
    sedentary: { label: 'Ít vận động', className: 'text-red-400 border-red-500/50 bg-red-500/10' },
    light: { label: 'Nhẹ', className: 'text-amber-400 border-amber-500/50 bg-amber-500/10' },
    moderate: { label: 'Vừa phải', className: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' },
    vigorous: { label: 'Mạnh', className: 'text-blue-400 border-blue-500/50 bg-blue-500/10' },
  };
  const c = config[level] || config.sedentary;
  return <Badge variant="outline" className={`${c.className} text-xs`}>{c.label}</Badge>;
});
ActivityBadge.displayName = 'ActivityBadge';

export const DeviceSensorsPanel = memo(({ sensors, onStartAll, onStopAll, onResetFall, compact }: DeviceSensorsPanelProps) => {
  const { data, status, health, isAnyActive, supportedCount } = sensors;

  const sensorItems = [
    {
      key: 'accelerometer',
      icon: Activity,
      label: 'Gia tốc kế',
      status: status.accelerometer,
      value: data.accelerometer 
        ? `${data.accelerometer.magnitude.toFixed(1)} m/s²`
        : null,
    },
    {
      key: 'gyroscope',
      icon: Compass,
      label: 'Con quay hồi chuyển',
      status: status.gyroscope,
      value: data.gyroscope
        ? `${data.gyroscope.magnitude.toFixed(2)} rad/s`
        : null,
    },
    {
      key: 'magnetometer',
      icon: Magnet,
      label: 'Từ kế',
      status: status.magnetometer,
      value: data.magnetometer
        ? `${data.magnetometer.magnitude.toFixed(0)} µT`
        : null,
    },
    {
      key: 'ambientLight',
      icon: Sun,
      label: 'Ánh sáng',
      status: status.ambientLight,
      value: data.ambientLight ? `${data.ambientLight.lux.toFixed(0)} lux` : null,
    },
  ];

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-primary">
            <Activity className="h-4 w-4" />
            Cảm biến thiết bị
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {supportedCount} hỗ trợ
            </Badge>
          </CardTitle>
          <Button
            variant={isAnyActive ? "destructive" : "default"}
            size="sm"
            onClick={isAnyActive ? onStopAll : onStartAll}
            className="h-7 text-xs"
          >
            <Power className="h-3 w-3 mr-1" />
            {isAnyActive ? 'Tắt' : 'Bật'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sensor Grid */}
        <div className="grid grid-cols-2 gap-2">
          {sensorItems.map(item => (
            <div key={item.key} className="p-2 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-xs font-medium text-foreground/80">{item.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <SensorBadge {...item.status} />
                {item.value && (
                  <span className="text-xs font-mono text-foreground/70">{item.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Health Indicators */}
        {isAnyActive && (
          <div className="space-y-2 pt-1 border-t border-border/30">
            {/* Steps & Activity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Footprints className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{health.steps.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">bước</span>
              </div>
              <ActivityBadge level={health.activityLevel} />
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Thăng bằng</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      health.balanceScore > 70 ? 'bg-emerald-500' : 
                      health.balanceScore > 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${health.balanceScore}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground/70">{health.balanceScore}%</span>
              </div>
            </div>

            {/* Alerts */}
            {health.tremorDetected && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Hand className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-300">
                  Phát hiện run tay (cường độ: {(health.tremorIntensity * 100).toFixed(0)}%)
                </span>
              </div>
            )}

            {health.fallDetected && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-red-300">Phát hiện té ngã!</span>
                </div>
                {onResetFall && (
                  <Button variant="ghost" size="sm" onClick={onResetFall} className="h-6 text-xs text-red-300">
                    Bỏ qua
                  </Button>
                )}
              </div>
            )}

            {health.balanceIssue && !health.fallDetected && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-300">Mất thăng bằng bất thường</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

DeviceSensorsPanel.displayName = 'DeviceSensorsPanel';

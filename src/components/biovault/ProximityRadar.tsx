import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bluetooth, 
  BluetoothOff, 
  Radio, 
  Users, 
  MapPin, 
  AlertTriangle,
  Shield,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useProximitySignalAgent } from '@/hooks/useProximitySignalAgent';
import { cn } from '@/lib/utils';

interface ProximityRadarProps {
  twinId: string;
  onContextUpdate?: (context: any) => void;
}

export function ProximityRadar({ twinId, onContextUpdate }: ProximityRadarProps) {
  const {
    isScanning,
    isSupported,
    signals,
    context,
    exposure,
    lastUpdate,
    error,
    startScanning,
    stopScanning,
    getCrowdDensityLabel,
    getAlertColor
  } = useProximitySignalAgent(twinId);

  // Notify parent of context updates
  React.useEffect(() => {
    if (context && onContextUpdate) {
      onContextUpdate({ context, exposure });
    }
  }, [context, exposure, onContextUpdate]);

  // Radar visualization data
  const radarPoints = useMemo(() => {
    if (!signals.length) return [];
    
    return signals.slice(0, 12).map((signal, index) => {
      const distance = Math.pow(10, (-59 - signal.rssi) / (10 * 2.5));
      const angle = (index / Math.min(signals.length, 12)) * 2 * Math.PI;
      const radius = Math.min(distance * 15, 80); // Scale for visualization
      
      return {
        id: signal.deviceId,
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
        rssi: signal.rssi,
        duration: signal.duration,
        distance
      };
    });
  }, [signals]);

  const getDensityColor = (density: string) => {
    switch (density) {
      case 'very_high': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getAlertBadgeVariant = (level: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level) {
      case 'danger': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="h-5 w-5 text-primary animate-pulse" />
              Proximity Radar
            </CardTitle>
            <Button
              size="sm"
              variant={isScanning ? "destructive" : "default"}
              onClick={isScanning ? stopScanning : startScanning}
              disabled={!isSupported}
            >
              {isScanning ? (
                <>
                  <BluetoothOff className="h-4 w-4 mr-2" />
                  Dừng
                </>
              ) : (
                <>
                  <Bluetooth className="h-4 w-4 mr-2" />
                  Quét BLE
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isSupported && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <WifiOff className="h-4 w-4" />
              Thiết bị không hỗ trợ Bluetooth
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Radar Visualization */}
          <div className="relative aspect-square max-w-[250px] mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Radar circles */}
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeOpacity="0.1" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeOpacity="0.15" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeOpacity="0.2" />
              <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeOpacity="0.25" />
              
              {/* Cross lines */}
              <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeOpacity="0.1" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeOpacity="0.1" />
              
              {/* Center point (self) */}
              <circle cx="50" cy="50" r="4" className="fill-primary" />
              
              {/* Scanning sweep animation */}
              {isScanning && (
                <g className="origin-center animate-spin" style={{ animationDuration: '3s' }}>
                  <line 
                    x1="50" y1="50" x2="50" y2="10" 
                    stroke="currentColor" 
                    strokeWidth="1"
                    strokeOpacity="0.3"
                  />
                  <defs>
                    <linearGradient id="sweepGradient" gradientTransform="rotate(90)">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 50 50 L 50 10 A 40 40 0 0 1 85 30 Z"
                    fill="url(#sweepGradient)"
                  />
                </g>
              )}
              
              {/* Device points */}
              {radarPoints.map((point, idx) => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    className={cn(
                      "transition-all duration-300",
                      point.rssi > -60 ? "fill-red-500" :
                      point.rssi > -75 ? "fill-yellow-500" :
                      "fill-green-500"
                    )}
                  >
                    <animate
                      attributeName="opacity"
                      values="1;0.5;1"
                      dur="2s"
                      repeatCount="indefinite"
                      begin={`${idx * 0.2}s`}
                    />
                  </circle>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    className="animate-ping"
                    style={{ animationDelay: `${idx * 0.3}s` }}
                  />
                </g>
              ))}
            </svg>
            
            {/* Device count overlay */}
            <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3 inline mr-1" />
              {signals.length} thiết bị
            </div>
          </div>

          {/* Stats Grid */}
          {context && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xl font-bold">{context.nearbyDevices}</div>
                <div className="text-xs text-muted-foreground">Thiết bị</div>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xl font-bold">{context.averageRssi} dBm</div>
                <div className="text-xs text-muted-foreground">Tín hiệu TB</div>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <MapPin className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xl font-bold">{context.estimatedDistance.toFixed(1)}m</div>
                <div className="text-xs text-muted-foreground">Khoảng cách</div>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className={cn("h-3 w-3 rounded-full mx-auto mb-2", getDensityColor(context.crowdDensity))} />
                <div className="text-sm font-medium">{getCrowdDensityLabel(context.crowdDensity)}</div>
                <div className="text-xs text-muted-foreground">Mật độ</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exposure Risk Card */}
      {exposure && (
        <Card className={cn(
          "border transition-colors",
          exposure.alertLevel === 'danger' ? 'border-red-500/50 bg-red-500/5' :
          exposure.alertLevel === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5' :
          exposure.alertLevel === 'info' ? 'border-blue-500/50 bg-blue-500/5' :
          'border-border'
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className={cn("h-4 w-4", getAlertColor(exposure.alertLevel))} />
                Đánh giá phơi nhiễm
              </CardTitle>
              <Badge variant={getAlertBadgeVariant(exposure.alertLevel)}>
                {exposure.alertLevel === 'danger' ? 'Nguy hiểm' :
                 exposure.alertLevel === 'warning' ? 'Cảnh báo' :
                 exposure.alertLevel === 'info' ? 'Chú ý' : 'An toàn'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Exposure Score */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Điểm phơi nhiễm</span>
                <span className="font-bold">{exposure.exposureScore}/100</span>
              </div>
              <Progress 
                value={exposure.exposureScore} 
                className={cn(
                  "h-2",
                  exposure.exposureScore > 70 ? '[&>div]:bg-red-500' :
                  exposure.exposureScore > 50 ? '[&>div]:bg-yellow-500' :
                  exposure.exposureScore > 25 ? '[&>div]:bg-blue-500' :
                  '[&>div]:bg-green-500'
                )}
              />
            </div>

            {/* Risk Zone */}
            {context?.riskZone && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{context.riskZone.name}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {context.riskZone.factors.map((factor, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {exposure.riskFactors.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Yếu tố rủi ro:</div>
                <div className="flex flex-wrap gap-1">
                  {exposure.riskFactors.map((factor, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {exposure.recommendations.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <div className="text-sm font-medium mb-2">Khuyến nghị:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {exposure.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Last Update */}
            {lastUpdate && (
              <div className="text-xs text-muted-foreground text-right pt-2 border-t">
                Cập nhật: {new Date(lastUpdate).toLocaleTimeString('vi-VN')}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

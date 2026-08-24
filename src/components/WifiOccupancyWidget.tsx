import React from 'react';
import { useWifiScanning } from '@/hooks/useWifiScanning';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Users } from 'lucide-react';

const DENSITY_COLOR: Record<string, string> = {
  sparse:   'bg-green-500/20 text-green-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  dense:    'bg-orange-500/20 text-orange-400',
  crowd:    'bg-red-500/20 text-red-400',
};

export function WifiOccupancyWidget() {
  const { env } = useWifiScanning(20000);

  return (
    <Card className="border-cyan-500/30 bg-card/70">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {env.connectionType !== 'unknown' ? (
              <Wifi className="h-4 w-4 text-cyan-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs font-medium">WiFi Occupancy Scan</p>
              <p className="text-xs text-muted-foreground">
                {env.connectionType.toUpperCase()} · {env.downlinkMbps ?? '–'} Mbps · {env.rttMs ?? '–'}ms RTT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>~{env.estimatedDevices}</span>
            </div>
            <Badge className={`${DENSITY_COLOR[env.occupancyDensity]} border-0 text-xs capitalize`}>
              {env.occupancyDensity}
            </Badge>
          </div>
        </div>
        {/* Congestion bar */}
        <div className="mt-2">
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-1000"
              style={{ width: `${env.channelCongestion * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>Channel congestion</span>
            <span>{Math.round(env.channelCongestion * 100)}%</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 italic">
          Passive WiFi probe · feeds Swarm Intelligence Engine
        </p>
      </CardContent>
    </Card>
  );
}

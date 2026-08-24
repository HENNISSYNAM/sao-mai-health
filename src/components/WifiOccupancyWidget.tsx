import React from 'react';
import { useWifiScanning } from '@/hooks/useWifiScanning';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Users, Radio, RefreshCw } from 'lucide-react';

const DENSITY_COLOR: Record<string, string> = {
  sparse:   'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  dense:    'bg-orange-500/20 text-orange-400 border-orange-500/30',
  crowd:    'bg-red-500/20 text-red-400 border-red-500/30',
};

const BAND_COLOR: Record<string, string> = {
  '5GHz':     'text-cyan-400',
  '2.4GHz':   'text-violet-400',
  'cellular': 'text-green-400',
  'unknown':  'text-muted-foreground',
};

const BAND_LABEL: Record<string, string> = {
  '5GHz':     '5 GHz — ≤20 m',
  '2.4GHz':   '2.4 GHz — ≤40 m',
  'cellular': 'Cellular',
  'unknown':  'Unknown band',
};

const DENSITY_LABEL: Record<string, string> = {
  sparse:   'Sparse',
  moderate: 'Moderate',
  dense:    'Dense',
  crowd:    'Crowded',
};

export function WifiOccupancyWidget() {
  const { env, scanning, scan } = useWifiScanning(20000);

  const congestionPct = Math.round(env.channelCongestion * 100);
  const jitterPct     = Math.round(env.rttJitter * 100);

  return (
    <Card className="border-cyan-500/30 bg-card/80 backdrop-blur-md">
      <CardContent className="py-3 px-4 space-y-2.5">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {env.connectionType !== 'unknown'
              ? <Wifi className="h-4 w-4 text-cyan-400" />
              : <WifiOff className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-xs font-semibold leading-tight">WiFi Spatial Scan</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {env.connectionType.toUpperCase()}
                {env.downlinkMbps !== null && ` · ${env.downlinkMbps} Mbps`}
                {env.rttMs !== null && ` · ${env.rttMs} ms RTT`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={`${DENSITY_COLOR[env.occupancyDensity]} border text-[10px] capitalize px-1.5`}>
              {DENSITY_LABEL[env.occupancyDensity]}
            </Badge>
            <Button
              size="icon" variant="ghost"
              className="h-6 w-6 text-muted-foreground"
              onClick={scan}
              disabled={scanning}
            >
              <RefreshCw className={`h-3 w-3 ${scanning ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Device count + spatial radius */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-muted/30 rounded-md py-1.5 px-1">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <Users className="h-2.5 w-2.5 text-cyan-400" />
            </div>
            <p className="text-sm font-bold text-cyan-400 font-mono leading-none">~{env.estimatedDevices}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">devices</p>
          </div>
          <div className="bg-muted/30 rounded-md py-1.5 px-1">
            <div className="flex items-center justify-center mb-0.5">
              <Radio className="h-2.5 w-2.5 text-violet-400" />
            </div>
            <p className={`text-xs font-bold font-mono leading-none ${BAND_COLOR[env.frequencyBand]}`}>
              {env.frequencyBand === 'unknown' ? '?' : env.frequencyBand}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">band</p>
          </div>
          <div className="bg-muted/30 rounded-md py-1.5 px-1">
            <p className="text-sm font-bold text-amber-400 font-mono leading-none">{env.spatialRadiusMetres}m</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">scan radius</p>
          </div>
        </div>

        {/* Congestion bar */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
            <span>Channel congestion</span>
            <span className="font-mono">{congestionPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${congestionPct}%`,
                background: congestionPct > 65
                  ? 'linear-gradient(90deg,#F97316,#EF4444)'
                  : congestionPct > 35
                    ? 'linear-gradient(90deg,#EAB308,#F97316)'
                    : 'linear-gradient(90deg,#06B6D4,#3B82F6)',
              }}
            />
          </div>
        </div>

        {/* Jitter bar (key spatial indicator) */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
            <span>RTT jitter <span className="text-[9px] opacity-60">(timing variance → crowd density)</span></span>
            <span className="font-mono">{jitterPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500/70 transition-all duration-1000"
              style={{ width: `${jitterPct}%` }}
            />
          </div>
        </div>

        {/* Band info */}
        <p className="text-[10px] text-muted-foreground leading-snug">
          <span className={BAND_COLOR[env.frequencyBand]}>
            {BAND_LABEL[env.frequencyBand]}
          </span>
          {' '}— feeds Swarm Engine as seed signal
        </p>

        <p className="text-[9px] text-muted-foreground italic leading-tight">
          Multi-server STUN RTT probe · No hardware required
        </p>
      </CardContent>
    </Card>
  );
}

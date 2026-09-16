import React, { useEffect, useRef } from 'react';
import { useWifiScanning, type WifiEnvironment } from '@/hooks/useWifiScanning';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const DENSITY_STYLE: Record<string, string> = {
  sparse:   'bg-green-500/15 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  dense:    'bg-orange-500/15 text-orange-400 border-orange-500/30',
  crowd:    'bg-red-500/15 text-red-400 border-red-500/30',
};

const DENSITY_LABEL: Record<string, string> = {
  sparse: 'Sparse', moderate: 'Moderate', dense: 'Dense', crowd: 'Crowded',
};

const METHOD_LABEL: Record<string, string> = {
  'network-info':    'Network Info API',
  'stun-rtt':        'STUN RTT',
  'resource-timing': 'Resource Timing',
  'fetch-race':      'Fetch race',
  'device-only':     'Device signals',
};

/**
 * Polar plot of the inferred occupancy field — 12 sectors around the device.
 * Sector arc length is fixed; radius and colour carry density.
 */
function SpatialRadar({ env }: { env: WifiEnvironment }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 150;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 8;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let sweep = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Range rings
      ctx.strokeStyle = 'rgba(148,163,184,0.14)';
      ctx.lineWidth = 1;
      for (const frac of [0.33, 0.66, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * frac, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Cross hairs
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Occupancy sectors
      const n = env.sectors.length;
      if (n > 0) {
        const arc = (Math.PI * 2) / n;
        env.sectors.forEach((s, i) => {
          const a0 = (s.bearing * Math.PI) / 180 - Math.PI / 2 - arc / 2;
          const a1 = a0 + arc * 0.88;
          const r = 10 + s.density * (maxR - 10);

          const hue = 190 - s.density * 190;          // cyan → red
          const alpha = 0.2 + s.density * 0.5;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, a0, a1);
          ctx.closePath();
          ctx.fillStyle = `hsla(${hue}, 85%, 55%, ${alpha})`;
          ctx.fill();
          ctx.strokeStyle = `hsla(${hue}, 90%, 62%, ${alpha + 0.25})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // Sweep beam
      if (!reduceMotion) {
        const a = sweep - Math.PI / 2;
        const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        grad.addColorStop(0, 'rgba(34,211,238,0.55)');
        grad.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.stroke();
        sweep = (sweep + 0.035) % (Math.PI * 2);
      }

      // Device at centre
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();

      if (!reduceMotion) rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [env.sectors]);

  return <canvas ref={ref} className="rounded-lg" aria-label="WiFi spatial occupancy field" />;
}

export function WifiOccupancyWidget() {
  const { env, scanning, scan } = useWifiScanning(20000);

  const congestionPct = Math.round(env.channelCongestion * 100);
  const jitterPct = Math.round(env.rttJitter * 100);
  const confidencePct = Math.round(env.confidence * 100);

  return (
    <Card className="border-cyan-500/25 bg-card/80 backdrop-blur-md">
      <CardContent className="py-3 px-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {env.isSupported
              ? <Wifi className="h-4 w-4 text-cyan-400" />
              : <WifiOff className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-xs font-semibold leading-tight">WiFi Spatial Scan</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {env.rttMs !== null && `${env.rttMs} ms`}
                {env.rttBaselineMs !== null && ` (nền ${env.rttBaselineMs} ms`}
                {env.rttBaselineMs !== null && env.rttExcessMs !== null && ` · +${env.rttExcessMs} ms`}
                {env.rttBaselineMs !== null && ')'}
                {env.downlinkMbps !== null && ` · ${env.downlinkMbps} Mbps`}
                {' · '}{confidencePct}% tin cậy · {env.sampleCount} mẫu
              </p>
              {env.anchor && (
                <p className="text-[9px] text-muted-foreground/70 leading-tight font-mono">
                  {env.anchor.lat.toFixed(4)}, {env.anchor.lng.toFixed(4)}
                  {' · ±'}{env.anchor.accuracyM}m
                  {env.headingDeg !== null && ` · ${Math.round(env.headingDeg)}°`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={`${DENSITY_STYLE[env.occupancyDensity]} border text-[10px] px-1.5`}>
              {DENSITY_LABEL[env.occupancyDensity]}
            </Badge>
            <Button size="icon" variant="ghost" className="h-9 w-9 md:h-6 md:w-6 text-muted-foreground"
                    onClick={scan} disabled={scanning}>
              <RefreshCw className={`h-3 w-3 ${scanning ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Radar + readings */}
        <div className="flex items-center gap-3">
          <SpatialRadar env={env} />
          <div className="flex-1 space-y-2 min-w-0">
            <div>
              <p className="text-2xl font-semibold leading-none tabular-nums text-cyan-400">
                ~{env.estimatedDevices}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                thiết bị trong vùng
                {env.estimatedDevicesRange[1] > 0 && (
                  <span className="font-mono"> ({env.estimatedDevicesRange[0]}–{env.estimatedDevicesRange[1]})</span>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div>
                <p className="font-mono text-violet-400">{env.frequencyBand}</p>
                <p className="text-muted-foreground">band</p>
              </div>
              <div>
                <p className="font-mono text-amber-400">{env.spatialRadiusMetres} m</p>
                <p className="text-muted-foreground">radius</p>
              </div>
              <div className="col-span-2">
                <p className="font-mono text-green-400">{env.coverageAreaM2.toLocaleString()} m²</p>
                <p className="text-muted-foreground">coverage area</p>
              </div>
            </div>
          </div>
        </div>

        {/* Congestion + jitter */}
        <div className="space-y-1.5">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
              <span>Channel congestion</span>
              <span className="font-mono tabular-nums">{congestionPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{
                     width: `${congestionPct}%`,
                     background: congestionPct > 65 ? 'linear-gradient(90deg,#F97316,#EF4444)'
                               : congestionPct > 35 ? 'linear-gradient(90deg,#EAB308,#F97316)'
                                                    : 'linear-gradient(90deg,#06B6D4,#3B82F6)',
                   }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
              <span>RTT jitter</span>
              <span className="font-mono tabular-nums">{jitterPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-violet-500/70 transition-all duration-700"
                   style={{ width: `${jitterPct}%` }} />
            </div>
          </div>
        </div>

        {/* Compatibility ladder — which methods produced data */}
        <div className="flex flex-wrap gap-1">
          {env.methodsUsed.map(m => (
            <span key={m}
                  className={`px-1.5 py-0.5 rounded text-[9px] border ${
                    m === 'device-only'
                      ? 'border-border/50 text-muted-foreground'
                      : 'border-cyan-500/25 text-cyan-400/90 bg-cyan-500/5'
                  }`}>
              {METHOD_LABEL[m] ?? m}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

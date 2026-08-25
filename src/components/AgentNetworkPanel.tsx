import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Radar, Play, Square } from 'lucide-react';
import type { AgentState, AgentDetection } from '@/services/surveillanceAgents';

const CONTINENT_ICON: Record<string, string> = {
  Asia: '🌏', Europe: '🌍', Americas: '🌎', Africa: '🌍', Oceania: '🏝️',
};

const STATUS_STYLE: Record<string, string> = {
  sweeping:  'text-cyan-400',
  analyzing: 'text-violet-400',
  cooldown:  'text-muted-foreground',
  idle:      'text-muted-foreground/60',
};

interface Props {
  agents: AgentState[];
  detections: AgentDetection[];
  totalRegions: number;
  totalDetections: number;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function AgentNetworkPanel({
  agents, detections, totalRegions, totalDetections, isRunning, onStart, onStop,
}: Props) {
  return (
    <Card className="border-violet-500/25 bg-card/80 backdrop-blur-md">
      <CardContent className="py-3 px-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radar className={`h-4 w-4 text-violet-400 ${isRunning ? 'animate-spin' : ''}`}
                     style={{ animationDuration: '3s' }} />
              {isRunning && (
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">Agent Network</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {agents.length} agents · {totalRegions} regions
              </p>
            </div>
          </div>
          <Button
            size="sm" variant={isRunning ? 'ghost' : 'default'}
            className="h-7 gap-1.5 text-[11px] px-2.5"
            onClick={isRunning ? onStop : onStart}
          >
            {isRunning ? <><Square className="h-3 w-3" /> Stop</> : <><Play className="h-3 w-3" /> Start</>}
          </Button>
        </div>

        {/* Live detection count */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums leading-none text-violet-400">
            {totalDetections}
          </span>
          <span className="text-[11px] text-muted-foreground">active detections on map</span>
        </div>

        {/* Per-agent rows */}
        <div className="space-y-1">
          {agents.map(a => (
            <div key={a.id} className="flex items-center gap-2 text-[11px]">
              <span className="w-4 text-center">{CONTINENT_ICON[a.id] ?? '🌐'}</span>
              <span className="w-16 truncate">{a.id}</span>

              {/* Status dot + label */}
              <span className={`flex items-center gap-1 ${STATUS_STYLE[a.status]}`}>
                <span className={`h-1.5 w-1.5 rounded-full bg-current ${
                  a.status === 'sweeping' || a.status === 'analyzing' ? 'animate-pulse' : ''
                }`} />
                <span className="w-14">{a.status}</span>
              </span>

              <span className="text-muted-foreground tabular-nums ml-auto">
                {a.detectionCount} hits
              </span>
              <span className="text-muted-foreground/60 tabular-nums w-10 text-right">
                {a.sweepsCompleted}×
              </span>
            </div>
          ))}
        </div>

        {/* Newest detections */}
        {detections.length > 0 && (
          <div className="border-t border-border/40 pt-2 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Latest signals
            </p>
            {detections.slice(0, 4).map(d => (
              <div key={d.id} className="flex items-center gap-2 text-[10px]">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{
                    background: d.severity > 0.7 ? '#EF4444'
                              : d.severity > 0.45 ? '#F59E0B' : '#22D3EE',
                  }}
                />
                <span className="font-medium truncate max-w-[90px]">{d.regionName}</span>
                <span className="text-muted-foreground truncate">{d.disease}</span>
                <span className="ml-auto font-mono tabular-nums text-muted-foreground">
                  {Math.round(d.severity * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[9px] text-muted-foreground italic leading-tight">
          Agents sweep autonomously on independent timers · detections expire after 90s
        </p>
      </CardContent>
    </Card>
  );
}

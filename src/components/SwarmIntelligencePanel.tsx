import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSwarmSimulation } from '@/hooks/useSwarmSimulation';
import { SURVEILLANCE_REGIONS } from '@/services/swarmIntelligenceEngine';
import {
  Activity, Brain, Globe, AlertTriangle, CheckCircle,
  Loader2, PlayCircle, RotateCcw, Wifi, Shield
} from 'lucide-react';

const RISK_COLORS: Record<string, string> = {
  LOW:      'bg-green-500/20 text-green-400 border-green-500/50',
  MEDIUM:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  HIGH:     'bg-orange-500/20 text-orange-400 border-orange-500/50',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/50',
};

export function SwarmIntelligencePanel() {
  const { t } = useTranslation();
  const {
    status, report, currentTick, currentTickData, error,
    availableRegions, run, reset,
  } = useSwarmSimulation();

  const [selectedRegions, setSelectedRegions] = useState<string[]>(['VN-HN', 'VN-HCM', 'HK']);
  const [days, setDays] = useState(60);

  const toggleRegion = (key: string) => {
    setSelectedRegions(prev =>
      prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
    );
  };

  const totalInfected = currentTickData?.infected ?? 0;
  const totalPop = selectedRegions.reduce(
    (s, k) => s + (SURVEILLANCE_REGIONS[k]?.population ?? 0), 0
  );
  const infectedPct = totalPop > 0 ? (totalInfected / totalPop) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/30 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                Swarm Intelligence Engine
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                MiroFish-inspired multi-agent epidemic simulation · Quantum-secured
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs text-cyan-400">Post-Quantum</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Region selector */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Surveillance Regions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableRegions.map(r => (
                <button
                  key={r.key}
                  onClick={() => toggleRegion(r.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedRegions.includes(r.key)
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {r.key.startsWith('HK') || r.key.startsWith('SG') || r.key.startsWith('CN') || r.key.startsWith('TH') || r.key.startsWith('MY')
                    ? '🌏 ' : '🇻🇳 '}
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Days slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Horizon:</span>
            {[30, 60, 90, 180].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2 py-0.5 rounded text-xs border transition-all ${
                  days === d
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Run / Reset buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => run(selectedRegions, days)}
              disabled={status === 'simulating' || status === 'extracting' || selectedRegions.length === 0}
              className="flex-1"
            >
              {(status === 'simulating' || status === 'extracting') ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  {status === 'extracting' ? 'Extracting seeds…' : 'Simulating…'}</>
              ) : (
                <><PlayCircle className="h-3.5 w-3.5 mr-1.5" />Run Simulation</>
              )}
            </Button>
            {status !== 'idle' && (
              <Button size="sm" variant="outline" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />{error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Live results */}
      {report && currentTickData && (
        <>
          {/* Risk badge */}
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Simulation Day {currentTick}</span>
                </div>
                <Badge className={`${RISK_COLORS[report.riskLevel]} border text-xs`}>
                  {report.riskLevel} RISK
                </Badge>
              </div>

              {/* SEIR bars */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Susceptible', val: currentTickData.susceptible, color: 'bg-blue-400' },
                  { label: 'Exposed',     val: currentTickData.exposed,    color: 'bg-yellow-400' },
                  { label: 'Infected',    val: currentTickData.infected,   color: 'bg-red-400' },
                  { label: 'Recovered',   val: currentTickData.recovered,  color: 'bg-green-400' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono">{item.val.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.color}`}
                        style={{ width: `${Math.min(100, (item.val / Math.max(totalPop, 1)) * 100 * 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* R0 */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Activity className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-muted-foreground">R₀ estimate:</span>
                <span className={`font-mono font-bold ${
                  currentTickData.r0Estimate > 2 ? 'text-red-400' :
                  currentTickData.r0Estimate > 1 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {currentTickData.r0Estimate.toFixed(2)}
                </span>
                <span className="text-muted-foreground ml-auto">
                  Confidence: {Math.round(report.confidence * 100)}%
                </span>
              </div>

              {/* Seed signals */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wifi className="h-3 w-3 text-cyan-400" />
                  <span>{report.seedSignals.filter(s => s.type === 'wifi_probe').length} WiFi signals</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3 text-blue-400" />
                  <span>{report.seedSignals.filter(s => s.type === 'news').length} news seeds</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Narrative */}
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                AI Narrative
              </p>
              <p className="text-sm leading-relaxed">{report.narrative}</p>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Recommendations
              </p>
              <ul className="space-y-1.5">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center px-4">
            ⚠️ Simulation only — Prototype · illustrative data. Not a clinical diagnosis.
          </p>
        </>
      )}
    </div>
  );
}

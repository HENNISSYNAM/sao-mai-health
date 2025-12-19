import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  MapPin, 
  RefreshCw, 
  Maximize2,
  Minimize2,
  Activity,
  Heart,
  AlertTriangle,
  Thermometer,
  Wind,
  Droplets
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import StrokeRiskMap from '@/components/stroke/StrokeRiskMap';
import RiskCharts from '@/components/stroke/RiskCharts';
import RiskStatsPanel from '@/components/stroke/RiskStatsPanel';
import HealthRecommendations from '@/components/stroke/HealthRecommendations';
import AgeGroupSelector from '@/components/stroke/AgeGroupSelector';
import { useBarometer } from '@/hooks/useBarometer';

type AgeGroup = '<18' | '18-35' | '36-55' | '>55';

const StrokeRisk: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<'hcmc' | 'hanoi' | 'all'>('all');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('36-55');
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const barometer = useBarometer();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch predictions
  const fetchPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('stroke_risk_predictions')
        .select('*')
        .gte('valid_until', new Date().toISOString())
        .order('predicted_at', { ascending: false });

      if (error) throw error;
      setPredictions(data || []);
      
      // Simulate barometer from weather data
      if (data?.[0]?.pressure) {
        barometer.simulatePressureFromWeather(data[0].pressure);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate new predictions
  const generatePredictions = async () => {
    setLoading(true);
    toast.info('Đang cập nhật dữ liệu thời gian thực...');
    try {
      const { data, error } = await supabase.functions.invoke('stroke-risk-agent', {});
      if (error) throw error;
      if (data.success) {
        toast.success(`Đã cập nhật ${data.predictions?.length || 0} khu vực`);
        fetchPredictions();
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const highRisk = predictions.filter(p => p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL');
    const criticalCount = predictions.filter(p => p.risk_level === 'CRITICAL').length;
    return {
      totalZones: predictions.length,
      highRiskZones: highRisk.length,
      criticalZones: criticalCount,
      avgAqi: predictions.reduce((a, b) => a + (b.aqi || 0), 0) / (predictions.length || 1),
      avgTemperature: predictions.reduce((a, b) => a + (b.temperature || 0), 0) / (predictions.length || 1),
      avgHumidity: predictions.reduce((a, b) => a + (b.humidity || 0), 0) / (predictions.length || 1),
      avgPressure: predictions.reduce((a, b) => a + (b.pressure || 0), 0) / (predictions.length || 1),
      lastUpdate: predictions[0]?.predicted_at || new Date().toISOString()
    };
  }, [predictions]);

  // Risk distribution for chart
  const riskDistribution = useMemo(() => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    predictions.forEach(p => { if (counts[p.risk_level as keyof typeof counts] !== undefined) counts[p.risk_level as keyof typeof counts]++; });
    return Object.entries(counts).map(([level, count]) => ({ level, count }));
  }, [predictions]);

  // Pollution data for chart
  const pollutionData = useMemo(() => {
    return predictions.slice(0, 8).map((p, i) => ({
      time: p.district_id?.substring(0, 6) || `Zone ${i}`,
      aqi: p.aqi || 0,
      pm25: p.pm25 || 0
    }));
  }, [predictions]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-danger text-danger-foreground';
      case 'HIGH': return 'bg-secondary text-secondary-foreground';
      case 'MEDIUM': return 'bg-warning text-warning-foreground';
      default: return 'bg-success text-success-foreground';
    }
  };

  const overallRisk = stats.criticalZones > 0 ? 'CRITICAL' : stats.highRiskZones > 2 ? 'HIGH' : stats.highRiskZones > 0 ? 'MEDIUM' : 'LOW';

  return (
    <div className={cn("flex flex-col bg-background", isFullscreen ? "fixed inset-0 z-50" : "min-h-screen")}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b-2 border-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-2xl bg-primary/10 border-2 border-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse border-2 border-card" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">Hệ Thống Cảnh Báo Đột Quỵ</h1>
              <Badge className={cn("text-xs font-bold uppercase", getRiskColor(overallRisk))}>
                {overallRisk === 'CRITICAL' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {overallRisk}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Dữ liệu real-time từ WAQI & Open-Meteo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Time */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-mono font-semibold">
              {currentTime.toLocaleTimeString('vi-VN')}
            </span>
          </div>

          {/* City Selector */}
          <Tabs value={selectedCity} onValueChange={(v) => setSelectedCity(v as any)}>
            <TabsList className="h-10 bg-muted/50 rounded-xl p-1">
              <TabsTrigger value="all" className="text-sm px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <MapPin className="h-4 w-4 mr-2" />Việt Nam
              </TabsTrigger>
              <TabsTrigger value="hanoi" className="text-sm px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Hà Nội
              </TabsTrigger>
              <TabsTrigger value="hcmc" className="text-sm px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                TP.HCM
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={generatePredictions} 
            disabled={loading} 
            className="gap-2 rounded-xl border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Cập nhật
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 rounded-xl border-2"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-card/50 border-b border-border overflow-x-auto">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <span className="text-sm font-semibold text-danger">{stats.criticalZones} vùng nguy hiểm</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 border border-secondary/20">
          <Heart className="h-4 w-4 text-secondary" />
          <span className="text-sm font-semibold text-secondary">{stats.highRiskZones} vùng rủi ro cao</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border">
          <Thermometer className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{stats.avgTemperature.toFixed(1)}°C</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border">
          <Wind className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">AQI: {stats.avgAqi.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border">
          <Droplets className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{stats.avgHumidity.toFixed(0)}%</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-0 p-2">
          <div className="absolute inset-2 rounded-2xl overflow-hidden border-2 border-border shadow-xl">
            <StrokeRiskMap 
              selectedCity={selectedCity} 
              onZoneSelect={setSelectedZone}
              className="absolute inset-0"
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-[420px] bg-card border-l-2 border-border overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Age Group Selector */}
            <div className="p-4 rounded-2xl bg-muted/30 border-2 border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Nhóm tuổi của bạn</p>
              <AgeGroupSelector value={ageGroup} onChange={setAgeGroup} />
            </div>

            {/* Stats */}
            <RiskStatsPanel stats={stats} className="grid-cols-2" />

            {/* Charts */}
            <RiskCharts 
              pressureHistory={barometer.pressureHistory}
              pollutionData={pollutionData}
              riskDistribution={riskDistribution}
              currentPressure={barometer.currentPressure || stats.avgPressure}
              pressureChange1h={barometer.pressureChange1h}
            />

            {/* Health Recommendations */}
            <HealthRecommendations 
              riskLevel={selectedZone?.risk_level || overallRisk}
              riskScore={selectedZone?.risk_score || Math.round(stats.avgAqi / 2)}
              ageGroup={ageGroup}
              environmentalFactors={{
                aqi: selectedZone?.aqi || stats.avgAqi,
                temperature: selectedZone?.temperature || stats.avgTemperature,
                humidity: selectedZone?.humidity || stats.avgHumidity,
                pressureChange: barometer.pressureChange1h || undefined
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrokeRisk;

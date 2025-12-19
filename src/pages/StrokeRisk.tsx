import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  MapPin, 
  RefreshCw, 
  Settings,
  Maximize2,
  Minimize2
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

  const barometer = useBarometer();

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
    toast.info('Đang cập nhật dữ liệu...');
    try {
      const { data, error } = await supabase.functions.invoke('stroke-risk-agent', {});
      if (error) throw error;
      if (data.success) {
        toast.success(`Đã cập nhật ${data.predictions?.length || 0} khu vực`);
        fetchPredictions();
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const highRisk = predictions.filter(p => p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL');
    return {
      totalZones: predictions.length,
      highRiskZones: highRisk.length,
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

  return (
    <div className={cn("flex flex-col bg-background", isFullscreen ? "fixed inset-0 z-50" : "min-h-screen")}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Cảnh Báo Đột Quỵ</h1>
            <p className="text-xs text-muted-foreground">Dữ liệu real-time từ WAQI & Open-Meteo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={selectedCity} onValueChange={(v) => setSelectedCity(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7">
                <MapPin className="h-3 w-3 mr-1" />Việt Nam
              </TabsTrigger>
              <TabsTrigger value="hanoi" className="text-xs px-3 h-7">Hà Nội</TabsTrigger>
              <TabsTrigger value="hcmc" className="text-xs px-3 h-7">TP.HCM</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="sm" onClick={generatePredictions} disabled={loading} className="gap-1">
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Cập nhật
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-0">
          <StrokeRiskMap 
            selectedCity={selectedCity} 
            onZoneSelect={setSelectedZone}
            className="absolute inset-0"
          />
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-[400px] bg-card/50 backdrop-blur-sm border-l border-border/50 overflow-y-auto p-4 space-y-4">
          {/* Age Group Selector */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Nhóm tuổi của bạn</p>
            <AgeGroupSelector value={ageGroup} onChange={setAgeGroup} />
          </div>

          {/* Stats */}
          <RiskStatsPanel stats={stats} className="grid-cols-2 lg:grid-cols-3" />

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
            riskLevel={selectedZone?.risk_level || (stats.highRiskZones > 2 ? 'HIGH' : 'MEDIUM')}
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
  );
};

export default StrokeRisk;

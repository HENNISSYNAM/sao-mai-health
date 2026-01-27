import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthDataPoint {
  id: string;
  disease: string;
  location: string;
  date: string;
  cases: number;
  source: string;
  sourceUrl?: string;
  timestamp: string;
}

interface DeltaPacket {
  type: 'insert' | 'update';
  dataPoint: HealthDataPoint;
  previousValue?: number;
  change?: number;
  changePercent?: number;
}

interface DeltaSummary {
  newCount: number;
  updateCount: number;
  totalCases: number;
}

interface DeltaUpdate {
  deltas: DeltaPacket[];
  timestamp: string;
  summary: DeltaSummary;
}

interface TimeSeriesPoint {
  date: string;
  cases: number;
  disease: string;
  isNew?: boolean;
}

interface DiseaseDistribution {
  disease: string;
  cases: number;
  change?: number;
}

interface LocationAggregation {
  location: string;
  cases: number;
  diseases: string[];
}

export function useHealthDataDelta() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pendingDeltas, setPendingDeltas] = useState<DeltaPacket[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>([]);
  const [diseaseDistribution, setDiseaseDistribution] = useState<DiseaseDistribution[]>([]);
  const [locationAggregation, setLocationAggregation] = useState<LocationAggregation[]>([]);
  const [deltaSummary, setDeltaSummary] = useState<DeltaSummary>({
    newCount: 0,
    updateCount: 0,
    totalCases: 0,
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Process incoming deltas
  const processDeltas = useCallback((deltas: DeltaPacket[]) => {
    // Update time series
    setTimeSeriesData(prev => {
      const newPoints: TimeSeriesPoint[] = deltas.map(d => ({
        date: d.dataPoint.date,
        cases: d.dataPoint.cases,
        disease: d.dataPoint.disease,
        isNew: d.type === 'insert',
      }));

      // Merge with existing, preserving order
      const merged = [...prev];
      for (const point of newPoints) {
        const existingIdx = merged.findIndex(
          p => p.date === point.date && p.disease === point.disease
        );
        if (existingIdx >= 0) {
          merged[existingIdx] = point;
        } else {
          merged.push(point);
        }
      }

      return merged.sort((a, b) => a.date.localeCompare(b.date));
    });

    // Update disease distribution
    setDiseaseDistribution(prev => {
      const updated = [...prev];
      for (const delta of deltas) {
        const disease = delta.dataPoint.disease;
        const existingIdx = updated.findIndex(d => d.disease === disease);
        
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            cases: updated[existingIdx].cases + (delta.change || delta.dataPoint.cases),
            change: delta.change,
          };
        } else {
          updated.push({
            disease,
            cases: delta.dataPoint.cases,
            change: delta.type === 'insert' ? delta.dataPoint.cases : delta.change,
          });
        }
      }
      return updated.sort((a, b) => b.cases - a.cases);
    });

    // Update location aggregation
    setLocationAggregation(prev => {
      const updated = [...prev];
      for (const delta of deltas) {
        const location = delta.dataPoint.location;
        const existingIdx = updated.findIndex(l => l.location === location);
        
        if (existingIdx >= 0) {
          const existing = updated[existingIdx];
          updated[existingIdx] = {
            ...existing,
            cases: existing.cases + (delta.change || delta.dataPoint.cases),
            diseases: [...new Set([...existing.diseases, delta.dataPoint.disease])],
          };
        } else {
          updated.push({
            location,
            cases: delta.dataPoint.cases,
            diseases: [delta.dataPoint.disease],
          });
        }
      }
      return updated.sort((a, b) => b.cases - a.cases);
    });

    // Add to pending deltas for UI animation
    setPendingDeltas(prev => [...prev, ...deltas]);

    // Clear pending after animation
    setTimeout(() => {
      setPendingDeltas(prev => prev.filter(d => !deltas.includes(d)));
    }, 3000);
  }, []);

  // Subscribe to realtime delta updates
  useEffect(() => {
    const channel = supabase
      .channel('health-data-deltas')
      .on('broadcast', { event: 'delta-update' }, (payload) => {
        console.log('📡 Received delta update:', payload);
        const update = payload.payload as DeltaUpdate;
        
        if (update.deltas && update.deltas.length > 0) {
          processDeltas(update.deltas);
          setDeltaSummary(update.summary);
          setLastUpdate(new Date(update.timestamp));
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('Delta channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [processDeltas]);

  // Manual trigger for delta computation
  const triggerDeltaComputation = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('health-data-delta');
      
      if (error) throw error;
      
      if (data?.deltas && data.deltas.length > 0) {
        processDeltas(data.deltas);
        setDeltaSummary(data.summary);
        setLastUpdate(new Date(data.timestamp));
      }
      
      return data;
    } catch (error) {
      console.error('Error triggering delta computation:', error);
      throw error;
    }
  }, [processDeltas]);

  // Get chart-ready time series data
  const getChartTimeSeries = useCallback((diseaseFilter?: string) => {
    let filtered = timeSeriesData;
    if (diseaseFilter) {
      filtered = timeSeriesData.filter(d => d.disease === diseaseFilter);
    }

    // Group by date
    const grouped = filtered.reduce((acc, point) => {
      if (!acc[point.date]) {
        acc[point.date] = { date: point.date, total: 0, isNew: false };
      }
      acc[point.date].total += point.cases;
      if (point.isNew) acc[point.date].isNew = true;
      return acc;
    }, {} as Record<string, { date: string; total: number; isNew: boolean }>);

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [timeSeriesData]);

  return {
    isConnected,
    lastUpdate,
    pendingDeltas,
    timeSeriesData,
    diseaseDistribution,
    locationAggregation,
    deltaSummary,
    triggerDeltaComputation,
    getChartTimeSeries,
  };
}

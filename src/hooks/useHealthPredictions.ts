import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PredictedDataPoint {
  date: string;
  disease: string;
  location: string;
  scenario: 'best-case' | 'most-likely' | 'worst-case';
  cases: number;
  confidence: 'high' | 'medium' | 'low';
  horizon: '7-day' | '14-day';
  dataType: 'predicted';
  factors: string[];
}

interface ObservedSummary {
  totalPoints: number;
  diseases: string[];
  locations: string[];
  dateRange: { start: string; end: string };
  avgDailyCases: Record<string, number>;
  trends: Record<string, 'increasing' | 'decreasing' | 'stable'>;
}

interface ScenarioInfo {
  description: string;
  assumptions: string[];
  totalPredictedCases: number;
}

interface ChartData {
  timeSeriesWithScenarios: any[];
  scenarioComparison: any[];
  confidenceBands: any[];
}

interface PredictionResult {
  success: boolean;
  observedSummary: ObservedSummary;
  predictions: PredictedDataPoint[];
  scenarios: {
    'best-case': ScenarioInfo;
    'most-likely': ScenarioInfo;
    'worst-case': ScenarioInfo;
  };
  chartData: ChartData;
  generatedAt: string;
  modelVersion: string;
}

export function useHealthPredictions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PredictionResult | null>(null);

  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('health-prediction-agent');

      if (invokeError) throw invokeError;

      if (result?.success) {
        setData(result);
      } else {
        throw new Error(result?.error || 'Failed to generate predictions');
      }

      return result;
    } catch (err: any) {
      console.error('Prediction fetch error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get predictions for a specific disease
  const getPredictionsForDisease = useCallback((disease: string) => {
    if (!data?.predictions) return [];
    return data.predictions.filter(p => p.disease === disease);
  }, [data]);

  // Get predictions for a specific scenario
  const getPredictionsForScenario = useCallback((scenario: 'best-case' | 'most-likely' | 'worst-case') => {
    if (!data?.predictions) return [];
    return data.predictions.filter(p => p.scenario === scenario);
  }, [data]);

  // Get 7-day vs 14-day predictions
  const getPredictionsByHorizon = useCallback((horizon: '7-day' | '14-day') => {
    if (!data?.predictions) return [];
    return data.predictions.filter(p => p.horizon === horizon);
  }, [data]);

  // Get trend for a disease
  const getTrend = useCallback((disease: string) => {
    return data?.observedSummary?.trends?.[disease] || 'stable';
  }, [data]);

  return {
    isLoading,
    error,
    data,
    fetchPredictions,
    getPredictionsForDisease,
    getPredictionsForScenario,
    getPredictionsByHorizon,
    getTrend,
    // Convenience accessors
    predictions: data?.predictions || [],
    chartData: data?.chartData || null,
    scenarios: data?.scenarios || null,
    observedSummary: data?.observedSummary || null,
    generatedAt: data?.generatedAt ? new Date(data.generatedAt) : null,
  };
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TwinContext {
  profile?: {
    age?: number;
    gender?: string;
    bloodType?: string;
    chronicConditions?: string[];
    allergies?: string[];
    medications?: string[];
  };
  location?: {
    lat: number;
    lng: number;
    address?: string;
    locationType?: string;
  };
  environment?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    aqi?: number;
    uvIndex?: number;
  };
  proximity?: {
    nearbyDevices: number;
    crowdDensity: string;
    exposureScore: number;
    riskZone?: string;
  };
  healthSystems?: {
    id: string;
    name: string;
    score: number;
    status: string;
    factors: string[];
  }[];
  recentAlerts?: {
    type: string;
    severity: string;
    title: string;
    message: string;
  }[];
  sessionContext?: {
    sessionId: string;
    activatedAt: string;
    accessType: string;
  };
}

interface RiskIndicator {
  category: 'environment' | 'health' | 'proximity' | 'lifestyle';
  level: 'low' | 'medium' | 'high';
  indicator: string;
  context: string;
}

interface Alert {
  priority: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  action: string;
}

interface Insight {
  type: 'observation' | 'recommendation' | 'reminder';
  content: string;
}

interface Guidance {
  immediate: string[];
  shortTerm: string[];
  preventive: string[];
}

interface AIAnalysis {
  overallStatus: 'good' | 'caution' | 'warning' | 'critical';
  statusSummary: string;
  riskIndicators: RiskIndicator[];
  alerts: Alert[];
  insights: Insight[];
  guidance: Guidance;
}

interface TwinAIState {
  isAnalyzing: boolean;
  isStreaming: boolean;
  lastAnalysis: AIAnalysis | null;
  lastUpdate: string | null;
  error: string | null;
  streamContent: string;
}

export function useTwinRealtimeAI(twinId: string) {
  const [state, setState] = useState<TwinAIState>({
    isAnalyzing: false,
    isStreaming: false,
    lastAnalysis: null,
    lastUpdate: null,
    error: null,
    streamContent: ''
  });

  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastContextRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate insights based on current context
  const generateInsights = useCallback(async (
    context: TwinContext,
    trigger: string = 'manual'
  ) => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('personal-twin-realtime-ai', {
        body: {
          action: 'generate_insights',
          twinId,
          context,
          trigger,
          language: 'vi'
        }
      });

      if (error) throw error;

      if (data.success) {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          lastAnalysis: data.analysis,
          lastUpdate: data.timestamp,
          error: null
        }));

        // Show urgent alerts as toasts
        data.analysis?.alerts?.forEach((alert: Alert) => {
          if (alert.priority === 'urgent') {
            toast.error(alert.title, {
              description: alert.message,
              duration: 10000
            });
          } else if (alert.priority === 'warning') {
            toast.warning(alert.title, {
              description: alert.message,
              duration: 5000
            });
          }
        });

        return data.analysis;
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('[TWIN-AI] Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage
      }));

      // Handle rate limit and payment errors
      if (errorMessage.includes('429') || errorMessage.includes('RATE_LIMIT')) {
        toast.error('Đã vượt giới hạn yêu cầu', {
          description: 'Vui lòng thử lại sau vài phút.'
        });
      } else if (errorMessage.includes('402') || errorMessage.includes('PAYMENT')) {
        toast.error('Cần nạp thêm credits', {
          description: 'Vui lòng liên hệ quản trị để nạp thêm credits AI.'
        });
      }

      return null;
    }
  }, [twinId]);

  // Assess risk specifically
  const assessRisk = useCallback(async (context: TwinContext) => {
    try {
      const { data, error } = await supabase.functions.invoke('personal-twin-realtime-ai', {
        body: {
          action: 'assess_risk',
          twinId,
          context,
          language: 'vi'
        }
      });

      if (error) throw error;
      return data.success ? data.riskAssessment : null;
    } catch (error) {
      console.error('[TWIN-AI] Risk assessment error:', error);
      return null;
    }
  }, [twinId]);

  // Get personalized guidance
  const getGuidance = useCallback(async (
    context: TwinContext,
    trigger: string = 'user_request'
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('personal-twin-realtime-ai', {
        body: {
          action: 'get_guidance',
          twinId,
          context,
          trigger,
          language: 'vi'
        }
      });

      if (error) throw error;
      return data.success ? data.guidance : null;
    } catch (error) {
      console.error('[TWIN-AI] Guidance error:', error);
      return null;
    }
  }, [twinId]);

  // Stream analysis for real-time updates
  const streamAnalysis = useCallback(async (
    context: TwinContext,
    trigger: string,
    onDelta: (text: string) => void,
    onComplete: () => void
  ) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isStreaming: true, streamContent: '' }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/personal-twin-realtime-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            action: 'stream_analysis',
            twinId,
            context,
            trigger,
            language: 'vi'
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Stream failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onDelta(content);
              setState(prev => ({ ...prev, streamContent: fullContent }));
            }
          } catch {
            // Incomplete JSON, wait for more
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      setState(prev => ({ ...prev, isStreaming: false }));
      onComplete();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[TWIN-AI] Stream aborted');
      } else {
        console.error('[TWIN-AI] Stream error:', error);
      }
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  }, [twinId]);

  // Auto-analyze when context changes significantly
  const checkAndAnalyze = useCallback(async (context: TwinContext) => {
    const contextHash = JSON.stringify(context);
    
    // Only analyze if context has changed
    if (contextHash === lastContextRef.current) {
      return;
    }
    lastContextRef.current = contextHash;

    // Determine trigger based on what changed
    let trigger = 'context_change';
    if (context.proximity?.exposureScore && context.proximity.exposureScore > 60) {
      trigger = 'high_exposure_detected';
    } else if (context.environment?.aqi && context.environment.aqi > 150) {
      trigger = 'poor_air_quality';
    } else if (context.location?.locationType === 'hospital') {
      trigger = 'hospital_location';
    }

    await generateInsights(context, trigger);
  }, [generateInsights]);

  // Cancel streaming
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Get status color
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-orange-500';
      case 'caution': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  }, []);

  // Get status background
  const getStatusBg = useCallback((status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-orange-500/10 border-orange-500/30';
      case 'caution': return 'bg-yellow-500/10 border-yellow-500/30';
      default: return 'bg-green-500/10 border-green-500/30';
    }
  }, []);

  return {
    ...state,
    generateInsights,
    assessRisk,
    getGuidance,
    streamAnalysis,
    checkAndAnalyze,
    cancelStream,
    getStatusColor,
    getStatusBg
  };
}

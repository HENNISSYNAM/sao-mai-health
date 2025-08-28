import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeHealthOptions {
  table: string // Allow any table name for flexibility
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  onUpdate?: (payload: any) => void
}

interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors: any[]
}

export function useRealtimeHealth<T = any>({ 
  table, 
  event = '*', 
  schema = 'public',
  onUpdate
}: UseRealtimeHealthOptions) {
  const [data, setData] = useState<T[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [nowTs, setNowTs] = useState(new Date())

  const mergeCache = useCallback((payload: RealtimePayload<T>) => {
    setNowTs(new Date())
    setData(currentData => {
      let newData = [...currentData]
      
      switch (payload.eventType) {
        case 'INSERT':
          newData = [payload.new, ...currentData]
          break
        
        case 'UPDATE':
          newData = currentData.map(item => 
            (item as any).id === (payload.new as any).id ? payload.new : item
          )
          break
        
        case 'DELETE':
          newData = currentData.filter(item => 
            (item as any).id !== (payload.old as any).id
          )
          break
        
        default:
          return currentData
      }
      
      if (onUpdate) {
        onUpdate(payload)
      }
      
      return newData
    })
  }, [onUpdate])

  useEffect(() => {
    const channelName = `realtime:${schema}.${table}`
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table
        },
        (payload: any) => {
          console.log(`Realtime update for ${table}:`, payload)
          mergeCache(payload as RealtimePayload<T>)
        }
      )
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true)
      })
      .on('presence', { event: 'join' }, () => {
        setIsConnected(true)
      })
      .on('presence', { event: 'leave' }, () => {
        setIsConnected(false)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
      })

    setChannel(realtimeChannel)

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
      setIsConnected(false)
    }
  }, [table, event, schema, mergeCache])

  const pushUpdate = useCallback((newData: T) => {
    mergeCache({
      eventType: 'INSERT',
      new: newData,
      old: null,
      errors: []
    })
  }, [mergeCache])

  const refreshData = useCallback((newData: T[]) => {
    setData(newData)
  }, [])

  return {
    data,
    setData,
    isConnected,
    channel,
    pushUpdate,
    refreshData,
    nowTs
  }
}

// Hook for patients table
export const useRealtimePatients = () => useRealtimeHealth<Patient>({
  table: 'patients',
  schema: 'public',
  onUpdate: (payload) => {
    console.log('Patient updated:', payload);
  }
});

// Hook for cases table
export const useRealtimeCases = () => useRealtimeHealth<Case>({
  table: 'cases',
  schema: 'public',
  onUpdate: (payload) => {
    console.log('Case updated:', payload);
  }
});

// Hook for case intake with combined patient+case data
export const useRealtimeCaseIntake = () => {
  const [data, setData] = useState<CaseIntakeData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const channelName = 'case-intake'
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cases'
        },
        async (payload: any) => {
          console.log('New case added:', payload);
          
  // Note: This is a simplified realtime hook for cases
          // In practice, you might want to fetch additional data
          console.log('Case added realtime:', payload.new);
          
          setData(currentData => [
            {
              ...payload.new,
              patient: null // Would need separate query to get patient data
            } as CaseIntakeData,
            ...currentData
          ]);
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients'
        },
        (payload: any) => {
          console.log('Patient updated:', payload);
          setData(currentData => 
            currentData.map(item => 
              item.patient?.id === payload.new.id 
                ? { ...item, patient: payload.new }
                : item
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    setChannel(realtimeChannel);

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      setIsConnected(false);
    };
  }, []);

  return {
    data,
    setData,
    isConnected,
    channel
  };
};

// Specialized hooks for specific tables
export function useRealtimeAlerts(onUpdate?: (payload: any) => void) {
  return useRealtimeHealth({ table: 'alerts', onUpdate })
}

export function useRealtimePredictions(onUpdate?: (payload: any) => void) {
  return useRealtimeHealth({ table: 'predictions', onUpdate })
}

export function useRealtimeAlertCandidates(onUpdate?: (payload: any) => void) {
  return useRealtimeHealth({ table: 'alert_candidates', onUpdate })
}

// Mock hook for daily_counts since it doesn't exist in DB yet
export function useRealtimeDailyCounts(onUpdate?: (payload: any) => void) {
  const [isConnected] = useState(true)
  const [nowTs, setNowTs] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    isConnected,
    nowTs,
    data: [],
    setData: () => {},
    channel: null,
    pushUpdate: () => {},
    refreshData: () => {}
  }
}

// Additional hooks for other pages
export function useRealtimeMetrics(onUpdate?: (payload: any) => void) {
  return useRealtimeHealth({ table: 'zone_metric_daily', onUpdate })
}

// Types for realtime data
interface Patient {
  id: string;
  mpi_hash: string;
  full_name: string;
  birth_year?: number;
  gender?: string;
  phone_hash?: string;
  address_hash?: string;
  created_at: string;
  updated_at: string;
}

interface Case {
  id: string;
  patient_id: string;
  case_number: string;
  disease_code: string;
  status: string;
  onset_date: string;
  report_date: string;
  district_id?: string;
  ward_id?: string;
  facility_id?: string;
  lat?: number;
  lng?: number;
  symptoms?: any;
  created_at: string;
  updated_at: string;
}

interface CaseIntakeData extends Case {
  patient?: Patient;
}
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

// Specialized hooks for specific tables
export function useRealtimeCases(onUpdate?: (payload: any) => void) {
  return useRealtimeHealth({ table: 'case_events', onUpdate })
}

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
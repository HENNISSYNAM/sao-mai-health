import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  table: 'cases' | 'lab_results' | 'alerts' | 'metrics_cases_daily'
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
}

interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors: any[]
}

export function useRealtime<T = any>({ 
  table, 
  event = '*', 
  schema = 'health' 
}: UseRealtimeOptions) {
  const [data, setData] = useState<T[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const updateCache = useCallback((payload: RealtimePayload<T>) => {
    setData(currentData => {
      switch (payload.eventType) {
        case 'INSERT':
          return [...currentData, payload.new]
        
        case 'UPDATE':
          return currentData.map(item => 
            (item as any).id === (payload.new as any).id ? payload.new : item
          )
        
        case 'DELETE':
          return currentData.filter(item => 
            (item as any).id !== (payload.old as any).id
          )
        
        default:
          return currentData
      }
    })
  }, [])

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
          updateCache(payload as RealtimePayload<T>)
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
  }, [table, event, schema, updateCache])

  const pushUpdate = useCallback((newData: T) => {
    updateCache({
      eventType: 'INSERT',
      new: newData,
      old: null,
      errors: []
    })
  }, [updateCache])

  return {
    data,
    setData,
    isConnected,
    channel,
    pushUpdate
  }
}
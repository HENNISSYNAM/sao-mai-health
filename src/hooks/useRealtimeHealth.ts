import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Enhanced realtime hook specifically for health tables
interface UseRealtimeHealthOptions {
  table: 'cases' | 'alerts' | 'beds' | 'stocks' | 'campaigns' | 'appointments' | 'encounters' | 'etl_queue' | 'dq_errors' | 'outbreaks' | 'metrics_cases_daily' | 'ai_outputs'
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  onUpdate?: (payload: any) => void
  invalidateKey?: string // For TanStack Query invalidation
}

interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors: any[]
  schema: string
  table: string
}

export function useRealtimeHealth<T = any>({ 
  table, 
  event = '*', 
  schema = 'health',
  onUpdate,
  invalidateKey
}: UseRealtimeHealthOptions) {
  const [data, setData] = useState<T[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Smart cache merge function
  const mergeCache = useCallback((payload: RealtimePayload<T>) => {
    setLastUpdate(new Date())
    
    setData(currentData => {
      switch (payload.eventType) {
        case 'INSERT':
          // Add new record if not already exists
          const existsInsert = currentData.some(item => 
            (item as any).id === (payload.new as any).id
          )
          if (!existsInsert) {
            return [...currentData, payload.new]
          }
          return currentData
        
        case 'UPDATE':
          // Update existing record
          return currentData.map(item => 
            (item as any).id === (payload.new as any).id ? {
              ...item,
              ...payload.new
            } : item
          )
        
        case 'DELETE':
          // Remove deleted record
          return currentData.filter(item => 
            (item as any).id !== (payload.old as any).id
          )
        
        default:
          return currentData
      }
    })

    // Call custom update handler
    if (onUpdate) {
      onUpdate(payload)
    }
  }, [onUpdate])

  useEffect(() => {
    const channelName = `realtime:${schema}.${table}`
    
    console.log(`🔄 Setting up realtime for ${channelName}`)
    
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
          console.log(`📡 Realtime update for ${table}:`, payload)
          mergeCache(payload as RealtimePayload<T>)
        }
      )
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true)
        console.log(`✅ Connected to ${channelName}`)
      })
      .on('presence', { event: 'join' }, () => {
        setIsConnected(true)
      })
      .on('presence', { event: 'leave' }, () => {
        setIsConnected(false)
      })
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${channelName}:`, status)
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
        }
      })

    setChannel(realtimeChannel)

    return () => {
      console.log(`🔌 Cleaning up realtime for ${channelName}`)
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
      setIsConnected(false)
    }
  }, [table, event, schema, mergeCache])

  // Manual push for optimistic updates
  const pushUpdate = useCallback((newData: T, eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT') => {
    mergeCache({
      eventType,
      new: newData,
      old: eventType === 'DELETE' ? newData : null,
      errors: [],
      schema,
      table
    })
  }, [mergeCache, schema, table])

  // Force refresh data
  const refreshData = useCallback((newData: T[]) => {
    setData(newData)
    setLastUpdate(new Date())
  }, [])

  return {
    data,
    setData: refreshData,
    isConnected,
    channel,
    pushUpdate,
    lastUpdate,
    connectionStatus: isConnected ? 'connected' : 'disconnected'
  }
}

// Specialized hooks for each module
export const useRealtimeCases = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'cases', onUpdate })

export const useRealtimeAlerts = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'alerts', onUpdate })

export const useRealtimeBeds = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'beds', onUpdate })

export const useRealtimeStocks = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'stocks', onUpdate })

export const useRealtimeCampaigns = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'campaigns', onUpdate })

export const useRealtimeAppointments = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'appointments', onUpdate })

export const useRealtimeEncounters = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'encounters', onUpdate })

export const useRealtimeETL = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'etl_queue', onUpdate })

export const useRealtimeDataQuality = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'dq_errors', onUpdate })

export const useRealtimeOutbreaks = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'outbreaks', onUpdate })

export const useRealtimeMetrics = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'metrics_cases_daily', onUpdate })

export const useRealtimeAI = (onUpdate?: (payload: any) => void) => 
  useRealtimeHealth({ table: 'ai_outputs', onUpdate })